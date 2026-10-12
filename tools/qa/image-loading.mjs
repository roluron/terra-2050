import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const extract = (start, end) => {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return html.slice(a, b);
};
const source = extract('function chargerImage(url){', 'const WEBP_OK')
  + extract('function chargerTextureImage(webp, repli, donnees){', '/* On entre TOUJOURS')
  + extract('function chargerPays(){', 'function paysSous(');
function fixture(webp = true) {
  const images = [], timers = new Map();
  let timerId = 0, populationCalls = 0;
  class Image {
    constructor() { this.width = 2; this.height = 1; images.push(this); }
    set src(url) { this.url = url; }
    removeAttribute(name) { assert.equal(name, 'src'); this.removed = true; }
  }
  class Texture { constructor(image) { this.image = image; } }
  const context = vm.createContext({Image, THREE: {Texture, NoColorSpace: 'data', RepeatWrapping: 'repeat',
    ClampToEdgeWrapping: 'clamp', LinearFilter: 'linear', NearestFilter: 'nearest'},
  IMAGES_CRITIQUES: [], cartesPerdues: false, WEBP_OK: webp, PAYS_RASTER: null, PAYS_ISO: [],
  uniformsGlobe: {uPays: {value: null}, uCountryStep: {value: {set() {}}}},
  charger: async () => ({iso: ['ZZ', 'YY']}), preparerPopulation: () => populationCalls++,
  document: {createElement: () => ({getContext: () => ({drawImage() {},
    getImageData: () => ({data: new Uint8Array([0, 0, 0, 255, 1, 0, 0, 255])})})})}, console,
  setTimeout: (callback, delay) => { assert.equal(delay, 30000); timers.set(++timerId, callback); return timerId; },
  clearTimeout: id => timers.delete(id)});
  vm.runInContext(source, context);
  return {context, images, timers, populationCalls: () => populationCalls,
    expire: () => {assert.equal(timers.size, 1); timers.values().next().value();}};
}
const flush = async () => {for (let i = 0; i < 4; i++) await Promise.resolve();};
const capabilitySource = extract('const WEBP_OK =', '/* Le gestionnaire');
for (const succeeds of [false, true]) {
  const capability = fixture();
  const pending = vm.runInContext(`(async () => {${capabilitySource}; return WEBP_OK;})()`, capability.context);
  if (succeeds) capability.images[0].onload(); else capability.expire();
  assert.equal(await pending, succeeds); assert.equal(capability.timers.size, 0);
}

const fallback = fixture();
const texture = fallback.context.chargerTextureImage('/primary.webp', '/fallback.png', true);
const latePrimary = fallback.images[0].onload;
fallback.expire(); await flush();
assert.equal(fallback.images[0].onload, null); assert.equal(fallback.images[0].onerror, null);
assert.equal(fallback.images[0].removed, true);
assert.deepEqual(fallback.images.map(image => image.url), ['/primary.webp', '/fallback.png']);
latePrimary(); assert.equal(texture.image, undefined);
const successfulFallback = fallback.images[1], lateError = successfulFallback.onerror;
successfulFallback.onload();
assert.deepEqual(await Promise.all(fallback.context.IMAGES_CRITIQUES), [true]);
latePrimary(); lateError();
assert.equal(texture.image, successfulFallback); assert.equal(texture.needsUpdate, true);
assert.equal(texture.colorSpace, 'data'); assert.equal(texture.minFilter, 'linear');
assert.equal(texture.wrapS, 'repeat'); assert.equal(texture.wrapT, 'clamp');
assert.equal(texture.generateMipmaps, false); assert.equal(fallback.context.cartesPerdues, false);
assert.equal(fallback.timers.size, 0);

const failed = fixture();
const blank = failed.context.chargerTextureImage('/first', '/second');
failed.expire(); await flush();
const lateFailed = failed.images[1].onload;
failed.expire();
assert.deepEqual(await Promise.all(failed.context.IMAGES_CRITIQUES), [false]);
lateFailed(); assert.equal(blank.image, undefined); assert.equal(failed.context.cartesPerdues, true);
assert.equal(failed.timers.size, 0);
const errors = fixture();
errors.context.chargerTextureImage('/first', '/second');
errors.images[0].onerror(); await flush(); errors.images[1].onerror();
assert.deepEqual(await Promise.all(errors.context.IMAGES_CRITIQUES), [false]);
assert.equal(errors.context.cartesPerdues, true); assert.equal(errors.timers.size, 0);

const loaded = fixture();
const original = loaded.context.chargerTextureImage('/primary', '/fallback');
const lateLoadError = loaded.images[0].onerror;
loaded.images[0].onload(); await Promise.all(loaded.context.IMAGES_CRITIQUES); lateLoadError();
assert.equal(original.image, loaded.images[0]); assert.equal(loaded.images.length, 1);
assert.equal(loaded.context.cartesPerdues, false); assert.equal(loaded.timers.size, 0);

const unsupported = fixture(false);
unsupported.context.chargerTextureImage('/webp', '/png');
assert.equal(unsupported.images[0].url, '/png'); unsupported.images[0].onerror();
assert.deepEqual(await Promise.all(unsupported.context.IMAGES_CRITIQUES), [false]);
assert.equal(unsupported.images.length, 1); assert.equal(unsupported.timers.size, 0);

const country = fixture();
const countryPending = country.context.chargerPays(); country.expire(); await countryPending;
assert.equal(country.context.PAYS_RASTER, null); assert.equal(country.timers.size, 0);
assert.equal(country.populationCalls(), 0);
const countryLoaded = fixture();
const countryReady = countryLoaded.context.chargerPays(); countryLoaded.images[0].onload(); await countryReady;
assert.deepEqual(Array.from(countryLoaded.context.PAYS_RASTER.px), [0, 1]);
assert.deepEqual(countryLoaded.context.PAYS_ISO, ['ZZ', 'YY']);
assert.equal(countryLoaded.context.uniformsGlobe.uPays.value.image, countryLoaded.images[0]);
assert.equal(countryLoaded.populationCalls(), 1); assert.equal(countryLoaded.timers.size, 0);
console.log('PASS: stalled primary/fallback/country images settle, late callbacks ignored, image/raster data and timer cleanup preserved.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import * as THREE from '../../assets/lib/three.module.min.js';
import { climateAtYear } from '../../climate-data.mjs';
import { floodAtYear } from '../../flood-data.mjs';
import { buildScientificTextures } from '../../science-textures.mjs';

const root = new URL('../../', import.meta.url);
const file = path => readFile(new URL(path, root));
const decode = bytes => { const b = gunzipSync(bytes); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const source = JSON.parse(await file('data/climate-manifest.json'));
const climate = { metadata: { ...source, fields: ['historical', 'near', 'future'].flatMap(epoch =>
  ['temperature', 'precipitation', 'summerMaximum', 'aridity'].map(field => `${epoch}_${field}`)) },
  values: decode(await file('data/climate-grid.bin')), points: new Float32Array() };
const metadata = JSON.parse(await file('data/flood-metadata.json'));
const floods = Object.fromEntries(await Promise.all(['coast', 'river'].map(async hazard => [hazard,
  { metadata: { ...metadata, ...metadata.hazards[hazard] }, values: decode(await file(`data/flood-${hazard}.bin`)) }])));

climate.values.set([-20, 100, 15, NaN, -20, 100, 20, NaN, -20, 100, 25, NaN], 0);
for (const hazard of ['coast', 'river']) {
  const grid = floods[hazard], fields = grid.metadata.fields;
  fields.forEach((field, index) => { grid.values[index] = field === 'coverage' ? 1 : field.includes('fraction') ? .25 : 4; });
  if (hazard === 'river') grid.values[fields.indexOf(`near_model_${grid.metadata.models[0]}_mean_depth_m`)] = NaN;
}
let ticks = 0;
const timer = setInterval(() => ticks++, 1);
const textures = await buildScientificTextures(THREE, climate, floods);
clearInterval(timer);
assert.ok(ticks > 0);
const names = ['heat', 'aridity', 'warming', 'coast', 'river'];
assert.deepEqual(Object.keys(textures), names);
assert.equal(textures.heat.userData.scientific.stats.bytes, 10368000);
function at(texture, lat, lon) {
  const x = Math.floor(((lon + 180) % 360 + 360) % 360 * 2), y = Math.min(359, Math.floor((90 - lat) * 2));
  const offset = ((359 - y) * 720 + x) * 4;
  return Array.from(texture.image.data.subarray(offset, offset + 4), THREE.DataUtils.fromHalfFloat);
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(0.000001, Math.abs(expected) * .001), `${actual} != ${expected}`);
for (const name of names) {
  const t = textures[name];
  assert.equal(t.type, THREE.HalfFloatType); assert.equal(t.minFilter, THREE.LinearFilter);
  assert.equal(t.magFilter, THREE.LinearFilter); assert.equal(t.flipY, false);
  assert.equal(t.generateMipmaps, false); assert.equal(t.colorSpace, THREE.NoColorSpace);
  const data = t.image.data;
  for (let i = 0; i < data.length; i += 4) {
    assert.ok(data[i+3] === 0 || data[i+3] === 0x3c00);
    if (!data[i+3]) assert.ok(data[i] === 0 && data[i+1] === 0 && data[i+2] === 0);
    else for (let c = 0; c < 3; c++) assert.ok(Number.isFinite(THREE.DataUtils.fromHalfFloat(data[i+c])));
  }
}
for (const [lat, lon] of [[48.85, 2.35], [23.81, 90.41], [10.78, 106.7], [12.37, -1.52], [89.75, -179.75], [-89.75, -179.75]]) {
  for (const [name, field] of [['heat', 'summerMaximum'], ['aridity', 'aridity'], ['warming', 'warming']]) {
    const expected = [2026, 2030, 2050].map(year => {
      const value = climateAtYear(climate, lat, lon, year)[field];
      return name === 'aridity' ? Math.min(value, 60) : value;
    });
    const actual = at(textures[name], lat, lon);
    const valid = expected.every(value => Number.isFinite(value) && Math.abs(value) <= 65504);
    assert.equal(actual[3], Number(valid));
    if (valid) actual.slice(0, 3).forEach((value, i) => close(value, expected[i]));
  }
  for (const hazard of ['coast', 'river']) {
    const expected = [2026, 2030, 2050].map(year => floodAtYear(floods[hazard], lat, lon, year, hazard));
    const actual = at(textures[hazard], lat, lon);
    assert.equal(actual[3], Number(expected.every(value => value.available)));
    if (actual[3]) actual.slice(0, 3).forEach((value, i) => close(value, expected[i].fraction));
  }
}
assert.equal(at(textures.heat, 89.75, -179.75)[3], 1);
assert.equal(at(textures.aridity, 89.75, -179.75)[3], 0);
assert.equal(at(textures.warming, 89.75, -179.75)[3], 1);
assert.notEqual(at(textures.heat, -89.75, -179.75)[0], at(textures.heat, 89.75, -179.75)[0]);
assert.equal(floodAtYear(floods.river, 89.75, -179.75, 2050, 'river').modelCount, 4);
let validDM = 0, cappedDM = 0, previouslyOverflowedDM = 0;
for (let row = 0; row < 720*360; row++) {
  const o = row*12, a = climate.values;
  const t = [a[o]+(a[o+4]-a[o])*41/45, a[o+4], a[o+8]];
  const p = [a[o+1]+(a[o+5]-a[o+1])*41/45, a[o+5], a[o+9]];
  const dm = t.map((temperature, i) => temperature > -10 ? p[i]/(temperature+10) : NaN);
  const offset = ((359-Math.floor(row/720))*720+row%720)*4;
  const encoded = textures.aridity.image.data;
  const valid = dm.every(Number.isFinite);
  assert.equal(encoded[offset+3], valid ? 0x3c00 : 0);
  if (!valid) continue;
  validDM++;
  if (dm.some(value => value > 60)) cappedDM++;
  if (dm.some(value => value > 65504)) previouslyOverflowedDM++;
  dm.forEach((value, i) => close(THREE.DataUtils.fromHalfFloat(encoded[offset+i]), Math.min(value, 60)));
}
assert.ok(previouslyOverflowedDM > 0);
assert.equal(textures.aridity.userData.scientific.displayCap, 60);
assert.equal(textures.aridity.userData.scientific.displayCappedCells, cappedDM);
assert.equal(textures.aridity.userData.scientific.validCells, validDM);
assert.equal(textures.aridity.userData.scientific.halfFloatOverflowCells, 0);
console.log('PASS: physical endpoints, independent masks, matched flood models, HalfFloat bounds, row reversal, event-loop yielding', textures.heat.userData.scientific.stats);
for (const texture of Object.values(textures)) texture.dispose();

if (process.argv.includes('--browser')) {
  const { createServer } = await import('node:http');
  const { chromium } = await import('playwright');
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Scientific textures QA</title>'); return; }
      const url = new URL(`.${pathname}`, root);
      if (!url.pathname.startsWith(root.pathname)) throw new Error('Outside root');
      response.setHeader('Content-Type', /\.m?js$/.test(pathname) ? 'text/javascript' : pathname.endsWith('.json') ? 'application/json' : 'application/octet-stream');
      response.end(await readFile(url));
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const result = await page.evaluate(async () => {
      const THREE = await import('/assets/lib/three.module.min.js');
      const { loadWorldClim, loadFloodHazards } = await import('/climate-data.mjs');
      const { buildScientificTextures } = await import('/science-textures.mjs');
      const [climate, floods] = await Promise.all([loadWorldClim(), loadFloodHazards()]);
      const tasks = [];
      const observer = new PerformanceObserver(list => tasks.push(...list.getEntries().map(task => ({ start: task.startTime, duration: task.duration }))));
      observer.observe({ entryTypes: ['longtask'] });
      await new Promise(resolve => setTimeout(resolve, 0));
      const start = performance.now(), textures = await buildScientificTextures(THREE, climate, floods), end = performance.now();
      await new Promise(resolve => setTimeout(resolve, 50));
      observer.disconnect();
      const buildTasks = tasks.filter(task => task.start >= start && task.start < end);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(1, 1);
      const target = new THREE.WebGLRenderTarget(1, 1), scene = new THREE.Scene(), camera = new THREE.Camera();
      const material = new THREE.ShaderMaterial({ uniforms: { map: { value: null }, uvPoint: { value: new THREE.Vector2() }, scale: { value: 1 } },
        vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: 'uniform sampler2D map;uniform vec2 uvPoint;uniform float scale;void main(){vec4 t=texture2D(map,uvPoint);gl_FragColor=t.a>0.?vec4(t.rgb/t.a*scale+.5,1.):vec4(0.);}' });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
      const gpuStart = performance.now();
      let checks = 0;
      for (const texture of Object.values(textures)) {
        const data = texture.image.data;
        let valid = -1, edge = -1;
        for (let i = 0; i < 720*360 && (valid < 0 || edge < 0); i++) {
          if (valid < 0 && data[i*4+3]) valid = i;
          if (i%720 < 719 && data[i*4+3] !== data[(i+1)*4+3]) edge = i;
        }
        if (valid < 0 || edge < 0) throw new Error('Missing valid/masked boundary for GPU QA');
        const candidates = [{ index: valid }, { index: 720*359+360 }, { index: 720*180+180 }, { index: edge, boundary: true }];
        for (const { index, boundary } of candidates) {
          const expected = Array.from(data.subarray(index*4, index*4+4), THREE.DataUtils.fromHalfFloat);
          if (boundary) for (let c = 0; c < 4; c++) expected[c] = (expected[c] + THREE.DataUtils.fromHalfFloat(data[(index+1)*4+c]))/2;
          const normalized = expected.slice(0,3).map(value => expected[3] ? value/expected[3] : 0);
          const scale = 1 / (2 * Math.max(1, ...normalized.map(Math.abs)));
          material.uniforms.map.value = texture;
          material.uniforms.scale.value = scale;
          material.uniforms.uvPoint.value.set((index%720+(boundary?1:.5))/720, (Math.floor(index/720)+.5)/360);
          renderer.setRenderTarget(target); renderer.render(scene, camera);
          const pixel = new Uint8Array(4); renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);
          for (let c = 0; c < 4; c++) {
            const wanted = !expected[3] ? 0 : c === 3 ? 255 : (normalized[c]*scale+.5)*255;
            if (Math.abs(pixel[c]-wanted) > 2) throw new Error(`GPU sample mismatch ${texture.name} ${index}: ${pixel} expected ${expected}`);
          }
          checks++;
        }
      }
      const output = { ...textures.heat.userData.scientific.stats, longTasks: buildTasks,
        webglVersion: renderer.getContext().getParameter(renderer.getContext().VERSION), gpuChecks: checks,
        firstUploadAndRenderMs: performance.now()-gpuStart,
        overflowCells: Object.fromEntries(Object.entries(textures).map(([name,t])=>[name,t.userData.scientific.halfFloatOverflowCells])) };
      for (const texture of Object.values(textures)) texture.dispose();
      target.dispose(); material.dispose(); renderer.dispose();
      return output;
    });
    assert.equal(result.gpuChecks, 20);
    console.log('BROWSER PASS', JSON.stringify(result));
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {createPlaceSearch, decodePlaceDirectory, normalizePlace} from '../../place-search.mjs';

const jsonBytes = await readFile(new URL('../../data/places.json', import.meta.url));
const coordinates = await readFile(new URL('../../data/places.bin', import.meta.url));
const directory = JSON.parse(jsonBytes);
const binary = coordinates.buffer.slice(coordinates.byteOffset, coordinates.byteOffset + coordinates.byteLength);
const places = decodePlaceDirectory(directory, binary);
const metadata = JSON.parse(await readFile(new URL('../../data/place-search.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(metadata.inputs.placesJsonSha256, hash(jsonBytes));
assert.equal(metadata.inputs.placesBinSha256, hash(coordinates));
assert.equal(metadata.places.length, places.length);
assert.equal(normalizePlace('  Washington, D.C.  '), 'washington dc');
assert.equal(normalizePlace('New  York'), 'new york');
assert.equal(normalizePlace('Hà Nội'), 'ha noi');
assert.throws(() => decodePlaceDirectory(directory, binary.slice(1)), /size/);
assert.throws(() => decodePlaceDirectory({villes: [['<bad>', 'ZZ', -1, 0, 'Bad']]}, new ArrayBuffer(24)), /entry/);
const badCoordinates = binary.slice(0); new DataView(badCoordinates).setInt16(0, 9100, true);
assert.throws(() => decodePlaceDirectory(directory, badCoordinates), /coordinates/);

const start = performance.now();
const search = createPlaceSearch(places, metadata);
const buildMs = performance.now() - start;
const city = (query, name, iso) => {
  const found = search(query).find(place => place[1] === iso && (place[0] === name || place[6] === name));
  assert.ok(found, `${query} must find ${name}, ${iso}: ${search(query).map(p => p[0] + ' ' + p[1])}`);
  return found;
};
for (const query of ['Paris', 'Paris, France', 'Paris France', 'Paris FR']) city(query, 'Paris', 'FR');
for (const query of ['San Francisco', 'San Francisco, CA', 'San Francisco California', 'San Fransisco']) city(query, 'San Francisco', 'US');
for (const query of ['New York', 'New  York', 'New York, NY', 'New York NY USA', 'NYC']) city(query, 'New York', 'US');
for (const query of ['Washington DC', 'Washington, D.C.', 'Washington D.C.']) city(query, 'Washington', 'US');
for (const query of ['Munich', 'München', 'Muenchen']) city(query, 'Munich', 'DE');
for (const query of ['Hanoi', 'Hà Nội', 'Ha Noi']) city(query, 'Hanoï', 'VN');
for (const query of ['Saigon', 'Sài Gòn', 'Ho Chi Minh City']) city(query, 'Ho Chi Minh City', 'VN');
city('東京', 'Tokyo', 'JP'); city('北京', 'Beijing', 'CN');
city('Nan', 'Nan', 'TH'); city('Wa', 'Wa', 'GH'); city('San', 'San', 'ML'); city('Bra', 'Bra', 'IT');
assert.equal(search('zzzzzzzz').length, 0);
assert.equal(search('San Francisco, Texas').some(place => place[0] === 'San Francisco' && place[1] === 'US'), false);
assert.equal(search('Paris, Canada').some(place => place[0] === 'Paris' && place[1] === 'FR'), false);
const paris = city('Paris', 'Paris', 'FR');
assert.equal(search('Paris', {exclude: paris}).includes(paris), false);
const country = ['France', 'FR', 46, 2, 60000000, 2, 'France'];
const mixed = createPlaceSearch([...places, country], metadata);
assert.equal(mixed('France', {countriesOnly: true})[0], country);
assert.equal(mixed('Paris', {countriesOnly: true}).length, 0);
assert.equal(mixed('France', {countriesOnly: false}).includes(country), false);

const fullStart = performance.now();
for (const place of places) {
  for (const name of new Set([place[0], place[6]])) {
    assert.ok(search(name, {limit: Infinity}).includes(place), `Exact name is unreachable: ${name}, ${place[1]}`);
  }
}
const samples = ['s', 'sa', 'san', 'san f', 'san francisco', 'San Francisco, CA', 'NYC', '東京', 'zzzzzzzz'];
const times = samples.map(query => {
  const started = performance.now(); search(query); return {query, milliseconds: +(performance.now() - started).toFixed(2)};
});
console.log(JSON.stringify({status: 'PASS', cities: places.length, buildMs: +buildMs.toFixed(2),
  allExactNamesMs: +(performance.now() - fullStart).toFixed(2), queries: times}));

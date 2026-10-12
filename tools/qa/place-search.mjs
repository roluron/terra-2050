import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
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
const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const loaderStart = html.indexOf('async function chargerNomsSupplementaires(');
const groupingStart = html.indexOf('    const homonyms = new Map();', loaderStart);
const groupingEnd = html.indexOf("    nomsSupplementaires = 'ready';", groupingStart);
assert.ok(loaderStart >= 0 && groupingStart > loaderStart && groupingEnd > groupingStart);
const groupingSource = html.slice(groupingStart, groupingEnd);
function regionLabels(rows, names) {
  const regionsLieux = new WeakMap();
  vm.runInNewContext(groupingSource, {LIEUX: rows, metadata: names, normaliser: normalizePlace,
    SOURCE_INDEX: new Map(rows.map((row, index) => [row, index])), regionsLieux});
  return regionsLieux;
}
const labels = regionLabels(places, metadata);
const solo = ['Solo', 'ZZ', 1, 2, 1, 0, 'Solo'];
assert.equal(regionLabels([solo], {places: [[1, 'ZZ', 'A', []]], regions: {'ZZ.A': ['Region A']}}).get(solo), undefined);
for (const [indices, expected] of [
  [[514, 6845], ['Guangxi', 'Shaanxi']],
  [[1565, 2300], ['Wakayama', 'Tokyo']],
  [[4118, 4194], ['Madrid', 'Castille and León']],
]) {
  assert.equal(places[indices[0]][6], places[indices[1]][6]);
  assert.notEqual(places[indices[0]][0], places[indices[1]][0]);
  assert.deepEqual(indices.map(index => labels.get(places[index])), expected);
}
const overlapping = [
  ['Alpha', 'ZZ', 1, 2, 1, 0, 'Shared'],
  ['Alpha', 'ZZ', 3, 4, 1, 0, 'Unique'],
  ['Gamma', 'ZZ', 5, 6, 1, 0, 'Shared'],
];
const overlapMetadata = {places: [[1, 'ZZ', 'A', []], [2, 'ZZ', 'A', []], [3, 'ZZ', 'B', []]],
  regions: {'ZZ.A': ['Region A'], 'ZZ.B': ['Region B']}};
const overlapLabels = regionLabels(overlapping, overlapMetadata);
assert.deepEqual(overlapping.map(row => overlapLabels.get(row)), ['Region A · 1°, 2°', 'Region A · 3°, 4°', 'Region B']);
const missingRegion = regionLabels(overlapping, {...overlapMetadata, regions: {}});
assert.deepEqual(overlapping.map(row => missingRegion.get(row)), ['1°, 2°', '3°, 4°', '5°, 6°']);
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
const reachable = {nameIso: 0, admin1: 0};
for (const [index, place] of places.entries()) {
  const names = [...new Set([place[0], place[6]])];
  if (names.some(name => search(`${name} ${place[1]}`, {limit: 7}).includes(place))) {
    reachable.nameIso++;
    continue;
  }
  const extra = metadata.places[index];
  const regions = extra ? metadata.regions[`${extra[1]}.${extra[2]}`] || [] : [];
  assert.ok(names.some(name => regions.some(region =>
    search(`${name} ${region} ${place[1]}`, {limit: 7}).includes(place))),
  `City is unreachable at UI limit: ${index}, ${place[0]}, ${place[1]}`);
  reachable.admin1++;
}
for (const [index, query, region] of [
  [31392, 'Springfield Tennessee US', 'US.TN'],
  [33619, 'Kong Savanes District CI', 'CI.87'],
]) {
  const extra = metadata.places[index];
  assert.equal(`${extra[1]}.${extra[2]}`, region);
  assert.ok(search(query, {limit: 7}).includes(places[index]), `${query} must return the original city row`);
}
const samples = ['s', 'sa', 'san', 'san f', 'san francisco', 'San Francisco, CA', 'NYC', '東京', 'zzzzzzzz'];
const times = samples.map(query => {
  const started = performance.now(); search(query); return {query, milliseconds: +(performance.now() - started).toFixed(2)};
});
console.log(JSON.stringify({status: 'PASS', cities: places.length, buildMs: +buildMs.toFixed(2),
  allExactNamesMs: +(performance.now() - fullStart).toFixed(2), reachableAtLimit7: reachable, queries: times}));

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { loadFloodCities, floodAtYear, floodCityAtYear } from '../../flood-data.mjs';

const root = new URL('../../', import.meta.url);
const file = path => readFile(new URL(path, root));
const originalFetch = globalThis.fetch;
globalThis.fetch = async path => new Response(await file(path));
const cities = await loadFloodCities();
globalThis.fetch = originalFetch;
const places = JSON.parse(await file('data/places.json')).villes;
const dhaka = places.findIndex(row => row[4] === 'Dhaka');
assert.ok(dhaka >= 0);
assert.equal(cities.metadata.count, 34099);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const average = values => values.reduce((a, b) => a + b, 0) / values.length;
const cityValue = (index, field) => cities.values[index * cities.metadata.fields.length + cities.metadata.fields.indexOf(field)];

const sources = cities.metadata.sources.filter(source => source.hazard === 'river');
const historical = sources.find(source => source.epoch === 'historical');
const paired = sources.filter(source => source.epoch === 2050).map(future => {
  const near = sources.find(source => source.epoch === 2030 && source.model === future.model);
  return { historical: cityValue(dhaka, historical.depth_field), near: cityValue(dhaka, near.depth_field),
    future: cityValue(dhaka, future.depth_field), available: [historical, near, future].every(source => cityValue(dhaka, source.availability_field) === 1) };
}).filter(value => value.available);
assert.equal(paired.length, 5);
for (const year of [1980, 2026, 2030, 2038, 2050]) {
  const result = floodCityAtYear(cities, dhaka, year, 'river');
  assert.equal(result.available, true);
  const baseline = average(paired.map(row => row.historical + (row.near - row.historical) * .92));
  const expected = average(paired.map(row => year < 2030
    ? row.historical + (row.near - row.historical) * (year - 1980) / 50
    : row.near + (row.future - row.near) * (year - 2030) / 20));
  close(result.baseline, baseline); close(result.value, expected);
  close(result.change, expected - baseline); close(result.future, average(paired.map(row => row.future)));
  assert.deepEqual(result.sourcePeriods, { historical: [1960, 1999], near: [2010, 2049], future: [2030, 2069] });
  assert.equal(result.annualForecast, false);
  assert.equal('fraction' in result, false);
}

const fields = cities.metadata.fields;
const synthetic = { metadata: { ...cities.metadata, count: 1 }, values: new Float32Array(fields.length) };
for (let i = 0; i < fields.length; i += 2) synthetic.values.set([4, 1], i);
const set = (field, value) => { synthetic.values[fields.indexOf(field)] = value; };
const futureSources = sources.filter(source => source.epoch === 2050);
futureSources.forEach((source, i) => set(source.depth_field, [1, 2, 4, 6, 10][i]));
let result = floodCityAtYear(synthetic, 0, 2050, 'river');
close(result.value, 4.6); close(result.change, .6);
close(result.p10, -2.6); close(result.p90, 4.4); close(result.agreement, .4);
const missingNear = sources.find(source => source.epoch === 2030 && source.model === futureSources[4].model);
set(missingNear.availability_field, 0);
result = floodCityAtYear(synthetic, 0, 2050, 'river');
assert.equal(result.modelCount, 4); close(result.value, 3.25); close(result.baseline, 4); close(result.change, -.75);
set(missingNear.availability_field, 1); set(missingNear.depth_field, NaN);
assert.equal(floodCityAtYear(synthetic, 0, 2038, 'river').modelCount, 4);
for (let i = 0; i < fields.length; i += 2) synthetic.values.set([0, 1], i);
result = floodCityAtYear(synthetic, 0, 2050, 'river');
assert.equal(result.available, true); assert.equal(result.value, 0); assert.equal(result.change, 0); assert.equal(result.agreement, 1);
const coastSources = cities.metadata.sources.filter(source => source.hazard === 'coast');
set(coastSources.find(source => source.epoch === 'historical').depth_field, 4);
set(coastSources.find(source => source.epoch === 2030).depth_field, 4);
set(coastSources.find(source => source.epoch === 2050).depth_field, 1);
result = floodCityAtYear(synthetic, 0, 2050, 'coast');
close(result.change, -3); assert.equal(result.p10, null); assert.equal(result.agreement, null);
assert.deepEqual(result.anchorYears, [1996.5, 2030, 2050]);
for (let i = 1; i < fields.length; i += 2) synthetic.values[i] = 0;
result = floodCityAtYear(synthetic, 0, 2050, 'river');
assert.equal(result.available, false); assert.equal(result.value, null);
assert.equal(floodCityAtYear(cities, -1, 2050, 'river').available, false);
assert.equal(floodCityAtYear(cities, dhaka, NaN, 'river').available, false);
assert.equal(floodCityAtYear(cities, dhaka, 2051, 'river').available, false);

const metadata = JSON.parse(await file('data/flood-metadata.json'));
for (const hazard of ['river', 'coast']) {
  const descriptor = metadata.hazards[hazard];
  const bytes = gunzipSync(await file(`data/${descriptor.file}`));
  const grid = { metadata: { ...metadata, ...descriptor }, values: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) };
  for (const [lat, lon] of [[23.81, 90.41], [48.85, 2.35], [10.78, 106.7], [12.37, -1.52]]) {
    const near = floodAtYear(grid, lat, lon, 2030, hazard), future = floodAtYear(grid, lat, lon, 2050, hazard);
    assert.equal(near.available, true);
    for (const year of [2026, 2030, 2038, 2050]) {
      const actual = floodAtYear(grid, lat, lon, year, hazard);
      close(actual.change, actual.value - actual.baseline);
      close(actual.fractionChange, actual.fraction - actual.baselineFraction);
      if (year >= 2030) close(actual.value, near.value + (future.value - near.value) * (year - 2030) / 20);
    }
    close(near.fraction, near.nearFraction); close(future.fraction, future.futureFraction);
  }
  const stride = descriptor.fields.length;
  let masked = -1, zero = -1;
  for (let row = 0; row < metadata.width * metadata.height && (masked < 0 || zero < 0); row++) {
    if (grid.values[row * stride] === 0) masked = row;
    else if (descriptor.fields.every((field, i) => !field.includes('depth_m') || field.includes('agreement') || grid.values[row * stride + i] === 0)) zero = row;
  }
  assert.ok(masked >= 0 && zero >= 0);
  const at = row => floodAtYear(grid, 90 - (Math.floor(row / metadata.width) + .5) / 2, -180 + (row % metadata.width + .5) / 2, 2050, hazard);
  assert.equal(at(masked).available, false); assert.equal(at(zero).available, true); assert.equal(at(zero).value, 0);
  assert.deepEqual(floodAtYear(grid, 0, -180, 2050, hazard), floodAtYear(grid, 0, 180, 2050, hazard));
  assert.equal(floodAtYear(grid, 91, 0, 2050, hazard).available, false);
}
globalThis.fetch = async path => {
  const bytes = Buffer.from(await file(path));
  if (path.endsWith('places.bin')) bytes[0] ^= 1;
  return new Response(bytes);
};
await assert.rejects(loadFloodCities(), /hash mismatch/);
globalThis.fetch = originalFetch;
console.log('PASS: real Dhaka, grid epochs/fractions, paired mean/spread/sign, matched model availability, native zero/masked cells, coordinate hashes');

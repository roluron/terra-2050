import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mapDiagnosticReading } from '../../map-diagnostic.mjs';

// Expected values below are calculated directly from shipped fields, without
// climateAtYear/fireAtYear/floodAtYear or the module's interpolation helpers.
const root = new URL('../../', import.meta.url);
const file = path => readFile(new URL(path, root));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const floats = bytes => {
  const values = new Float32Array(bytes.byteLength / 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < values.length; i++) values[i] = view.getFloat32(i * 4, true);
  return values;
};
const climateMetadata = JSON.parse(await file('data/climate-manifest.json'));
const climateBytes = await file('data/climate-grid.bin');
assert.equal(sha256(climateBytes), climateMetadata.grid.sha256);
const climateDecoded = gunzipSync(climateBytes);
assert.equal(sha256(climateDecoded), climateMetadata.grid.uncompressed_sha256);
const climate = { metadata: { ...climateMetadata, fields: ['historical', 'near', 'future']
  .flatMap(period => ['temperature', 'precipitation', 'summerMaximum', 'aridity'].map(metric => `${period}_${metric}`)) },
values: floats(climateDecoded), points: new Float32Array() };
const fireMetadata = JSON.parse(await file('data/fire-weather.json'));
const fireBytes = await file('data/fire-weather.bin');
assert.equal(sha256(fireBytes), fireMetadata.sha256);
const fire = { metadata: fireMetadata, values: floats(fireBytes) };
const floodMetadata = JSON.parse(await file('data/flood-metadata.json'));
const floods = {};
for (const hazard of ['river', 'coast']) {
  const descriptor = floodMetadata.hazards[hazard], compressed = await file(`data/${descriptor.file}`);
  assert.equal(sha256(compressed), descriptor.sha256);
  const decoded = gunzipSync(compressed);
  assert.equal(sha256(decoded), descriptor.decoded_sha256);
  floods[hazard] = { metadata: { ...floodMetadata, ...descriptor }, values: floats(decoded) };
}

const close = (actual, expected, context = '') => assert.ok(Number.isFinite(actual)
  && Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${context}: ${actual} != ${expected}`);
const average = values => values.reduce((a, b) => a + b, 0) / values.length;
const quantile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b), position = (sorted.length - 1) * p;
  return sorted[Math.floor(position)] * (1 - position % 1) + sorted[Math.ceil(position)] * (position % 1);
};
const interpolate = (historical, near, future, year, historicalYear) => year < 2030
  ? historical + (near - historical) * (year - historicalYear) / (2030 - historicalYear)
  : near + (future - near) * (year - 2030) / 20;
const coordinate = (row, grid) => ({
  latitude: 90 - (Math.floor(row / grid.metadata.width) + .5) * 180 / grid.metadata.height,
  longitude: -180 + (row % grid.metadata.width + .5) * 360 / grid.metadata.width,
});
const rowAt = (grid, lat, lon) => Math.min(grid.metadata.height - 1, Math.floor((90 - lat) / 180 * grid.metadata.height))
  * grid.metadata.width + Math.floor(((lon + 180) % 360 + 360) % 360 / 360 * grid.metadata.width);
const inputs = { climate, fire, floods };
const read = (filter, year, latitude, longitude, extra = {}) => mapDiagnosticReading({ ...inputs, filter, year, latitude, longitude, ...extra });
function climateExpected(row, filter, year) {
  const offset = row * 12;
  const at = (field, y) => interpolate(climate.values[offset + field], climate.values[offset + field + 4],
    climate.values[offset + field + 8], y, 1985);
  if (filter === 'secheresse') {
    if (![2026, 2030, 2050].every(y => Number.isFinite(at(0, y)) && Math.fround(at(0, y)) > -10
        && Number.isFinite(at(1, y)) && Math.fround(at(1, y)) >= 0)) return null;
    const value = at(1, year) / (at(0, year) + 10), baseline = at(1, 2026) / (at(0, 2026) + 10);
    return { value, baseline, future: at(1, 2050) / (at(0, 2050) + 10) };
  }
  const field = filter === 'chaleur' ? 2 : 0, historical = filter === 'stabilite' ? climate.values[offset] : 0;
  const [baseline, value, future] = [2026, year, 2050].map(y => at(field, y) - historical);
  return [baseline, value, future].every(Number.isFinite) ? { value, baseline, future } : null;
}
function fireExpected(row, year) {
  const offset = row * 8, near = fire.values[offset + 1], future = fire.values[offset + 2];
  if (![near, future].every(value => Number.isFinite(value) && value >= 0 && value <= 366)) return null;
  const progress = (year - 2026) / 24;
  return { value: near + (future - near) * progress, baseline: near, future,
    p10: fire.values[offset + 4] * progress, p90: fire.values[offset + 5] * progress,
    agreement: year === 2026 ? 1 : fire.values[offset + 6] };
}
const floodIndices = Object.fromEntries(Object.entries(floods).map(([hazard, grid]) => {
  const fields = grid.metadata.fields;
  const models = hazard === 'river' ? grid.metadata.models : ['coastal-median'];
  return [hazard, models.map(model => {
    const prefixes = hazard === 'river' ? ['historical', `near_model_${model}`, `model_${model}`]
      : ['historical', 'near', 'future'];
    return prefixes.map(prefix => [fields.indexOf(`${prefix}_mean_depth_m`), fields.indexOf(`${prefix}_fraction_gt_0_5m`)]);
  })];
}));
function floodExpected(grid, hazard, row, year) {
  const offset = row * grid.metadata.fields.length;
  const coverage = grid.values[offset + grid.metadata.fields.indexOf('coverage')];
  if (!(coverage > 0 && coverage <= 1)) return null;
  const fractions = [];
  for (const model of floodIndices[hazard]) {
    const records = model.map(([depth, fraction]) => [grid.values[offset + depth], grid.values[offset + fraction]]);
    if (records.every(([depth, fraction]) => Number.isFinite(depth) && depth >= 0
        && Number.isFinite(fraction) && fraction >= 0 && fraction <= 1)) fractions.push(records.map(record => record[1]));
  }
  if (!fractions.length) return null;
  const historical = average(grid.metadata.historical_period);
  const historicalYear = hazard === 'river' ? Math.round(historical) : historical;
  const current = fractions.map(values => interpolate(...values, year, historicalYear));
  const baseline = fractions.map(values => interpolate(...values, 2026, historicalYear));
  const changes = current.map((value, index) => value - baseline[index]), change = average(changes);
  return { value: average(current) * 100, baseline: average(baseline) * 100, future: average(fractions.map(values => values[2])) * 100,
    modelCount: fractions.length, p10: hazard === 'river' ? quantile(changes, .1) * 100 : null,
    p90: hazard === 'river' ? quantile(changes, .9) * 100 : null,
    agreement: hazard === 'river' ? changes.filter(value => Math.sign(value) === Math.sign(change)).length / changes.length : null };
}
function compare(actual, expected, context) {
  assert.equal(actual.available, expected !== null, `${context} availability`);
  assert.equal(actual.annualForecast, false);
  assert.equal(actual.baselineYear, 2026);
  if (!expected) {
    for (const field of ['value', 'baseline', 'future', 'change']) assert.equal(actual[field], null);
    return;
  }
  for (const field of ['value', 'baseline', 'future']) close(actual[field], expected[field], `${context} ${field}`);
  close(actual.change, expected.value - expected.baseline, `${context} change`);
  for (const field of ['modelCount', 'agreement', 'p10', 'p90']) {
    if (!(field in expected)) continue;
    if (expected[field] === null) assert.equal(actual[field], null);
    else close(actual[field], expected[field], `${context} ${field}`);
  }
  assert.equal(actual.spatialSupport, 'containing-grid-cell');
}

const result = { date: '2026-10-01', method: 'Independent arithmetic on shipped binary payloads; no scientific validation claimed',
  grids: {}, anchors: [] };
const filters = ['chaleur', 'secheresse', 'stabilite', 'feux', 'mer', 'fleuves'];
for (const filter of filters) {
  const grid = ['mer', 'fleuves'].includes(filter) ? floods[filter === 'mer' ? 'coast' : 'river'] : filter === 'feux' ? fire : climate;
  const summary = { testedCells: grid.metadata.width * grid.metadata.height, available: 0, unavailable: 0,
    zeroLevels: 0, increases: 0, decreases: 0, unchanged: 0 };
  for (let row = 0; row < summary.testedCells; row++) {
    const { latitude, longitude } = coordinate(row, grid), actual = read(filter, 2050, latitude, longitude);
    const expected = ['mer', 'fleuves'].includes(filter)
      ? floodExpected(grid, filter === 'mer' ? 'coast' : 'river', row, 2050)
      : filter === 'feux' ? fireExpected(row, 2050) : climateExpected(row, filter, 2050);
    compare(actual, expected, `${filter} cell ${row}`);
    if (!expected) { summary.unavailable++; continue; }
    summary.available++;
    if (expected.value === 0) summary.zeroLevels++;
    summary[expected.value > expected.baseline ? 'increases' : expected.value < expected.baseline ? 'decreases' : 'unchanged']++;
    assert.equal(actual.resolutionDegrees, filter === 'feux' ? 2.5 : .5);
    if (['mer', 'fleuves'].includes(filter)) { assert.equal(actual.unit, '%'); assert.equal('depth' in actual, false); }
  }
  result.grids[filter] = summary;
  console.log(`${filter}: ${summary.testedCells} cells checked; ${summary.available} available, ${summary.unavailable} missing`);
}

for (const [name, latitude, longitude] of [['Dhaka', 23.81, 90.41], ['Paris', 48.86, 2.35],
  ['HCMC', 10.78, 106.7], ['Port Moresby', -9.44, 147.18], ['Beijing', 39.9, 116.4], ['Pacific', 0, -140]]) {
  const example = { name, latitude, longitude, readings2050: {} };
  for (const filter of filters) {
    const grid = ['mer', 'fleuves'].includes(filter) ? floods[filter === 'mer' ? 'coast' : 'river'] : filter === 'feux' ? fire : climate;
    const row = rowAt(grid, latitude, longitude);
    for (let year = 2026; year <= 2050; year++) {
      const actual = read(filter, year, latitude, longitude);
      const expected = ['mer', 'fleuves'].includes(filter)
        ? floodExpected(grid, filter === 'mer' ? 'coast' : 'river', row, year)
        : filter === 'feux' ? fireExpected(row, year) : climateExpected(row, filter, year);
      compare(actual, expected, `${name} ${filter} ${year}`);
      if (year === 2050) example.readings2050[filter] = actual;
    }
  }
  result.anchors.push(example);
}

for (const filter of [...filters, 'declin']) {
  for (const year of [NaN, 2025, 2051, Infinity]) assert.equal(read(filter, year, 0, 0).available, false);
  for (const [lat, lon] of [[91, 0], [-91, 0], [NaN, 0], [0, Infinity]]) assert.equal(read(filter, 2050, lat, lon).available, false);
  assert.equal(read(filter, 2050, 0, 0, { climate: null, fire: null, floods: null }).available, false);
}
for (const filter of filters) {
  for (const latitude of [-90, -89.75, 0, 89.75, 90]) {
    assert.deepEqual(read(filter, 2050, latitude, 180), read(filter, 2050, latitude, -180));
    assert.deepEqual(read(filter, 2050, latitude, 540), read(filter, 2050, latitude, -180));
  }
}
assert.equal(read('declin', 2050, 0, 0).reason, 'Population requires country-level annual data');
assert.equal(read('unknown', 2050, 0, 0).available, false);

// Real zero, missing data and matched-model subsets must remain distinguishable.
const zeroFire = { metadata: fire.metadata, values: new Float32Array(fire.values.length) };
zeroFire.values.set([0, 0, 0, 0, 0, 0, 1, 1]);
assert.equal(read('feux', 2050, 89, -179, { fire: zeroFire }).available, true);
assert.equal(read('feux', 2050, 89, -179, { fire: zeroFire }).value, 0);
zeroFire.values[1] = NaN;
assert.equal(read('feux', 2050, 89, -179, { fire: zeroFire }).available, false);

const synthetic = { metadata: floods.river.metadata, values: new Float32Array(floods.river.values.length) };
synthetic.values[0] = 1;
assert.equal(read('fleuves', 2050, 89.75, -179.75, { floods: { river: synthetic } }).available, true);
assert.equal(read('fleuves', 2050, 89.75, -179.75, { floods: { river: synthetic } }).value, 0);
const set = (name, value) => { synthetic.values[synthetic.metadata.fields.indexOf(name)] = value; };
set('historical_fraction_gt_0_5m', .4);
const futureFractions = [0, .2, .3, .7, 1];
synthetic.metadata.models.forEach((model, i) => {
  set(`near_model_${model}_fraction_gt_0_5m`, .4);
  set(`model_${model}_fraction_gt_0_5m`, futureFractions[i]);
});
let actual = read('fleuves', 2050, 89.75, -179.75, { floods: { river: synthetic } });
compare(actual, floodExpected(synthetic, 'river', 0, 2050), 'Synthetic fractional model spread');
assert.equal(actual.modelCount, 5); close(actual.agreement, .4);
set(`near_model_${synthetic.metadata.models[4]}_fraction_gt_0_5m`, NaN);
actual = read('fleuves', 2050, 89.75, -179.75, { floods: { river: synthetic } });
compare(actual, floodExpected(synthetic, 'river', 0, 2050), 'Synthetic missing paired model');
assert.equal(actual.modelCount, 4);
synthetic.values[0] = 0;
assert.equal(read('fleuves', 2050, 89.75, -179.75, { floods: { river: synthetic } }).available, false);

const syntheticClimate = { metadata: climate.metadata, values: new Float32Array(climate.values.length), points: new Float32Array() };
syntheticClimate.values.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
for (const filter of ['chaleur', 'secheresse', 'stabilite']) {
  actual = read(filter, 2050, 89.75, -179.75, { climate: syntheticClimate });
  assert.equal(actual.available, true); assert.equal(actual.value, 0);
}
syntheticClimate.values[4] = -10;
assert.equal(read('secheresse', 2026, 89.75, -179.75, { climate: syntheticClimate }).available, false);
syntheticClimate.values[4] = 0; syntheticClimate.values[9] = NaN;
assert.equal(read('secheresse', 2026, 89.75, -179.75, { climate: syntheticClimate }).available, false);

const output = new URL('audit/2026-10-01/map-diagnostic/', root);
await mkdir(output, { recursive: true });
await writeFile(new URL('results.json', output), `${JSON.stringify(result, null, 2)}\n`);
console.log('PASS: all six physical-filter grids, all 25 years at six anchors, units/support, payload hashes, valid zeros, masks, paired fraction spread, poles/dateline and population separation');

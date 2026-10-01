import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createGlobalSummary } from '../../global-summary.mjs';
import { summarizeText, summaryCopy } from '../../global-summary-copy.mjs';

const started = performance.now(), root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const floats = bytes => new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const filters = ['chaleur', 'secheresse', 'feux', 'mer', 'fleuves', 'declin', 'stabilite'];
const years = [2026, 2030, 2050];
let checks = 0;
const close = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`); checks++;
};
const idle = async () => {};

// Hand-derived three-row fixtures: latitude weights 1/2, 1, 1/2.
// Partial native coverage must affect the denominator; zero coverage is absent.
const climateFixture = () => {
  const values = new Float32Array([
    10, 200, 30, 10, 12, 198, 31, 9, 14, 260, 33, 260 / 24,
    20, 300, 20, 10, 24, 340, 24, 10, 28, 342, 28, 9,
    0, 100, 10, 10, 3, 100, 999, 100 / 13, 6, 100, 999, 100 / 16,
  ]);
  const metadata = { abi: 'terra-climate-v2', width: 1, height: 3, fields: Array(12).fill('fixture') };
  const coverage = new Uint8Array(36);
  coverage.fill(1, 0, 12); coverage.fill(4, 12, 24);
  return { climate: { metadata, values }, climateCoverage: coverage };
};
const fireFixture = () => ({ metadata: { schema: 2, width: 1, height: 3,
  fields: ['historical', 'near', 'future', 'pairedChangeMean', 'pairedChangeP10', 'pairedChangeP90', 'signAgreement', 'burnableFraction'],
  historicalPeriod: [1995, 2014], thresholdReference: '1850–1899', modelCount: 21 },
values: new Float32Array([20, 30, 40, 10, 10, 10, 1, .5, 40, 20, 10, -10, -10, -10, 1, 1,
  0, 100, 300, 0, 0, 0, 0, 0]) });
const floodFixture = hazard => {
  const fields = hazard === 'coast'
    ? ['coverage', 'historical_mean_depth_m', 'historical_fraction_gt_0_5m',
      'near_mean_depth_m', 'near_fraction_gt_0_5m', 'future_mean_depth_m', 'future_fraction_gt_0_5m']
    : ['coverage', 'historical_mean_depth_m', 'historical_fraction_gt_0_5m',
      ...['near_model_A', 'model_A', 'near_model_B', 'model_B'].flatMap(prefix => [prefix + '_mean_depth_m', prefix + '_fraction_gt_0_5m'])];
  const values = new Float32Array(fields.length * 3);
  for (let cell = 0; cell < 3; cell++) {
    const record = { coverage: [.2, .8, 0][cell], historical_mean_depth_m: 1,
      historical_fraction_gt_0_5m: [.1, .5, 0][cell], near_mean_depth_m: 1,
      near_fraction_gt_0_5m: [.2, .5, 1][cell], future_mean_depth_m: 1,
      future_fraction_gt_0_5m: [.3, .3, 1][cell],
      near_model_A_mean_depth_m: 1, near_model_A_fraction_gt_0_5m: [.2, .5, 1][cell],
      model_A_mean_depth_m: 1, model_A_fraction_gt_0_5m: [.3, .3, 1][cell],
      near_model_B_mean_depth_m: cell === 0 ? NaN : 1, near_model_B_fraction_gt_0_5m: .9,
      model_B_mean_depth_m: 1, model_B_fraction_gt_0_5m: .7 };
    fields.forEach((field, i) => { values[cell * fields.length + i] = record[field]; });
  }
  return { metadata: { abi: 'terra-floods/2', width: 1, height: 3, fields,
    historical_period: hazard === 'river' ? [1960, 1999] : [1979, 2014],
    near_epoch: 2030, future_epoch: 2050, scenario: 'rcp8p5', models: hazard === 'river' ? ['A', 'B'] : [] }, values };
};
const fixtureInput = { ...climateFixture(), fire: fireFixture(),
  floods: { coast: floodFixture('coast'), river: floodFixture('river') },
  population: { AA: Array.from({ length: 26 }, (_, i) => 100 + i), BB: Array(26).fill(0) },
  populationAreaCount: 2, chunkSize: 2 };
let pauses = 0;
const fixture = await createGlobalSummary({ ...fixtureInput, yieldTask: async () => { pauses++; } });
assert.equal(pauses, 4, 'Yield once per complete chunk, not once per cell'); checks++;
close(fixture.reading('chaleur', 2030).value, (1 * .5 + 4 * 4) / 4.5);
close(fixture.reading('chaleur', 2050).value, (3 * .5 + 8 * 4) / 4.5);
close(fixture.reading('chaleur', 2026).value, (1 * .5 + 4 * 4) / 4.5 * 41 / 45);
close(fixture.reading('stabilite', 2030).value, (2 * .5 + 4 * 4) / 4.5);
close(fixture.reading('secheresse', 2030).value, .5 / 4.5 * 100);
close(fixture.reading('secheresse', 2050).value, 4 / 4.5 * 100);
close(fixture.reading('feux', 2026).value, -14);
close(fixture.reading('feux', 2050).value, -20);
// Native source fractions are Float32; use a tolerance reflecting the input.
close(fixture.reading('mer', 2030).value, .01 / .9 * 100, 2e-6);
close(fixture.reading('mer', 2050).value, (.02 - .16) / .9 * 100, 2e-6);
close(fixture.reading('fleuves', 2030).value, (.01 + .16) / .9 * 100, 2e-6);
close(fixture.reading('fleuves', 2050).value, .02 / .9 * 100, 2e-6);
assert.deepEqual(fixture.reading('fleuves', 2050).modelCountRange, [1, 2]); checks++;
assert.equal(fixture.reading('fleuves', 2026).referenceAnchorYear, 1980); checks++;
assert.equal(fixture.reading('mer', 2026).referenceAnchorYear, 1996.5); checks++;
close(fixture.reading('declin', 2050).value, 125);
assert.equal(fixture.reading('declin', 2050).officialWorldAggregateCrossChecked, false); checks++;
assert.strictEqual(fixture.reading('chaleur', 2050), fixture.reading('chaleur', 2050)); checks++;
fixtureInput.climate.values.fill(999);
close(fixture.reading('chaleur', 2030).value, (1 * .5 + 4 * 4) / 4.5);
assert.ok(Object.isFrozen(fixture.reading('chaleur', 2030).referencePeriod)); checks++;
for (const year of [2025, 2051, 2030.5, NaN]) assert.equal(fixture.reading('chaleur', year).available, false);
assert.equal(fixture.reading('unknown', 2030).available, false); checks += 5;

// True zero, cooling and missing support are distinct, including valid zero
// rainfall/flood fractions and the undefined cold-domain aridity denominator.
const zeroInput = climateFixture();
zeroInput.climate.values.set(Array(3).fill([10, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0]).flat());
const zeros = await createGlobalSummary({ ...zeroInput, fire: { ...fireFixture(), values: new Float32Array(24).fill(0).map((n, i) => i % 8 === 7 ? 1 : n) },
  floods: { coast: { ...floodFixture('coast'), values: new Float32Array(21).map((n, i) => i % 7 === 0 ? 1 : 0) } }, yieldTask: idle });
for (const filter of ['chaleur', 'stabilite', 'secheresse', 'feux', 'mer']) {
  assert.equal(zeros.reading(filter, 2050).available, true); close(zeros.reading(filter, 2050).value, 0);
}
const negativeInput = climateFixture();
for (let offset = 0; offset < 36; offset += 12) negativeInput.climate.values.set([10, 100, 30, 5, 9, 100, 29, 100 / 19, 8, 100, 28, 100 / 18], offset);
const negative = await createGlobalSummary({ ...negativeInput, yieldTask: idle });
close(negative.reading('chaleur', 2050).value, -2);
close(negative.reading('stabilite', 2050).value, -2);
const coldInput = climateFixture();
for (let offset = 0; offset < 36; offset += 12) coldInput.climate.values[offset] = -10;
const cold = await createGlobalSummary({ ...coldInput, yieldTask: idle });
assert.equal(cold.reading('secheresse', 2050).available, false); checks++;
assert.equal(cold.reading('chaleur', 2050).available, true); checks++;
const unsupported = await createGlobalSummary({ ...climateFixture(), climateCoverage: new Uint8Array(36), yieldTask: idle });
assert.equal(unsupported.reading('chaleur', 2050).available, false); checks++;
const invalidCoverage = await createGlobalSummary({ ...climateFixture(), climateCoverage: new Uint8Array(36).fill(10), yieldTask: idle });
assert.equal(invalidCoverage.reading('chaleur', 2050).available, false); checks++;
for (const population of [{ AA: Array(26).fill(1) }, { AA: Array(26).fill(1), BB: Array(26).fill(-1) },
  { AA: Array(26).fill(1), BB: Array(26).fill(1.5) }, { AA: Array(26).fill(1), WORLD: Array(26).fill(1) }]) {
  const data = await createGlobalSummary({ population, populationAreaCount: 2, yieldTask: idle });
  assert.equal(data.reading('declin', 2050).available, false); checks++;
}

// Independent reductions over the shipped rasters use explicit cell-level
// interpolation, rather than the module's mean-anchor shortcut.
const climateMeta = await json('data/climate-manifest.json');
const climate = { metadata: climateMeta, values: floats(gunzipSync(await read('data/climate-grid.bin'))) };
const climateCoverage = new Uint8Array(gunzipSync(await read('data/climate-coverage.bin')));
const fire = { metadata: await json('data/fire-weather.json'), values: floats(await read('data/fire-weather.bin')) };
const floodMeta = await json('data/flood-metadata.json');
const floods = {};
for (const hazard of ['coast', 'river']) {
  const descriptor = floodMeta.hazards[hazard];
  floods[hazard] = { metadata: { ...floodMeta, ...descriptor }, values: floats(gunzipSync(await read(`data/${descriptor.file}`))) };
}
const population = await json('data/population-annual.json');
const constructionStarted = performance.now();
let realPauses = 0;
const real = await createGlobalSummary({ climate, climateCoverage, fire, floods, population,
  yieldTask: async () => { realPauses++; } });
const constructionMs = performance.now() - constructionStarted;
const latitudeWeight = (row, height) => Math.sin((row + .5) * Math.PI / height);
const average = records => records.reduce((sum, [value, weight]) => sum + value * weight, 0)
  / records.reduce((sum, [, weight]) => sum + weight, 0);
const interpolation = (h, n, f, year, reference) => year <= 2030
  ? h * (2030 - year) / (2030 - reference) + n * (year - reference) / (2030 - reference)
  : n * (2050 - year) / 20 + f * (year - 2030) / 20;
for (const year of years) {
  const expected = { chaleur: [], stabilite: [], secheresse: [] };
  for (let row = 0; row < climateMeta.height; row++) for (let col = 0; col < climateMeta.width; col++) {
    const offset = (row * climateMeta.width + col) * 12, weight = latitudeWeight(row, climateMeta.height);
    for (const [filter, field] of [['chaleur', 2], ['stabilite', 0]]) {
      const h = climate.values[offset + field], n = climate.values[offset + field + 4], f = climate.values[offset + field + 8];
      const covered = Math.min(climateCoverage[offset + field], climateCoverage[offset + field + 4], climateCoverage[offset + field + 8]);
      if (covered && [h, n, f].every(Number.isFinite)) expected[filter].push([interpolation(h, n, f, year, 1985) - h, weight * covered / 9]);
    }
    const hT = climate.values[offset], nT = climate.values[offset + 4], fT = climate.values[offset + 8];
    const hP = climate.values[offset + 1], nP = climate.values[offset + 5], fP = climate.values[offset + 9];
    const covered = Math.min(...[0, 1, 3, 4, 5, 7, 8, 9, 11].map(field => climateCoverage[offset + field]));
    if (covered && [hT, nT, fT].every(t => Number.isFinite(t) && t > -10)
        && [hP, nP, fP].every(p => Number.isFinite(p) && p >= 0)) {
      const reference = hP / (hT + 10);
      const index = interpolation(hP, nP, fP, year, 1985) / (interpolation(hT, nT, fT, year, 1985) + 10);
      const drier = index < reference - 1e-6 * Math.max(1, Math.abs(reference), Math.abs(index));
      expected.secheresse.push([drier ? 100 : 0, weight * covered / 9]);
    }
  }
  for (const filter of ['chaleur', 'stabilite', 'secheresse']) close(real.reading(filter, year).value, average(expected[filter]), 2e-10);
  const fireRecords = [];
  for (let row = 0; row < fire.metadata.height; row++) for (let col = 0; col < fire.metadata.width; col++) {
    const offset = (row * fire.metadata.width + col) * 8;
    const [h, n, f] = fire.values.slice(offset, offset + 3), burnable = fire.values[offset + 7];
    if ([h, n, f].every(n => Number.isFinite(n) && n >= 0 && n <= 366) && burnable > 0 && burnable <= 1) {
      const current = n * (2050 - year) / 24 + f * (year - 2026) / 24;
      fireRecords.push([current - h, latitudeWeight(row, fire.metadata.height) * burnable]);
    }
  }
  close(real.reading('feux', year).value, average(fireRecords), 2e-10);
  for (const [filter, hazard] of [['mer', 'coast'], ['fleuves', 'river']]) {
    const grid = floods[hazard], records = [], fields = grid.metadata.fields;
    const get = (offset, field) => grid.values[offset + fields.indexOf(field)];
    const models = hazard === 'river' ? grid.metadata.models : ['coast'];
    for (let row = 0; row < grid.metadata.height; row++) for (let col = 0; col < grid.metadata.width; col++) {
      const offset = (row * grid.metadata.width + col) * fields.length, coverage = get(offset, 'coverage');
      if (!(coverage > 0 && coverage <= 1)) continue;
      const deltas = [];
      for (const model of models) {
        const prefixes = hazard === 'river' ? ['historical', 'near_model_' + model, 'model_' + model] : ['historical', 'near', 'future'];
        const depths = prefixes.map(prefix => get(offset, prefix + '_mean_depth_m'));
        const fractions = prefixes.map(prefix => get(offset, prefix + '_fraction_gt_0_5m'));
        if (depths.every(d => Number.isFinite(d) && d >= 0) && fractions.every(f => Number.isFinite(f) && f >= 0 && f <= 1)) {
          deltas.push((interpolation(...fractions, year, hazard === 'river' ? 1980 : 1996.5) - fractions[0]) * 100);
        }
      }
      if (deltas.length) records.push([deltas.reduce((sum, n) => sum + n, 0) / deltas.length,
        latitudeWeight(row, grid.metadata.height) * coverage]);
    }
    close(real.reading(filter, year).value, average(records), 2e-10);
  }
}
const populationTotals = { 2026: 8299527483, 2030: 8567893067, 2050: 9662753839 };
for (const [year, total] of Object.entries(populationTotals)) {
  assert.equal(real.reading('declin', +year).value, total); checks++;
  assert.equal(real.reading('declin', +year).referenceValue, 8230483094); checks++;
}
for (const filter of filters) for (let year = 2026; year <= 2050; year++) {
  const reading = real.reading(filter, year);
  assert.equal(reading.available, true); assert.ok(Number.isFinite(reading.value));
  assert.strictEqual(real.reading(filter, year), reading); checks += 3;
  if (filter !== 'declin') {
    assert.equal(reading.observedAnnualChange, false); assert.ok(reading.support.approximateEarthAreaFraction > 0);
    assert.ok(reading.support.approximateEarthAreaFraction <= 1); checks += 3;
  }
}

// Copy preserves real signs, units, independent historical periods, scenario,
// missing summaries and East Asian population counters in all eight locales.
assert.equal(summaryCopy.en.aridity, '{n}% of covered land becomes drier');
assert.equal(summaryCopy.fr.aridity, '{n} % des terres avec données deviennent plus sèches');
let copyChecks = 0;
for (const locale of Object.keys(summaryCopy)) for (const filter of filters) for (const year of [2026, 2050]) {
  const reading = real.reading(filter, year), text = summarizeText(filter, reading, locale, year);
  assert.ok(text.headline.length && text.detail.includes(String(year)));
  assert.ok(!/[{}]|undefined|NaN/.test(text.headline + text.detail));
  if (filter === 'declin') {
    assert.ok(text.detail.includes('237')); assert.ok(!text.detail.includes('SSP'));
    if (['ja', 'zh', 'zh-Hant'].includes(locale)) assert.ok(/亿|億/.test(text.headline));
  } else {
    assert.ok(text.detail.includes(reading.referencePeriod.join('–'))); assert.ok(text.detail.includes(reading.scenario));
    if (filter === 'chaleur') assert.ok(text.detail.includes(summaryCopy[locale].heatDefinition));
    if (filter === 'secheresse') assert.ok(text.detail.includes(summaryCopy[locale].aridityDefinition));
    if (filter === 'feux') assert.ok(text.detail.includes('1850'));
    if (['mer', 'fleuves'].includes(filter)) assert.ok(text.detail.includes(summaryCopy[locale].percentagePoints));
  }
  copyChecks++;
}
for (const locale of Object.keys(summaryCopy)) {
  const reading = { ...real.reading('chaleur', 2050) };
  for (const value of [0, -.25, .0001, -.0001]) {
    const text = summarizeText('chaleur', { ...reading, value }, locale, 2050);
    assert.ok(text.headline.includes('°C'));
    if (value < 0) assert.ok(text.headline.includes('−'));
    if (Math.abs(value) === .0001) assert.ok(text.headline.includes('Δ'));
    copyChecks++;
  }
  assert.equal(summarizeText('chaleur', { available: false }, locale, 2050).headline, ''); copyChecks++;
}
assert.deepEqual(summarizeText('chaleur', real.reading('chaleur', 2050), 'unknown', 2050),
  summarizeText('chaleur', real.reading('chaleur', 2050), 'en', 2050)); copyChecks++;

const output = process.env.QA_SORTIE || '/tmp/terra-global-summary';
await mkdir(output, { recursive: true });
const snapshots = Object.fromEntries(filters.map(filter => [filter, Object.fromEntries(years.map(year => [year,
  { ...real.reading(filter, year), text: { en: summarizeText(filter, real.reading(filter, year), 'en', year),
    fr: summarizeText(filter, real.reading(filter, year), 'fr', year) } }]))]));
await writeFile(output + '/numeric-summary.json', JSON.stringify({ status: 'PASS', checks, copyChecks,
  constructionMs: Math.round(constructionMs), constructionYields: realPauses,
  durationMs: Math.round(performance.now() - started), snapshots }, null, 2));
console.log(JSON.stringify({ status: 'PASS', checks, copyChecks, constructionMs: Math.round(constructionMs),
  constructionYields: realPauses, durationMs: Math.round(performance.now() - started), output }, null, 2));

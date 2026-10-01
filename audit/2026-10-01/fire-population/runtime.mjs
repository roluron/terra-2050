import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sampleGrid, fireAtYear } from '../../../climate-data.mjs';
import { populationHover, physicalHover } from '../../../hover-diagnostic.mjs';

const root = new URL('../../../', import.meta.url);
const metadata = JSON.parse(fs.readFileSync(new URL('data/fire-weather.json', root)));
const bytes = fs.readFileSync(new URL('data/fire-weather.bin', root));
const values = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const grid = { metadata, values };
let cells = 0, validYears = 0, missingYears = 0;
for (let row = 0; row < 72; row++) for (let col = 0; col < 144; col++) {
  const lat = 88.75 - 2.5 * row, lon = -178.75 + 2.5 * col;
  const sample = sampleGrid(grid, lat, lon), offset = (row * 144 + col) * 8;
  for (let field = 0; field < 8; field++) assert.ok(Object.is(sample[metadata.fields[field]], values[offset + field]));
  cells++;
  for (let year = 2026; year <= 2050; year++) {
    const reading = fireAtYear(grid, lat, lon, year);
    if (!Number.isFinite(sample.near)) { assert.equal(reading, null); missingYears++; continue; }
    const fraction = (year - 2026) / 24;
    assert.equal(reading.value, sample.near + (sample.future - sample.near) * fraction);
    assert.equal(reading.change, sample.pairedChangeMean * fraction);
    assert.equal(reading.changeP10, sample.pairedChangeP10 * fraction);
    assert.equal(reading.changeP90, sample.pairedChangeP90 * fraction);
    assert.ok(Math.abs(reading.change - (reading.value - sample.near)) < 1e-4);
    validYears++;
  }
}
const annual = JSON.parse(fs.readFileSync(new URL('data/population-annual.json', root)));
let populationCases = 0;
for (const series of Object.values(annual)) for (let year = 2026; year <= 2050; year++) for (const changing of [false, true]) {
  const referenceIndex = changing ? 1 : 0;
  const diagnostic = populationHover(series, year, changing, 'en');
  assert.ok(diagnostic);
  const displayed = Number(diagnostic.value.replace(/−/g, '-').replace(/[^0-9.+-]/g, ''));
  const expected = (series[year - 2025] / series[referenceIndex] - 1) * 100;
  assert.ok(Math.abs(displayed - expected) <= .05000001);
  assert.ok(diagnostic.detail.endsWith(`${changing ? 2026 : 2025} → ${year}`));
  populationCases++;
}
assert.equal(populationHover(null, 2050, true, 'en'), null);
assert.equal(physicalHover({ available: false, value: 0, baseline: 0 }, 2050, true, 'en', 'days/year'), null);
const report = { pass: true, cells, validYears, missingYears, populationCases,
  scope: 'Exhaustive shipped fire-grid indexing and all 25 displayed years, plus population formatting in both existing reference modes; not source reconstruction or scientific validation.' };
fs.writeFileSync(new URL('runtime-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));

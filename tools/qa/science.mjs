import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleGrid, fireAtYear } from '../../climate-data.mjs';

const metadata = JSON.parse(await readFile(new URL('../../data/fire-weather.json', import.meta.url)));
const bytes = await readFile(new URL('../../data/fire-weather.bin', import.meta.url));
const values = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const grid = { metadata, values };
const paris = sampleGrid(grid, 48.85, 2.35);
assert.ok(Math.abs(paris.near - 27.77857142857143) < .001);
assert.ok(Math.abs(paris.future - 36.371428571428574) < .001);
const burkina = sampleGrid(grid, 12.37, -1.52);
assert.ok(burkina.pairedChangeP10 < 0 && burkina.pairedChangeP90 > 0);
assert.ok(Number.isNaN(sampleGrid(grid, 25, 10).near));
assert.equal(sampleGrid(grid, NaN, 0), null);
assert.equal(sampleGrid(grid, 91, 0), null);
assert.deepEqual(sampleGrid(grid, -33.87, 151.21), sampleGrid(grid, -33.87, -208.79));
assert.deepEqual(sampleGrid(grid, 0, -180), sampleGrid(grid, 0, 180));
assert.ok(sampleGrid(grid, -90, 0));
for (const year of [2026, 2032, 2038, 2044, 2050]) {
  const sample = fireAtYear(grid, 48.85, 2.35, year);
  assert.ok(Math.abs(sample.value - (27.77857142857143 + 8.592857142857142 * (year - 2026) / 24)) < .001);
  assert.ok(Math.abs(sample.change - (sample.value - sample.near)) < .001);
}
assert.equal(fireAtYear(grid, 25, 10, 2050), null);
assert.equal(fireAtYear(grid, 0, 0, NaN), null);
for (let row = 0; row < 72; row++) for (let col = 0; col < 144; col++) {
  const sample = fireAtYear(grid, 88.75 - row * 2.5, -178.75 + col * 2.5, 2050);
  if (sample) assert.ok(Math.abs(sample.change - (sample.future - sample.near)) < .0001);
}
console.log('PASS: fire-weather source samples, uncertainty, masked desert, longitude wrapping and pole bounds');

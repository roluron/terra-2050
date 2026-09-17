import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { loadScientificMetrics } from '../../science-metrics.mjs';
import { climateAtYear, loadFloodHazards } from '../../climate-data.mjs';
import { floodCityAtYear, floodAtYear } from '../../flood-data.mjs';

const root = new URL('../../', import.meta.url);
globalThis.fetch = async path => new Response(await fs.readFile(new URL(path, root)));
const data = await loadScientificMetrics(), regional = await loadFloodHazards();
const places = JSON.parse(await fs.readFile(new URL('data/places.json', root))).villes;
const coordinates = await fs.readFile(new URL('data/places.bin', root));
const axes = ['thermique', 'eau', 'feux', 'mer', 'fleuves', 'stabilite'];
const climateKeys = { thermique: 'summerMaximum', eau: 'aridity', stabilite: 'warming' };
const counts = Object.fromEntries(axes.map(axis => [axis, { native: 0, regional: 0, unavailable: 0 }]));
let nativeComplete = 0, complete = 0, any = 0;
const examples = {};
for (let index = 0; index < places.length; index++) {
  const lat = coordinates.readInt16LE(index * 24) / 100, lon = coordinates.readInt16LE(index * 24 + 2) / 100;
  const base = data.forCity(index, lat, lon, 2026), future = data.forCity(index, lat, lon, 2050);
  nativeComplete += axes.every(axis => base[axis].nativeAvailable);
  complete += axes.every(axis => base[axis].available);
  any += axes.some(axis => base[axis].available);
  for (const axis of axes) {
    const reading = base[axis], target = future[axis];
    assert.equal(reading.available, target.available);
    assert.equal(reading.regionalFallback, target.regionalFallback);
    counts[axis][reading.nativeAvailable ? 'native' : reading.regionalFallback ? 'regional' : 'unavailable']++;
    if (reading.available) {
      assert.equal(reading.change, 0);
      assert.equal(reading.value, target.baseline);
      assert.equal(reading.future, target.value);
    }
    if (reading.regionalFallback) {
      assert.equal(reading.nativeAvailable, false);
      assert.ok(reading.nativeUnavailableReason);
      assert.equal(reading.spatialSupport, 'containing-regional-grid-cell');
      assert.equal(reading.resolutionDegrees, 0.5);
      assert.equal(reading.source.fallbackMethod, 'containing-cell-only-no-neighbour-search');
    }
    if (axis in climateKeys) {
      const native = climateAtYear(data.climate, lat, lon, 2050, index)[climateKeys[axis]];
      const grid = climateAtYear(data.climate, lat, lon, 2050)[climateKeys[axis]];
      if (reading.nativeAvailable) assert.equal(target.value, native);
      if (reading.regionalFallback) assert.equal(target.value, grid);
    }
    if (axis === 'mer' || axis === 'fleuves') {
      const hazard = axis === 'mer' ? 'coast' : 'river';
      const native = floodCityAtYear(data.floods, index, 2050, hazard);
      assert.equal(reading.nativeAvailable, native.available);
      if (native.available) { assert.equal(target.value, native.value); assert.equal(reading.regionalFallback, false); }
      else if (reading.regionalFallback) assert.equal(target.value, floodAtYear(regional, lat, lon, 2050, hazard).value);
    }
  }
  if (['New York', 'Mumbai', 'Ho Chi Minh City'].includes(places[index][4])) examples[places[index][4]] = Object.fromEntries(axes.map(axis => [axis,
    { value: base[axis].value, future: future[axis].value, nativeAvailable: base[axis].nativeAvailable,
      regionalFallback: base[axis].regionalFallback, spatialSupport: base[axis].spatialSupport }]));
}
assert.equal(nativeComplete, 28343);
assert.equal(complete, data.availability.allSix);
assert.ok(complete > nativeComplete);
assert.equal(examples['New York'].fleuves.regionalFallback, true);
assert.equal(examples.Mumbai.thermique.regionalFallback, true);
assert.equal(examples['Ho Chi Minh City'].mer.nativeAvailable, true);
assert.equal(examples['Ho Chi Minh City'].mer.value, 0);
assert.equal(examples['Ho Chi Minh City'].mer.regionalFallback, false);
console.log(JSON.stringify({ status: 'PASS', count: places.length, nativeComplete, complete, any, counts, examples }, null, 2));

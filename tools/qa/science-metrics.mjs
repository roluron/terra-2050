import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { loadScientificMetrics } from '../../science-metrics.mjs';

const root = new URL('../../', import.meta.url);
let corruptPlaces = false;
globalThis.fetch = async path => {
  const bytes = await fs.readFile(new URL(path, root));
  return new Response(corruptPlaces && path === './data/places.json' ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes);
};
const started = performance.now();
const data = await loadScientificMetrics();
const places = JSON.parse(await fs.readFile(new URL('data/places.json', root))).villes;
const coords = await fs.readFile(new URL('data/places.bin', root));
const native = gunzipSync(await fs.readFile(new URL('data/climate-points.bin', root)));
const axes = ['thermique', 'eau', 'feux', 'mer', 'fleuves', 'stabilite'];
const counts = Object.fromEntries(axes.map(axis => [axis, 0]));
let allSix = 0, zeroFloods = 0;
for (let index = 0; index < places.length; index++) {
  const lat = coords.readInt16LE(index * 24) / 100, lon = coords.readInt16LE(index * 24 + 2) / 100;
  const baseline = data.forCity(index, lat, lon, 2026), future = data.forCity(index, lat, lon, 2050);
  let complete = true;
  for (const axis of axes) {
    const a = baseline[axis], b = future[axis];
    assert.equal(a.available, b.available, `${index} ${axis} endpoint availability`);
    if (a.available) {
      counts[axis]++;
      assert.equal(a.change, 0);
      assert.equal(a.value, b.baseline);
      assert.equal(a.future, b.value);
      assert.ok(Math.abs((b.value - b.baseline) - b.change) < 1e-4);
      if ((axis === 'mer' || axis === 'fleuves') && a.value === 0) zeroFloods++;
    } else complete = false;
  }
  if (complete) allSix++;
  const hottest = native.readFloatLE((index * 12 + 10) * 4);
  assert.equal(future.thermique.value, Number.isFinite(hottest) ? hottest : null);
}
assert.deepEqual(counts, data.availability.perAxis);
assert.equal(allSix, data.availability.allSix);
assert.ok(zeroFloods > 0, 'Valid zero depth must not become unavailable');
for (const args of [[-1, 0, 0, 2026], [0, 0, 0, 2026], [0, NaN, 0, 2026], [0, 0, 0, 2051]]) {
  const result = data.forCity(...args);
  assert.ok(axes.every(axis => result[axis].available === false && result[axis].value === null));
}
const i = places.findIndex(place => place[4] === 'Paris');
assert.ok(i >= 0);
const lat = coords.readInt16LE(i * 24) / 100, lon = coords.readInt16LE(i * 24 + 2) / 100;
const mid = data.forCity(i, lat, lon, 2038);
assert.ok(Math.abs(mid.feux.change - data.forCity(i, lat, lon, 2050).feux.change / 2) < 1e-6);
assert.equal(mid.feux.source.biasCorrection, false);
assert.equal(mid.eau.source.periods[0].id, '1970-2000');
assert.equal(mid.mer.source.scenario, 'rcp8p5');
assert.ok(Math.abs(mid.eau.value - (data.climate.points[i * 12 + 5] * .6 + data.climate.points[i * 12 + 9] * .4)
  / (data.climate.points[i * 12 + 4] * .6 + data.climate.points[i * 12 + 8] * .4 + 10)) < 1e-5);
corruptPlaces = true;
await assert.rejects(loadScientificMetrics(), /hash mismatch/);
console.log(JSON.stringify({ status: 'PASS', availability: data.availability, zeroFloods,
  durationMs: Math.round(performance.now() - started), test: fileURLToPath(import.meta.url) }, null, 2));

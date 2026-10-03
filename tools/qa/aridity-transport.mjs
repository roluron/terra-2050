import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import * as THREE from '../../assets/lib/three.module.min.js';
import { buildScientificTextures } from '../../science-textures.mjs';

const root = new URL('../../', import.meta.url);
const file = path => readFile(new URL(path, root));
const decode = bytes => {
  const raw = gunzipSync(bytes);
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
};
const cm = JSON.parse(await file('data/climate-manifest.json'));
const climate = { metadata: { ...cm, fields: ['historical', 'near', 'future'].flatMap(period =>
  ['temperature', 'precipitation', 'summerMaximum', 'aridity'].map(key => `${period}_${key}`)) },
  values: decode(await file('data/climate-grid.bin')) };
const fm = JSON.parse(await file('data/flood-metadata.json'));
const floods = Object.fromEntries(await Promise.all(['coast', 'river'].map(async hazard => [hazard,
  { metadata: { ...fm, ...fm.hazards[hazard] }, values: decode(await file(`data/flood-${hazard}.bin`)) }])));
const textures = await buildScientificTextures(THREE, climate, floods);
assert.deepEqual(Object.keys(textures), ['heat', 'aridity', 'warming', 'coast', 'river', 'aridityTemperature', 'aridityPrecipitation']);
assert.equal(textures.heat.userData.scientific.stats.bytes, 20736000);
const temps = textures.aridityTemperature, rain = textures.aridityPrecipitation;
for (const texture of [temps, rain]) {
  assert.equal(texture.type, THREE.FloatType);
  assert.equal(texture.minFilter, THREE.NearestFilter);
  assert.equal(texture.magFilter, THREE.NearestFilter);
  assert.equal(texture.flipY, false);
  assert.equal(texture.wrapS, THREE.RepeatWrapping);
  assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping);
  assert.equal(texture.colorSpace, THREE.NoColorSpace);
  assert.equal(texture.userData.scientific.rowOrder, 'south-first');
  assert.deepEqual(texture.userData.scientific.years, [2026, 2030, 2050]);
  assert.equal(texture.userData.scientific.displayCap, null);
  assert.match(texture.userData.scientific.derive, /do not interpolate the ratio/);
}
assert.equal(temps.userData.scientific.pairedWith, 'aridityPrecipitation');
assert.equal(rain.userData.scientific.pairedWith, 'aridityTemperature');
assert.equal(temps.userData.scientific.unit, 'degC');
assert.equal(rain.userData.scientific.unit, 'mm/year');
let cells = 0, oldMaskDifferences = 0;
for (let r = 0; r < 360; r++) for (let col = 0; col < 720; col++) {
  const input = (r * 720 + col) * 12;
  const output = ((359 - r) * 720 + col) * 4;
  const raw = climate.values;
  const expectedT = [Math.fround(raw[input] + (raw[input + 4] - raw[input]) * 41 / 45), raw[input + 4], raw[input + 8]];
  const expectedP = [Math.fround(raw[input + 1] + (raw[input + 5] - raw[input + 1]) * 41 / 45), raw[input + 5], raw[input + 9]];
  const valid = expectedT.every(t => Number.isFinite(t) && t > -10) && expectedP.every(p => Number.isFinite(p) && p >= 0);
  assert.equal(temps.image.data[output + 3], Number(valid), `temperature mask ${r},${col}`);
  assert.equal(rain.image.data[output + 3], Number(valid), `precipitation mask ${r},${col}`);
  if (!valid) {
    assert.deepEqual(Array.from(temps.image.data.subarray(output, output + 4)), [0, 0, 0, 0]);
    assert.deepEqual(Array.from(rain.image.data.subarray(output, output + 4)), [0, 0, 0, 0]);
    continue;
  }
  cells++;
  if (!textures.aridity.image.data[output + 3]) oldMaskDifferences++;
  assert.deepEqual(Array.from(temps.image.data.subarray(output, output + 3)), expectedT, `temperature epochs ${r},${col}`);
  assert.deepEqual(Array.from(rain.image.data.subarray(output, output + 3)), expectedP, `precipitation epochs ${r},${col}`);
  // At 2040 the inputs must be interpolated before division. This checks the
  // full delivered grid independently of climateAtYear and the legacy index.
  const t2040 = (raw[input + 4] + raw[input + 8]) / 2;
  const p2040 = (raw[input + 5] + raw[input + 9]) / 2;
  const decodedT = (temps.image.data[output + 1] + temps.image.data[output + 2]) / 2;
  const decodedP = (rain.image.data[output + 1] + rain.image.data[output + 2]) / 2;
  assert.equal(decodedP / (decodedT + 10), p2040 / (t2040 + 10));
}
assert.equal(temps.userData.scientific.validCells, cells);
assert.equal(rain.userData.scientific.validCells, cells);
assert.ok(cells > 50000);

// Synthetic domain boundaries, valid zeros and one-period missing inputs.
const altered = { ...climate, values: climate.values.slice() };
const samples = [
  [-9.9999, 100, -9.99, 100, -9.98, 100],
  [-10, 100, -10, 100, -9, 100],
  [10, 0, 12, 0, 14, 0],
  [10, 100, NaN, 100, 14, 100],
  [10, 100, 12, 100, 14, NaN],
  [10, 100, 12, -1, 14, 100],
  // Quantization onto -10 must be masked, never a valid singular ratio.
  [Math.fround(-10.00001), 100, Math.fround(-9.999999), 100, -9.99, 100],
];
for (const [i, [th, ph, tn, pn, tf, pf]] of samples.entries()) {
  altered.values.set([th, ph, 20, NaN, tn, pn, 22, NaN, tf, pf, 24, NaN], i * 12);
}
const synthetic = await buildScientificTextures(THREE, altered, floods, true);
assert.equal(synthetic.aridityTemperature.minFilter, THREE.LinearFilter);
assert.equal(synthetic.aridityPrecipitation.magFilter, THREE.LinearFilter);
for (let i = 0; i < samples.length; i++) {
  const offset = (359 * 720 + i) * 4;
  const expected = [0, 2].includes(i);
  assert.equal(synthetic.aridityTemperature.image.data[offset + 3], Number(expected), `synthetic ${i}`);
  assert.equal(synthetic.aridityPrecipitation.image.data[offset + 3], Number(expected), `synthetic rain ${i}`);
}
const offset = 359 * 720 * 4;
const tMid = (synthetic.aridityTemperature.image.data[offset + 1] + synthetic.aridityTemperature.image.data[offset + 2]) / 2;
const pMid = (synthetic.aridityPrecipitation.image.data[offset + 1] + synthetic.aridityPrecipitation.image.data[offset + 2]) / 2;
const ratioAfter = pMid / (tMid + 10);
const oldInterpolated = (synthetic.aridity.image.data[offset + 1] + synthetic.aridity.image.data[offset + 2]) / 2;
assert.ok(Number.isFinite(ratioAfter));
assert.ok(Math.abs(oldInterpolated - ratioAfter) > 500, 'Regression witness must distinguish the two methods near -10 C');
console.log(JSON.stringify({ status: 'PASS', cellsChecked: 259200, validPairedCells: cells,
  oldMaskDifferences, texturesBytes: textures.heat.userData.scientific.stats.bytes,
  checks: ['all seven textures', 'all anchor values and masks', 'all grid cells at 2040',
    'north/south row mapping', 'Float32 domain near -10C', 'valid precipitation zero',
    'missing and negative precipitation', 'linear-float capability', 'nonlinear interpolation regression'],
  nearMinus10Regression: { ratioAfterInterpolation: ratioAfter, legacyRatioInterpolation: oldInterpolated } }, null, 2));
for (const texture of [...Object.values(textures), ...Object.values(synthetic)]) texture.dispose();

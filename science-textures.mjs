const WIDTH = 720, HEIGHT = 360, YEARS = [2026, 2030, 2050];

function fields(grid, required) {
  if (!grid || grid.metadata?.width !== WIDTH || grid.metadata?.height !== HEIGHT
      || !(grid.values instanceof Float32Array) || grid.values.length !== WIDTH * HEIGHT * grid.metadata.fields.length) {
    throw new Error('Scientific textures require complete 720x360 interleaved Float32 grids');
  }
  return required.map(name => {
    const index = grid.metadata.fields.indexOf(name);
    if (index < 0) throw new Error(`Missing scientific field: ${name}`);
    return index;
  });
}

function floodReader(grid, hazard) {
  const metadata = grid?.metadata;
  if (metadata?.abi !== 'terra-floods/2' || metadata.scenario !== 'rcp8p5'
      || metadata.near_epoch !== 2030 || metadata.future_epoch !== 2050) throw new Error('Flood epoch ABI unavailable');
  const models = hazard === 'river' ? metadata.models : ['coastal-median'];
  if (!Array.isArray(models) || !models.length) throw new Error('Flood models unavailable');
  const indices = models.map(model => {
    const prefixes = hazard === 'river' ? ['historical', `near_model_${model}`, `model_${model}`]
      : ['historical', 'near', 'future'];
    return fields(grid, prefixes.map(prefix => `${prefix}_mean_depth_m`)
      .concat(prefixes.map(prefix => `${prefix}_fraction_gt_0_5m`)));
  });
  const midpoint = (metadata.historical_period[0] + metadata.historical_period[1]) / 2;
  const historicalYear = hazard === 'river' ? Math.round(midpoint) : midpoint;
  return { values: grid.values, stride: metadata.fields.length, coverage: fields(grid, ['coverage'])[0], indices,
    progress: (2026 - historicalYear) / (2030 - historicalYear) };
}

export async function buildScientificTextures(THREE, climate, floods) {
  const started = performance.now();
  const ci = fields(climate, ['historical_temperature', 'near_temperature', 'future_temperature',
    'historical_precipitation', 'near_precipitation', 'future_precipitation',
    'historical_summerMaximum', 'near_summerMaximum', 'future_summerMaximum']);
  const rivers = floodReader(floods.river, 'river'), coasts = floodReader(floods.coast, 'coast');
  const names = ['heat', 'aridity', 'warming', 'coast', 'river'];
  const buffers = names.map(() => new Uint16Array(WIDTH * HEIGHT * 4));
  const validCells = [0, 0, 0, 0, 0], overflowCells = [0, 0, 0, 0, 0], displayCappedCells = [0, 0, 0, 0, 0];
  const half = THREE.DataUtils.toHalfFloat, halfOne = half(1);
  const values = climate.values, stride = climate.metadata.fields.length;
  let chunkStarted = performance.now(), maxChunkMs = chunkStarted - started, yields = 0;
  const store = (kind, offset, a, b, c) => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return;
    if (kind === 1) {
      if (a > 60 || b > 60 || c > 60) displayCappedCells[kind]++;
      a = Math.min(a, 60); b = Math.min(b, 60); c = Math.min(c, 60);
    }
    if (Math.abs(a) > 65504 || Math.abs(b) > 65504 || Math.abs(c) > 65504) { overflowCells[kind]++; return; }
    const target = buffers[kind];
    target[offset] = half(a); target[offset + 1] = half(b); target[offset + 2] = half(c); target[offset + 3] = halfOne;
    validCells[kind]++;
  };
  const flood = (source, row, output, kind) => {
    const offset = row * source.stride, data = source.values;
    if (!(data[offset + source.coverage] > 0 && data[offset + source.coverage] <= 1)) return;
    let baseline = 0, near = 0, future = 0, count = 0;
    for (const indices of source.indices) {
      let valid = true;
      for (let i = 0; i < 6; i++) {
        const value = data[offset + indices[i]];
        if (!Number.isFinite(value) || value < 0 || (i >= 3 && value > 1)) { valid = false; break; }
      }
      if (!valid) continue;
      const a = data[offset + indices[3]], b = data[offset + indices[4]], c = data[offset + indices[5]];
      baseline += a + (b - a) * source.progress; near += b; future += c; count++;
    }
    if (count) store(kind, output, baseline / count, near / count, future / count);
  };
  for (let row = 0; row < WIDTH * HEIGHT; row++) {
    const offset = row * stride;
    const output = ((HEIGHT - 1 - Math.floor(row / WIDTH)) * WIDTH + row % WIDTH) * 4;
    const th = values[offset + ci[0]], tn = values[offset + ci[1]], tf = values[offset + ci[2]];
    const t26 = th + (tn - th) * 41 / 45;
    const ph = values[offset + ci[3]], pn = values[offset + ci[4]], pf = values[offset + ci[5]];
    const p26 = ph + (pn - ph) * 41 / 45;
    const sh = values[offset + ci[6]], sn = values[offset + ci[7]], sf = values[offset + ci[8]];
    store(0, output, sh + (sn - sh) * 41 / 45, sn, sf);
    store(1, output, t26 > -10 ? p26 / (t26 + 10) : NaN, tn > -10 ? pn / (tn + 10) : NaN,
      tf > -10 ? pf / (tf + 10) : NaN);
    store(2, output, t26 - th, tn - th, tf - th);
    flood(coasts, row, output, 3); flood(rivers, row, output, 4);
    if ((row & 255) === 255 && performance.now() - chunkStarted >= 6) {
      maxChunkMs = Math.max(maxChunkMs, performance.now() - chunkStarted);
      await new Promise(resolve => setTimeout(resolve, 0));
      yields++; chunkStarted = performance.now();
    }
  }
  maxChunkMs = Math.max(maxChunkMs, performance.now() - chunkStarted);
  const stats = { durationMs: performance.now() - started, maxChunkMs, yields, bytes: buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0) };
  const units = ['degC', 'De Martonne index', 'degC anomaly from historical', 'fraction of valid cells >0.5m', 'fraction of valid cells >0.5m'];
  return Object.fromEntries(names.map((name, index) => {
    const texture = new THREE.DataTexture(buffers[index], WIDTH, HEIGHT, THREE.RGBAFormat, THREE.HalfFloatType);
    texture.name = `science-${name}`;
    texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false; texture.flipY = false; texture.premultiplyAlpha = false;
    texture.colorSpace = THREE.NoColorSpace; texture.unpackAlignment = 1; texture.needsUpdate = true;
    texture.userData.scientific = { years: YEARS, unit: units[index], rowOrder: 'south-first',
      decode: 'RGB/alpha when alpha>0; RGB=2026,2030,2050. Alpha is matched validity, not risk.',
      temporalMethod: 'Illustrative endpoint interpolation, not annual forecasts; intermediate De Martonne interpolation is a display approximation.',
      displayCap: name === 'aridity' ? 60 : null,
      displayCapMeaning: name === 'aridity' ? 'GPU display only: 60 means >=60, the wetter legend endpoint. Source and city De Martonne values are unchanged.' : null,
      displayCappedCells: displayCappedCells[index],
      validCells: validCells[index], halfFloatOverflowCells: overflowCells[index], stats };
    return [name, texture];
  }));
}

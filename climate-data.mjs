export function sampleGrid(grid, latitude, longitude) {
  if (!grid || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90) return null;
  const { width, height, fields } = grid.metadata;
  const x = Math.floor(((longitude + 180) % 360 + 360) % 360 / 360 * width);
  const y = Math.min(height - 1, Math.floor((90 - latitude) / 180 * height));
  const offset = (y * width + x) * fields.length;
  return Object.fromEntries(fields.map((field, index) => [field, grid.values[offset + index]]));
}

export function fireAtYear(grid, latitude, longitude, year) {
  if (!Number.isFinite(year)) return null;
  const sample = sampleGrid(grid, latitude, longitude);
  if (!sample || !Number.isFinite(sample.near) || !Number.isFinite(sample.future)) return null;
  const progress = Math.max(0, Math.min(1, (year - 2026) / 24));
  return { ...sample, value: sample.near + (sample.future - sample.near) * progress,
    change: sample.pairedChangeMean * progress,
    changeP10: sample.pairedChangeP10 * progress, changeP90: sample.pairedChangeP90 * progress };
}

export function climateAtYear(grid, latitude, longitude, year, pointIndex = -1) {
  if (!grid || !Number.isFinite(year)) return null;
  const sample = Number.isInteger(pointIndex) && pointIndex >= 0 && pointIndex < grid.points.length / 12
    ? Object.fromEntries(grid.metadata.fields.map((field, i) => [field, grid.points[pointIndex * 12 + i]]))
    : sampleGrid(grid, latitude, longitude);
  if (!sample) return null;
  const beforeNear = year < 2030;
  const first = beforeNear ? 'historical' : 'near', second = beforeNear ? 'near' : 'future';
  const progress = Math.max(0, Math.min(1, beforeNear ? (year - 1985) / 45 : (year - 2030) / 20));
  const interpolate = key => sample[`${first}_${key}`] + (sample[`${second}_${key}`] - sample[`${first}_${key}`]) * progress;
  const temperature = interpolate('temperature'), precipitation = interpolate('precipitation');
  return { ...sample, temperature, precipitation, summerMaximum: interpolate('summerMaximum'),
    aridity: temperature > -10 ? precipitation / (temperature + 10) : NaN,
    warming: temperature - sample.historical_temperature };
}

export async function loadFireWeather() {
  const [metadataResponse, dataResponse] = await Promise.all([
    fetch('./data/fire-weather.json'), fetch('./data/fire-weather.bin'),
  ]);
  if (!metadataResponse.ok || !dataResponse.ok) throw new Error('Fire-weather data unavailable');
  const [metadata, buffer] = await Promise.all([metadataResponse.json(), dataResponse.arrayBuffer()]);
  if (metadata.schema !== 2 || metadata.width !== 144 || metadata.height !== 72 || metadata.fields.length !== 8 || metadata.fields[3] !== 'pairedChangeMean' || buffer.byteLength !== 144 * 72 * 8 * 4) {
    throw new Error('Invalid fire-weather data schema');
  }
  const view = new DataView(buffer);
  const values = new Float32Array(buffer.byteLength / 4);
  for (let i = 0; i < values.length; i++) values[i] = view.getFloat32(i * 4, true);
  return { metadata, values };
}

export async function loadFloodHazards() {
  const response = await fetch('./data/flood-metadata.json');
  if (!response.ok) throw new Error('Flood metadata unavailable');
  const metadata = await response.json();
  if (metadata.width !== 720 || metadata.height !== 360) throw new Error('Invalid flood grid');
  const entries = await Promise.all(['coast', 'river'].map(async hazard => {
    const descriptor = metadata.hazards[hazard];
    const response = await fetch(`./data/flood-${hazard}.bin`);
    if (!response.ok || !response.body) throw new Error(`${hazard} flood data unavailable`);
    const buffer = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if (buffer.byteLength !== metadata.width * metadata.height * descriptor.fields.length * 4) throw new Error('Invalid flood payload');
    const view = new DataView(buffer), values = new Float32Array(buffer.byteLength / 4);
    for (let i = 0; i < values.length; i++) values[i] = view.getFloat32(i * 4, true);
    return [hazard, { metadata: { ...metadata, ...descriptor }, values }];
  }));
  return Object.fromEntries(entries);
}

export async function loadWorldClim() {
  const response = await fetch('./data/climate-manifest.json');
  if (!response.ok) throw new Error('Climate metadata unavailable');
  const source = await response.json();
  if (source.abi !== 'terra-climate-v2' || source.width !== 720 || source.height !== 360 || source.fields.length !== 12) throw new Error('Invalid climate grid');
  const names = ['temperature', 'precipitation', 'summerMaximum', 'aridity'];
  const fields = ['historical', 'near', 'future'].flatMap(period => names.map(name => `${period}_${name}`));
  const arrays = await Promise.all(['grid', 'points'].map(async key => {
    const response = await fetch(`./data/climate-${key}.bin`);
    if (!response.ok || !response.body) throw new Error('Climate data unavailable');
    const buffer = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if (buffer.byteLength !== source[key].uncompressed_bytes) throw new Error('Invalid climate payload');
    const view = new DataView(buffer), values = new Float32Array(buffer.byteLength / 4);
    for (let i = 0; i < values.length; i++) values[i] = view.getFloat32(i * 4, true);
    return values;
  }));
  return { metadata: { ...source, sourceFields: source.fields, fields }, values: arrays[0], points: arrays[1] };
}

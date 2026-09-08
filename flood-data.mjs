const fieldMaps = new WeakMap();
const epochs = ['historical', 'near', 'future'];

function reader(data, row) {
  if (!data?.metadata || !(data.values instanceof Float32Array)) return null;
  const fields = data.metadata.fields;
  if (!Array.isArray(fields) || !Number.isInteger(row) || row < 0 || (row + 1) * fields.length > data.values.length) return null;
  let cached = fieldMaps.get(data);
  if (!cached || cached.fields !== fields) {
    cached = { fields, indices: new Map(fields.map((name, index) => [name, index])) };
    fieldMaps.set(data, cached);
  }
  const offset = row * fields.length;
  return name => cached.indices.has(name) ? data.values[offset + cached.indices.get(name)] : NaN;
}

function unavailable(reason) {
  return { value: null, baseline: null, near: null, future: null, change: null,
    p10: null, p90: null, valueP10: null, valueP90: null, agreement: null,
    modelCount: 0, available: false, unit: 'm', reason };
}

function anchors(hazard, periods) {
  const historical = periods.historical;
  if (!Array.isArray(historical) || historical.length !== 2 || !historical.every(Number.isFinite)) return null;
  const midpoint = (historical[0] + historical[1]) / 2;
  return [hazard === 'river' ? Math.round(midpoint) : midpoint, 2030, 2050];
}

function interpolate(values, year, years) {
  const left = year < years[1] ? 0 : 1;
  const progress = (year - years[left]) / (years[left + 1] - years[left]);
  return values[left] + (values[left + 1] - values[left]) * progress;
}

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

function quantile(values, probability) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability, lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}

function summarize(records, year, years, ensemble) {
  const current = records.map(values => interpolate(values, year, years));
  const baseline = records.map(values => interpolate(values, 2026, years));
  const changes = current.map((value, index) => value - baseline[index]);
  const change = mean(changes);
  return { value: mean(current), baseline: mean(baseline), near: mean(records.map(values => values[1])),
    future: mean(records.map(values => values[2])), change,
    p10: ensemble ? quantile(changes, .1) : null, p90: ensemble ? quantile(changes, .9) : null,
    valueP10: ensemble ? quantile(current, .1) : null, valueP90: ensemble ? quantile(current, .9) : null,
    agreement: ensemble ? changes.filter(value => Math.sign(value) === Math.sign(change)).length / changes.length : null };
}

function result(records, fractions, models, year, hazard, periods, support) {
  const years = anchors(hazard, periods);
  if (!years || !Number.isFinite(year) || year < years[0] || year > years[2]) return unavailable('Year outside supported interpolation anchors');
  if (!records.length) return unavailable('No models have matched availability across historical, 2030 and 2050');
  const ensemble = hazard === 'river';
  const output = { ...summarize(records, year, years, ensemble), available: true, modelCount: records.length,
    models, unit: 'm', hazard, year, baselineYear: 2026, anchorYears: years, sourcePeriods: periods,
    scenario: 'rcp8p5', returnPeriodYears: 100, temporalMethod: 'illustrative-linear-interpolation', annualForecast: false,
    uncertainty: ensemble ? 'Descriptive spread of matched models; p10/p90 describe paired changes from the 2026 estimate, not confidence intervals'
      : 'Single median sea-level scenario; no ensemble uncertainty provided',
    agreementReference: ensemble ? 'sign-of-mean-paired-change-from-2026' : null, ...support };
  if (fractions) {
    const fraction = summarize(fractions, year, years, ensemble);
    Object.assign(output, { fraction: fraction.value, baselineFraction: fraction.baseline, nearFraction: fraction.near,
      futureFraction: fraction.future, fractionChange: fraction.change, fractionP10: fraction.p10,
      fractionP90: fraction.p90, fractionAgreement: fraction.agreement,
      fractionMeaning: 'Fraction of valid source cells deeper than 0.5 m; not population exposure' });
  }
  return output;
}

export function floodAtYear(grid, latitude, longitude, year, hazard) {
  if (!['river', 'coast'].includes(hazard)) return unavailable('Unknown flood hazard');
  grid = grid?.[hazard] ?? grid;
  const metadata = grid?.metadata;
  if (!metadata || metadata.abi !== 'terra-floods/2' || metadata.scenario !== 'rcp8p5'
      || metadata.near_epoch !== 2030 || metadata.future_epoch !== 2050
      || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90) return unavailable('Invalid flood grid or coordinates');
  const { width, height } = metadata;
  if (width !== 720 || height !== 360) return unavailable('Invalid flood grid dimensions');
  const x = Math.floor(((longitude + 180) % 360 + 360) % 360 / 360 * width);
  const y = Math.min(height - 1, Math.floor((90 - latitude) / 180 * height));
  const read = reader(grid, y * width + x);
  if (!read || !(read('coverage') > 0 && read('coverage') <= 1)) return unavailable('No source coverage in containing grid cell');
  const models = hazard === 'river' ? metadata.models : ['coastal-median'];
  if (!Array.isArray(models)) return unavailable('Missing model descriptors');
  const records = [], fractions = [], matched = [];
  for (const model of models) {
    const prefixes = hazard === 'river' ? ['historical', `near_model_${model}`, `model_${model}`] : epochs;
    const depth = prefixes.map(prefix => read(`${prefix}_mean_depth_m`));
    const fraction = prefixes.map(prefix => read(`${prefix}_fraction_gt_0_5m`));
    if (!depth.every(value => Number.isFinite(value) && value >= 0)
        || !fraction.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) continue;
    records.push(depth); fractions.push(fraction); matched.push(model);
  }
  return result(records, fractions, matched, year, hazard,
    { historical: metadata.historical_period, near: metadata.near_climate_period, future: metadata.future_climate_period },
    { spatialSupport: '0.5-degree-cell-mean', coverage: read('coverage') });
}

export function floodCityAtYear(cities, index, year, hazard) {
  if (!['river', 'coast'].includes(hazard)) return unavailable('Unknown flood hazard');
  const metadata = cities?.metadata;
  if (!metadata || metadata.abi !== 'terra-flood-cities/1' || !Array.isArray(metadata.sources)
      || !Number.isInteger(index) || index < 0 || index >= metadata.count) return unavailable('Invalid city index or descriptor');
  const read = reader(cities, index);
  if (!read) return unavailable('City data unavailable');
  const sources = metadata.sources.filter(source => source.hazard === hazard);
  const historical = sources.find(source => source.epoch === 'historical');
  const models = hazard === 'river' ? sources.filter(source => source.epoch === 2050).map(source => source.model) : ['coastal-median'];
  const records = [], matched = [];
  for (const model of models) {
    const select = epoch => sources.find(source => source.epoch === epoch && (hazard === 'coast' || source.model === model));
    const descriptors = [historical, select(2030), select(2050)];
    if (!descriptors.every(source => source && (source.scenario === 'historical' || source.scenario === 'rcp8p5')
        && read(source.availability_field) === 1)) continue;
    const values = descriptors.map(source => read(source.depth_field));
    if (!values.every(value => Number.isFinite(value) && value >= 0)) continue;
    records.push(values); matched.push(model);
  }
  return result(records, null, matched, year, hazard,
    { historical: historical?.climate_period, near: sources.find(source => source.epoch === 2030)?.climate_period,
      future: sources.find(source => source.epoch === 2050)?.climate_period },
    { spatialSupport: 'native-grid-cell-at-stored-city-coordinate', nativeResolutionArcseconds: metadata.native_resolution_arcseconds,
      coordinatePrecisionDegrees: metadata.coordinate_precision_degrees, cityIndex: index });
}

async function sha256(buffer) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function fetchBuffer(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Flood input unavailable: ${path}`);
  return response.arrayBuffer();
}

export async function loadFloodCities() {
  const metadata = JSON.parse(new TextDecoder().decode(await fetchBuffer('./data/flood-cities.json')));
  if (metadata.abi !== 'terra-flood-cities/1' || metadata.file !== 'flood-cities.bin' || metadata.encoding !== 'gzip'
      || !Number.isInteger(metadata.count) || metadata.count <= 0 || !Array.isArray(metadata.fields)
      || metadata.fields.length !== 28 || new Set(metadata.fields).size !== metadata.fields.length
      || !Array.isArray(metadata.sources) || metadata.sources.length !== 14) throw new Error('Invalid flood city ABI');
  const [compressed, places, coordinates] = await Promise.all([
    fetchBuffer('./data/flood-cities.bin'), fetchBuffer('./data/places.json'), fetchBuffer('./data/places.bin'),
  ]);
  const hashes = await Promise.all([compressed, places, coordinates].map(sha256));
  if (hashes[0] !== metadata.sha256 || hashes[1] !== metadata.places_sha256 || hashes[2] !== metadata.coordinates_sha256) throw new Error('Flood city source hash mismatch');
  if (JSON.parse(new TextDecoder().decode(places)).villes.length !== metadata.count || coordinates.byteLength !== metadata.count * 24) throw new Error('Flood city order mismatch');
  const buffer = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if (buffer.byteLength !== metadata.count * metadata.fields.length * 4 || buffer.byteLength !== metadata.decoded_bytes
      || await sha256(buffer) !== metadata.decoded_sha256) throw new Error('Invalid flood city payload');
  const values = new Float32Array(buffer.byteLength / 4), view = new DataView(buffer);
  for (let i = 0; i < values.length; i++) values[i] = view.getFloat32(i * 4, true);
  return { metadata, values };
}

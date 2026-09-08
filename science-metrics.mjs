import { loadWorldClim, loadFireWeather, fireAtYear, climateAtYear } from './climate-data.mjs';
import { floodCityAtYear, loadFloodCities } from './flood-data.mjs';

const axes = ['thermique', 'eau', 'feux', 'mer', 'fleuves', 'stabilite'];
const units = ['°C', 'De Martonne index', 'days/year', 'm', 'm', '°C'];
const finite = value => Number.isFinite(value) ? (value === 0 ? 0 : value) : null;

async function hash(buffer) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
}

async function buffer(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Scientific source unavailable: ${path}`);
  return response.arrayBuffer();
}

function metric(value, baseline, future, unit, source, extra = {}) {
  const available = [value, baseline, future].every(Number.isFinite);
  return { value: finite(value), baseline: finite(baseline), future: finite(future),
    change: available ? value - baseline : null, unit, available, baselineYear: 2026,
    futureYear: 2050, temporalMethod: 'illustrative-linear-interpolation', annualForecast: false,
    source, ...extra };
}

export async function loadScientificMetrics() {
  const [climate, fire, floods, placesBytes, coordinatesBytes] = await Promise.all([
    loadWorldClim(), loadFireWeather(), loadFloodCities(),
    buffer('./data/places.json'), buffer('./data/places.bin'),
  ]);
  const places = JSON.parse(new TextDecoder().decode(placesBytes)).villes;
  const count = places.length, cm = climate.metadata, fm = floods.metadata;
  const [placesHash, coordinatesHash, pointsHash] = await Promise.all([
    hash(placesBytes), hash(coordinatesBytes),
    hash(climate.points.buffer.slice(climate.points.byteOffset, climate.points.byteOffset + climate.points.byteLength)),
  ]);
  if (placesHash !== cm.places.json.sha256 || coordinatesHash !== cm.places.coordinates.sha256
      || placesHash !== fm.places_sha256 || coordinatesHash !== fm.coordinates_sha256
      || pointsHash !== cm.points.uncompressed_sha256 || count !== cm.places.count || count !== fm.count
      || coordinatesBytes.byteLength !== count * 24 || climate.points.length !== count * 12) {
    throw new Error('Scientific city source/order hash mismatch');
  }
  const expectedMetrics = ['annual_mean_temperature', 'annual_precipitation',
    'hottest_month_mean_daily_maximum_temperature', 'de_martonne_aridity'];
  const periods = ['1970-2000', '2021-2040', '2041-2060'];
  if (!cm.sourceFields?.every((field, i) => field.id === expectedMetrics[i % 4] && field.period === periods[Math.floor(i / 4)])
      || cm.sourceFields.length !== 12) throw new Error('Scientific climate field order mismatch');
  const coordinates = new DataView(coordinatesBytes);
  const climateSource = { dataset: 'WorldClim 2.1 / CMIP6', periods: cm.periods,
    model: 'MPI-ESM1-2-HR', scenario: 'SSP3-7.0', spatialSupport: 'native-nearest-cell-no-borrowing',
    resolutionDegrees: 1 / 6, anchorYears: [1985, 2030, 2050], disclosures: cm.disclosures };
  const sources = { climate: climateSource, fire: fire.metadata, floods: fm,
    placesSha256: placesHash, coordinatesSha256: coordinatesHash,
    scenarioDisclosure: 'Climate/fire SSP3-7.0 and floods RCP8.5 are different scenarios; no common-scenario forecast.' };
  function forCity(index, latitude, longitude, year) {
    const valid = Number.isInteger(index) && index >= 0 && index < count
      && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
      && Number.isFinite(year) && year >= 2026 && year <= 2050
      && Math.abs(latitude - coordinates.getInt16(index * 24, true) / 100) < 1e-7
      && Math.abs(longitude - coordinates.getInt16(index * 24 + 2, true) / 100) < 1e-7;
    if (!valid) return Object.fromEntries(axes.map((axis, i) => [axis,
      metric(NaN, NaN, NaN, units[i], null, { reason: 'Invalid city index, stored coordinate or supported year' })]));
    const current = climateAtYear(climate, latitude, longitude, year, index);
    const baseline = year === 2026 ? current : climateAtYear(climate, latitude, longitude, 2026, index);
    const future = year === 2050 ? current : climateAtYear(climate, latitude, longitude, 2050, index);
    const weather = fireAtYear(fire, latitude, longitude, year);
    const coast = floodCityAtYear(floods, index, year, 'coast');
    const river = floodCityAtYear(floods, index, year, 'river');
    const climateMetric = (key, unit, extra = {}) => metric(current?.[key], baseline?.[key], future?.[key], unit, climateSource, extra);
    const floodMetric = reading => metric(reading.value, reading.baseline, reading.future, 'm', {
      dataset: 'WRI Aqueduct Floods', scenario: reading.scenario, periods: reading.sourcePeriods,
      returnPeriodYears: reading.returnPeriodYears, spatialSupport: reading.spatialSupport,
      nativeResolutionArcseconds: reading.nativeResolutionArcseconds, models: reading.models,
    }, { available: reading.available, change: finite(reading.change), p10: finite(reading.p10), p90: finite(reading.p90),
      agreement: finite(reading.agreement), modelCount: reading.modelCount, uncertainty: reading.uncertainty,
      reason: reading.reason });
    return {
      thermique: climateMetric('summerMaximum', '°C', { definition: 'Hottest-month mean daily maximum temperature; not a daily extreme or hot-day count' }),
      eau: climateMetric('aridity', 'De Martonne index', { direction: 'lower-is-drier', temporalMethod: 'derived-from-illustratively-interpolated-temperature-and-precipitation', definition: 'Annual precipitation / (annual mean temperature + 10), defined only above -10°C; not water availability' }),
      feux: metric(weather?.value, weather?.near, weather?.future, 'days/year', fire.metadata,
        { change: finite(weather?.change), p10: finite(weather?.changeP10), p90: finite(weather?.changeP90),
          agreement: finite(weather?.signAgreement), modelCount: fire.metadata.modelCount,
          uncertainty: fire.metadata.uncertainty, definition: fire.metadata.metric }),
      mer: floodMetric(coast), fleuves: floodMetric(river),
      stabilite: climateMetric('warming', '°C', { definition: 'Annual mean warming relative to historical 1970–2000 climatology; change is additional warming since the 2026 estimate' }),
    };
  }
  const availability = { count, baselineYear: 2026, futureYear: 2050, allSix: 0, perAxis: Object.fromEntries(axes.map(axis => [axis, 0])),
    byAvailableAxisCount: Array(7).fill(0) };
  const coverage = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    const readings = forCity(index, coordinates.getInt16(index * 24, true) / 100, coordinates.getInt16(index * 24 + 2, true) / 100, 2026);
    let available = 0;
    for (const [axisIndex, axis] of axes.entries()) if (readings[axis].available) { availability.perAxis[axis]++; available++; coverage[index] |= 1 << axisIndex; }
    availability.byAvailableAxisCount[available]++;
    if (available === 6) availability.allSix++;
    if (index % 512 === 511) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return { forCity, availability, coverage, sources, climate, fire, floods };
}

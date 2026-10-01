import { climateAtYear, fireAtYear } from './climate-data.mjs';
import { floodAtYear } from './flood-data.mjs';

// A map reading describes the containing grid cell. City-point measurements
// and population-weighted country summaries have a different spatial support.
const definitions = {
  chaleur: ['hottest-month-mean-daily-maximum-temperature', '°C'],
  secheresse: ['de-martonne-index', 'De Martonne index'],
  stabilite: ['annual-mean-temperature-anomaly-from-historical-climatology', '°C'],
  feux: ['annual-days-above-local-preindustrial-fwi-95th-percentile', 'days/year'],
  mer: ['valid-source-cell-fraction-deeper-than-0.5m-in-100-year-coastal-flood', '%'],
  fleuves: ['valid-source-cell-fraction-deeper-than-0.5m-in-100-year-river-flood', '%'],
};

function unavailable(filter, year, reason) {
  return { available: false, filter, year, value: null, baseline: null, future: null,
    change: null, unit: definitions[filter]?.[1] ?? '', definition: definitions[filter]?.[0] ?? null,
    baselineYear: 2026, modelCount: 0, agreement: null, spatialSupport: null,
    resolutionDegrees: null, annualForecast: false, reason };
}

function gridCell(grid, latitude, longitude) {
  const { width, height, fields } = grid?.metadata ?? {};
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0
      || !Array.isArray(fields) || fields.length === 0
      || !(grid.values instanceof Float32Array) || grid.values.length !== width * height * fields.length) return null;
  const column = Math.floor(((longitude + 180) % 360 + 360) % 360 / 360 * width);
  const row = Math.min(height - 1, Math.floor((90 - latitude) / 180 * height));
  return { row, column, latitudeCenter: 90 - (row + .5) * 180 / height,
    longitudeCenter: -180 + (column + .5) * 360 / width };
}

function climateReading(filter, year, latitude, longitude, climate) {
  const cell = gridCell(climate, latitude, longitude);
  if (!cell || climate.metadata.abi !== 'terra-climate-v2') return unavailable(filter, year, 'Climate grid unavailable or invalid');
  const key = { chaleur: 'summerMaximum', secheresse: 'aridity', stabilite: 'warming' }[filter];
  if (filter === 'secheresse') {
    // Match the two ingredient textures' common 2026/2030/2050 domain. A
    // ratio available at one year cannot stand in for missing anchor data.
    const anchors = [2026, 2030, 2050].map(at => climateAtYear(climate, latitude, longitude, at));
    if (!anchors.every(reading => Number.isFinite(reading?.temperature) && Math.fround(reading.temperature) > -10
        && Number.isFinite(reading?.precipitation) && Math.fround(reading.precipitation) >= 0)) {
      return unavailable(filter, year, 'No matched De Martonne ingredient data at all three display anchors');
    }
  }
  const readings = [2026, year, 2050].map(at => climateAtYear(climate, latitude, longitude, at));
  const [baseline, value, future] = readings.map(reading => reading?.[key]);
  if (![baseline, value, future].every(Number.isFinite)) return unavailable(filter, year, 'No matched climate data for the containing grid cell');
  const periods = climate.metadata.periods ?? [];
  return { available: true, filter, year, value, baseline, future, change: value - baseline,
    unit: definitions[filter][1], definition: definitions[filter][0], baselineYear: 2026,
    spatialSupport: 'containing-grid-cell', resolutionDegrees: 360 / climate.metadata.width, cell,
    modelCount: 1, agreement: null, sourcePeriods: {
      historical: periods[0]?.years ?? [1970, 2000], near: periods[1]?.years ?? [2021, 2040],
      future: periods[2]?.years ?? [2041, 2060],
    },
    scenario: periods[1]?.scenario ?? 'SSP3-7.0', model: periods[1]?.model ?? 'MPI-ESM1-2-HR',
    temporalMethod: 'illustrative-linear-interpolation', annualForecast: false,
    historicalReference: filter === 'stabilite' ? periods[0]?.years ?? [1970, 2000] : null,
    ...(filter === 'secheresse' ? { direction: 'lower-is-drier',
      temporalMethod: 'derived-from-illustratively-interpolated-temperature-and-precipitation',
      spatialAggregation: 'ratio-of-grid-cell-mean-temperature-and-precipitation-ingredients' } : {}),
  };
}

function fireReading(year, latitude, longitude, fire) {
  const filter = 'feux', cell = gridCell(fire, latitude, longitude);
  if (!cell || fire.metadata.schema !== 2) return unavailable(filter, year, 'Fire-weather grid unavailable or invalid');
  const sample = fireAtYear(fire, latitude, longitude, year);
  if (!sample || ![sample.near, sample.future, sample.value].every(value => Number.isFinite(value) && value >= 0 && value <= 366)) {
    return unavailable(filter, year, 'No fire-weather data for the containing grid cell');
  }
  const agreement = Number.isFinite(sample.signAgreement) && sample.signAgreement >= 0 && sample.signAgreement <= 1
    ? year === 2026 ? 1 : sample.signAgreement : null;
  return { available: true, filter, year, value: sample.value, baseline: sample.near,
    future: sample.future, change: sample.value - sample.near,
    unit: definitions[filter][1], definition: definitions[filter][0], baselineYear: 2026,
    spatialSupport: 'containing-grid-cell', resolutionDegrees: 360 / fire.metadata.width, cell,
    modelCount: fire.metadata.modelCount, agreement,
    agreementReference: 'sign-of-mean-paired-change-from-2026',
    p10: Number.isFinite(sample.changeP10) ? sample.changeP10 : null,
    p90: Number.isFinite(sample.changeP90) ? sample.changeP90 : null,
    sourcePeriods: { historical: fire.metadata.historicalPeriod, near: fire.metadata.nearPeriod,
      future: fire.metadata.futurePeriod }, scenario: fire.metadata.scenario,
    thresholdReference: fire.metadata.thresholdReference, coverage: sample.burnableFraction,
    temporalMethod: 'illustrative-linear-interpolation', annualForecast: false,
    uncertainty: fire.metadata.uncertainty,
  };
}

function floodReading(filter, year, latitude, longitude, floods) {
  const hazard = filter === 'mer' ? 'coast' : 'river';
  const grid = floods?.[hazard] ?? floods, cell = gridCell(grid, latitude, longitude);
  if (!cell) return unavailable(filter, year, 'Flood grid unavailable or invalid');
  const reading = floodAtYear(grid, latitude, longitude, year, hazard);
  if (!reading.available || ![reading.fraction, reading.baselineFraction, reading.futureFraction].every(Number.isFinite)) {
    return unavailable(filter, year, reading.reason ?? 'No flood data for the containing grid cell');
  }
  // The map encodes the fraction of valid native cells above 0.5 m, not mean
  // flood depth, exact land area, population exposure or daily river height.
  return { available: true, filter, year, value: reading.fraction * 100,
    baseline: reading.baselineFraction * 100, future: reading.futureFraction * 100,
    change: (reading.fraction - reading.baselineFraction) * 100,
    unit: '%', changeUnit: 'percentage points', definition: definitions[filter][0], baselineYear: 2026,
    spatialSupport: 'containing-grid-cell', resolutionDegrees: 360 / grid.metadata.width, cell,
    modelCount: reading.modelCount, models: reading.models, agreement: reading.fractionAgreement,
    agreementReference: reading.agreementReference,
    p10: reading.fractionP10 === null ? null : reading.fractionP10 * 100,
    p90: reading.fractionP90 === null ? null : reading.fractionP90 * 100,
    sourcePeriods: reading.sourcePeriods, scenario: reading.scenario,
    anchorYears: reading.anchorYears, returnPeriodYears: reading.returnPeriodYears,
    coverage: reading.coverage, thresholdMetres: .5, temporalMethod: reading.temporalMethod,
    annualForecast: false, uncertainty: reading.uncertainty,
  };
}

export function mapDiagnosticReading({ filter, year, latitude, longitude, climate, fire, floods } = {}) {
  if (!Number.isFinite(year) || year < 2026 || year > 2050) return unavailable(filter, year, 'Year outside 2026–2050');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90) {
    return unavailable(filter, year, 'Invalid coordinates');
  }
  if (['chaleur', 'secheresse', 'stabilite'].includes(filter)) return climateReading(filter, year, latitude, longitude, climate);
  if (filter === 'feux') return fireReading(year, latitude, longitude, fire);
  if (['mer', 'fleuves'].includes(filter)) return floodReading(filter, year, latitude, longitude, floods);
  return unavailable(filter, year, filter === 'declin' ? 'Population requires country-level annual data' : 'Unknown map filter');
}

const FIRST_YEAR = 2026, LAST_YEAR = 2050;
const ARIDITY_TOLERANCE = 1e-6;
const nextTask = () => new Promise(resolve => setTimeout(resolve, 0));

function layout(grid, count) {
  const metadata = grid?.metadata;
  if (!Number.isInteger(metadata?.width) || metadata.width <= 0
      || !Number.isInteger(metadata?.height) || metadata.height <= 0
      || !Array.isArray(metadata.fields) || metadata.fields.length !== count
      || !(grid.values instanceof Float32Array)
      || grid.values.length !== metadata.width * metadata.height * count) return null;
  return { width: metadata.width, height: metadata.height, count };
}

function rowWeight(row, height) {
  return Math.cos((90 - (row + .5) * 180 / height) * Math.PI / 180);
}

function support(weight, cells, shape, scope) {
  const earthFraction = weight * (2 * Math.PI / shape.width)
    * (2 * Math.sin(Math.PI / (2 * shape.height))) / (4 * Math.PI);
  return Object.freeze({ scope, validCells: cells, gridCells: shape.width * shape.height,
    weightedCoverage: weight, approximateEarthAreaFraction: earthFraction,
    weighting: 'cos(latitude-centre) times represented native-cell/land-cover fraction',
    exactGeographicArea: false, populationWeighted: false });
}

function midpointInterpolation(values, year, historicalYear) {
  const left = year < 2030 ? 0 : 1;
  const progress = left === 0 ? (year - historicalYear) / (2030 - historicalYear) : (year - 2030) / 20;
  return values[left] + (values[left + 1] - values[left]) * progress;
}

function unavailable(filter, year, reason) {
  return Object.freeze({ available: false, filter, year, value: null, reason });
}

function freezeReading(reading) {
  if (Array.isArray(reading.referencePeriod)) Object.freeze(reading.referencePeriod);
  return Object.freeze(reading);
}

// Construction snapshots the packaged fields once. All displayed-year
// readings then use cached scalars; moving the pointer never scans the grids.
export async function createGlobalSummary({ climate, fire, floods, population, climateCoverage,
  populationAreaCount = 237, yieldTask = nextTask, chunkSize = 8192 } = {}) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new TypeError('Invalid summary chunk size');
  if (typeof yieldTask !== 'function') throw new TypeError('Invalid summary scheduler');
  if (!Number.isInteger(populationAreaCount) || populationAreaCount < 1) throw new TypeError('Invalid population area count');
  const metrics = new Map(), cache = new Map();

  const climateShape = layout(climate, 12);
  const coverageValid = climateCoverage instanceof Uint8Array && climateShape
    && climateCoverage.length === climate.values.length && !climateCoverage.some(n => n > 9);
  if (climateShape && coverageValid && climate.metadata.abi === 'terra-climate-v2') {
    const values = climate.values;
    const totals = { chaleur: [0, 0, 0], stabilite: [0, 0, 0] };
    const weights = { chaleur: 0, stabilite: 0, secheresse: 0 };
    const cells = { chaleur: 0, stabilite: 0, secheresse: 0 };
    const drier = new Float64Array(LAST_YEAR - FIRST_YEAR + 1);
    for (let cell = 0; cell < climateShape.width * climateShape.height; cell++) {
      const offset = cell * 12, area = rowWeight(Math.floor(cell / climateShape.width), climateShape.height);
      for (const [filter, field] of [['chaleur', 2], ['stabilite', 0]]) {
        const indices = [field, field + 4, field + 8];
        const covered = Math.min(...indices.map(i => climateCoverage[offset + i]));
        const anchors = indices.map(i => values[offset + i]);
        if (covered > 0 && anchors.every(Number.isFinite)) {
          const weight = area * covered / 9;
          weights[filter] += weight; cells[filter]++;
          anchors.forEach((value, i) => { totals[filter][i] += value * weight; });
        }
      }
      const temperatures = [0, 4, 8].map(i => values[offset + i]);
      const rainfall = [1, 5, 9].map(i => values[offset + i]);
      // The application derives De Martonne from the packaged ingredients.
      // Use one fixed represented domain for all years, including historical
      // data, and exclude the proxy's undefined T <= -10 degrees domain.
      const covered = Math.min(...[0, 1, 3, 4, 5, 7, 8, 9, 11].map(i => climateCoverage[offset + i]));
      if (covered > 0 && temperatures.every(t => Number.isFinite(t) && Math.fround(t) > -10)
          && rainfall.every(p => Number.isFinite(p) && p >= 0)) {
        const weight = area * covered / 9, historic = rainfall[0] / (temperatures[0] + 10);
        weights.secheresse += weight; cells.secheresse++;
        for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
          const t = midpointInterpolation(temperatures, year, 1985);
          const p = midpointInterpolation(rainfall, year, 1985);
          const index = p / (t + 10);
          // Float32 ingredients cannot support claims based on numerical
          // cancellation. This tolerance is numerical, not a drought threshold.
          if (index < historic - ARIDITY_TOLERANCE * Math.max(1, Math.abs(historic), Math.abs(index))) {
            drier[year - FIRST_YEAR] += weight;
          }
        }
      }
      if ((cell + 1) % chunkSize === 0) await yieldTask();
    }
    for (const filter of ['chaleur', 'stabilite']) if (weights[filter] > 0) {
      const anchors = totals[filter].map(n => n / weights[filter]);
      metrics.set(filter, year => freezeReading({ available: true, filter, year,
        value: midpointInterpolation(anchors, year, 1985) - anchors[0], unit: '°C',
        referenceValue: anchors[0], estimateValue: midpointInterpolation(anchors, year, 1985),
        referencePeriod: [1970, 2000], referenceKind: 'historical-period-average',
        temporalMethod: 'illustrative-interpolation-of-period-averages', scenario: 'SSP3-7.0',
        modelCount: 1, model: 'MPI-ESM1-2-HR',
        metric: filter === 'chaleur' ? 'hottest-month-mean-daily-maximum-temperature-change' : 'land-annual-mean-temperature-change',
        support: support(weights[filter], cells[filter], climateShape, 'represented-modelled-land'),
        globalMeanSurfaceTemperature: false, observedAnnualChange: false }));
    }
    if (weights.secheresse > 0) metrics.set('secheresse', year => freezeReading({ available: true,
      filter: 'secheresse', year, value: drier[year - FIRST_YEAR] / weights.secheresse * 100, unit: '%',
      referencePeriod: [1970, 2000], referenceKind: 'historical-period-average',
      temporalMethod: 'De-Martonne-derived-from-interpolated-temperature-and-rainfall',
      scenario: 'SSP3-7.0', modelCount: 1, model: 'MPI-ESM1-2-HR',
      metric: 'represented-area-share-with-lower-De-Martonne-index', numericalTolerance: ARIDITY_TOLERANCE,
      support: support(weights.secheresse, cells.secheresse, climateShape, 'represented-modelled-land'),
      droughtProbability: false, waterAvailability: false, observedAnnualChange: false }));
  }

  const fireShape = layout(fire, 8);
  if (fireShape && fire.metadata.schema === 2) {
    const sums = [0, 0, 0]; let weight = 0, cells = 0;
    for (let cell = 0; cell < fireShape.width * fireShape.height; cell++) {
      const offset = cell * 8, anchors = [0, 1, 2].map(i => fire.values[offset + i]);
      const burnable = fire.values[offset + 7];
      if (anchors.every(n => Number.isFinite(n) && n >= 0 && n <= 366)
          && Number.isFinite(burnable) && burnable > 0 && burnable <= 1) {
        const area = rowWeight(Math.floor(cell / fireShape.width), fireShape.height) * burnable;
        weight += area; cells++; anchors.forEach((n, i) => { sums[i] += n * area; });
      }
      if ((cell + 1) % chunkSize === 0) await yieldTask();
    }
    if (weight > 0) {
      const anchors = sums.map(n => n / weight);
      metrics.set('feux', year => {
        const estimate = anchors[1] + (anchors[2] - anchors[1]) * (year - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR);
        return freezeReading({ available: true, filter: 'feux', year, value: estimate - anchors[0],
          referenceValue: anchors[0], estimateValue: estimate, unit: 'days/year',
          referencePeriod: [...(fire.metadata.historicalPeriod || [1995, 2014])], referenceKind: 'historical-period-average',
          thresholdReference: fire.metadata.thresholdReference || '1850–1899',
          threshold: 'local-preindustrial-FWI-95th-percentile',
          temporalMethod: 'illustrative-interpolation-2016–2035-to-2041–2060', scenario: 'SSP3-7.0',
          modelCount: fire.metadata.modelCount, metric: 'change-in-extreme-fire-weather-days',
          support: support(weight, cells, fireShape, 'represented-burnable-land-2016-cover'),
          actualFires: false, observedAnnualChange: false });
      });
    }
  }

  for (const [filter, hazard] of [['mer', 'coast'], ['fleuves', 'river']]) {
    const grid = floods?.[hazard], fields = grid?.metadata?.fields;
    const shape = fields && layout(grid, fields.length), metadata = grid?.metadata;
    if (!shape || metadata.abi !== 'terra-floods/2' || metadata.scenario !== 'rcp8p5'
        || metadata.near_epoch !== 2030 || metadata.future_epoch !== 2050
        || !Array.isArray(metadata.historical_period) || metadata.historical_period.length !== 2
        || !metadata.historical_period.every(Number.isFinite)) continue;
    const indices = new Map(fields.map((name, index) => [name, index]));
    const coverage = indices.get('coverage');
    const models = hazard === 'river' ? metadata.models : ['coastal-median'];
    if (coverage === undefined || !Array.isArray(models) || !models.length) continue;
    const descriptors = models.map(model => (hazard === 'river'
      ? ['historical', `near_model_${model}`, `model_${model}`] : ['historical', 'near', 'future'])
      .map(prefix => [indices.get(prefix + '_mean_depth_m'), indices.get(prefix + '_fraction_gt_0_5m')]))
      .filter(epochs => epochs.every(pair => pair.every(Number.isInteger)));
    if (!descriptors.length) continue;
    const sums = [0, 0, 0]; let weight = 0, cells = 0, minModels = Infinity, maxModels = 0;
    for (let cell = 0; cell < shape.width * shape.height; cell++) {
      const offset = cell * shape.count, covered = grid.values[offset + coverage];
      if (Number.isFinite(covered) && covered > 0 && covered <= 1) {
        const fractions = [0, 0, 0]; let matched = 0;
        for (const descriptorsPerEpoch of descriptors) {
          const anchors = descriptorsPerEpoch.map(([depth, fraction]) => [grid.values[offset + depth], grid.values[offset + fraction]]);
          if (anchors.every(([d, f]) => Number.isFinite(d) && d >= 0 && Number.isFinite(f) && f >= 0 && f <= 1)) {
            matched++; anchors.forEach(([, f], i) => { fractions[i] += f; });
          }
        }
        if (matched) {
          const area = rowWeight(Math.floor(cell / shape.width), shape.height) * covered;
          weight += area; cells++; minModels = Math.min(minModels, matched); maxModels = Math.max(maxModels, matched);
          fractions.forEach((n, i) => { sums[i] += n / matched * area; });
        }
      }
      if ((cell + 1) % chunkSize === 0) await yieldTask();
    }
    if (weight > 0) {
      const anchors = sums.map(n => n / weight);
      const historicMidpoint = (metadata.historical_period[0] + metadata.historical_period[1]) / 2;
      const anchorYear = hazard === 'river' ? Math.round(historicMidpoint) : historicMidpoint;
      metrics.set(filter, year => {
        const estimate = midpointInterpolation(anchors, year, anchorYear);
        return freezeReading({ available: true, filter, year, value: (estimate - anchors[0]) * 100,
          referenceValue: anchors[0] * 100, estimateValue: estimate * 100, unit: 'percentage points',
          referencePeriod: [...metadata.historical_period], referenceKind: 'historical-model-period',
          referenceAnchorYear: anchorYear, scenario: 'RCP8.5',
          temporalMethod: 'illustrative-interpolation-historical-to-2030-to-2050',
          metric: 'change-in-valid-source-cell-fraction-deeper-than-0.5m',
          thresholdMetres: .5, returnPeriodYears: 100, modelCountRange: Object.freeze([minModels, maxModels]),
          support: support(weight, cells, shape, 'represented-model-domain'),
          floodProtectionIncluded: false, populationExposure: false, dailyWaterLevel: false,
          exactGeographicFloodArea: false, observedAnnualChange: false });
      });
    }
  }

  const entries = population && typeof population === 'object' ? Object.entries(population) : [];
  if (entries.length === populationAreaCount && entries.every(([code, annual]) => /^[A-Z]{2}$/.test(code)
      && Array.isArray(annual) && annual.length === 26
      && annual.every(n => Number.isSafeInteger(n) && n >= 0))) {
    const totals = Array.from({ length: 26 }, (_, index) => entries.reduce((sum, [, annual]) => sum + annual[index], 0));
    if (totals.every(Number.isSafeInteger)) metrics.set('declin', year => freezeReading({ available: true,
      filter: 'declin', year, value: totals[year - 2025], unit: 'persons',
      referenceValue: totals[0], changeFrom2025: totals[year - 2025] - totals[0],
      referencePeriod: [2025, 2025], referenceKind: 'annual-UN-country-area-total',
      temporalMethod: 'exact-sum-of-packaged-annual-projections', scenario: 'UN WPP medium',
      countryAreaCount: entries.length, aggregatesIncluded: false,
      officialWorldAggregateCrossChecked: false, metric: 'sum-of-UN-country-area-population-projections' }));
  }

  return Object.freeze({ reading(filter, year) {
    if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) return unavailable(filter, year, 'Year outside 2026–2050');
    const key = filter + ':' + year;
    if (!cache.has(key)) cache.set(key, metrics.has(filter) ? metrics.get(filter)(year)
      : unavailable(filter, year, 'Missing, invalid or unmatched packaged data'));
    return cache.get(key);
  } });
}

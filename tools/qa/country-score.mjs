import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual production aggregation, with explicit known outcomes.
// The fixtures separate absence, a valid zero and invalid population weights.
const source = await fs.readFile(new URL('../../index.html', import.meta.url), 'utf8');
const start = source.indexOf('function indicePays(');
const end = source.indexOf('const COUNTRY_NOTES_CACHE', start);
assert.ok(start >= 0 && end > start, 'Production country-score function found');
const aggregation = source.slice(start, end);

function harness(fixtures) {
  const scores = new WeakMap(), calls = [];
  const cities = fixtures.map(({ score, population = 1000, complete = true }, index) => {
    const city = [`Fixture ${index}`, 'XX', 0, 0, population, 0, `Fixture ${index}`, complete];
    scores.set(city, score);
    return city;
  });
  const cache = new Map();
  const context = vm.createContext({
    _memoPays: cache,
    VILLES_PAR_PAYS: { XX: cities, EMPTY: [] },
    indiceHabitabiliteVille(city, year) {
      calls.push({ city, year });
      const value = scores.get(city);
      return typeof value === 'function' ? value(year) : value;
    },
  });
  vm.runInContext(aggregation, context, { filename: 'production-country-score.js' });
  return { score: (iso = 'XX', year = 2050) => context.indicePays(iso, year),
    cities, scores, calls, cache };
}

const cases = [
  ['unknown country', [], null, 'MISSING'],
  ['known country with no listed cities', [], null, 'EMPTY'],
  ['country with only unavailable city scores', [
    { score: null }, { score: NaN }, { score: undefined },
  ], null],
  ['a genuine zero city score is retained', [{ score: 0 }], 0],
  ['zero participates in the population denominator', [
    { score: 0, population: 300 }, { score: 100, population: 100 },
  ], 25],
  ['known population-weighted average', [
    { score: 80, population: 1000 }, { score: 20, population: 3000 },
  ], 35],
  ['missing and non-finite scores contribute neither value nor weight', [
    { score: 80, population: 1000 }, { score: 20, population: 3000 },
    { score: null, population: 9000 }, { score: NaN, population: 7000 },
    { score: Infinity, population: 5000 }, { score: -Infinity, population: 4000 },
    { score: undefined, population: 3000 }, { score: '100', population: 2000 },
  ], 35],
  ['invalid weights contribute neither value nor denominator', [
    { score: 80, population: 1000 }, { score: 20, population: 3000 },
    { score: 100, population: 0 }, { score: 100, population: -1000 },
    { score: 100, population: NaN }, { score: 100, population: Infinity },
    { score: 100, population: -Infinity }, { score: 100, population: '1000' },
    { score: 100, population: null },
  ], 35],
  ['no positive finite population weight means no country score', [
    { score: 80, population: 0 }, { score: 100, population: NaN },
    { score: 50, population: -10 }, { score: 10, population: Infinity },
  ], null],
  ['incomplete cities stay outside the overall score', [
    { score: 80, population: 1000 }, { score: 20, population: 3000 },
    { score: 100, population: 100000, complete: false },
  ], 35],
  ['round the aggregate after weighting', [
    { score: 50, population: 1 }, { score: 51, population: 1 },
  ], 51],
];
for (const [name, fixtures, expected, iso] of cases) {
  const test = harness(fixtures);
  assert.equal(test.score(iso), expected, name);
  assert.equal(test.score(iso), expected, `${name}: cached result stays identical`);
}

const incomplete = harness([{ score: 100, complete: false }]);
assert.equal(incomplete.score(), null);
assert.equal(incomplete.calls.length, 0, 'No score request is made for incomplete source coverage');

const annual = harness([{ score: year => year === 2026 ? 40 : 80 }]);
assert.equal(annual.score('XX', 2026), 40);
assert.equal(annual.score('XX', 2050), 80, 'Country score cache is scoped to the selected year');
const before = annual.calls.length;
assert.equal(annual.score('XX', 2026), 40);
assert.equal(annual.calls.length, before, 'Repeated country/year requests use the cache');

// Replacing the scientific source must invalidate both score caches. Execute
// the loader's assignment block, then prove that a formerly missing result
// can become available rather than remaining a cached null.
const loadStart = source.indexOf('SCIENCE = science;');
const loadEnd = source.indexOf('const grid = science.fire;', loadStart);
assert.ok(loadStart >= 0 && loadEnd > loadStart, 'Scientific source assignment block found');
const cached = harness([{ score: null }]);
assert.equal(cached.score(), null);
cached.scores.set(cached.cities[0], 70);
const cityCache = new Map([[2050, new Map([[0, null]])]]);
const newScience = { revision: 'replacement-source' };
const loaderContext = vm.createContext({ SCIENCE: null, science: newScience,
  SCORE_CACHE: cityCache, _memoPays: cached.cache });
vm.runInContext(source.slice(loadStart, loadEnd), loaderContext,
  { filename: 'production-scientific-source-assignment.js' });
assert.equal(cityCache.size, 0, 'Changing scientific source invalidates cached city scores');
assert.equal(cached.cache.size, 0, 'Changing scientific source invalidates cached country scores');
assert.equal(cached.score(), 70, 'An old cached missing score does not hide newly available data');

console.log(JSON.stringify({ status: 'PASS', fixtures: cases.length,
  checks: ['missing scores excluded from denominator', 'valid zero retained',
    'invalid population weights excluded', 'known weighted averages',
    'country/year caching', 'scientific-source cache invalidation'] }, null, 2));

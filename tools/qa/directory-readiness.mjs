import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {decodePlaceDirectory, createPlaceSearch} from '../../place-search.mjs';
import {createPlaceLinks} from '../../place-links.mjs';

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
function extract(start, end) {
  const from = html.indexOf(start), to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing production function: ${start}`);
  return html.slice(from, to);
}
const directorySource = extract('function chargerAnnuaire(){', '\nconst hud =');
const summarySource = extract('function preparerSyntheseGlobale(){', '\nlet scienceLoadFailed');
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
};
const flush = () => new Promise(resolve => setImmediate(resolve));
const directory = {villes: [['Paris', 'FR', 100, 1, 'Paris'], ['Boston', 'US', 80, 0, 'Boston']]};
const json = new TextEncoder().encode(JSON.stringify(directory)).buffer, binary = new ArrayBuffer(48);
const coordinates = new DataView(binary);
coordinates.setInt16(0, 4886, true); coordinates.setInt16(2, 235, true);
coordinates.setInt16(24, 4236, true); coordinates.setInt16(26, -7106, true);
const population = {FR: Array(26).fill(60000000), US: Array(26).fill(300000000)};

for (const populationFirst of [false, true]) {
  const names = deferred(), numbers = deferred(), annual = deferred(), refreshes = [];
  const context = {
    Promise, TextDecoder, Intl, decodePlaceDirectory, createPlaceSearch, createPlaceLinks,
    annuaireLance: false, annuaireErreur: false, donneesPretes: false,
    LIEUX: [], PAYS_POP: {}, PAYS_LIGNES: [], VILLES_PAR_PAYS: {}, SOURCE_INDEX: new WeakMap(),
    SCIENCE: {coverage: Uint8Array.of(63, 63)}, populationSourceReady: false,
    texC: {}, lieuDossier: null, champ: {value: ''}, calquesPrets: Promise.resolve(),
    document: {body: {classList: {add() {}, remove() {}}}},
    console: {error(...args) { throw new Error(args.join(' ')); }},
    charger: path => path.endsWith('places.json') ? names.promise : path.endsWith('places.bin') ? numbers.promise : annual.promise,
    majDossier: () => refreshes.push(context.populationSourceReady),
  };
  for (const name of ['chargerGrillesCalques', 'pixelsDepuisTexture', 'preparerPopulation', 'rafraichirSurvol',
    'preparerSyntheseGlobale', 'indexerVilles', 'chargerNomsSupplementaires', 'chargerPays', 'peutEntrer',
    'afficherResultats', 'ouvrirDepuisLien']) context[name] = () => {};
  vm.createContext(context); vm.runInContext(directorySource, context);
  const ready = context.chargerAnnuaire();
  if (populationFirst) {
    annual.resolve(population); await flush();
    assert.equal(context.populationSourceReady, true);
    assert.equal(context.donneesPretes, false);
  }
  names.resolve(json); numbers.resolve(binary);
  let timer;
  try {
    await Promise.race([ready, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('City readiness waits for population')), 1000);
    })]);
  } finally { clearTimeout(timer); }
  assert.equal(context.donneesPretes, true);
  assert.equal(context.LIEUX.length, 2);
  const country = context.PAYS_LIGNES.find(row => row[1] === 'FR');
  assert.equal(country[4], populationFirst ? population.FR[0] : 0);
  context.lieuDossier = country;
  const link = context.liensLieux.hash(country, 2050);
  if (!populationFirst) {
    assert.equal(context.populationSourceReady, false);
    annual.resolve(population); await flush();
    assert.equal(context.populationSourceReady, true);
    assert.deepEqual(refreshes, [true]);
  }
  assert.equal(context.PAYS_LIGNES.find(row => row[1] === 'FR'), country);
  assert.equal(context.lieuDossier, country);
  assert.equal(country[4], population.FR[0]);
  assert.equal(context.rechercherLieux('France', {countriesOnly: true})[0], country);
  assert.equal(context.liensLieux.resolve(new URLSearchParams(link.slice(1))), country);
  assert.equal(context.SOURCE_INDEX.get(context.LIEUX[1]), 1);
}

for (const scienceAvailable of [true, false]) {
  const calls = [];
  const context = {globalSummaryStarted: false, globalSourcesReady: true, populationSourceReady: true,
    scienceSourceReady: false, SCIENCE: null, FIRE_WEATHER: null, FLOOD_HAZARDS: null,
    PAYS_POP: population, climateCoverage: null, console,
    createGlobalSummary: sources => { calls.push(sources); return Promise.resolve({}); },
    majSyntheseGlobale() {},
  };
  vm.createContext(context); vm.runInContext(summarySource, context);
  context.preparerSyntheseGlobale();
  assert.equal(calls.length, 0, 'Early regional failure must not snapshot pending science');
  if (scienceAvailable) context.SCIENCE = {climate: {available: true}};
  context.scienceSourceReady = true; context.preparerSyntheseGlobale(); await flush();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].climate, context.SCIENCE?.climate);
  assert.equal(calls[0].population, population);
  context.preparerSyntheseGlobale();
  assert.equal(calls.length, 1);
}
console.log('PASS directory readiness: both population orders, country identity, late science and failed science');

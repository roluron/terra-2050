import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {decodePlaceDirectory} from '../../place-search.mjs';
import {createPlaceLinks} from '../../place-links.mjs';

const directory = JSON.parse(fs.readFileSync(new URL('../../data/places.json', import.meta.url)));
const binary = fs.readFileSync(new URL('../../data/places.bin', import.meta.url));
const cities = decodePlaceDirectory(directory, binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength));
const countries = [...new Set(cities.map(place => place[1]))].map(iso => [iso, iso, 0, 0, 0, 2, iso]);
const links = createPlaceLinks(cities, countries);
for (const place of [...cities, ...countries]) {
  const params = new URLSearchParams(links.hash(place, 2042).slice(1));
  assert.equal(links.resolve(params), place);
  assert.equal(links.restoreRecent(links.recent(place)), place);
  assert.equal(params.get('an'), '2042');
}
const springfields = cities.filter(place => place[0] === 'Springfield' && place[1] === 'US');
assert(springfields.length > 1);
const pair = new URLSearchParams(links.hash(springfields[0], 2050, springfields[1]).slice(1));
assert.equal(links.resolve(pair, true), springfields[1]);
assert.equal(links.resolve(new URLSearchParams({v:'Springfield',cc:'US'})), null);
assert.equal(links.restoreRecent('Springfield|US'), null);
assert.equal(links.resolve(new URLSearchParams({v:'Paris',cc:'CA'})), null);
assert.equal(links.resolve(new URLSearchParams({v:'Paris',cc:'INVALID'})), null);
assert.equal(links.resolve(new URLSearchParams({v:'Paris',cc:'FR',p:'NaN,0'})), null);
const paris = links.resolve(new URLSearchParams({v:'Paris',cc:'FR'}));
assert(paris);
assert.equal(links.restoreRecent('Paris|FR'), paris);
const reordered = createPlaceLinks([...cities].reverse(), countries);
assert.equal(reordered.resolve(new URLSearchParams(links.hash(paris,2050).slice(1))), paris);
assert.equal(links.resolve(new URLSearchParams(links.hash(countries[0],2050).slice(1))), countries[0]);
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
function extract(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return html.slice(a, b);
}
const navigationSource = extract('function fermerDossier(depuisChamp){', '/* =====================================================================\n   PARTAGE')
  + extract('function majLien(immediat, pousser){', "document.getElementById('dossier-partage')")
  + extract("curseur.addEventListener('input'", 'const LARGEUR_INVITATION')
  + extract("addEventListener('popstate'", '/* ---- marqueur de la ville');
for (const hash of ['#v=Springfield&cc=US&an=2040', '#v=Missing&cc=US&an=2040', '#v=Paris&cc=FR&p=NaN,0&an=2040']) {
  const timers = new Map(), listeners = {}, classes = new Set(['dossier-ouvert']);
  let timerId = 0, selected = null, resultsShown = false;
  const element = () => ({classList: {remove() {}}, inert: false});
  const state = {URLSearchParams, Event, lieuDossier: paris, lieuVs: springfields[0], defiLien: null,
    liensLieux: links, estPays: place => place[5] === 2, etat: {annee: 2050, crise: true}, location: {hash},
    history: {replaceState() { assert.fail('An unresolved link must not rewrite history'); }},
    setTimeout: (fn, delay) => {timers.set(++timerId, {fn, delay});return timerId;}, clearTimeout: id => timers.delete(id),
    addEventListener: (event, fn) => {listeners[event] = fn;},
    curseur: {value: '2050', addEventListener: (event, fn) => {listeners['slider-' + event] = fn;},
      dispatchEvent: event => listeners['slider-' + event.type](), setAttribute() {}},
    champ: {value: 'Paris'}, dossierEl: element(), scrimEl: element(),
    document: {getElementById: element, body: {classList: {remove: key => classes.delete(key)}}},
    timelineRepere: {after() {}}, timelineEl: {}, storyOuvert: false, retourHistorique: false,
    minuterieLien: null, minuterieAnnonce: null, survolFige: false, EASE: '',
    SoundManager: {play() {}, stop() {}}, odoAn: {set() {}}, gsap: {to() {}}, T: () => ({distanceAn: () => ''}),
    choisirLieu: place => {selected = place;}, afficherResultats: () => {resultsShown = true;},
  };
  for (const name of ['arreterVolCamera', 'retirerMarqueur', 'calerTimeline', 'cacherSurvol', 'majDistanceAn',
    'majContexteCalques', 'majDossier', 'annoncer', 'actualiserSignalement', 'deployerRecherche']) state[name] = () => {};
  vm.createContext(state);vm.runInContext(navigationSource, state);
  state.majLien();
  assert.equal(timers.size, 1);
  listeners.popstate();
  assert.equal(state.lieuDossier, null, 'An unresolved link must close the previous city');
  assert.equal(classes.has('dossier-ouvert'), false);
  assert.equal(state.dossierEl.inert, true);
  assert.equal(state.etat.annee, 2040);
  assert.equal(state.lieuVs, null);
  assert.equal(state.defiLien, null);
  assert.equal(state.retourHistorique, false);
  assert.equal(resultsShown, true);
  assert.equal(selected, null);
  assert.equal(timers.size, 0, 'Previous city URL writes must be cancelled');
  assert.equal(state.location.hash, hash);
  state.location.hash = links.hash(springfields[0], 2037, springfields[1]);
  state.history.state = {terra: 'ville'};
  listeners.popstate();
  assert.equal(selected, springfields[0]);
  assert.equal(state.lieuVs, springfields[1]);
  assert.equal(state.etat.annee, 2037);
  assert.equal(state.interdirePile, true);
}
console.log(`PASS: ${cities.length} city and ${countries.length} country links and recents; ambiguous navigation cancels stale dossiers and URL writes; typed comparisons retain identity and year.`);

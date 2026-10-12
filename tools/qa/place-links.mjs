import assert from 'node:assert/strict';
import fs from 'node:fs';
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
console.log(`PASS: ${cities.length} city and ${countries.length} country links and recents round-trip; homonyms, invalid qualifiers, comparisons and reordered data.`);

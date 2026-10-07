import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = source.indexOf('  PAYS_LIGNES = Object.keys(VILLES_PAR_PAYS)');
const end = source.indexOf('  indexerVilles();', start);
assert.ok(start >= 0 && end > start);
for (const coverage of [null, {science: true}]) {
  const context = {
    VILLES_PAR_PAYS: {FR: [['Paris', 'FR', 48.86, 2.35, 2000000, 1, 'Paris', coverage]]},
    PAYS_POP: {FR: [68000000]},
    regionFr: new Intl.DisplayNames(['fr'], {type: 'region'}),
    regionEn: new Intl.DisplayNames(['en'], {type: 'region'}),
  };
  runInNewContext(source.slice(start, end), context);
  assert.equal(context.PAYS_LIGNES.length, 1);
  const place = context.PAYS_LIGNES[0];
  assert.equal(place[0], 'France');
  assert.equal(place[1], 'FR');
  assert.equal(place[5], 2);
  assert.equal(place[4], 68000000);
  assert.equal(place[2], 48.86);
}
console.log('Country details remain selectable with and without climate coverage: PASS');

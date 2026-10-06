import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {translations} from '../../locales/catalog.mjs';
for(const [language,text] of Object.entries(translations)){
 assert.ok(text.createdBy,language);
 assert.match(text.partagerSite,/fromearth/,language);
 assert.match(text.ui.terra2050_will_your_city_still,/^fromearth · 2050/,language);
}
const manifest=JSON.parse(await readFile(new URL('../../manifest.webmanifest',import.meta.url),'utf8'));
assert.equal(manifest.short_name,'fromearth');
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
assert.match(html,/href="https:\/\/fromanother\.love" target="_blank" rel="noopener"/);
assert.match(html,/assets\/fromearth-projections\.jpg/);
assert.doesNotMatch(html,/title: 'TERRA|partagerTexte\('TERRA/);
console.log('PASS fromearth identity, credit and eight languages');

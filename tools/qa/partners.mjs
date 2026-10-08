import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { copy } from '../../partners/copy.mjs';
import { translations } from '../../locales/catalog.mjs';

const page = new URL('../../partners/index.html', import.meta.url);
const html = await fs.readFile(page, 'utf8');
const keys = [...html.matchAll(/data-copy(?:-alt|-aria)?="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(Object.keys(copy.fr).sort(), Object.keys(copy.en).sort());
for (const locale of ['en', 'fr']) {
  for (const key of keys) assert.ok(copy[locale][key]?.trim(), `${locale}: missing ${key}`);
  const press = JSON.parse(await fs.readFile(new URL(`../../presskit/press-copy${locale === 'fr' ? '-fr' : ''}.json`, import.meta.url), 'utf8'));
  for (const key of ['aboutTitle', 'aboutIntro', 'aboutBody', 'aboutApproach', 'aboutLink']) assert.equal(press[key], copy[locale][key], `${locale}: inconsistent studio introduction`);
  for (const text of [copy[locale], press]) {
    assert.match(text === press ? text.credit : text.idea, /Robin Mahieux/);
    assert.match(text.aboutBody, /Vicki Dang and Robin Mahieux|Vicki Dang et Robin Mahieux/);
    const values = Object.values(text).filter(value => typeof value === 'string').join(' ');
    assert.doesNotMatch(values, /Robin M\./);
    assert.equal((values.match(/Robin Mahieux/g) || []).length, 2);
  }
  assert.match(copy[locale].lead, /future generations|générations futures/);
  assert.match(copy[locale].dataBody, /own datasets|jeux de données/);
  assert.doesNotMatch(Object.values(copy[locale]).join(' '), /Ingenium|\$|USD|€|upload/i);
}
for (const [locale, dictionary] of Object.entries(translations)) assert.ok(dictionary.ui.institutionPartners, `${locale}: missing settings label`);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.ok(ids.includes('about'));
const pressHtml = await fs.readFile(new URL('../../presskit/index.html', import.meta.url), 'utf8');
assert.match(pressHtml, /id="about"/);
assert.doesNotMatch(pressHtml, /Robin M\./);
assert.equal(new Set(ids).size, ids.length);
for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `Missing section ${target}`);
const resources = [...html.matchAll(/(?:href|src|poster)="([^"]+)"/g)].map(match => match[1]).filter(value => !/^(?:https?:|mailto:|#|\?)/.test(value));
for (const resource of resources) await fs.access(new URL(resource.split('?')[0], page));
const script = await fs.readFile(new URL('../../partners/partners.mjs', import.meta.url), 'utf8');
assert.match(script, /mailto:firstcontact@fromanother\.love\?subject=/);
assert.match(script, /encodeURIComponent\(text\.emailBody\)/);
if (process.env.URL0) {
  const url = new URL('/partners/', process.env.URL0);
  for (const resource of ['', ...resources]) {
    const response = await fetch(new URL(resource, url), { method: 'HEAD' });
    assert.equal(response.status, 200, resource || 'partners/');
  }
}
console.log(`PASS: bilingual copy, 8 settings locales, section navigation, ${resources.length} local resources and public email contact${process.env.URL0 ? ', served HTTP resources' : ''}`);

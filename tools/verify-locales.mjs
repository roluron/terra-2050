import assert from 'node:assert/strict';
import fs from 'node:fs';
import { translations } from '../locales/catalog.mjs';
assert.deepEqual(Object.keys(translations).sort(), ['en', 'es', 'fr', 'it', 'ja', 'vi', 'zh']);

const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
function verify(reference, value, path) {
  assert.equal(typeof value, typeof reference, path);
  if (typeof reference === 'string') {
    assert.ok(value.trim(), path);
    assert.deepEqual(placeholders(value), placeholders(reference), path);
  } else if (typeof reference === 'function') {
    assert.equal(value.length, reference.length, path);
    for (const n of [0, 1, -2, 50]) {
      const args = path.endsWith('panelSummary') ? ['Aridity'] : [n, 2050, 1, .1, 10, 2];
      const result = value(...args);
      assert.equal(typeof result, 'string', path);
      assert.ok(result.length && !/undefined|NaN|\[object Object\]/.test(result), path);
    }
  } else {
    assert.deepEqual(Object.keys(value).sort(), Object.keys(reference).sort(), path);
    for (const key of Object.keys(reference)) verify(reference[key], value[key], path + '.' + key);
  }
}
for (const [code, text] of Object.entries(translations)) {
  verify(translations.en, text, code);
  assert.equal(text.lang, code);
  for (const token of ['SSP3-7.0', 'RCP8.5', '22%', '18%', '12%', '20%', '16%']) assert.ok(text.panelMethodText.includes(token), code + ': ' + token);
}
const sources = ['index.html','earth-letter.js'].map(name => fs.readFileSync(new URL('../'+name, import.meta.url), 'utf8'));
const source = sources.join('\n');
for (const [index, code] of sources.entries()) for (const match of code.matchAll(/(?:T\(\)|\bt)\.([\w]+)(?:\.([\w]+))?/g)) {
  const value = (index === 0 ? translations.en : translations.en.ui)[match[1]];
  assert.notEqual(value, undefined, match[0]);
  if (match[2]) assert.notEqual(value[match[2]], undefined, match[0]);
}
for (const match of source.matchAll(/(?:data-t="|data-ui="|message\(')([\w]+)/g)) {
  const dictionary = match[0].startsWith('data-t=') ? translations.en : translations.en.ui;
  assert.notEqual(dictionary[match[1]], undefined, match[0]);
}
if (process.argv.includes('--autotest')) {
  const broken = {...translations.fr}; delete broken.panelMethod;
  assert.throws(() => verify(translations.en, broken, 'missing key'));
  assert.throws(() => verify(translations.en.ui.comparePrompt, 'City', 'missing placeholder'));
  assert.throws(() => verify(translations.en.panelSummary, () => 'undefined', 'bad function'));
  console.log('PASS missing keys, placeholders and invalid functions are rejected');
}
console.log('PASS complete locale schemas, UI references, interpolation and scientific scenario identifiers: ' + Object.keys(translations).join(', '));

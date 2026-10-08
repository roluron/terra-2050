import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const imports = ['index.html', 'earth-letter.js', 'city-comparison.mjs'].flatMap(file =>
  [...readFileSync(new URL('../../' + file, import.meta.url), 'utf8').matchAll(/from\s+['"]([^'"]*i18n\.mjs[^'"]*)['"]/g)]
    .map(match => new URL(match[1], 'https://fromearth.love/').href));
assert.equal(imports.length, 3);
assert.equal(new Set(imports).size, 1, 'Language state and introduction callback must share one module instance');
console.log('PASS: globe, introduction and comparison share one language module');

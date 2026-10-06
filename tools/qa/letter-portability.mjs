import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../earth-letter.js', import.meta.url), 'utf8');
const declarations = source.match(/const signs = .*;\nconst cuneiform = .*;/)[0];
const glyphs = vm.runInNewContext(declarations + '\n[...signs,...cuneiform]');
const orb = await readFile(new URL('../../earth-orb.mjs', import.meta.url), 'utf8');
glyphs.push(...vm.runInNewContext(orb.match(/const symbols = .*;/)[0] + '\nsymbols'));
assert.ok(glyphs.every(glyph => !/\p{Emoji}/u.test(glyph)), 'Intro symbols must not select mobile emoji fonts');
const segmenter = source.match(/  const segmenter = .*;/)[0];
const segments = source.slice(source.indexOf('    const segments ='), source.indexOf('    for (const text of segments)'));
for (const locale of ['fr', 'en', 'ja', 'zh', 'zh-Hant', 'vi', 'it', 'es']) {
  const text = ['ja', 'zh', 'zh-Hant'].includes(locale) ? '你好，地球！こんにちは。' : 'Bonjour, humain. Tu laisses une trace.';
  for (const IntlValue of [Intl, {}]) {
    const result = vm.runInNewContext(segmenter + '\n' + segments + '\nsegments', { Intl: IntlValue, language: () => locale, node: { textContent: text } });
    assert.equal(result.join(''), text);
    assert.ok(result.length > 1);
  }
}
const handler = source.slice(source.indexOf("window.addEventListener('pagehide'"));
let onHide, stopped = 0, intervals = 0, timeouts = 0;
vm.runInNewContext(handler, { window: { addEventListener: (name, fn) => { onHide = fn; } },
  codeTimer: 1, recoveryTimer: 2, clearInterval: () => intervals++, clearTimeout: () => timeouts++, stopOrb: () => stopped++ });
onHide({ persisted: true });
assert.deepEqual([stopped, intervals, timeouts], [0, 0, 0]);
onHide({ persisted: false });
assert.deepEqual([stopped, intervals, timeouts], [1, 1, 1]);
const proximity = source.slice(source.indexOf('function revealNearPointer('), source.indexOf("document.getElementById('earth-letter-main').addEventListener('pointermove'"));
let revealed = 0;
const context = vm.createContext({ letterReady: false, pointerReady: false, reveal: () => revealed++,
  words: [{ started: false, word: { getBoundingClientRect: () => ({ left: 10, right: 20, top: 10, bottom: 20 }) } }] });
vm.runInContext(proximity, context);
context.revealNearPointer({ clientX: 35, clientY: 15 }); assert.equal(revealed, 0);
context.letterReady = true;
context.revealNearPointer({ clientX: 35, clientY: 15 }); assert.equal(revealed, 1);
context.revealNearPointer({ clientX: 100, clientY: 100 }); assert.equal(revealed, 1);
console.log('PASS: non-emoji glyphs, eight locales with/without Segmenter, cached-page lifecycle and nearby touch targets');

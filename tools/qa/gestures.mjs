import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const start = source.indexOf('  let presse = null;');
const end = source.indexOf("  survolEl.addEventListener('click'", start);
assert.ok(start >= 0 && end > start);
const handlers = new Map();
const observed = [];
vm.runInNewContext(source.slice(start, end), {
  Set, Math, performance: { now: () => 100 },
  toile: { addEventListener: (name, fn) => handlers.set(name, fn) },
  cacherSurvol: () => {}, montrerSurvol: () => observed.push('tooltip'),
  sousPointeur: () => ({ ville: ['Paris'] }), choisirLieu: () => observed.push('open'),
});
const send = (event, id, x, type = 'touch') => handlers.get(event)({ pointerId: id, clientX: x, clientY: 100, pointerType: type });
send('pointerdown', 1, 100); send('pointerup', 1, 100);
assert.deepEqual(observed.splice(0), ['tooltip']);
send('pointerdown', 1, 100); send('pointermove', 1, 160); send('pointermove', 1, 100); send('pointerup', 1, 100);
assert.deepEqual(observed.splice(0), []);
send('pointerdown', 1, 100); send('pointerdown', 2, 130); send('pointermove', 1, 70); send('pointerup', 2, 130); send('pointerup', 1, 70);
assert.deepEqual(observed.splice(0), []);
send('pointerdown', 1, 100); send('pointercancel', 1, 100); send('pointerup', 1, 100);
assert.deepEqual(observed.splice(0), []);
send('pointerdown', 1, 100, 'mouse'); send('pointerup', 1, 100, 'mouse');
assert.deepEqual(observed.splice(0), ['open']);
send('pointerdown', 1, 100, 'mouse'); send('pointermove', 1, 160, 'mouse'); send('pointermove', 1, 100, 'mouse'); send('pointerup', 1, 100, 'mouse');
assert.deepEqual(observed.splice(0), []);
console.log('PASS actual pointer handlers: tap, returning drag, pinch, cancellation, mouse click, returning mouse drag');

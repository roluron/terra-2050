import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {loadSource} from '../../load-source.mjs';

const original = {fetch, setTimeout, clearTimeout};
const timers = new Map();
let now = 0, nextId = 0, signal, body;
globalThis.setTimeout = (callback, duration) => {
  assert.ok(duration === 30000 || duration === 120000);
  timers.set(++nextId, {callback, at: now + duration});
  return nextId;
};
globalThis.clearTimeout = id => timers.delete(id);
const advance = duration => {
  const until = now + duration;
  for (;;) {
    const next = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break;
    now = next[1].at;timers.delete(next[0]);next[1].callback();
  }
  now = until;
};
const flush = () => new Promise(setImmediate);
const aborted = current => new Promise((resolve, reject) => current.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError'))));
const streamed = async (path, options) => {
  signal = options.signal;
  return new Response(new ReadableStream({start(controller) {
    body = controller;
    signal.addEventListener('abort', () => controller.error(new DOMException('Timed out', 'AbortError')));
  }}));
};
try {
  globalThis.fetch = (path, options) => {signal = options.signal;return aborted(signal);};
  const headers = loadSource('/stall');advance(30000);
  await assert.rejects(headers, {name: 'AbortError'});assert.equal(timers.size, 0);

  globalThis.fetch = streamed;
  const stalled = loadSource('/body-stall');await flush();advance(30000);
  await assert.rejects(stalled, {name: 'AbortError'});assert.equal(timers.size, 0);

  let respond;
  globalThis.fetch = (path, options) => new Promise(resolve => {respond = () => resolve(streamed(path, options));});
  const lateHeaders = loadSource('/late-headers');advance(20000);respond();await flush();
  advance(20000);assert.equal(signal.aborted, false);
  body.enqueue(new Uint8Array());await flush();advance(10000);
  await assert.rejects(lateHeaders, {name: 'AbortError'});assert.equal(timers.size, 0);
  globalThis.fetch = streamed;

  for (const mode of ['json', 'gzip']) {
    const payload = mode === 'json' ? '{"answer":42}' : 'complete scientific payload';
    const bytes = mode === 'json' ? new TextEncoder().encode(payload) : gzipSync(payload);
    const result = loadSource('/progress', mode);await flush();
    const split = Math.floor(bytes.length / 3);
    body.enqueue(bytes.subarray(0, split));await flush();
    advance(20000);body.enqueue(bytes.subarray(split, split * 2));await flush();
    advance(20000);assert.equal(signal.aborted, false);
    body.enqueue(bytes.subarray(split * 2));body.close();
    const value = await result;
    if (mode === 'json') assert.deepEqual(value, {answer: 42});
    else assert.equal(new TextDecoder().decode(value), payload);
    assert.equal(timers.size, 0);
  }

  const drip = loadSource('/endless-progress', 'arrayBuffer');drip.catch(() => {});await flush();
  for (let i = 0; i < 6; i++) {advance(19000);body.enqueue(Uint8Array.of(i));await flush();}
  assert.equal(signal.aborted, false);advance(6000);
  await assert.rejects(drip, {name: 'AbortError'});assert.equal(timers.size, 0);

  globalThis.fetch = async () => new Response('missing', {status: 404});
  await assert.rejects(loadSource('/missing'), /404/);assert.equal(timers.size, 0);
  globalThis.fetch = async () => new Response('{"ok":true}');
  assert.deepEqual(await loadSource('/json'), {ok: true});assert.equal(timers.size, 0);
  globalThis.fetch = async () => new Response(gzipSync('complete scientific payload'));
  assert.equal(new TextDecoder().decode(await loadSource('/compressed', 'gzip')), 'complete scientific payload');
  assert.equal(timers.size, 0);
  globalThis.fetch = async () => new Response('broken gzip');
  await assert.rejects(loadSource('/broken', 'gzip'));assert.equal(timers.size, 0);
  console.log('PASS: 30s header/body inactivity, progressing JSON/gzip beyond 30s, 120s hard ceiling, HTTP/gzip errors and timer cleanup.');
} finally {Object.assign(globalThis, original);}

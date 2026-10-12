import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {loadSource} from '../../load-source.mjs';

const original = {fetch, setTimeout, clearTimeout};
let expire, cleared, signal;
globalThis.setTimeout = (callback, duration) => {assert.equal(duration,30000);expire=callback;cleared=false;return 1;};
globalThis.clearTimeout = () => {cleared=true;};
const aborted = current => new Promise((resolve,reject) => current.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError'))));
try {
  globalThis.fetch = (path, options) => {signal=options.signal;return aborted(signal);};
  const pending = loadSource('/stall'); expire();
  await assert.rejects(pending,{name:'AbortError'}); assert(cleared);
  globalThis.fetch = async (path, options) => {signal=options.signal;return {ok:true,json:()=>aborted(signal)};};
  const body = loadSource('/body-stall'); await Promise.resolve(); expire();
  await assert.rejects(body,{name:'AbortError'}); assert(cleared);
  globalThis.fetch = async () => new Response('missing',{status:404});
  await assert.rejects(loadSource('/missing'),/404/); assert(cleared);
  globalThis.fetch = async () => new Response('{"ok":true}');
  assert.deepEqual(await loadSource('/json'),{ok:true}); assert(cleared);
  globalThis.fetch = async () => new Response(gzipSync('complete scientific payload'));
  assert.equal(new TextDecoder().decode(await loadSource('/compressed','gzip')),'complete scientific payload'); assert(cleared);
  console.log('PASS: acquisition and body timeouts, HTTP errors, JSON, gzip, timer cleanup.');
} finally { Object.assign(globalThis,original); }

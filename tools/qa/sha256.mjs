import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { sha256 } from '../../sha256.mjs';

const root = new URL('../../', import.meta.url);
const inputs = [Buffer.alloc(0), Buffer.from('abc'), Buffer.alloc(1_000_000, 97),
  ...[1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 4097].map(length =>
    Uint8Array.from({ length }, (_, index) => (index * 31 + 17) % 256))];
const sliced = Uint8Array.from({ length: 201 }, (_, index) => index);
inputs.push(sliced.subarray(5, 188), new DataView(sliced.buffer, 7, 179));
for (const name of ['places.json', 'places.bin', 'flood-cities.bin', 'climate-points.bin']) {
  const bytes = await fs.readFile(new URL(`data/${name}`, root));
  inputs.push(bytes);
  if (name.endsWith('.bin') && name !== 'places.bin') inputs.push(gunzipSync(bytes));
}
const expected = inputs.map(input => createHash('sha256')
  .update(ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : input).digest('hex'));
assert.equal(expected[0], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
assert.equal(expected[1], 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(expected[2], 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
for (const crypto of [webcrypto, undefined, {}]) {
  Object.defineProperty(globalThis, 'crypto', { value: crypto, configurable: true });
  for (let i = 0; i < inputs.length; i++) {
    assert.equal(await sha256(inputs[i]), expected[i], `input ${i}; native=${!!crypto?.subtle}`);
    const bytes = new Uint8Array(inputs[i].buffer, inputs[i].byteOffset, inputs[i].byteLength);
    assert.equal(await sha256(bytes.slice().buffer), expected[i]);
  }
}
await assert.rejects(sha256('invalid'), TypeError);
let yielded = false;
setTimeout(() => { yielded = true; }, 0);
await sha256(Buffer.alloc(1_000_000));
assert.equal(yielded, true);
console.log(JSON.stringify({ status: 'PASS', vectors: inputs.length, branches: ['native', 'no crypto', 'no subtle'], yielded }));

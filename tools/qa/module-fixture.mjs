import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {injectModule} from './entrance.cjs';

const fixture = '<script type="importmap">{}</script><script type="module">const local=42;</script><script type="module" src="./external.mjs"></script>';
const modified = injectModule(fixture, 'globalThis.fixtureProbe=()=>local;');
const start = modified.indexOf('<script type="module">') + '<script type="module">'.length;
const context = {};
vm.runInNewContext(modified.slice(start, modified.indexOf('</script>', start)), context);
assert.equal(context.fixtureProbe(), 42);
assert(modified.endsWith('<script type="module" src="./external.mjs"></script>'));
assert.throws(() => injectModule('<script type="module" src="./external.mjs"></script>', ''), /target missing/);
assert.throws(() => injectModule('<script type="module">', ''), /target missing/);
const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const injected = injectModule(source, 'globalThis.fixtureProbe=true;');
assert(injected.indexOf('globalThis.fixtureProbe=true;') < injected.indexOf('</script>', injected.indexOf('<script type="module">')));
console.log('PASS: probes use inline module scope, preserve external scripts and reject absent targets');

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadScientificMetrics} from '../../../science-metrics.mjs';
import {physicalHover} from '../../../hover-diagnostic.mjs';

// Recalculate presentation statistics only. The validated score/coverage
// results are retained, avoiding another full score evaluation.
const root = new URL('../../../', import.meta.url);
globalThis.fetch = async path => new Response(await fs.readFile(new URL(path, root)));
const science = await loadScientificMetrics();
const names = JSON.parse(await fs.readFile(new URL('data/places.json', root))).villes;
const coordinates = await fs.readFile(new URL('data/places.bin', root));
const axes = ['thermique','eau','feux','mer','fleuves','stabilite'];
const isLiteralZero = text => /^0 (?!<)/.test(text);
const stats = Object.fromEntries(axes.map(axis => [axis, {
  available: 0, nonzeroChanges: 0, nonzeroLevels: 0,
  nonzeroDeltaRoundedToZeroInHover: 0, nonzeroLevelRoundedToZeroInHover: 0,
  boundedSmallPositiveDeltas: 0, boundedSmallNegativeDeltas: 0, boundedSmallLevels: 0,
}]));
const failures = [], boundedExamples = [];
for(let year = 2026; year <= 2050; year++) {
  for(let index = 0; index < names.length; index++) {
    const readings = science.forCity(index, coordinates.readInt16LE(index*24)/100,
      coordinates.readInt16LE(index*24+2)/100, year);
    for(const axis of axes) {
      const reading = readings[axis], stat = stats[axis];
      if(!reading.available) continue;
      stat.available++;
      const delta = reading.value - reading.baseline;
      if(delta !== 0) stat.nonzeroChanges++;
      if(reading.value !== 0) stat.nonzeroLevels++;
      // Values whose two-decimal rounded number is nonzero cannot print
      // literal zero. Only the potential zero candidates need formatting.
      if(delta !== 0 && Number(delta.toFixed(2)) === 0) {
        const formatted = physicalHover(reading, year, true, 'en', reading.unit).value;
        if(isLiteralZero(formatted)) {
          stat.nonzeroDeltaRoundedToZeroInHover++;
          failures.push({ index, axis, year, delta, formatted });
        } else {
          assert.ok(formatted.includes('<') && formatted.includes('Δ'), 'Small delta has an explicit bound');
          stat[delta > 0 ? 'boundedSmallPositiveDeltas' : 'boundedSmallNegativeDeltas']++;
          if(boundedExamples.length < 12) boundedExamples.push({ name: names[index][4],
            iso: names[index][1], axis, year, delta, formatted });
        }
      }
      if(reading.value !== 0 && Number(reading.value.toFixed(2)) === 0) {
        const formatted = physicalHover(reading, year, false, 'en', reading.unit).value;
        if(isLiteralZero(formatted)) {
          stat.nonzeroLevelRoundedToZeroInHover++;
          failures.push({ index, axis, year, value: reading.value, formatted });
        } else {
          assert.ok(formatted.includes('<') || formatted.includes('>'), 'Small level has an explicit bound');
          stat.boundedSmallLevels++;
        }
      }
    }
    if(index % 1024 === 1023) await new Promise(resolve => setTimeout(resolve, 0));
  }
  console.log(JSON.stringify({ year, cityCases: names.length, failures: failures.length }));
}
const path = new URL('results.json', import.meta.url);
const results = JSON.parse(await fs.readFile(path));
for(const axis of axes) {
  assert.equal(stats[axis].available, results.perAxis[axis].available,
    `${axis}: same available readings as the complete numerical audit`);
  results.perAxis[axis].nonzeroDeltaRoundedToZeroInHover = stats[axis].nonzeroDeltaRoundedToZeroInHover;
  results.perAxis[axis].nonzeroLevelRoundedToZeroInHover = stats[axis].nonzeroLevelRoundedToZeroInHover;
}
// The old examples were bounded positive changes mistakenly classified by
// startsWith('0 '). Keep only genuine literal-zero failures in this field.
results.roundedZeroExamples = failures.slice(0, 24);
results.status = results.issues.length || failures.length ? 'FAIL' : 'PASS_LOADED_DATA_AND_FORMATTING';
if(results.invariantProbe.countryScore === results.invariantProbe.expected) {
  results.invariantProbe.note = 'Corrected regression probe: a missing city score remains a missing country score; no coercion to zero.';
}
const formatterBytes = await fs.readFile(new URL('hover-diagnostic.mjs', root));
const indexBytes = await fs.readFile(new URL('index.html', root));
results.formatterAudit = { recalculatedAt: new Date().toISOString(),
  cases: names.length * 25,
  method: 'Raw scientific readings for all cities/years; literal-zero test /^0 (?!<)/. Only nonzero values that round numerically to zero require formatting; explicit bounds are not zeros.',
  priorDiagnostic: "The old startsWith('0 ') diagnostic is obsolete after bounded text. Its positive-bound counts were false positives, not remaining defects.",
  formatterSha256: createHash('sha256').update(formatterBytes).digest('hex'),
  runtimeIndexSha256: createHash('sha256').update(indexBytes).digest('hex'),
  stats, boundedExamples, failures,
};
await fs.writeFile(path, JSON.stringify(results, null, 2) + '\n');
await fs.writeFile(new URL('rounding-statistics.json', import.meta.url),
  JSON.stringify(results.formatterAudit, null, 2) + '\n');
assert.equal(failures.length, 0, 'No nonzero value or change may print as literal zero');
console.log(JSON.stringify({ status: 'PASS', cases: names.length * 25,
  literalZeroFailures: failures.length,
  boundedChanges: Object.fromEntries(axes.map(axis => [axis,
    stats[axis].boundedSmallPositiveDeltas + stats[axis].boundedSmallNegativeDeltas])),
}, null, 2));

// Run from repo root: node audit/2026-10-01/floods/check_runtime.mjs
// Exhaustive consumer comparison against simple independently evaluated equations.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { floodCityAtYear, floodAtYear } from '../../../flood-data.mjs';

const root = new URL('../../../', import.meta.url);
const get = file => readFile(new URL(file, root));
const citymeta = JSON.parse(await get('data/flood-cities.json'));
const meta = JSON.parse(await get('data/flood-metadata.json'));
const decode = bytes => new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const city = {metadata: citymeta, values: decode(gunzipSync(await get('data/flood-cities.bin')))};
const grids = {};
for (const hazard of ['coast', 'river']) grids[hazard] = {metadata: {...meta, ...meta.hazards[hazard]}, values: decode(gunzipSync(await get(`data/flood-${hazard}.bin`)))};
const av = xs => xs.reduce((s,x) => s+x,0) / xs.length;
const percentile = (xs,q) => {
  const sorted = [...xs].sort((a,b) => a-b), k = (xs.length-1)*q;
  return sorted[Math.floor(k)]*(1-(k%1)) + sorted[Math.ceil(k)]*(k%1);
};
let checks = 0;
let precisionAmbiguousAgreement = 0;
const close = (a,b) => { assert.ok(Number.isFinite(a) && Math.abs(a-b)<1e-10, `${a} != ${b}`); checks++; };
function expected(records, year, hazard, unit) {
  const start = hazard === 'river' ? 1980 : 1996.5;
  const b = records.map(row => row[0] + (row[1]-row[0])*(2026-start)/(2030-start));
  const current = records.map(row => year<2030 ? row[0]+(row[1]-row[0])*(year-start)/(2030-start) : row[1]+(row[2]-row[1])*(year-2030)/20);
  const paired = current.map((v,i) => v-b[i]);
  const change = av(paired);
  return {value:av(current), baseline:av(b), future:av(records.map(x=>x[2])), change,
          p10:hazard==='river'?percentile(paired,.1):null,p90:hazard==='river'?percentile(paired,.9):null,
          agreement:hazard==='river'?paired.filter(v=>Math.sign(v)===Math.sign(change)).length/paired.length:null,
          precisionAmbiguous: Math.abs(change)<1e-12 || paired.some(v=>Math.abs(v)<1e-12),unit};
}
function checkAgreement(actual,ex) {
  if (Math.abs(actual-ex.agreement)>1e-10 && ex.precisionAmbiguous) {precisionAmbiguousAgreement++;return;}
  close(actual,ex.agreement);
}
function verify(actual, records, year, hazard) {
  assert.equal(actual.available, Boolean(records.length)); checks++;
  if (!records.length) { assert.equal(actual.value,null); checks++; return; }
  const ex = expected(records, year, hazard, 'm');
  for (const f of ['value','baseline','future','change']) close(actual[f], ex[f]);
  for (const f of ['p10','p90']) if(hazard==='river') close(actual[f],ex[f]); else {assert.equal(actual[f],null);checks++;}
  if(hazard==='river')checkAgreement(actual.agreement,ex);else {assert.equal(actual.agreement,null);checks++;}
  assert.equal(actual.modelCount,records.length); assert.equal(actual.returnPeriodYears,100);
  assert.equal(actual.scenario,'rcp8p5'); assert.equal(actual.annualForecast,false); checks+=4;
}
const results = {};
for (const hazard of ['coast','river']) {
  const sources=citymeta.sources.filter(s=>s.hazard===hazard);
  const historical=sources.find(s=>s.epoch==='historical');
  const models=sources.filter(s=>s.epoch===2050).map(s=>s.model);
  const fields=citymeta.fields;
  const sourceGroups=models.map(model => [historical, ...[2030,2050].map(epoch => sources.find(s=>s.epoch===epoch && s.model===model))]);
  const availableFields=sourceGroups.map(group=>group.map(s=>fields.indexOf(s.availability_field)));
  const depthFields=sourceGroups.map(group=>group.map(s=>fields.indexOf(s.depth_field)));
  let cityCalls=0;
  for(let i=0;i<citymeta.count;i++) {
    const row=i*fields.length;
    const records=depthFields.filter((_,m)=>availableFields[m].every(f=>city.values[row+f]===1)).map(fs=>fs.map(f=>city.values[row+f]));
    // All annual years, plus anchors and one decimal year, not just endpoints.
    for(const year of [hazard==='river'?1980:1996.5,...Array.from({length:25},(_,n)=>2026+n),2038.25]) {
      verify(floodCityAtYear(city,i,year,hazard),records,year,hazard); cityCalls++;
    }
  }
  const grid=grids[hazard], fm=grid.metadata.fields;
  const index=f=>fm.indexOf(f), stride=fm.length;
  const modelNames=hazard==='river'?grid.metadata.models:['coastal-median'];
  const modelDepthFields=modelNames.map(model => (hazard==='river'?['historical',`near_model_${model}`,`model_${model}`]:['historical','near','future']).map(p=>index(`${p}_mean_depth_m`)));
  const modelFractionFields=modelNames.map(model => (hazard==='river'?['historical',`near_model_${model}`,`model_${model}`]:['historical','near','future']).map(p=>index(`${p}_fraction_gt_0_5m`)));
  let gridCalls=0;
  for(let cell=0;cell<720*360;cell++) {
    const row=cell*stride, available=grid.values[row+index('coverage')]>0;
    const records=available?modelDepthFields.map(fs=>fs.map(f=>grid.values[row+f])):[];
    const fractions=available?modelFractionFields.map(fs=>fs.map(f=>grid.values[row+f])):[];
    const lat=90-(Math.floor(cell/720)+.5)/2,lon=-180+(cell%720+.5)/2;
    for(const year of [2026,2030,2038.25,2050]) {
      const actual=floodAtYear(grid,lat,lon,year,hazard);
      verify(actual,records,year,hazard); gridCalls++;
      if(fractions.length) {
        const ex=expected(fractions,year,hazard,'fraction');
        for(const [field,ef] of [['fraction','value'],['baselineFraction','baseline'],['futureFraction','future'],['fractionChange','change']]) close(actual[field],ex[ef]);
        if(hazard==='river') {
          close(actual.fractionP10,ex.p10);close(actual.fractionP90,ex.p90);checkAgreement(actual.fractionAgreement,ex);
        }
      }
    }
  }
  results[hazard]={cityCalls,gridCalls};
  console.log(`PASS ${hazard}: ${cityCalls} native-city and ${gridCalls} containing-grid-cell outputs`);
}
await writeFile(new URL('./runtime-results.json', import.meta.url),JSON.stringify({scope:'shipped payload arithmetic only; source TIFFs not independently validated',checks,precisionAmbiguousAgreement,results},null,2)+'\n');
console.log(`PASS ${checks} assertions: yearly/intermediate interpolation, physical units, paired model spread/sign, missing vs zero; ${precisionAmbiguousAgreement} agreement differences at floating-point-scale change/sign boundaries`);

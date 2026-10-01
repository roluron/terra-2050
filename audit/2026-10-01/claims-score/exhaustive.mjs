import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadScientificMetrics} from '../../../science-metrics.mjs';
import {physicalHover} from '../../../hover-diagnostic.mjs';

// Read-only audit: fetch published local data without a browser or network.
const root = new URL('../../../', import.meta.url);
globalThis.fetch = async path => new Response(await fs.readFile(new URL(path, root)));
const source = await fs.readFile(new URL('index.html', root), 'utf8');
const sci = await loadScientificMetrics();
const names = JSON.parse(await fs.readFile(new URL('data/places.json', root))).villes;
const coords = await fs.readFile(new URL('data/places.bin', root));
const population = JSON.parse(await fs.readFile(new URL('data/population-annual.json', root)));
const sourceIndex = new WeakMap();
const cities = names.map((n,i) => {
  const city = [n[0],n[1],coords.readInt16LE(i*24)/100,coords.readInt16LE(i*24+2)/100,n[2],n[3],n[4],sci.coverage[i]===63];
  sourceIndex.set(city,i);return city;
});
const axes = ['thermique','eau','feux','mer','fleuves','stabilite'];
const weights = [.22,.18,.12,.20,.16,.12];
const byCountry = Object.groupBy(cities,c => c[1]);
let currentReading;
const context = vm.createContext({SCIENCE:sci,SOURCE_INDEX:sourceIndex,SCORE_CACHE:new Map(),
  CRITERES:axes.map((cle,i) => ({cle,poids:weights[i]})),POIDS_TOTAL:1,LAMBDA_PIRE:.5,
  VILLES_PAR_PAYS:byCountry,_memoPays:new Map(),mesuresLieu:()=>currentReading,
});
for(const [start,end] of [
  ['function penalitePhysique(', 'function unavailableScienceText('],
  ['function indiceHabitabiliteVille(', 'const niveauDe ='],
  ['function indicePays(', 'const COUNTRY_NOTES_CACHE'],
]) vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))),context);

// Independent equation from explicit physical values and the documented scales.
const independentPenalty = (key,v) => Math.min(1,Math.max(0,
  key==='thermique'?(v-20)/30:key==='eau'?1-v/60:key==='feux'?v/366:key==='stabilite'?v/5:v/3));
const perAxis = Object.fromEntries(axes.map(a => [a,{
  available:0,missing:0,native:0,regional:0,min:Infinity,max:-Infinity,
  nonzeroDeltaRoundedToZeroInHover:0,nonzeroLevelRoundedToZeroInHover:0,
  negativeChanges:0,zeroChanges:0,positiveChanges:0,
}]));
// Positive bounded text starts with "0 <" and must not be classified as
// the literal numeric zero followed by a unit.
const isLiteralZero = value => /^0 (?!<)/.test(value);
let completeCases=0,unavailableCases=0,numericScoreCases=0;
const issues=[],informational=[],examples=[],countrySummary=[];
for(let year=2026;year<=2050;year++){
  const yearScores=new Map();
  for(let i=0;i<cities.length;i++){
    const city=cities[i],reading=sci.forCity(i,city[2],city[3],year);
    currentReading=reading;
    const actual=context.indiceHabitabiliteVille(city,year);
    const complete=axes.every(a => reading[a].available);
    if(complete)completeCases++;else unavailableCases++;
    if(Number.isFinite(actual))numericScoreCases++;
    if(complete){
      const penalties=axes.map(a=>independentPenalty(a,reading[a].value));
      const expected=Math.round(100*(1-(penalties.reduce((s,p,j)=>s+p*weights[j],0)+Math.max(...penalties))/2));
      if(actual!==expected)issues.push({type:'score-equation',i,year,actual,expected});
      if(!(actual>=0&&actual<=100))issues.push({type:'score-range',i,year,actual});
    }else if(actual!==null)issues.push({type:'missing-data-numeric-score',i,year,actual});
    if(complete !== Boolean(city[7]))issues.push({type:'coverage-flag-year-instability',i,year,complete,flag:city[7]});
    yearScores.set(city,actual);
    for(const a of axes){
      const s=perAxis[a],r=reading[a];
      if(!r.available){
        s.missing++;
        // A metric can retain a usable current level while lacking a comparable
        // baseline or future level. Availability is authoritative; no numeric
        // score or display may be inferred from the isolated current value.
        if(r.value!==null)informational.push({type:'unavailable-finite-current-level',i,year,a,value:r.value});
        continue;
      }
      s.available++;s[r.regionalFallback?'regional':'native']++;
      s.min=Math.min(s.min,r.value);s.max=Math.max(s.max,r.value);
      const delta=r.value-r.baseline;
      s[delta<0?'negativeChanges':delta>0?'positiveChanges':'zeroChanges']++;
      if(![r.value,r.baseline,r.future,r.change].every(Number.isFinite))issues.push({type:'available-non-finite',i,year,a});
      if(year===2026&&delta!==0)issues.push({type:'baseline-nonzero-change',i,a,delta});
      if(Math.abs(r.change-delta)>1e-4)issues.push({type:'change-differs-from-level-reference',i,year,a,delta,change:r.change});
      const zeroHover=isLiteralZero(physicalHover(r,year,true,'en',r.unit).value);
      if(delta!==0&&zeroHover){s.nonzeroDeltaRoundedToZeroInHover++;if(examples.length<24)examples.push({name:city[6],iso:city[1],axis:a,year,baseline:r.baseline,value:r.value,delta,display:physicalHover(r,year,true,'en',r.unit)});}
      if(r.value!==0&&isLiteralZero(physicalHover(r,year,false,'en',r.unit).value))s.nonzeroLevelRoundedToZeroInHover++;
    }
    if(i%1024===1023)await new Promise(r=>setTimeout(r,0));
  }
  for(const [iso,list] of Object.entries(byCountry)){
    let sum=0,weight=0;
    for(const c of list){const score=yearScores.get(c);if(Number.isFinite(score)){sum+=score*c[4];weight+=c[4];}}
    const expected=weight?Math.round(sum/weight):null;
    const actual=context.indicePays(iso,year);
    if(actual!==expected)issues.push({type:'country-score',iso,year,actual,expected});
    if(year===2050){
      const available=Object.fromEntries(axes.map(a=>[a,{cities:0,regional:0,weight:0,baseline:0,value:0,change:0}]));
      let listedPopulation=0;
      for(const c of list){listedPopulation+=c[4];const index=sourceIndex.get(c);const r=sci.forCity(index,c[2],c[3],year);
        for(const a of axes){if(!r[a].available)continue;const x=available[a];x.cities++;x.regional+=Number(r[a].regionalFallback);x.weight+=c[4];x.baseline+=r[a].baseline*c[4];x.value+=r[a].value*c[4];x.change+=r[a].change*c[4];}
      }
      for(const a of axes){const x=available[a];for(const f of ['baseline','value','change'])x[f]=x.weight?x[f]/x.weight:null;}
      countrySummary.push({iso,listedCities:list.length,completeCities:list.filter(c=>c[7]).length,
        listedPopulation,un2026:population[iso]?.[1]??null,listedPopulationOverUn2026:population[iso]?.[1]?listedPopulation/population[iso][1]:null,
        score2050:actual,available});
    }
  }
  context.SCORE_CACHE.clear();
  console.log(JSON.stringify({year,cityCases:cities.length,issues:issues.length}));
}
// Explicit invariant breach: does the national implementation coerce missing to zero?
const probeCity=['Audit','XX',0,0,1000,0,'Audit',true];
const failedContext=vm.createContext({_memoPays:new Map(),VILLES_PAR_PAYS:{XX:[probeCity]},indiceHabitabiliteVille:()=>null});
vm.runInContext(source.slice(source.indexOf('function indicePays('),source.indexOf('const COUNTRY_NOTES_CACHE')),failedContext);
const invariantProbe={cityScore:null,countryScore:failedContext.indicePays('XX',2050),expected:null,
  note:'This is a defensive failure-path issue, not observed in the complete loaded dataset.'};
const output={revision:'57a0757d101a51206ba9758cfb59cbe45e0d35b2',generatedAt:new Date().toISOString(),
  audit:'Read-only numerical/communication audit, not external scientific validation',
  cases:cities.length*25,completeCases,unavailableCases,numericScoreCases,perAxis,issues,informational,
  roundedZeroExamples:examples,invariantProbe,countrySummary};
await fs.writeFile(new URL('results.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
assert.equal(issues.length,0,'Loaded-data numerical invariants failed; see results.json');
console.log(JSON.stringify({status:'PASS_LOADED_DATA',cases:output.cases,completeCases,unavailableCases,
  roundedNonzeroDeltas:Object.fromEntries(axes.map(a=>[a,perAxis[a].nonzeroDeltaRoundedToZeroInHover])),
  results:fileURLToPath(new URL('results.json',import.meta.url)),invariantProbe},null,2));

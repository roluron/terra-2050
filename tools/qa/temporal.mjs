import fs from 'node:fs';
import { enter } from './entrance.cjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.QA_SORTIE || '/tmp/terra-temporal';fs.mkdirSync(out,{recursive:true});
const base=process.env.URL0 || 'http://localhost:8080/';
const browser=await chromium.launch({executablePath:chromium.executablePath()});
const evidence={};
const annual=JSON.parse(fs.readFileSync(new URL('../../data/population-annual.json',import.meta.url)));
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(url=>url.pathname==='/',async route=>{
  const response=await route.fetch();let body=await response.text();
  body=body.replace('</script>\n</body>',`globalThis.__temporalRead=()=>({year:etat.annee,progress:etat.progression,globe:uniformsGlobe.uProgression.value,place:lieuDossier?nomVille(lieuDossier):null,score:lieuDossier?indiceHabitabilite(lieuDossier,etat.annee):null,risks:lieuDossier&&!estPays(lieuDossier)?CRITERES.map(c=>({key:c.cle,risk:c.penalite(lieuDossier,(etat.annee-2026)/24)*100})):notesPays(lieuDossier[1],(etat.annee-2026)/24).map((n,i)=>({key:CRITERES[i].cle,risk:100-n}))});\n</script>\n</body>`);
  await route.fulfill({response,body});
 });
 await page.goto(base+'#v=Paris&an=2026&cc=FR');await enter(page);
 await page.waitForFunction(()=>!document.querySelector('#dossier').inert);await page.waitForTimeout(2000);
 const read=async()=>{
  const state=await page.evaluate(()=>globalThis.__temporalRead());
  state.cards=await page.locator('#dossier-risques .risque').evaluateAll(es=>es.map(e=>({key:e.dataset.cle,value:Number(e.querySelector('.risk-number').textContent.replace(',','.')),delta:e.querySelector('.risk-change').textContent,mode:e.dataset.temporal})));
  state.population=await page.locator('#dossier-pop').getAttribute('data-population');
  for(const card of state.cards)assert.ok(Math.abs(card.value-state.risks.find(r=>r.key===card.key).risk)<=.051,JSON.stringify({state,card}));
  return state;
 };
 const setYear=async year=>{await page.locator('#curseur').focus();await page.keyboard.press('Home');if(year===2050)await page.keyboard.press('End');else for(let i=2026;i<year;i++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(700);const r=await read();assert.equal(r.year,year);assert.ok(Math.abs(r.globe-(year-2026)/24)<.001);assert.ok((await page.locator('#layer-context').textContent()).includes(String(year)));return r;};
 for(const place of ['Paris','Ho Chi Minh City','France','Ouagadougou']){
  if(place!=='Paris'){
   await page.click('#champ-recherche');await page.fill('#champ-recherche',place);
   await page.getByRole('option',{name:place==='France'?/France (COUNTRY|PAYS)/:new RegExp(place==='Ho Chi Minh City'?'Ho Chi Minh':place)}).first().click();
   await page.waitForFunction(()=>!document.querySelector('#dossier').inert);await page.waitForTimeout(1000);
  }
  const a=await setYear(2026),m=await setYear(2038),b=await setYear(2050);evidence[place]={a,m,b};
  assert.notEqual(a.population,b.population);
  assert.equal(a.cards.find(c=>c.key==='fleuves').value,b.cards.find(c=>c.key==='fleuves').value);
  assert.equal(b.cards.find(c=>c.key==='fleuves').mode,'reference');
  for(const key of ['feux','eau','stabilite'])if(a.risks.find(r=>r.key===key).risk!==b.risks.find(r=>r.key===key).risk)assert.notEqual(a.cards.find(c=>c.key===key).value,b.cards.find(c=>c.key===key).value);
  if(place==='Ho Chi Minh City'){assert.equal(a.score,37);assert.equal(b.score,23);assert.notEqual(a.cards.find(c=>c.key==='mer').value,b.cards.find(c=>c.key==='mer').value);}
  if(place==='Paris'){assert.equal(a.score,66);assert.equal(b.score,63);}
  const iso=place==='Ho Chi Minh City'?'VN':place==='Ouagadougou'?'BF':'FR';
  for(const state of [a,m,b])assert.equal(Number(state.population),annual[iso][state.year-2025]);
  const fireA=a.cards.find(c=>c.key==='feux'),fireB=b.cards.find(c=>c.key==='feux');
  assert.equal(fireB.mode,'estimate');
  if(place==='Paris'){assert.ok(fireB.value>fireA.value);assert.match(fireB.delta,/2026: 25.6.*\+7.2 pts/);}
  if(place==='Ho Chi Minh City'){assert.equal(fireB.value,fireA.value);assert.match(fireB.delta,/unchanged estimate/);}
  if(place==='Ouagadougou'){assert.ok(fireB.value<fireA.value);assert.match(fireB.delta,/-0.4 pts/);}
  await page.screenshot({path:out+'/'+place.replaceAll(' ','-')+'.png'});
 }
 await page.click('#dossier-croix');await page.click('.calque[data-cle=fleuves]');
 if(await page.locator('#pedago').isVisible())await page.click('#pedago-fermer');
 assert.match(await page.locator('#layer-context').textContent(),/fixed reference/);
 assert.deepEqual(errors,[]);evidence.pass=true;evidence.errors=errors;
} catch(e){evidence.pass=false;evidence.error=e.stack;process.exitCode=1;}
finally{fs.writeFileSync(out+'/temporal.json',JSON.stringify(evidence,null,2));await browser.close();}
console.log(JSON.stringify({pass:evidence.pass,error:evidence.error}));

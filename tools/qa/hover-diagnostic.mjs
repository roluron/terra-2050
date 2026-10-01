import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {chromium} from 'playwright';
import {enter, chooseLanguage} from './entrance.cjs';
import {hoverCopy, warmingCopy, populationHover, physicalHover, formatHoverNumber} from '../../hover-diagnostic.mjs';
import {mapDiagnosticCopy} from '../../map-diagnostic-copy.mjs';
const annual=JSON.parse(fs.readFileSync(new URL('../../data/population-annual.json',import.meta.url)));
const climateMeta=JSON.parse(fs.readFileSync(new URL('../../data/climate-manifest.json',import.meta.url)));
const climateBytes=gunzipSync(fs.readFileSync(new URL('../../data/climate-grid.bin',import.meta.url)));
const climateValues=new Float32Array(climateBytes.buffer.slice(climateBytes.byteOffset,climateBytes.byteOffset+climateBytes.byteLength));
const output=process.env.QA_SORTIE||'/tmp/terra-warming-reference/hover';
const compactReferenceOnly=process.env.QA_COMPACT_REFERENCE_ONLY==='1';
fs.mkdirSync(output,{recursive:true});
// Compute the anomaly from packaged temperature fields, independently of
// mapDiagnosticReading/physicalHover. Keep the historical mean unchanged.
function warmingAt({lat,lon},year){
 const row=Math.min(climateMeta.height-1,Math.floor((90-lat)/180*climateMeta.height));
 const col=Math.floor(((lon+180)%360+360)%360/360*climateMeta.width);
 const offset=(row*climateMeta.width+col)*climateMeta.fields.length;
 const [historic,near,future]=[0,4,8].map(i=>climateValues[offset+i]);
 return (year<2030?historic+(near-historic)*(year-1985)/45:near+(future-near)*(year-2030)/20)-historic;
}
const signedTemperature=(value,locale)=>new Intl.NumberFormat(locale,{maximumFractionDigits:2,signDisplay:'exceptZero'})
 .format(Number(value.toFixed(2))).replace(/-/g,'−')+' °C';
const report={profiles:[],languageNavigation:'Existing language navigation closes the tooltip. Mode selection is preserved; translated content is checked after a new pin. Pinned year changes are checked without another pin.',limitations:'Chromium desktop and mobile emulation; expected warming derives from shipped climate fields, not independently reacquired source files.'};
for(const locale of Object.keys(hoverCopy)){
  assert.equal(hoverCopy[locale].length,3);
  assert.ok(populationHover(annual.CN,2050,true,locale).detail.includes('2026 → 2050'));
  assert.ok(populationHover(annual.CN,2050,false,locale).detail.includes('2025 → 2050'));
}
assert.equal(populationHover([100,100,110],2027,true,'en').value,'+10 %');
assert.equal(populationHover([100,100,70],2027,true,'fr').value,'−30 %');
assert.equal(populationHover([100,100],2026,true,'fr').value,'0 %');
assert.equal(populationHover(null,2050,true,'en'),null);
assert.equal(populationHover([0,100],2026,false,'en'),null);
assert.equal(physicalHover({available:true,value:0,baseline:0},2026,true,'fr','m').value,'0 m');
assert.equal(physicalHover({available:true,value:3,baseline:1},2050,true,'fr','°C').value,'+2 °C');
assert.equal(physicalHover({available:true,value:1,baseline:3},2050,true,'en','m').value,'−2 m');
assert.equal(physicalHover({available:false,value:0,baseline:0},2050,false,'en','m'),null);
assert.equal(formatHoverNumber(-.001,'fr',true),'−0,1 < Δ < 0');
assert.equal(formatHoverNumber(.00182,'en',true,2),'0 < Δ < 0.01');
assert.equal(formatHoverNumber(0,'en',true,2),'0');
assert.equal(physicalHover({available:true,value:20,baseline:18},2050,true,'fr','%','points de pourcentage').value,'+2 points de pourcentage');
assert.equal(physicalHover({available:true,filter:'stabilite',value:1.18,baseline:1.18},2026,false,'en','°C').value,'+1.18 °C');
assert.equal(physicalHover({available:true,filter:'stabilite',value:-.42,baseline:-.42},2026,false,'fr','°C').value,'−0,42 °C');
assert.equal(physicalHover({available:true,filter:'stabilite',value:0,baseline:0},2026,false,'en','°C').value,'0 °C');
assert.equal(physicalHover({available:true,filter:'chaleur',value:35,baseline:35},2026,false,'en','°C').value,'35 °C');
console.log('PASS numerical edge cases: population references, signs, missing/zero readings, locale rounding');
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const [name,options] of [['desktop',{viewport:{width:1280,height:800}}],['mobile',{viewport:compactReferenceOnly?{width:320,height:568}:{width:393,height:852},isMobile:true,hasTouch:true}]]){
  if(process.env.QA_PROFILE&&process.env.QA_PROFILE!==name)continue;
  const page=await browser.newPage({...options,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   if(route.request().resourceType()!=='document')return route.continue();
   const response=await route.fetch();
   const body=(await response.text()).replace('</script>\n</body>',`
    globalThis.__hoverAudit={
     ready:()=>!!PAYS_RASTER && !!SCIENCE && PAYS_LIGNES.length>0,
     show:(iso,x=100,y=150,pinned=false)=>montrerSurvol({iso,lat:iso==='ZZ'?undefined:35,lon:iso==='ZZ'?undefined:105},x,y,pinned),
     showAt:(s,x=100,y=150,pinned=false)=>montrerSurvol(s,x,y,pinned),
     state:()=>({filter:filtreSurvol,year:etat.annee,mode:uniformsGlobe.uChange.value>.5?'change':'value',controls:Object.fromEntries([...document.querySelectorAll('[data-map-mode]')].map(b=>[b.dataset.mapMode,b.getAttribute('aria-pressed')]))}),
     align:()=>{arreterVolCamera();controles.autoRotate=false;camera.position.copy(latLonVersVec3(25,45,camera.position.length()));camera.lookAt(0,0,0);controles.update();camera.updateMatrixWorld();},
     readings:(iso)=>Object.fromEntries(Object.entries(hoverMetricKey).map(([filter,key])=>[key,mapDiagnosticReading({filter,year:etat.annee,latitude:35,longitude:105,climate:SCIENCE.climate,fire:FIRE_WEATHER,floods:FLOOD_HAZARDS})])),
     score:iso=>indicePays(iso,etat.annee),
     filter:key=>document.querySelector('.calque[data-cle="'+key+'"]').click(),
     point:()=>{camera.position.copy(latLonVersVec3(35,105,camera.position.length()));camera.lookAt(0,0,0);controles.update();camera.updateMatrixWorld();const v=latLonVersVec3(35,105).project(camera);const cx=(v.x+1)*innerWidth/2,cy=(1-v.y)*innerHeight/2;for(const dy of [0,-24,24,-48,48])for(const dx of [0,-24,24,-48,48]){const x=cx+dx,y=cy+dy;if(document.elementFromPoint(x,y)===toile && sousPointeur(x,y)?.iso==='CN')return {x,y};}throw Error('No exposed country canvas point');},
     hit:(x,y)=>sousPointeur(x,y),
     hide:()=>cacherSurvol(),
    };
   </script>\n</body>`);
   await route.fulfill({response,body});
  });
  await page.goto((process.env.URL0||'http://localhost:8080/')+'?lang=fr');await enter(page);
  await page.waitForFunction(()=>globalThis.__hoverAudit?.ready());
  const show=async(iso='CN')=>page.evaluate(({iso,pinned})=>__hoverAudit.show(iso,100,150,pinned),{iso,pinned:name==='mobile'});
  const field=selector=>page.locator('#survol '+selector).textContent();
  const slider=page.locator('#curseur');
  const year=async y=>{await slider.fill(String(y));};
  const mode=async m=>page.locator(`[data-map-mode="${m}"]`).dispatchEvent('click');
  const filter=async key=>{await page.evaluate(key=>__hoverAudit.filter(key),key);if(await page.locator('#pedago').isVisible()){await page.locator('#pedago-fermer').click();await page.locator('#pedago').waitFor({state:'hidden'});}};
  const state=()=>page.evaluate(()=>__hoverAudit.state());
  const chooseLocale=async locale=>{
   if(name!=='mobile')return chooseLanguage(page,locale);
   if(await page.locator('#bouton-reglages').getAttribute('aria-expanded')!=='true')await page.locator('#bouton-reglages').tap();
   await page.locator('#bouton-langue').tap();
   await page.locator(`#language-options input[value="${locale}"]`).tap();
   await page.locator('#language-dialog').waitFor({state:'hidden'});
  };
  const assertMode=async expected=>{const s=await state();assert.equal(s.mode,expected,name+' shader mode');assert.equal(s.controls[expected],'true',name+' selected control');assert.equal(s.controls[expected==='value'?'change':'value'],'false',name+' other control');};
  const warmingSample={iso:'SA',lat:25,lon:45};
  const showWarming=()=>page.evaluate(({s,pinned})=>__hoverAudit.showAt(s,100,150,pinned),{s:warmingSample,pinned:name==='mobile'});
  const snapshots=[];
  assert.equal((await state()).filter,null,name+' entry has no preselected filter');
  await filter('stabilite');await assertMode('value');
  for(const y of [2026,2030,2050]){
   await year(y);
   if(name==='mobile'&&y!==2026)assert.equal(await field('.s-indice'),signedTemperature(warmingAt(warmingSample,y),'fr'),name+' pinned historic anomaly refresh '+y);
   await showWarming();
   assert.equal(await field('.s-indice'),signedTemperature(warmingAt(warmingSample,y),'fr'),name+' historic anomaly '+y);
   assert.equal(await field('.s-sous'),`${warmingCopy.fr.label} · ${y}`);
   assert.equal(await field('.s-detail'),warmingCopy.fr.reference);
   assert.equal(await page.locator('[data-map-mode="value"]').textContent(),warmingCopy.fr.value);
   assert.equal(await page.locator('.map-hint').textContent(),warmingCopy.fr.hint);
   await assertMode('value');snapshots.push({year:y,value:await field('.s-indice'),reference:await field('.s-detail')});
  }
  // A deliberate change view survives filter switches, year and language.
  await mode('change');await year(2026);if(name==='desktop')await showWarming();
  assert.equal(await field('.s-indice'),'0 °C');await assertMode('change');
  await filter('chaleur');await assertMode('change');await mode('value');
  await filter('stabilite');await assertMode('change');await year(2030);await assertMode('change');
  await chooseLocale('en');await assertMode('change');
  await filter('chaleur');await assertMode('value');
  await filter('stabilite');await assertMode('change');await mode('value');
  await showWarming();
  // Language navigation closes the tooltip by existing design. Keep the
  // deliberate mode choice, then reveal the newly translated reading.
  for(const locale of Object.keys(warmingCopy)){
   await chooseLocale(locale);await year(2026);
   await assertMode('value');
   await showWarming();
   assert.equal(await page.locator('#survol').isVisible(),true,name+' translated reading visible');
   assert.equal(await field('.s-indice'),signedTemperature(warmingAt(warmingSample,2026),locale));
   assert.equal(await field('.s-sous'),`${warmingCopy[locale].label} · 2026`);
   assert.equal(await field('.s-detail'),warmingCopy[locale].reference);
   assert.equal(await page.locator('[data-map-mode="value"]').textContent(),warmingCopy[locale].value);
   assert.equal(await page.locator('.map-scale small').textContent(),warmingCopy[locale].reference,name+' legend reference');
   if(await page.locator('#bouton-reglages').getAttribute('aria-expanded')==='true'){
    if(name==='mobile')await page.locator('#bouton-reglages').tap();else await page.locator('#bouton-reglages').click();
   }
   if(['en','fr'].includes(locale)){
    await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('menu-reglages')).opacity)<.01);
    await page.evaluate(()=>__hoverAudit.align());
    if(name==='desktop'){
     await page.mouse.move(8,8);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    await showWarming();assert.equal(await page.locator('#survol').isVisible(),true,name+' capture reading visible');
    await page.screenshot({path:`${output}/${name}-${locale}-warming-2026.png`});
   }
   if(compactReferenceOnly){
    await page.locator('#map-toggle').tap();
    const legend=page.locator('.map-scale small');await legend.scrollIntoViewIfNeeded();
    assert.equal(await legend.isVisible(),true,locale+' compact reference visible');
    const bounds=await page.locator('#map-options').boundingBox();
    assert.ok(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=321&&bounds.y+bounds.height<=569,locale+' compact menu fits viewport');
    assert.equal(await page.locator('#map-options').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,locale+' compact menu no horizontal overflow');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,locale+' compact page no horizontal overflow');
    if(['en','fr','vi'].includes(locale))await page.screenshot({path:`${output}/compact-${locale}-warming-menu.png`});
    await page.locator('#map-toggle').tap();
   }
  }
  await chooseLanguage(page,'fr');await filter('stabilite');await year(2026);await show();
  report.profiles.push({name,viewport:options.viewport,defaultReadings:snapshots,rememberedChoices:true,locales:Object.keys(warmingCopy),compactReferenceOnly});
  console.log(`PASS ${name}: historical warming reference, independent raw-field values, remembered modes and eight translated references`);
  if(compactReferenceOnly){
   assert.deepEqual(errors,[]);fs.writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2)+'\n');await page.close();continue;
  }
  await show();assert.equal(await field('.s-nom'),'Chine');
  assert.equal(await field('.s-indice'),`${await page.evaluate(()=>__hoverAudit.score('CN'))}/100`);
  assert.match(await field('.s-sous'),/expérimental.*2026/);
  await year(2050);
  if(name==='mobile'){assert.match(await field('.s-sous'),/2050/);assert.equal(await page.locator('#survol').getAttribute('role'),'button');}
  else await show();
  await filter('declin');await show();
  assert.equal(await field('.s-indice'),populationHover(annual.CN,2050,true,'fr').value);
  assert.equal(await field('.s-detail'),populationHover(annual.CN,2050,true,'fr').detail);
  await mode('value');
  if(name==='desktop')await show();
  assert.equal(await field('.s-indice'),populationHover(annual.CN,2050,false,'fr').value);
  assert.match(await field('.s-detail'),/2025 → 2050/);
  for(const key of ['chaleur','secheresse','feux','mer','fleuves','stabilite']){
   await filter(key);await mode('value');await show();console.log(`CHECK ${name} ${key}`);
   assert.ok(await field('.s-indice'),key+' value');
   assert.match(await field('.s-note'),/Maille du modèle/);
   if(['mer','fleuves'].includes(key))assert.match(await field('.s-note'),/cellules sources.*centennale/);
   await mode('change');await show();
   const readings=await page.evaluate(()=>__hoverAudit.readings('CN'));
   const mk={chaleur:'thermique',secheresse:'eau',feux:'feux',mer:'mer',fleuves:'fleuves',stabilite:'stabilite'}[key];
   const r=readings[mk],unit=r.unit==='days/year'?'jours/an':r.unit==='De Martonne index'?'De Martonne':r.unit;
   assert.equal(await field('.s-indice'),physicalHover(r,2050,true,'fr',unit,['mer','fleuves'].includes(key)?'points de pourcentage':unit).value,key);
   assert.match(await field('.s-detail'),/2026:.*2050:/);
   await year(2026);if(name==='desktop')await show();
   assert.match(await field('.s-indice'),/^0 /,key+' reference zero');
   await year(2050);await mode('value');
  }
  await show('ZZ');assert.equal(await field('.s-indice'),'');assert.ok(await field('.s-detail'));
  await show();
  for(const locale of Object.keys(hoverCopy)){
   await chooseLanguage(page,locale);await show();console.log(`CHECK ${name} ${locale}`);
   assert.ok(await field('.s-sous'));assert.ok((await field('.s-note')).startsWith(mapDiagnosticCopy[locale][0].split('{size}')[0]),locale);
  }
  await chooseLanguage(page,'fr');
  await filter('stabilite'); // no active filter
  if(await page.locator('#bouton-reglages').getAttribute('aria-expanded')==='true')await page.locator('#bouton-reglages').click();
  const point=await page.evaluate(()=>__hoverAudit.point());
  assert.equal((await page.evaluate(p=>__hoverAudit.hit(p.x,p.y),point)).iso,'CN');
  if(name==='mobile')await page.touchscreen.tap(point.x,point.y);else await page.mouse.move(point.x,point.y);
  await page.waitForFunction(()=>document.querySelector('#survol').classList.contains('visible'));
  assert.equal(await field('.s-nom'),'Chine');
  await page.waitForTimeout(220);
  await page.screenshot({path:`${output}/${name}-country-hover.png`});
  if(name==='mobile'){
   assert.equal(await page.locator('#survol').getAttribute('role'),'button');
   await year(2038);assert.match(await field('.s-sous'),/2038/);
   assert.equal(await page.evaluate(()=>document.body.classList.contains('dossier-ouvert')),false,'first country tap must not activate a newly revealed city label');
   await page.locator('#survol').tap();
   await page.waitForFunction(()=>document.body.classList.contains('dossier-ouvert'));
   assert.match(await page.locator('#dossier-nom').textContent(),/Chine/);
   await page.locator('#dossier-croix').click();
   await page.waitForFunction(()=>!document.body.classList.contains('dossier-ouvert'));
   await show();await page.locator('#survol').focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.body.classList.contains('dossier-ouvert'));
   assert.match(await page.locator('#dossier-nom').textContent(),/Chine/);
  }else{
   const mutations=await page.evaluate(p=>{const el=document.querySelector('#survol'),o=new MutationObserver(()=>{});o.observe(el,{subtree:true,characterData:true,childList:true});for(let i=0;i<30;i++)document.getElementById('scene').dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:p.x,clientY:p.y}));const n=o.takeRecords().length;o.disconnect();return n;},point);
   assert.equal(mutations,0,'no text mutations during pointer movement');
   await page.screenshot({path:`${output}/desktop-country-hover.png`});
  }
  if(name==='mobile'){
   // Programmatic diagnostics also test clamping without changing the camera.
   await page.setViewportSize({width:320,height:568});
   await page.evaluate(()=>__hoverAudit.show('CN',318,560,true));
   const bounds=await page.locator('#survol').boundingBox();assert.ok(bounds.x>=7&&bounds.y>=7&&bounds.x+bounds.width<=313&&bounds.y+bounds.height<=561);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: seven filters, both modes, eight languages, country boundaries, missing data, year updates and cache`);
  fs.writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2)+'\n');
  await page.close();
 }
 fs.writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}

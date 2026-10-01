import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {enter, chooseLanguage} from './entrance.cjs';
import {hoverCopy, populationHover, physicalHover, formatHoverNumber} from '../../hover-diagnostic.mjs';
const annual=JSON.parse(fs.readFileSync(new URL('../../data/population-annual.json',import.meta.url)));
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
assert.equal(formatHoverNumber(-.001,'fr',true),'0');
console.log('PASS numerical edge cases: population references, signs, missing/zero readings, locale rounding');
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const [name,options] of [['desktop',{viewport:{width:1280,height:800}}],['mobile',{viewport:{width:393,height:852},isMobile:true,hasTouch:true}]]){
  const page=await browser.newPage({...options,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   if(route.request().resourceType()!=='document')return route.continue();
   const response=await route.fetch();
   const body=(await response.text()).replace('</script>\n</body>',`
    globalThis.__hoverAudit={
     ready:()=>!!PAYS_RASTER && !!SCIENCE && PAYS_LIGNES.length>0,
     show:(iso,x=100,y=150,pinned=false)=>montrerSurvol({iso},x,y,pinned),
     readings:(iso)=>mesuresLieu(ligneDePays(iso),etat.annee),
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
   await filter(key);await show();console.log(`CHECK ${name} ${key}`);
   assert.ok(await field('.s-indice'),key+' value');
   assert.match(await field('.s-note'),/pondérée/);
   if(['mer','fleuves'].includes(key))assert.match(await field('.s-note'),/centennale.*surface/);
   await mode('change');await show();
   const readings=await page.evaluate(()=>__hoverAudit.readings('CN'));
   const mk={chaleur:'thermique',secheresse:'eau',feux:'feux',mer:'mer',fleuves:'fleuves',stabilite:'stabilite'}[key];
   const r=readings[mk],unit=r.unit==='days/year'?'jours/an':r.unit==='De Martonne index'?'De Martonne':r.unit;
   assert.equal(await field('.s-indice'),physicalHover(r,2050,true,'fr',unit).value,key);
   assert.match(await field('.s-detail'),/2026:.*2050:/);
   await year(2026);if(name==='desktop')await show();
   assert.match(await field('.s-indice'),/^0 /,key+' reference zero');
   await year(2050);await mode('value');
  }
  await show('ZZ');assert.equal(await field('.s-indice'),'');assert.ok(await field('.s-detail'));
  await show();
  for(const locale of Object.keys(hoverCopy)){
   await chooseLanguage(page,locale);await show();console.log(`CHECK ${name} ${locale}`);
   assert.ok(await field('.s-sous'));assert.ok((await field('.s-note')).startsWith(hoverCopy[locale][0]),locale);
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
  await page.screenshot({path:`/tmp/terra-hover-${name}.png`});
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
   await page.screenshot({path:'/tmp/terra-hover-desktop.png'});
  }
  if(name==='mobile'){
   // Programmatic diagnostics also test clamping without changing the camera.
   await page.setViewportSize({width:320,height:568});
   await page.evaluate(()=>__hoverAudit.show('CN',318,560,true));
   const bounds=await page.locator('#survol').boundingBox();assert.ok(bounds.x>=7&&bounds.y>=7&&bounds.x+bounds.width<=313&&bounds.y+bounds.height<=561);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: seven filters, both modes, eight languages, country boundaries, missing data, year updates and cache`);
  await page.close();
 }
}finally{await browser.close();}

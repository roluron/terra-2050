import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {enter,chooseLanguage} from './entrance.cjs';
import {experienceUICopy} from '../../experience-ui-copy.mjs';
import {legendCopy} from '../../reading-copy.mjs';
const output=process.env.QA_SORTIE||'/tmp/terra-experience-ui';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];let current='startup';
try{
 for(const viewport of [{width:1280,height:900},{width:393,height:852},{width:320,height:568}]){
  if(process.env.QA_WIDTHS&&!process.env.QA_WIDTHS.split(',').includes(String(viewport.width)))continue;
  const page=await browser.newPage({viewport,reducedMotion:'reduce',hasTouch:viewport.width<720});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   if(route.request().resourceType()!=='document')return route.fallback();
   const response=await route.fetch(),html=await response.text();
   await route.fulfill({response,body:html.replace('</script>\n</body>',`globalThis.__experience={ready:()=>!!globalSummary&&!!PAYS_RASTER, state:()=>({filter:filtreSurvol,year:etat.annee,hidden:coucheMasquee,mode:uniformsGlobe.uReference.value>.5?'reference':uniformsGlobe.uChange.value>.5?'change':'value',strength:CALQUES[filtreSurvol]?.uniforme.value}),show:()=>montrerSurvol({iso:'FR',lat:48.8,lon:2.3,ville:null},innerWidth/2,innerHeight/2,true),read:year=>lectureSurvol({iso:'FR',lat:48.8,lon:2.3},year),clear:()=>cacherSurvol(),shader:()=>moteur.info.programs.filter(p=>p.diagnostics&&!p.diagnostics.runnable).length};</script>\n</body>`)});
  });
  await page.goto((process.env.URL0||'http://localhost:8080/')+'?lang=en');await enter(page);await page.waitForFunction(()=>__experience.ready(),null,{timeout:60000});
  const choose=async key=>{await page.locator('#map-toggle').click();await page.locator(`[data-cle="${key}"]`).click();};
  for(const key of ['chaleur','feux','secheresse','mer','fleuves','stabilite','declin']){
   current=viewport.width+'/'+key;await choose(key);assert.equal(await page.locator('#pedago').isVisible(),false);
   for(const mode of key==='declin'||key==='stabilite'?['value','change']:['reference','change','value']){
    await page.locator(`[data-map-mode="${mode}"]`).dispatchEvent('click');
    for(const year of [2026,2050]){
     await page.locator('#curseur').fill(String(year));
     assert.deepEqual(await page.locator('#visible-legend .ux-scale>span>*').allTextContents(),legendCopy(key,'en',mode).ticks);
     assert.equal(await page.locator('#visible-legend .ux-scale i').getAttribute('style'),await page.locator('#layer-context .map-scale i').getAttribute('style'));
     const before=await page.locator('.summary-headline').textContent();await page.locator('#layer-visibility').click();
     assert.equal((await page.evaluate(()=>__experience.state())).strength,0);assert.equal(await page.locator('.summary-headline').textContent(),before);assert.equal((await page.evaluate(()=>__experience.state())).filter,key);
     await page.locator('#layer-visibility').click();assert.equal((await page.evaluate(()=>__experience.state())).strength,1);
    }
   }
   await page.evaluate(()=>__experience.show());await page.locator('[data-hover-action="compare"]').click();
   const expected=await page.evaluate(()=>[__experience.read(2026).diagnostic?.value,__experience.read(2050).diagnostic?.value]);
   assert.deepEqual(await page.locator('#view-compare article strong').allTextContents(),expected);
   await page.keyboard.press('Escape');assert.equal(await page.locator('[data-hover-action="compare"]').evaluate(el=>el===document.activeElement),true);
   await page.locator('[data-hover-action="source"]').click();assert.match(await page.locator('#view-sources').textContent(),/SSP3-7.0|RCP8.5|UN/);
   assert.equal(await page.locator('#view-sources .ux-data-details').getAttribute('open'),null);
   assert.ok((await page.locator('#view-sources .ux-dialog-content>.ux-row h3').allTextContents()).includes('Values for this area'));
   await page.locator('#view-sources .ux-data-details>summary').click();assert.equal(await page.locator('#view-sources .ux-data-details').evaluate(el=>el.open),true);
   await page.keyboard.press('Escape');await page.evaluate(()=>__experience.clear());
  }
  for(const language of ['en','fr','es','it','vi','ja','zh','zh-Hant']){
   current=viewport.width+'/'+language;await chooseLanguage(page,language);await page.locator('#bouton-reglages').click();
   assert.equal(await page.locator('#share-view').getAttribute('aria-label'),experienceUICopy(language).share);
   const boxes=await page.locator('#map-inspector,#layer-visibility,#timeline,#titre,#share-view,#recherche,#util').evaluateAll(nodes=>nodes.map(n=>({id:n.id,...n.getBoundingClientRect().toJSON()})));
   for(const b of boxes)assert.ok(b.x>=-1&&b.right<=viewport.width+1,JSON.stringify(b));
   const pill=boxes.find(b=>b.id==='map-inspector'),eye=boxes.find(b=>b.id==='layer-visibility'),timeline=boxes.find(b=>b.id==='timeline');assert.ok(eye.x>=pill.right+6);assert.ok(eye.right<=timeline.x,current+' controls overlap');
   await page.locator('#map-toggle').click();assert.equal(await page.locator('#map-options').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await page.locator('#menu-sources').click();
   const dialog=await page.locator('#view-sources').boundingBox();assert.ok(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=viewport.width&&dialog.y+dialog.height<=viewport.height);
   await page.screenshot({path:output+'/sources-'+viewport.width+'-'+language+'.png'});await page.keyboard.press('Escape');await page.locator('#map-toggle').click();
  }
  await page.locator('#explore-city').click();assert.equal(await page.locator('#share-view').isVisible(),false);await page.locator('#champ-recherche').press('Escape');await page.waitForFunction(()=>document.body.classList.contains('loupe'));
  await page.evaluate(()=>__experience.show());await page.locator('#layer-visibility').click();await page.locator('#share-view').click();
  const url=await page.locator('#view-share input').inputValue();const params=new URL(url).searchParams;assert.equal(params.get('hidden'),'1');assert.equal(params.get('layer'),'declin');assert.equal(params.get('year'),'2050');assert.equal(params.get('lat'),'48.80000');
  await page.keyboard.press('Escape');await page.goto(url);await enter(page);await page.waitForFunction(()=>__experience.state().hidden&&document.querySelector('#survol.fige'),null,{timeout:60000});assert.equal((await page.evaluate(()=>__experience.state())).year,2050);assert.match(await page.locator('.s-nom').textContent(),/France|法国|法國/);
  await page.locator('#share-view').click();await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}}));await page.locator('#view-share .ux-primary').click();assert.equal(await page.locator('#view-share .ux-status').textContent(),experienceUICopy('zh-Hant').failed);await page.keyboard.press('Escape');
  await page.evaluate(()=>__experience.clear());await choose('declin');await page.evaluate(()=>__experience.show());assert.equal(await page.locator('.s-indice').textContent(),'');assert.equal(await page.locator('[data-hover-action="compare"]').isVisible(),false);
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>__experience.shader()),0);await page.screenshot({path:output+'/globe-'+viewport.width+'.png'});results.push({viewport,filters:7,languages:8,modes:true,visibility:true,localComparison:true,deepLink:true,copyFailure:true,errors});console.log('PASS experience UI '+viewport.width);await writeFile(output+'/results.json',JSON.stringify(results,null,2));await page.close();
 }
 await writeFile(output+'/results.json',JSON.stringify(results,null,2));
}catch(error){console.error('FAILED',current,error);throw error;}finally{await browser.close();}

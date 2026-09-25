import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {webkit,chromium,devices} from 'playwright';
const out=process.env.QA_SORTIE||'/tmp/terra-glass-touch';await fs.mkdir(out,{recursive:true});
for(const [name,engine,options] of [
 ['phone',webkit,devices['iPhone 15 Pro']],['small-phone',webkit,devices['iPhone SE']],['desktop',chromium,{viewport:{width:1440,height:900},deviceScaleFactor:2,hasTouch:true}]
]){
 const browser=await engine.launch({headless:false});const context=await browser.newContext({...options,reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const tap=async selector=>page.locator(selector).tap();
 const shot=async suffix=>{await page.waitForTimeout(650);await page.screenshot({path:`${out}/${name}-${suffix}.png`});};
 const glass=async selector=>{
  const surface=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {background:s.backgroundImage,tint:s.backgroundColor,blur:s.backdropFilter||s.webkitBackdropFilter,width:r.width,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight};});
  // depuis a9462fd le verre est une teinte unie translucide (--glass-surface), plus un degrade
  assert.ok(/gradient/.test(surface.background)||/rgba\([^)]*,\s*0?\.\d+\)/.test(surface.tint),`${selector}: verre opaque ${surface.tint}`);assert.match(surface.blur,/blur/);assert.ok(surface.right<=surface.vw+1);assert.ok(surface.bottom<=surface.vh+1);
 };
 const target=async selector=>{for(const item of await page.locator(selector).all()){const b=await item.boundingBox();assert.ok(b&&b.height>=44&&b.width>=44,`${selector}: ${JSON.stringify(b)}`);}};
 try{
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=fr');await page.locator('#language-dialog[open]').waitFor();await glass('.language-content');await shot('language');await tap('#language-options input:checked');
  await page.locator('#voile.pret').waitFor({state:'attached'});for(const word of await page.locator('#earth-shell .word').all())await word.tap();await page.locator('#earth-shell.complete').waitFor();await tap('#future');await page.locator('#earth-shell').waitFor({state:'hidden'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.calque')].every(e=>!e.style.opacity&&!e.style.transform));
  const mobile=name!=='desktop';
  await target('#map-toggle');await tap('#map-toggle');
  await target('.calque[data-cle="feux"]');await shot('filters');await tap('.calque[data-cle="feux"]');
  if(await page.locator('#pedago').isVisible()){await glass('.pedago-carte:not(.story-carte)');await shot('explanation');await tap('#pedago-fermer');await page.locator('#pedago').waitFor({state:'hidden'});}
  if(mobile){assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.getElementById('calques').contains(document.activeElement)),false);}
  await tap('#map-toggle');await glass('#map-options');await target('[data-map-mode="value"]');await shot('map');await tap('#map-method summary');await shot('sources');await tap('#map-method summary');
  await tap('#bouton-reglages');await glass('#menu-reglages');await target('#bouton-langue');await shot('settings');await tap('#bouton-reglages');
  await tap('#champ-recherche');await page.locator('#champ-recherche').fill('Paris');await page.getByRole('option').filter({hasText:'Paris'}).first().waitFor();await glass('#resultats');await shot('search');await page.getByRole('option').filter({hasText:'Paris'}).first().tap();await page.locator('#dossier.ouvert').waitFor();await page.waitForTimeout(1000);await glass('#dossier');await target('#dossier-croix');await shot('city');
  await tap('#dossier-comparer');await glass('#city-comparison');await target('.compare-close');await page.locator('#comparison-search').fill('Tokyo');await page.locator('#comparison-results [role="option"]').first().tap();assert.equal(await page.locator('#city-comparison td[data-value]').count(),12);await shot('comparison');await tap('.compare-close');
  await tap('#dossier-story');await page.locator('#story-partager:not([disabled]):not([aria-busy="true"])').waitFor();await glass('.story-carte');await target('#story-fermer');await target('.story-opt');await shot('story');await tap('#story-fermer');await tap('#dossier-croix');
  assert.equal(await page.locator('#map-inspector').isVisible(),true);assert.equal(errors.length,0,errors.join('\n'));console.log(`PASS ${name}: touch-only language, filters, sources, settings, search, city, comparison, story, close; glass and targets`);
 }finally{await context.close();await browser.close();}
}

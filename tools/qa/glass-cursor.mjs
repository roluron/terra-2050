import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {enter} from './entrance.cjs';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['phone',webkit,devices['iPhone SE']]]){
 const browser=await engine.launch({headless:false});try{
 const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=en');
 await page.locator('#language-options label').first().hover();
 assert.equal(await page.locator('.glass-cursor').isVisible(),false);
 await enter(page);
 if(name==='desktop'){
  await page.mouse.move(720,450);await page.waitForTimeout(200);
  assert.equal(await page.locator('.glass-cursor').isVisible(),true,'Globe cursor');
  assert.ok(await page.evaluate(async()=> (await import('./glass-cursor.mjs')).glassCursor.radius>0));
  assert.equal(await page.locator('.glass-cursor').evaluate(e=>e.classList.contains('point')),false,'Lens on the globe');
  for(const selector of ['#bouton-reglages','#an','#map-toggle']){
   await page.locator(selector).hover();await page.waitForTimeout(400);
   assert.equal(await page.locator('.glass-cursor').isVisible(),true,selector);
   assert.equal(await page.locator('.glass-cursor').evaluate(e=>e.classList.contains('point')),true,selector+' is a dot');
   assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).cursor),'none','Native cursor hidden on '+selector);
  }
  await page.mouse.move(400,80);await page.waitForTimeout(400);
  // rayon et taille sont lisses image par image : on attend l'etat final (CI plus lente)
  await page.waitForFunction(async()=>(await import('./glass-cursor.mjs')).glassCursor.radius===3,null,{timeout:5000}).catch(()=>{});
  assert.equal(await page.locator('.glass-cursor').isVisible(),true,'Dot over empty space');
  assert.ok(await page.locator('.glass-cursor').evaluate(e=>parseFloat(e.style.width)<8),'Small dot over empty space');
  assert.equal(await page.evaluate(async()=> (await import('./glass-cursor.mjs')).glassCursor.radius),3,'Refraction radius follows the dot on the canvas');
  await page.mouse.move(720,450);await page.waitForTimeout(200);
  await page.screenshot({path:(process.env.QA_SORTIE||'/tmp/terra-qa')+'/outputs/globe-only-cursor.png'});
  await page.locator('#champ-recherche').fill('New York');
  await page.getByRole('option').filter({hasText:'New York'}).first().click();
  await page.locator('#dossier-comparer').click();await page.locator('.compare-close').hover();await page.waitForTimeout(100);
  assert.equal(await page.locator('.glass-cursor').isVisible(),false,'Comparison is modal: native cursor');
 }else assert.equal(await page.locator('.glass-cursor').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS '+name+': lens on globe, dot elsewhere, native in modals');
 }finally{await browser.close()}
}

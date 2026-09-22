import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {enter} from './entrance.cjs';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['phone',webkit,devices['iPhone SE']]]){
 const browser=await engine.launch({headless:false});try{
 const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8088/?lang=en');
 await page.locator('#language-options label').first().hover();
 assert.equal(await page.locator('.glass-cursor').isVisible(),false);
 await enter(page);
 if(name==='desktop'){
  await page.mouse.move(720,450);await page.waitForTimeout(200);
  assert.equal(await page.locator('.glass-cursor').isVisible(),true,'Globe cursor');
  assert.ok(await page.evaluate(async()=> (await import('./glass-cursor.mjs')).glassCursor.radius>0));
  for(const selector of ['#bouton-reglages','#an','#map-toggle']){
   await page.locator(selector).hover();await page.waitForTimeout(100);
   assert.equal(await page.locator('.glass-cursor').isVisible(),false,selector);
  }
  await page.mouse.move(400,80);await page.waitForTimeout(100);
  assert.equal(await page.locator('.glass-cursor').isVisible(),false,'Empty space');
  await page.mouse.move(720,450);await page.waitForTimeout(200);
  await page.screenshot({path:'/Users/robinmahieux/Documents/Codex/2026-09-16/t/outputs/globe-only-cursor.png'});
  await page.locator('#champ-recherche').fill('New York');
  await page.getByRole('option').filter({hasText:'New York'}).first().click();
  await page.locator('#dossier-comparer').click();await page.locator('.compare-close').hover();await page.waitForTimeout(100);
  assert.equal(await page.locator('.glass-cursor').isVisible(),false,'Comparison');
 }else assert.equal(await page.locator('.glass-cursor').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS '+name+': cursor only on globe, normal UI pointers');
 }finally{await browser.close()}
}

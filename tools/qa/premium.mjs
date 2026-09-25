import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,webkit,devices} from 'playwright';
import {enter} from './entrance.cjs';

const out=process.env.QA_SORTIE||'/tmp/terra-premium';
await fs.mkdir(out,{recursive:true});
for(const [name,engine,options] of [
 ['desktop-motion',chromium,{viewport:{width:1440,height:900},deviceScaleFactor:2,reducedMotion:'no-preference'}],
 ['phone-motion',webkit,{...devices['iPhone SE'],reducedMotion:'no-preference'}],
 ['desktop-reduced',chromium,{viewport:{width:1440,height:900},reducedMotion:'reduce'}]
]){
 const browser=await engine.launch({headless:false}),context=await browser.newContext({...options,recordVideo:{dir:out}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=fr',{waitUntil:'domcontentloaded'});
  await page.locator('#language-dialog[open]').waitFor();await page.waitForTimeout(1800);
  const card=page.locator('.language-content');
  const type=await page.locator('#language-title').evaluate(e=>({family:getComputedStyle(e).fontFamily,weight:getComputedStyle(e).fontWeight}));
  assert.match(type.family,/TWK Lausanne/);assert.equal(type.weight,'300');
  const footer=await page.locator('#language-options input:checked').boundingBox();assert.ok(footer.y+footer.height<=page.viewportSize().height);
  const before=await card.evaluate(e=>getComputedStyle(e,'::before').transform);
  await page.screenshot({path:`${out}/${name}-light-a.png`});
  await page.waitForTimeout(1000);
  const after=await card.evaluate(e=>getComputedStyle(e,'::before').transform);
  // le halo derivant de la carte est masque depuis a9462fd (premium.css) : il
  // ne doit ni s'afficher ni bouger, quel que soit le reglage de mouvement
  assert.equal(await card.evaluate(e=>getComputedStyle(e,'::before').display),'none');
  assert.equal(before,after);
  await page.screenshot({path:`${out}/${name}-light-b.png`});
  if(name.startsWith('desktop')){
   const b=await card.boundingBox();await page.mouse.move(b.x+30,b.y+30);await page.waitForTimeout(100);
   const a=await card.evaluate(e=>e.style.getPropertyValue('--light-x'));
   await page.mouse.move(b.x+b.width-30,b.y+b.height-30);await page.waitForTimeout(100);
   const z=await card.evaluate(e=>e.style.getPropertyValue('--light-x'));
   assert.equal(a===z,name==='desktop-reduced');
  }
  await enter(page);
  await page.locator('#champ-recherche').fill('zzzznoresult');await page.locator('#resultats .vide').waitFor();
  await page.locator('#champ-recherche').fill('Paris');await page.getByRole('option').filter({hasText:'Paris'}).first().click();
  await page.locator('#dossier.ouvert').waitFor();await page.waitForTimeout(900);
  await page.locator('.risque').first().scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-metrics.png`});
  await page.locator('.risque summary').first().click();await page.locator('.risque[open]').waitFor();await page.screenshot({path:`${out}/${name}-detail.png`});
  await page.locator('#dossier .trajectoire').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-trajectory.png`});
  await page.locator('#dossier-croix').click();
  if(name==='phone-motion'){
   await page.setViewportSize({width:568,height:320});await page.locator('#map-toggle').tap();
   const b=await page.locator('#map-inspector').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.y+b.height<=320);await page.screenshot({path:`${out}/phone-landscape.png`});
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: type, footer, gradient motion, pointer/reduced motion, empty search, metric/detail/trajectory, close`);
 }finally{await context.close();await browser.close();}
}

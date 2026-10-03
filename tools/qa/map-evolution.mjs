import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright';
import { enter, openFilters } from './entrance.cjs';

const out = process.env.QA_SORTIE || '/tmp/terra-map-evolution';
await fs.mkdir(out,{recursive:true});
const keys=['chaleur','feux','secheresse','mer','fleuves','stabilite','declin'];
for(const mobile of [false,true]){
 const name=mobile?'phone':'desktop';
 const browser=await (mobile?webkit:chromium).launch({headless:false});
 const context=await browser.newContext({...mobile?devices['iPhone 15 Pro']:{viewport:{width:1440,height:900},deviceScaleFactor:2},reducedMotion:'reduce',recordVideo:{dir:out}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=it');await enter(page);
  for(const key of keys){
   await openFilters(page);
   await page.locator(`.calque[data-cle="${key}"]`).click();
   if(await page.locator('#pedago').isVisible())await page.locator('#pedago-fermer').click();
   assert.equal(await page.locator('.calque.actif').count(),1);
   await page.locator('#curseur').press('Home');await page.waitForTimeout(700);
   await page.screenshot({path:`${out}/${name}-${key}-2026.png`});
   for(let y=2027;y<=2050;y++){await page.locator('#curseur').press('ArrowRight');await page.waitForTimeout(40);}
   await page.waitForTimeout(700);
   assert.equal(await page.locator('#curseur').inputValue(),'2050');
   if(!mobile)assert.match(await page.locator('#layer-context').innerText(),/2050/);
   const geometry=await page.evaluate(()=>{
    const b=id=>document.getElementById(id).getBoundingClientRect();
    const nav=b('calques'),notice=b('model-notice'),panel=b('map-inspector');
    return {overlap:nav.bottom>notice.top+1,panelOutside:panel.left<0||panel.right>innerWidth+1||panel.bottom>innerHeight+1,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.deepEqual(geometry,{overlap:false,panelOutside:false,overflow:false});
   await page.screenshot({path:`${out}/${name}-${key}-2050.png`});
  }
  await openFilters(page);
  await page.locator('#map-method summary').click();
  await page.screenshot({path:`${out}/${name}-sources.png`});
  await page.locator('#map-method summary').click();
  await page.locator('[data-map-mode="value"]').click();
  assert.equal(await page.locator('[data-map-mode="value"]').getAttribute('aria-pressed'),'true');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`PASS ${name}: exclusive layers, year input, bounded Italian layout, sources, value mode`);
 }finally{await context.close();await page.video().saveAs(`${out}/${name}-evolution.webm`);await browser.close();}
}

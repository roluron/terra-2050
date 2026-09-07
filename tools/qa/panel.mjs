import fs from 'node:fs';
import { enter } from './entrance.cjs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {chromium, webkit, devices} from 'playwright';

const out = process.env.QA_SORTIE || fs.mkdtempSync(os.tmpdir() + '/terra-panel-');
fs.mkdirSync(out, {recursive:true});
const results = [];
const base = process.env.URL0 || 'http://localhost:8080/';
for (const [name, engine, options] of [
  ['panel-desktop', chromium, {viewport:{width:1440,height:900}}],
  ['panel-se', webkit, {...devices['iPhone SE'], viewport:{width:320,height:568}}],
  ['panel-iphone', webkit, devices['iPhone 15 Pro']],
  ['panel-landscape', webkit, {...devices['iPhone 15 Pro'], viewport:{width:734,height:343}}],
  ['panel-ipad', webkit, devices['iPad Pro 11']],
]) {
  if (process.env.QA_DEVICE && !name.includes(process.env.QA_DEVICE)) continue;
  const browser = await engine.launch({executablePath:engine.executablePath()});
  let page;
  try {
    page = await browser.newPage({...options,locale:'en-US'});
    const errors = []; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'#v=Paris&an=2026&cc=FR');
    await enter(page);
    await page.waitForFunction(()=>document.body.classList.contains('pret') && !document.querySelector('#dossier').inert);
    await page.waitForTimeout(1600);
    assert.equal(await page.locator('#dossier-nom').textContent(),'Paris');
    assert.equal(await page.locator('#dossier-temps #curseur').count(),1);
    await page.waitForTimeout(3200);
    assert.equal(await page.locator('#curseur').inputValue(),'2026','Opening changed the reading year');
    const bounds = await page.evaluate(()=>{
      const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right};};
      return {viewport:{w:innerWidth,h:innerHeight},panel:box(document.querySelector('#dossier')),body:box(document.querySelector('.fiche-corps')),close:box(document.querySelector('#dossier-croix')),range:box(document.querySelector('#curseur')),footer:box(document.querySelector('#dossier .actions')),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(bounds.overflow,false); assert.ok(bounds.panel.x>=-1 && bounds.panel.right<=bounds.viewport.w+1);
    assert.ok(bounds.body.h>=100,JSON.stringify(bounds));
    assert.ok(bounds.close.w>=44 && bounds.close.h>=44);
    assert.ok(bounds.range.h>=44);
    assert.ok(bounds.footer.bottom<=bounds.viewport.h+1);
    assert.equal(await page.locator('#dossier-croix svg').isVisible(),true);
    await page.screenshot({path:`${out}/${name}-city.png`});
    const rows=page.locator('#dossier-risques details'); assert.equal(await rows.count(),6);
    const notes=await rows.evaluateAll(es=>es.map(e=>Number(e.dataset.note)));
    assert.deepEqual(notes,[...notes].sort((a,b)=>a-b));
    for (const row of await rows.all()) {
      const summary=row.locator('summary'); await summary.scrollIntoViewIfNeeded();
      assert.ok((await summary.boundingBox()).height>=44);
      if(await row.evaluate(e=>e.open))await summary.click();
      if(options.hasTouch)await summary.tap();else {await summary.focus();await page.keyboard.press('Enter');}
      assert.equal(await row.evaluate(e=>e.open),true);
      assert.ok((await row.locator('.detail').textContent()).length>10);
    }
    const opened=await rows.evaluateAll(es=>es.filter(e=>e.open).map(e=>e.dataset.cle));
    await page.locator('#curseur').focus();await page.keyboard.press('End');
    await page.waitForFunction(()=>location.hash.includes('an=2050'));
    assert.equal(await page.locator('#dossier-annee').textContent(),'2050');
    assert.deepEqual(await rows.evaluateAll(es=>es.filter(e=>e.open).map(e=>e.dataset.cle)),opened);
    await page.locator('.fiche-methode summary').click();
    assert.equal(await page.locator('#dossier-sources').isVisible(),true);
    assert.match(await page.locator('.fiche-methode').textContent(),/SSP3-7.0/);
    await page.screenshot({path:`${out}/${name}-method.png`});
    await page.click('#bouton-reglages');await page.click('#bouton-langue');
    assert.match(await page.locator('.fiche-methode summary').textContent(),/Comprendre/);
    assert.match(await page.locator('.fiche-temps-label').textContent(),/Année/);
    await page.click('#dossier-story');
    await page.waitForFunction(()=>!document.querySelector('#story-partager').disabled);
    await page.click('#story-fermer');
    await page.click('#dossier-croix');
    assert.equal(await page.locator('#dossier #timeline').count(),0);
    assert.equal(await page.locator('#curseur').isVisible(),true);
    assert.equal(await page.locator('#dossier').evaluate(e=>e.inert),true);
    if(name==='panel-desktop' || name==='panel-se') {
      await page.click('#champ-recherche');await page.fill('#champ-recherche','France');
      await page.getByRole('option',{name:/France (PAYS|COUNTRY)/}).click();
      await page.waitForFunction(()=>!document.querySelector('#dossier').inert);
      assert.equal(await page.locator('#dossier-nom').textContent(),'France');
      assert.match(await page.locator('#dossier-conseil').textContent(),/pondérée|weighted/);
      await page.screenshot({path:`${out}/${name}-country.png`});
    }
    assert.deepEqual(errors,[]);
    results.push({name,pass:true,bounds,sixLocalDetails:true,yearStable:true,yearAndURLUpdate:true,openDetailsPreserved:true,methodology:true,FR:true,story:true,closeRestoresTimeline:true,errors});
  } catch(e) {
    if(page)await page.screenshot({path:`${out}/${name}-failure.png`});
    results.push({name,pass:false,error:e.message});
  } finally {await browser.close();}
  console.log(JSON.stringify(results.at(-1)));
  fs.writeFileSync(`${out}/panel.json`,JSON.stringify(results,null,2));
}
process.exitCode=results.some(r=>!r.pass)?1:0;

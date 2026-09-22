import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {enter} from './entrance.cjs';
const out=process.env.QA_SORTIE||'/tmp/terra-unified';await fs.mkdir(out,{recursive:true});
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900},deviceScaleFactor:2}],['phone',webkit,devices['iPhone SE']]]){
 const browser=await engine.launch({headless:false});
 try{
  const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   globalThis.storyFonts=[];
   const font=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'font');
   Object.defineProperty(CanvasRenderingContext2D.prototype,'font',{...font,set(value){if(this.canvas.width===1080&&this.canvas.height===1920)storyFonts.push(value);font.set.call(this,value);}});
   Object.defineProperty(navigator,'canShare',{value:()=>false});
  });
  await page.goto('http://127.0.0.1:8088/?lang=en');await enter(page);
  const year=await page.locator('#an').boundingBox(),filter=await page.locator('#map-inspector').boundingBox(),search=await page.locator('#champ-recherche').boundingBox(),gear=await page.locator('#bouton-reglages').boundingBox();
  assert.ok(Math.abs(year.x+year.width/2-page.viewportSize().width/2)<1,'Year is independently centered');
  assert.ok(filter.x<30&&filter.x+filter.width<year.x,'Filters remain left of year');
  assert.ok(Math.abs(search.width-search.height)<1&&Math.abs(search.height-gear.height)<1,'Matching round search and gear');
  await page.screenshot({path:`${out}/${name}-home.png`});
  await page.locator('#champ-recherche').fill('New York');await page.getByRole('option').filter({hasText:'New York'}).first().click();
  await page.locator('#dossier-comparer').click();
  assert.equal(await page.locator('#comparison-year').isVisible(),true);
  assert.equal(await page.locator('.compare-time .regle i').count(),25);
  for(const key of ['Home','End']){
   await page.locator('#comparison-year').focus();await page.keyboard.press(key);await page.waitForTimeout(700);
   assert.equal(await page.locator('#curseur').inputValue(),await page.locator('#comparison-year').inputValue());
   const bars=await page.locator('.compare-time .regle i').evaluateAll(es=>es.map(e=>e.style.transform));
   assert.match(bars[key==='Home'?0:24],/3\.0|3\.1/);
  }
  await page.screenshot({path:`${out}/${name}-comparison.png`});await page.locator('.compare-close').click();
  await page.locator('#dossier-story').click();await page.waitForFunction(()=>!document.getElementById('story-partager').disabled);
  const fonts=await page.evaluate(()=>storyFonts);assert.ok(fonts.length>5);assert.ok(fonts.every(f=>! /Herbik|Georgia|monospace/.test(f)));assert.ok(fonts.some(f=>f.startsWith('300 340px')));
  assert.match(await page.locator('#story-partager').evaluate(e=>getComputedStyle(e).fontFamily),/Lausanne/);
  const download=page.waitForEvent('download');await page.locator('#story-partager').click();await (await download).saveAs(`${out}/${name}-story.jpg`);
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: left filters, centered year, matched icons, shared ruler, Lausanne story download`);
 }finally{await browser.close();}
}

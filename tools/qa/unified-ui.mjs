import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {enter, openSearch} from './entrance.cjs';
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
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=en');await enter(page);
  const year=await page.locator('#an').boundingBox(),timeline=await page.locator('#timeline').boundingBox(),filter=await page.locator('#map-inspector').boundingBox(),search=await page.locator('#explore-city').boundingBox(),gear=await page.locator('#bouton-reglages').boundingBox();
  const inset=await page.locator('#timeline').evaluate(el=>parseFloat(getComputedStyle(el).right));
  assert.ok(Number.isFinite(inset)&&inset>=0&&Math.abs(page.viewportSize().width-timeline.x-timeline.width-inset)<1,'Timeline is anchored at the scaled right inset');
  assert.ok(Math.abs(filter.x-inset)<1&&filter.x+filter.width<year.x,'Filters share the scaled inset and remain left of year');
  assert.ok(search.width>=44&&search.height>=44&&gear.width>=44&&gear.height>=44,'Search and settings retain usable targets');
  assert.ok(search.x+search.width<=gear.x,'Search stays left of settings');
  if(page.viewportSize().width<=720)assert.ok(Math.abs(search.width-search.height)<1,'Compact search target stays round');
  await page.screenshot({path:`${out}/${name}-home.png`});
  await openSearch(page);await page.locator('#champ-recherche').fill('New York');await page.getByRole('option').filter({hasText:'New York'}).first().click();
  await page.locator('#dossier-comparer').click();
  assert.equal(await page.locator('#comparison-year').isVisible(),true);
  assert.equal(await page.locator('.compare-time .regle i').count(),25);
  for(const key of ['Home','End']){
   await page.locator('#comparison-year').focus();await page.keyboard.press(key);
   assert.equal(await page.locator('#comparison-year').inputValue(),key==='Home'?'2026':'2050');
   assert.equal(await page.locator('#curseur').inputValue(),await page.locator('#comparison-year').inputValue());
   const endpoint=key==='Home'?0:24;
   try{
    await page.waitForFunction(index=>{
     const bars=document.querySelectorAll('.compare-time .regle i'),bar=bars[index];
     if(bars.length!==25||!bar)return false;
     const base=parseFloat(getComputedStyle(bar).height),scale=bar.getBoundingClientRect().height/base;
     return base>0&&scale>=3&&scale<=4.05;
    },endpoint,{timeout:10000});
   }catch(error){
    error.stack+='\n'+name+' '+key+' ruler '+JSON.stringify(await page.evaluate(index=>({
     year:document.querySelector('#comparison-year').value,mainYear:document.querySelector('#curseur').value,
     visible:document.visibilityState,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
     bar:[...document.querySelectorAll('.compare-time .regle i')].filter((_,i)=>i===index).map(e=>({
      cssHeight:getComputedStyle(e).height,rect:e.getBoundingClientRect().toJSON(),transform:e.style.transform,
      computedTransform:getComputedStyle(e).transform}))}),endpoint));
    throw error;
   }
   const bars=await page.locator('.compare-time .regle i').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).height)));
   assert.equal(bars.length,25);assert.ok(bars[endpoint]>=3&&bars[endpoint]<=4.05,'Selected endpoint reaches the source ruler height');
  }
  await page.screenshot({path:`${out}/${name}-comparison.png`});await page.locator('.compare-close').click();
  await page.locator('#dossier-story').click();await page.waitForFunction(()=>!document.getElementById('story-partager').disabled);
  const fonts=await page.evaluate(()=>storyFonts);assert.ok(fonts.length>5);assert.ok(fonts.every(f=>! /Herbik|Georgia|monospace/.test(f)));assert.ok(fonts.some(f=>f.startsWith('300 340px')));
  assert.match(await page.locator('#story-partager').evaluate(e=>getComputedStyle(e).fontFamily),/Lausanne/);
  const download=page.waitForEvent('download');await page.locator('#story-partager').click();await (await download).saveAs(`${out}/${name}-story.jpg`);
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: left filters, right year, matched icons, shared ruler, Lausanne story download`);
 }finally{await browser.close();}
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium, webkit, devices} from 'playwright';
import {enter, chooseLanguage} from './entrance.cjs';
import {experienceCopy} from '../../refinement-copy.mjs';

const url=process.env.URL0||'http://localhost:8080/';
const output=process.env.QA_SORTIE||'/tmp/terra-feedback';
await fs.mkdir(output,{recursive:true});
const touchEngine=existsSync(webkit.executablePath())?webkit:chromium;
const profiles=[
  ['desktop',chromium,{viewport:{width:1280,height:720},reducedMotion:'no-preference'}],
  ['phone',touchEngine,{...devices['iPhone 15 Pro'],deviceScaleFactor:1,reducedMotion:'no-preference'}],
  ['compact',touchEngine,{...devices['iPhone SE'],viewport:{width:320,height:568},deviceScaleFactor:1,reducedMotion:'reduce'}],
  ['tablet',touchEngine,{...devices['iPad Mini'],deviceScaleFactor:1,reducedMotion:'reduce'}]
];
for(const [profile,engine,options] of profiles){
  if(process.env.TARGET&&process.env.TARGET!==profile)continue;
  const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),...(engine===chromium?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  try{
    const page=await browser.newPage(options),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'?lang=en',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{
      window.feedbackEntrance=[];
      function sample(){
        const opacity=['titre','an','map-inspector','explore-city'].map(id=>{
          let value=1;
          for(let e=document.getElementById(id);e;e=e.parentElement){
            const style=getComputedStyle(e);
            value*=style.visibility==='hidden'?0:Number(style.opacity);
          }
          return value;
        });
        if(document.body.classList.contains('pret'))window.feedbackEntrance.push(opacity);
        if(!document.body.classList.contains('pret')||opacity.some(value=>value<.99))requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await enter(page);
    await page.waitForFunction(()=>['titre','explore-city','an','map-inspector'].every(id=>Number(getComputedStyle(document.getElementById(id)).opacity)>=.99));
    const entrance=await page.evaluate(()=>window.feedbackEntrance);
    await fs.writeFile(`${output}/${profile}-entrance.json`,JSON.stringify(entrance));
    assert.ok(entrance.length&&entrance.every(values=>Math.max(...values)-Math.min(...values)<.08),`title, year, filters and CTA fade together: ${JSON.stringify(entrance.find(values=>Math.max(...values)-Math.min(...values)>=.08))}`);
    await page.screenshot({path:`${output}/${profile}-globe.png`});
    const timeline=await page.locator('#timeline').boundingBox();
    assert.ok(timeline.y+timeline.height<options.viewport.height-25,'timeline has breathing room above the bottom');
    if(options.viewport.width<=720){
      assert.ok(timeline.x>options.viewport.width/2,'mobile timeline is on the right');
      const filter=await page.locator('#map-inspector').boundingBox();
      assert.ok(filter.x+filter.width<timeline.x,'filter and timeline do not overlap');
    }
    const slider=page.locator('#curseur');
    await slider.focus();await slider.press('End');
    assert.equal(await slider.inputValue(),'2050');
    assert.match(await slider.getAttribute('aria-valuetext'),/^2050/);
    await slider.press('Home');assert.equal(await slider.inputValue(),'2026');
    if(options.hasTouch){
      const range=await slider.boundingBox();
      await slider.tap({position:{x:range.width-1,y:range.height/2}});assert.equal(await slider.inputValue(),'2050');
      await slider.tap({position:{x:1,y:range.height/2}});assert.equal(await slider.inputValue(),'2026');
    }
    assert.equal(await page.locator('#loupe').count(),0,'one city-search control, without a separate icon');
    assert.equal(await page.locator('.city-search-icon').isVisible(),options.viewport.width<=720,'magnifier on smartphone, text on desktop/tablet');
    assert.equal(await page.locator('#explore-city').getAttribute('aria-label'),experienceCopy('en').journey,'the icon keeps a localized accessible name');
    if(profile==='phone'){
      await page.setViewportSize({width:852,height:393});
      await page.waitForFunction(()=>Math.abs(document.querySelector('#explore-city').getBoundingClientRect().width-48)<1);
      assert.equal(await page.locator('.city-search-icon').isVisible(),true,'smartphone landscape keeps the icon');
      await page.setViewportSize(options.viewport);
    }
    const invitation=await page.locator('#explore-city').boundingBox();
    const gear=await page.locator('#bouton-reglages').boundingBox();
    assert.ok(Math.abs(gear.x-invitation.x-invitation.width-16)<1,'city invitation is immediately to the left of settings');
    assert.ok(Math.abs(gear.y+gear.height/2-invitation.y-invitation.height/2)<1,'city invitation and settings share a row');
    await page.locator('#explore-city').click();
    assert.equal(await page.locator('#champ-recherche').evaluate(e=>e===document.activeElement),true);
    await page.waitForFunction(()=>Math.abs(document.getElementById('champ-recherche').getBoundingClientRect().width-Math.min(360,innerWidth-(innerWidth<=720?100:140)))<1);
    const search=await page.locator('#champ-recherche').boundingBox();
    assert.ok(Math.abs(search.x+search.width-invitation.x-invitation.width)<1,'the search expands leftward from the invitation, beside settings');
    assert.equal(search.y,invitation.y);
    assert.equal(await page.locator('#explore-city').getAttribute('aria-hidden'),'true');
    await page.screenshot({path:`${output}/${profile}-search.png`});
    await page.locator('#champ-recherche').fill('');await page.locator('#champ-recherche').press('Escape');
    await page.waitForFunction(()=>document.body.classList.contains('loupe')&&document.querySelector('#explore-city').tabIndex===0);
    await page.keyboard.press('Control+k');
    assert.equal(await page.locator('#champ-recherche').evaluate(e=>e===document.activeElement),true,'keyboard shortcut expands the same search');
    await page.locator('#champ-recherche').blur();
    await page.waitForFunction(()=>document.body.classList.contains('loupe'));
    await page.locator('#map-toggle').click();
    await page.locator('.calque[data-cle="chaleur"]').click();
    await page.locator('#pedago').waitFor({state:'visible'});
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#pedago .pedago-carte')).opacity)>.99);
    assert.equal(await page.locator('#etiquettes').evaluate(e=>getComputedStyle(e).visibility),'hidden');
    assert.equal(await page.locator('#pedago-texte').innerText(),experienceCopy('en').indicators.chaleur);
    assert.equal(await page.locator('#pedago-details-text').isVisible(),false);
    assert.equal(await page.locator('#pedago-fermer').evaluate(e=>getComputedStyle(e,'::after').content),'none');
    await page.screenshot({path:`${output}/${profile}-help.png`});
    await page.locator('#pedago-details-label').click();
    assert.match(await page.locator('#pedago-details-text').innerText(),/SSP3-7.0/);
    await page.locator('#pedago-fermer').click();await page.locator('#pedago').waitFor({state:'hidden'});
    if(await page.locator('#map-toggle').getAttribute('aria-expanded')==='false')await page.locator('#map-toggle').click();
    await page.locator('[data-map-mode="value"]').click();
    assert.equal(await page.locator('[data-map-mode="value"]').innerText(),'Estimate in 2026');
    assert.match(await page.locator('.map-hint').innerText(),/estimated conditions in 2026/);
    await page.locator('#map-toggle').click();
    await page.locator('#bouton-reglages').click();await page.locator('#bouton-son').click();
    await page.waitForFunction(()=>window.Howler._howls.some(h=>h._src?.endsWith('/ambient_loop.mp3')&&h.state()==='loaded'&&h.playing()));
    assert.equal(await page.evaluate(()=>window.Howler._muted),false);
    await page.locator('#bouton-son').click();assert.equal(await page.evaluate(()=>window.Howler._muted),true);
    await page.locator('#bouton-reglages').click();
    await page.locator('#champ-recherche').fill('Paris');await page.getByRole('option').filter({hasText:'Paris'}).first().click();
    if(options.viewport.width<=720){
      const citySearch=await page.locator('#champ-recherche').boundingBox(),close=await page.locator('#dossier-croix').boundingBox();
      assert.ok(citySearch.y+citySearch.height<=close.y||citySearch.x+citySearch.width<=close.x,'city search leaves the close button accessible');
      await page.screenshot({path:`${output}/${profile}-city-search.png`});
    }
    await page.locator('#dossier-comparer').click();
    await page.locator('#comparison-search').fill('Tokyo');await page.locator('#comparison-search').press('ArrowDown');await page.locator('#comparison-search').press('Enter');
    const before=await page.locator('#city-comparison thead th').allTextContents();
    assert.match(before[2],/Tokyo/);
    await page.locator('.compare-swap').click();
    assert.equal(await page.locator('#comparison-search').inputValue(),'');
    assert.equal(await page.locator('#comparison-search').evaluate(e=>e===document.activeElement),true);
    assert.deepEqual(await page.locator('#city-comparison thead th').allTextContents(),before,'old comparison survives cancelling a replacement');
    await page.locator('#comparison-search').fill('London');await page.locator('#comparison-search').press('ArrowDown');await page.locator('#comparison-search').press('Enter');
    const after=await page.locator('#city-comparison thead th').allTextContents();
    assert.equal(after[1],before[1]);assert.match(after[2],/London/);
    await page.locator('#comparison-year').press('End');assert.equal(await slider.inputValue(),'2050');
    await page.locator('#comparison-year').blur();
    assert.ok(new URLSearchParams(new URL(page.url()).hash.slice(1)).has('vs'));
    await page.screenshot({path:`${output}/${profile}-comparison.png`});
    assert.equal(await page.locator('.compare-shell header').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('.compare-table-wrap thead').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('#recherche').evaluate(e=>getComputedStyle(e).visibility),'hidden');
    assert.ok(await page.locator('#city-comparison').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await page.locator('.compare-close').click();await page.locator('#dossier-croix').click();
    await page.waitForFunction(()=>!document.body.classList.contains('dossier-ouvert')&&Number(getComputedStyle(document.getElementById('dossier')).opacity)<.01);
    if(profile==='desktop'){
      for(const code of ['fr','vi','ja','zh','zh-Hant','es','it','en']){
        await chooseLanguage(page,code);
        if(await page.locator('#bouton-reglages').getAttribute('aria-expanded')==='true')await page.locator('#bouton-reglages').click();
        assert.equal(await page.locator('#explore-city').innerText(),experienceCopy(code).journey);
        await page.locator('#map-toggle').click();
        assert.equal(await page.locator('[data-map-mode="value"]').innerText(),experienceCopy(code).value.replace('{year}','2050'));
        await page.locator('#map-toggle').click();
      }
    }
    await page.screenshot({path:`${output}/${profile}-closed.png`});
    assert.deepEqual(errors,[]);
    console.log(`PASS ${profile} (${engine.name()}): timeline, CTA, help, sources, ambient audio, replacement city, sharing URL, glass surfaces`);
  }finally{await browser.close();}
}

// Isolate pointer geometry from WebGL so an early endpoint regression is precise.
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{})});
try{
  const page=await browser.newPage();
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:'<!doctype html>'}));
  await page.goto(url);
  await page.evaluate(async()=>{
    const {createYearRuler}=await import('./year-ruler.mjs');
    const root=document.createElement('div');root.style.cssText='position:fixed;z-index:9999;top:0;left:0;width:240px';
    root.innerHTML='<div id="qa-ruler" style="display:flex;justify-content:space-between"><i></i></div><input id="qa-slider" type="range" min="2026" max="2050" value="2026">';document.body.append(root);
    const ruler=root.querySelector('div'),slider=root.querySelector('input'),update=createYearRuler(slider,ruler);
    for(const bar of ruler.children)bar.style.cssText='width:2px;height:10px';
    const last=ruler.lastElementChild.getBoundingClientRect();
    slider.dispatchEvent(new PointerEvent('pointermove',{clientX:last.left+last.width/2-3}));
    for(let i=0;i<80;i++)update();
    window.qaBefore=Number(ruler.lastElementChild.style.opacity);
    slider.dispatchEvent(new PointerEvent('pointermove',{clientX:last.left+last.width/2}));
    for(let i=0;i<80;i++)update();
    window.qaAtEnd=Number(ruler.lastElementChild.style.opacity);
  });
  assert.ok(await page.evaluate(()=>qaBefore<.3&&qaAtEnd>.8),'2050 lights only once the pointer reaches its tick');
  console.log('PASS pointer geometry: no premature 2050 highlight');
}finally{await browser.close();}

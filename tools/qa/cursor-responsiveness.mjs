import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {enter} from './entrance.cjs';

const url=process.env.URL0||'http://localhost:8080/';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{})});
try{
  for(const reducedMotion of ['no-preference','reduce']){
    const page=await browser.newPage({viewport:{width:1000,height:700},reducedMotion});
    const fixture=new URL('cursor-fixture',url).href;
    await page.route(fixture,route=>route.fulfill({contentType:'text/html',body:`<!doctype html>
      <link rel="stylesheet" href="./premium.css">
      <style>*{box-sizing:border-box}#scene{position:fixed;inset:0;width:100%;height:100%}#control{position:fixed;left:850px;top:40px;width:100px;height:50px}</style>
      <canvas id="scene"></canvas><button id="control">Control</button><dialog><button>Close</button></dialog>`}));
    await page.goto(fixture);
    await page.evaluate(async()=>{
      const cursor=await import('./glass-cursor.mjs');
      cursor.setCursorGlobeHitTest(x=>x>200&&x<800);
      window.cursor=cursor.glassCursor;
    });
    await page.mouse.move(500,350);
    await page.waitForFunction(()=>!document.querySelector('.glass-cursor').hidden);
    // Read in the same event turn: an animated chase or an extra RAF fails.
    const errors=await page.evaluate(()=>{
      const errors=[];
      for(const [x,y] of [[300,300],[720,450],[250,600],[500,350]]){
        document.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:x,clientY:y}));
        errors.push(Math.hypot(window.cursor.x-x,window.cursor.y-y));
        const r=document.querySelector('.glass-cursor').getBoundingClientRect();
        errors.push(Math.hypot(r.x+r.width/2-x,r.y+r.height/2-y));
      }
      return errors;
    });
    assert.ok(errors.every(error=>error<.01),`cursor position follows immediately: ${errors}`);
    await page.waitForFunction(()=>window.cursor.radius===25);
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const metric=async name=>(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name===name).value;
    const before=await metric('LayoutCount');
    for(let i=0;i<20;i++)await page.mouse.move(300+i*20,350);
    const layouts=(await metric('LayoutCount'))-before;
    assert.ok(layouts<=1,`moving a settled cursor must not relayout the page: ${layouts}`);
    await page.locator('#control').hover();
    await page.waitForFunction(()=>window.cursor.radius===0&&document.querySelector('.glass-cursor').classList.contains('point')&&Math.abs(document.querySelector('.glass-cursor').getBoundingClientRect().width-10)<.01);
    await page.mouse.move(500,350);
    await page.waitForFunction(()=>window.cursor.radius===25);
    await page.mouse.down();await page.waitForFunction(()=>window.cursor.radius===18);
    await page.mouse.up();await page.waitForFunction(()=>window.cursor.radius===25);
    await page.evaluate(()=>document.querySelector('dialog').showModal());
    await page.waitForFunction(()=>document.querySelector('.glass-cursor').hidden&&!document.body.classList.contains('curseur-verre')&&window.cursor.radius===0);
    await page.evaluate(()=>document.querySelector('dialog').close());
    await page.mouse.move(100,350);
    await page.waitForFunction(()=>!document.querySelector('.glass-cursor').hidden&&document.querySelector('.glass-cursor').getBoundingClientRect().width<6.01);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.glass-cursor').isVisible(),false,'keyboard restores native cursor');
    await page.mouse.move(400,350);await page.waitForFunction(()=>!document.querySelector('.glass-cursor').hidden);
    await page.evaluate(()=>dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('.glass-cursor').isVisible(),false,'blur clears the cursor');
    console.log(`PASS ${reducedMotion}: immediate pointer, ${layouts} layouts during movement, lens/control/press/modal/keyboard/blur`);
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'}),pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url+'?lang=en');await enter(page);
  const tooltip=await page.evaluate(async()=>{
    const scene=document.getElementById('scene'),tooltip=document.getElementById('survol');
    const move=(x,y)=>scene.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:x,clientY:y,bubbles:true}));
    let point;
    for(const [x,y] of [[640,360],[580,310],[700,400],[620,430]]){
      move(x,y);
      if(tooltip.classList.contains('visible')){point=[x,y];break;}
    }
    if(!point)throw Error('No land tooltip found');
    const observer=new MutationObserver(()=>{});observer.observe(tooltip,{subtree:true,childList:true,characterData:true});
    const original=tooltip.querySelector('.s-nom').textContent;
    for(let i=0;i<30;i++)move(...point);
    const repeatedMutations=observer.takeRecords().length;
    const slider=document.getElementById('curseur');slider.value='2050';slider.dispatchEvent(new Event('input',{bubbles:true}));
    move(...point);
    const yearMutations=observer.takeRecords().length;
    observer.disconnect();
    return {original,repeatedMutations,yearMutations,visible:tooltip.classList.contains('visible')};
  });
  assert.equal(tooltip.repeatedMutations,0,'same place/year must reuse the diagnostic without rewriting text');
  assert.ok(tooltip.yearMutations>0,'changing the year invalidates the tooltip cache');
  assert.equal(tooltip.visible,true);
  assert.deepEqual(pageErrors,[]);
  console.log(`PASS live globe tooltip (${tooltip.original}): cached content during movement, refreshed on year change`);
}finally{await browser.close();}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, webkit, devices } from 'playwright';
import { discover } from './entrance.cjs';
import { morphPoint, startOrb } from '../../earth-orb.mjs';

assert.deepEqual(morphPoint({x:0,y:5},{x:10,y:15},0),{x:0,y:5});
assert.deepEqual(morphPoint({x:0,y:5},{x:10,y:15},1),{x:10,y:15});
{
  let next, ready = false, completed = 0;
  Object.assign(globalThis,{innerWidth:800,innerHeight:600,devicePixelRatio:1,document:{createElement:()=>({getContext:()=>null})},window:{addEventListener(){},removeEventListener(){}},requestAnimationFrame:fn=>(next=fn,1),cancelAnimationFrame(){}});
  startOrb({getContext:()=>null},[],{ready:()=>ready,points:()=>[],materialize(){},complete(){completed++;}});
  const now=performance.now();
  next(now+100);assert.equal(completed,0);
  ready=true;next(now+200);next(now+210);assert.equal(completed,1);
}
const out = process.env.QA_SORTIE || fs.mkdtempSync('/tmp/terra-intro-');
fs.mkdirSync(out, { recursive: true });
for (const [name, engine, configuration] of [
  ['desktop', chromium, {viewport:{width:1440,height:900}}],
  ['iphone-reduced', webkit, {...devices['iPhone 15 Pro'],reducedMotion:'reduce'}]
]) {
  const browser = await engine.launch({executablePath:engine.executablePath()});
  try {
    const context = await browser.newContext(configuration);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.URL0 || 'http://localhost:8080/');
    await page.waitForSelector('#earth-shell[open] .word').catch(async error => {
      await page.screenshot({path:out+'/'+name+'-startup-failure.png'});
      console.error(JSON.stringify({errors,state:await page.locator('body').innerText()}));
      throw error;
    });
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal(await page.locator('#future').isVisible(), false);
    await page.locator('#earth-shell .word').first().focus();
    await page.waitForSelector('#earth-shell .word.revealed');
    assert.equal(await page.locator('#future').isVisible(), false);
    await discover(page);
    const overflow = await page.locator('#earth-shell').evaluate(element => element.scrollWidth > element.clientWidth);
    assert.equal(overflow, false);
    await page.screenshot({path:out+'/'+name+'-letter.png'});
    const measurement = page.evaluate(() => new Promise(resolve => {
      const intervals = [], movement = [];
      let last = performance.now(), sampledAt = 0, vertex = -1;
      const started = last;
      const tick = time => {
        intervals.push(time-last); last=time;
        if (time-sampledAt > 350 && document.querySelector('#earth-shell').classList.contains('departing')) {
          const points = window.terraIntro.points();
          if (vertex < 0) vertex = points.findIndex(point => point.land && point.alpha > .9 && point.x > .3 && point.x < .7);
          if (vertex >= 0) movement.push({...points[vertex],time:time-started});
          sampledAt=time;
        }
        if (!document.querySelector('#earth-shell').open || time-started > 20000) {
          intervals.sort((a,b)=>a-b);
          resolve({duration:time-started,p95:intervals[Math.floor(intervals.length*.95)],movement,closed:!document.querySelector('#earth-shell').open});
        } else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
    await page.locator('#future').click();
    const result = await measurement;
    assert.equal(result.closed, true);
    if (name === 'desktop') {
      const orbit = result.movement.filter(point => point.time > 3200);
      assert.ok(orbit.length > 4);
      const displacement = Math.hypot(orbit.at(-1).x-orbit[0].x,orbit.at(-1).y-orbit[0].y);
      assert.ok(displacement > .005, 'The particle Earth must keep rotating after assembly');
      result.normalizedRotationDisplacement=displacement;
    } else assert.ok(result.duration < 2500, 'Reduced motion bypasses assembly');
    await page.screenshot({path:out+'/'+name+'-globe.png'});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({name,pass:true,duration:result.duration,p95FrameMs:result.p95,rotation:result.normalizedRotationDisplacement,errors}));
    fs.writeFileSync(out+'/'+name+'-intro.json',JSON.stringify(result,null,2));
  } finally { await browser.close(); }
}

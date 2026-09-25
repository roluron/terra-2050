import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
import {welcome,discover,chromeArgs} from './entrance.cjs';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['mobile',webkit,{...devices['iPhone 15 Pro'],reducedMotion:'reduce'}]]){
 if(process.env.TARGET&&process.env.TARGET!==name)continue;
 const browser=await engine.launch({headless:false,...(engine===chromium?{args:chromeArgs}:{})});
 try{
  const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(name,e.message)});
  if(name==='mobile')await page.route('**/howler.min.js',route=>route.abort());
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=en');await page.locator('#language-dialog').waitFor();await welcome(page);await page.mouse.move(0,0);await page.waitForTimeout(3000);
  assert.ok(await page.locator('h1 .word').count());
  assert.equal(await page.locator('#letter>p').count(),3);
  if(name==='desktop'){
   // sur un runner lent, rien n'est encore apparu apres 3 s : on attend que le premier
   // paragraphe commence a se montrer avant de le comparer au second
   await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#letter>p')).opacity)>.02,null,{timeout:20000});
   const blocks=await page.locator('#earth-shell h1,#letter>p').evaluateAll(es=>es.map(e=>({delay:parseFloat(getComputedStyle(e).animationDelay),opacity:Number(getComputedStyle(e).opacity)})));
   assert.ok(blocks.every((b,i)=>!i||b.delay>blocks[i-1].delay),'Paragraphs arrive in order');
   assert.ok(blocks[1].opacity>blocks[2].opacity,'First paragraph appears before second');
  }
  assert.equal(await page.locator('#earth-shell .latin').evaluateAll(es=>es.some(e=>Number(getComputedStyle(e).opacity)>0)),false);
  await page.screenshot({path:(process.env.QA_SORTIE||'/tmp/terra-qa')+'/work/instagram/'+name+'-mystery.png'});
  await page.waitForFunction(()=>window.terraIntro?.ready(),null,{timeout:30000}).catch(async error=>{console.error(await page.evaluate(()=>({ready:window.terraIntro?.ready(),progress:document.querySelector('#jauge')?.textContent,resources:performance.getEntriesByType('resource').filter(r=>r.duration>3000).map(r=>r.name)})));throw error});
  for(const word of await page.locator('#earth-shell .word').all())await word.focus();
  await page.waitForSelector('#earth-shell.complete');
  await page.evaluate(()=>{window.transitionFrames=[];let last=performance.now();function sample(now){window.transitionFrames.push({dt:now-last,veil:Number(getComputedStyle(document.querySelector('#earth-shell')).getPropertyValue('--earth-veil')||1)});last=now;if(document.querySelector('#earth-shell').open)requestAnimationFrame(sample)}requestAnimationFrame(sample);const shell=document.querySelector('#earth-shell');new MutationObserver((m,o)=>{if(!shell.open){window.transitionFrames.push({dt:performance.now()-last,veil:Number(getComputedStyle(shell).getPropertyValue('--earth-veil')||1)});o.disconnect();}}).observe(shell,{attributes:true,attributeFilter:['open']})});
  await page.locator('#future').click();await page.waitForFunction(()=>!document.querySelector('#earth-shell').open,null,{timeout:25000});
  const frames=await page.evaluate(()=>window.transitionFrames),intervals=frames.map(f=>f.dt).sort((a,b)=>a-b);
  assert.ok(frames.every((f,i)=>!i||f.veil<=frames[i-1].veil+.001),'Reveal never reverses');
  if(name==='desktop')assert.ok(frames.at(-1).veil<.001);
  assert.equal(await page.locator('#earth-shell').evaluate(e=>Number(e.style.getPropertyValue('--earth-veil'))),0);assert.deepEqual(errors,[]);
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth),false);
  console.log(JSON.stringify({name,encodedStart:true,transitionComplete:true,frames:frames.length,p95:intervals[Math.floor(intervals.length*.95)]}));
 }finally{await browser.close()}
}

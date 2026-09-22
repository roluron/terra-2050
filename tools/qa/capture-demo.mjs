import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.URL0||'http://localhost:8080/';
const work=process.env.DEMO_WORK||'/tmp/terra-demo';
await mkdir(work,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2,recordVideo:{dir:work,size:{width:3840,height:2160}}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let mouse=[960,540];
async function glide(to,duration=900){
 const from=mouse,began=Date.now();
 while(Date.now()-began<duration){const t=Math.min(1,(Date.now()-began)/duration),k=t*t*(3-2*t);await page.mouse.move(from[0]+(to[0]-from[0])*k,from[1]+(to[1]-from[1])*k);await sleep(16)}
 await page.mouse.move(...to);mouse=to;
}
async function center(selector){const b=await page.locator(selector).first().boundingBox();return [b.x+b.width/2,b.y+b.height/2]}
async function go(selector,duration){await glide(await center(selector),duration)}
async function press(selector,duration=900){await go(selector,duration);await sleep(250);await page.mouse.down();await sleep(90);await page.mouse.up()}
async function type(text){for(const ch of text){await page.keyboard.type(ch);await sleep(110+Math.random()*90)}}
const chapters=[];const mark=name=>chapters.push({name,at:(Date.now()-began)/1000});

await page.goto(url+'?lang=en');
await page.evaluate(()=>document.fonts.ready);
await page.addStyleTag({content:`.demo-cursor{position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,.28);box-shadow:0 0 0 1px rgba(0,0,0,.35),0 2px 10px rgba(0,0,0,.4);pointer-events:none;transition:transform .12s,opacity .2s}.demo-cursor.down{transform:scale(.6)}*{cursor:none!important}`});
await page.evaluate(()=>{const dot=document.createElement('div');dot.className='demo-cursor';document.body.append(dot);const scene=document.querySelector('#scene');
 addEventListener('pointermove',e=>{dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px'},true);
 addEventListener('pointerdown',()=>dot.classList.add('down'),true);addEventListener('pointerup',()=>dot.classList.remove('down'),true);
 (function tick(){dot.style.opacity=scene?.classList.contains('glass-pointer')?0:1;requestAnimationFrame(tick)})()});
await page.waitForSelector('#voile.pret',{state:'attached',timeout:30000});
const began=Date.now();await sleep(2000);

mark('language');
const options=await page.locator('#language-options label').all();
for(const option of options.slice(0,4)){const b=await option.boundingBox();await glide([b.x+b.width/2,b.y+b.height/2],650);await sleep(350)}
await press('#language-options label:has(input[value="en"])');
await page.locator('#language-dialog').waitFor({state:'hidden'});await sleep(2500);

mark('letter');
await glide([200,300],800);
for(const word of await page.locator('#earth-shell .word').all()){const b=await word.boundingBox();if(!b)continue;await glide([b.x+b.width/2,b.y+b.height/2],90+b.width*1.6);}
for(const word of await page.locator('#earth-shell .word').all())await word.dispatchEvent('pointerdown');
await page.waitForSelector('#earth-shell.complete');await sleep(1800);
await go('#future',1200);await sleep(1200);await page.mouse.down();await sleep(90);await page.mouse.up();

mark('earth');
await page.waitForFunction(()=>!document.getElementById('earth-shell').open,null,{timeout:25000});
await page.waitForFunction(()=>[...document.querySelectorAll('.calque')].every(el=>!el.style.opacity&&!el.style.transform),null,{timeout:30000});
await sleep(2500);
await glide([760,520],700);await page.mouse.down();await glide([1180,560],2600);await page.mouse.up();await sleep(1800);

mark('filters');
for(const layer of ['feux','mer','chaleur']){
 if(await page.locator('#map-toggle').getAttribute('aria-expanded')!=='true'){await press('#map-toggle');await sleep(1400)}
 await press(`.calque[data-cle="${layer}"]`);await sleep(1200);
 if(await page.locator('#pedago').isVisible()){await sleep(2600);await press('#pedago-fermer');await page.locator('#pedago').waitFor({state:'hidden'})}
 await sleep(2600);
}

mark('year');
const slider=await page.locator('#curseur').boundingBox();
await glide([slider.x+6,slider.y+slider.height/2],900);await sleep(300);await page.mouse.down();
await glide([slider.x+slider.width-6,slider.y+slider.height/2],5200);await page.mouse.up();await sleep(2200);

async function pick(field,text,results){
 await press(field);await sleep(300);await page.keyboard.press('Meta+a');await page.keyboard.press('Backspace');await sleep(300);await type(text);
 const option=page.locator(results).filter({hasText:text}).first();
 await option.waitFor().catch(async e=>{console.error(await page.evaluate(()=>({value:document.getElementById('champ-recherche').value,list:document.getElementById('resultats').innerText.slice(0,120),cmp:document.getElementById('comparison-results')?.innerText.slice(0,120)})));throw e});await sleep(700);
 const b=await option.boundingBox();await glide([b.x+b.width/2,b.y+b.height/2],700);await sleep(200);await page.mouse.down();await sleep(80);await page.mouse.up();
}
const tour=[{city:'Tokyo',rival:'Paris',story:true},{city:'Dhaka',rival:'Amsterdam'},{city:'Miami',rival:'Lagos'},{city:'Jakarta',rival:'Sydney',swap:true}];
for(const [index,stop] of tour.entries()){
 mark('city '+stop.city);
 if(await page.locator('#dossier.ouvert').count()){await press('#dossier-croix');await page.locator('#dossier.ouvert').waitFor({state:'detached'});await sleep(1500)}
 await pick('#champ-recherche',stop.city,'[role="option"]');
 await page.locator('#dossier.ouvert').waitFor();await sleep(3000);
 const meters=await page.locator('.risque summary').all();
 for(const meter of meters.slice(index%2,index%2+1)){const b=await meter.boundingBox();if(!b)continue;await glide([b.x+b.width/2,b.y+b.height/2],700);await sleep(200);await page.mouse.down();await sleep(80);await page.mouse.up();await sleep(2200)}
 mark('compare '+stop.city+' '+stop.rival);
 await press('#dossier-comparer');await sleep(1200);
 await pick('#comparison-search',stop.rival,'#comparison-results [role="option"]');
 await page.locator('#city-comparison td[data-value]').first().waitFor();await sleep(4000);
 if(stop.swap){
  const years=await page.locator('#comparison-year').boundingBox();
  await glide([years.x+years.width-6,years.y+years.height/2],800);await sleep(300);await page.mouse.down();await glide([years.x+years.width*0.2,years.y+years.height/2],3200);await page.mouse.up();await sleep(2000);
  await press('.compare-swap');await sleep(3000);
 }
 await press('.compare-close');await sleep(900);
 if(stop.story){
  mark('story');
  await press('#dossier-story');
  await page.locator('#story-partager:not([disabled]):not([aria-busy="true"])').waitFor({timeout:30000});await sleep(4000);
  await press('#story-fermer');await sleep(700);
 }
}
await press('#dossier-croix');await sleep(1500);

mark('french');
await press('#bouton-reglages');await sleep(1000);
await press('#bouton-langue');await sleep(1000);
await press('#language-options label:has(input[value="fr"])');
await page.locator('#language-dialog').waitFor({state:'hidden'});await sleep(2000);
await glide([760,560],700);await page.mouse.down();await glide([1100,540],3000);await page.mouse.up();await sleep(3000);

const length=(Date.now()-began)/1000;
await page.screenshot({path:work+'/demo-end.png'});await sleep(500);
const video=page.video();await context.close();const path=await video.path();
await writeFile(work+'/demo.json',JSON.stringify({path,length,chapters,errors},null,2));
await browser.close();
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify({path,length,chapters}));

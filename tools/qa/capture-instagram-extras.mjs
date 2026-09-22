import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {welcome} from './entrance.cjs';
const work='/Users/robinmahieux/Documents/Codex/2026-09-16/t/work/instagram';
const browser=await chromium.launch({headless:false}),cuts=JSON.parse(await readFile(work+'/cuts-extras.json','utf8').catch(()=>'[]'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function glide(p,a,b,ms){const start=Date.now();while(Date.now()-start<ms){const t=Math.min(1,(Date.now()-start)/ms),k=t*t*(3-2*t);await p.mouse.move(a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k);await sleep(20)}}
for(const name of ['09-hello-to-earth','10-lens-close-up','11-earth-halo','12-decoding-words']){
 if(process.env.SHOTS&&!process.env.SHOTS.split(',').includes(name))continue;
 const context=await browser.newContext({viewport:{width:1080,height:1080},recordVideo:{dir:work,size:{width:1080,height:1080}}}),page=await context.newPage();
 const demo=name.startsWith('10')||name.startsWith('11');
 await page.goto(demo?'http://127.0.0.1:8091/outputs/cursor-lab.html':'http://127.0.0.1:8088/?lang=en');await page.evaluate(()=>document.fonts.ready);
 let began;
 if(demo){
  await page.waitForFunction(()=>texture!==null);
  await page.addStyleTag({content:'header,footer,.actions,input,.city,#status,main>.label{display:none!important}body{cursor:none!important}'});
  if(name.startsWith('10')){
   await page.addStyleTag({content:'main{left:70px;top:365px;max-width:950px}h1{font-size:170px;line-height:1.1;letter-spacing:-8px;margin:0}p{display:none}#scene{visibility:hidden}'});
   await page.evaluate(()=>{document.querySelector('#title').textContent='A closer look.';s.fillStyle='#05080d';s.fillRect(0,0,w,h);pixels=s.getImageData(0,0,w,h).data;refreshTextLens()});
   await page.mouse.move(160,465);await sleep(800);began=Date.now();await glide(page,[160,465],[895,465],4800);await sleep(500);await glide(page,[895,465],[160,465],4800);
  }else{
   await page.addStyleTag({content:'main{left:75px;top:130px;max-width:720px}h1{font-size:72px;letter-spacing:-3px;margin:0}p{font-size:20px;max-width:600px;margin-top:20px}'});
   await page.evaluate(()=>{document.querySelector('#title').textContent='A closer look.';document.querySelector('#description').textContent='One planet. A different perspective.';refreshTextLens()});
   await page.mouse.move(400,480);await sleep(800);began=Date.now();await glide(page,[400,480],[710,720],3500);await glide(page,[710,720],[850,410],3000);await glide(page,[850,410],[400,480],3500);
  }
 }else{
  await page.addStyleTag({content:'.glass-cursor,#survol,#etiquettes,#titre,#recherche,#util,#globe-dock,#accroche{display:none!important}#earth-letter-main{width:820px!important;padding:0!important}#earth-shell h1{font-size:64px!important;margin-bottom:65px!important}#earth-shell .letter{font-size:29px!important;line-height:1.42!important}#earth-shell .signature{font-size:32px!important;margin-top:44px!important}'});
  await page.locator('#language-dialog').waitFor();await welcome(page);began=Date.now();await page.mouse.move(0,0);
  if(name.startsWith('12')){
   await page.evaluate(()=>{const p=document.querySelector('#letter>p');const br=p.querySelector('br');while(br?.nextSibling)br.nextSibling.remove();br?.remove()});
   await page.addStyleTag({content:'#earth-shell h1,.signature,.invitation,#letter>p:nth-child(2){display:none!important}#earth-shell .letter{font-size:82px!important;line-height:1.22!important}#earth-shell .glyphs{font-size:54px!important}'});
  }
  await sleep(name.startsWith('09')?7600:3000);
  for(const paragraph of await page.locator('#earth-shell h1,#letter>p').all()){
   for(const word of await paragraph.locator('.word').all()){if(name.startsWith('09')||await word.isVisible()){await word.dispatchEvent('pointerdown');await sleep(name.startsWith('12')?480:100)}}
   await sleep(650);
  }
  await sleep(name.startsWith('12')?3000:1800);
  if(name.startsWith('09')){await page.waitForFunction(()=>window.terraIntro?.ready());await page.locator('#future').click();await page.waitForFunction(()=>!document.querySelector('#earth-shell').open,null,{timeout:25000});await sleep(2500)}
 }
 const length=(Date.now()-began)/1000;await page.screenshot({path:work+'/'+name+'-end.png'});await sleep(500);const video=page.video();await context.close();const previous=cuts.findIndex(c=>c.name===name);if(previous>=0)cuts.splice(previous,1);cuts.push({name,path:await video.path(),length,tail:.5});await writeFile(work+'/cuts-extras.json',JSON.stringify(cuts,null,2));console.log(name,length);
}
await browser.close();

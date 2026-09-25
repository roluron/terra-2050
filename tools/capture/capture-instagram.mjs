import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {discover,welcome} from '../qa/entrance.cjs';
const root=process.env.CAPTURE_ROOT||'/tmp/terra-capture';
const work=root+'/work/instagram';
await mkdir(work,{recursive:true});
const browser=await chromium.launch({headless:false});
const cuts=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function glide(page,from,to,duration){
 const began=Date.now();
 while(Date.now()-began<duration){const t=Math.min(1,(Date.now()-began)/duration),k=t*t*(3-2*t);await page.mouse.move(from[0]+(to[0]-from[0])*k,from[1]+(to[1]-from[1])*k);await sleep(16)}
 await page.mouse.move(...to);
}
for(const name of ['01-cursor','02-earth-letter','03-transformation']){
 const context=await browser.newContext({viewport:{width:1080,height:1080},deviceScaleFactor:1,recordVideo:{dir:work,size:{width:1080,height:1080}}});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(name==='01-cursor'?'http://127.0.0.1:8091/outputs/cursor-lab.html':(process.env.URL0||'http://127.0.0.1:8088/')+'?lang=en');
 await page.evaluate(()=>document.fonts.ready);
 let began;
 if(name==='01-cursor'){
  await page.waitForFunction(()=>texture!==null);
  await page.addStyleTag({content:`header,footer,.actions,input,.city,#status,main>.label{display:none!important}main{left:90px;top:142px;max-width:600px}h1{font-size:76px;letter-spacing:-3px;margin:0}p{font-size:20px;line-height:1.4;max-width:450px;margin-top:22px}body{cursor:none!important}`});
  await page.evaluate(()=>{document.querySelector('#title').innerHTML='A closer look.';document.querySelector('#description').innerHTML='One planet. A different perspective.';refreshTextLens()});
  await page.mouse.move(130,185);await sleep(800);began=Date.now();
  await glide(page,[130,185],[450,185],2400);
  await glide(page,[450,185],[655,370],1600);
  await glide(page,[655,370],[805,530],2000);
  await glide(page,[805,530],[675,610],1700);
  await glide(page,[675,610],[485,380],1300);
  await glide(page,[485,380],[130,185],1800);
  await sleep(600);
 }else{
  await page.addStyleTag({content:`#earth-letter-main{width:780px;padding:0}#earth-shell h1{font-size:64px;margin-bottom:68px}#earth-shell .letter{font-size:27px;line-height:1.42}#earth-shell .signature{font-size:31px;margin-top:46px}#earth-shell .word:focus-visible{outline:none}#earth-shell #future{font-size:18px}.glass-cursor,#survol,#etiquettes,#titre,#recherche,#util,#globe-dock,#accroche{display:none!important}#earth-shell button:focus-visible{outline:none}`});
  if(name==='02-earth-letter'){
   await welcome(page);await sleep(3200);
   await page.addStyleTag({content:'.invitation{visibility:hidden!important}'});
   began=Date.now();await sleep(500);
   for(const word of await page.locator('#earth-shell .word').all()){await word.dispatchEvent('pointerdown');await sleep(85)}
   await page.waitForSelector('#earth-shell.complete');await sleep(2300);
  }else{
   await discover(page);await page.waitForFunction(()=>window.terraIntro?.ready());await sleep(1600);
   began=Date.now();await sleep(1000);
   await page.locator('#future').hover();await sleep(700);await page.locator('#future').click();
   await page.waitForFunction(()=>!document.querySelector('#earth-shell').open,null,{timeout:25000});await sleep(2500);
  }
 }
 const length=(Date.now()-began)/1000;
 await page.screenshot({path:work+'/'+name+'-end.png'});
 await sleep(500);
 const video=page.video();await context.close();const path=await video.path();
 cuts.push({name,path,length,tail:.5});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify(cuts.at(-1)));
}
await writeFile(work+'/cuts.json',JSON.stringify(cuts,null,2));
await browser.close();

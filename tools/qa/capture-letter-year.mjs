import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {welcome} from './entrance.cjs';
const work='/Users/robinmahieux/Documents/Codex/2026-09-16/t/work/instagram';
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1080,height:1080},recordVideo:{dir:work,size:{width:1080,height:1080}}});
const page=await context.newPage(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.goto('http://127.0.0.1:8088/?lang=en');await page.locator('#language-dialog').waitFor();await page.evaluate(()=>document.fonts.ready);
await page.addStyleTag({content:'.glass-cursor,#survol,#etiquettes,#titre,#recherche,#util,#globe-dock,#accroche{display:none!important}#earth-letter-main{width:820px!important;padding:0!important}#earth-shell h1{font-size:64px!important;margin-bottom:65px!important}#earth-shell .letter{font-size:29px!important;line-height:1.42!important}#earth-shell .signature{font-size:32px!important;margin-top:44px!important}#earth-shell h1,#earth-shell .letter p{animation:none;opacity:0;filter:blur(8px)}body.video-year #globe-dock{display:block!important}body.video-year #globe-dock>*:not(#timeline){display:none!important}body.video-year #globe-dock>#timeline{bottom:42px!important;width:280px!important;animation:video-year-in 1.5s ease both}#timeline .an{font-size:80px!important;white-space:nowrap!important}@keyframes video-year-in{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}'});
await welcome(page);await page.mouse.move(0,0);
await page.locator('#earth-shell h1,#letter>p').evaluateAll(nodes=>nodes.forEach(el=>{
 el.style.setProperty('animation','none','important');
 el.style.opacity='0';el.style.filter='blur(8px)';
}));
await page.addStyleTag({content:'#earth-shell .glyphs{animation:none!important;opacity:.8;transform:none;filter:none}#earth-shell .glyphs:not(.video-symbol){visibility:hidden}#earth-shell .video-symbol{display:flex!important}#earth-shell .latin{animation:none!important;transition:none!important}'});
await page.locator('#earth-shell .glyphs').evaluateAll(nodes=>nodes.forEach(el=>{const stable=el.cloneNode(true);stable.classList.add('video-symbol');el.after(stable)}));
const began=Date.now();await sleep(600);
for(const paragraph of await page.locator('#earth-shell h1,#letter>p').all()){
 const heading=await paragraph.evaluate(el=>el.tagName==='H1');
 await paragraph.evaluate(el=>el.animate([{opacity:0,filter:'blur(8px)',transform:'translateY(8px)'},{opacity:1,filter:'blur(0px)',transform:'translateY(0px)'}],{duration:1800,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'}));
 await sleep(2000);
 if(await paragraph.evaluate(el=>getComputedStyle(el).opacity)!=='1')throw new Error('Paragraph did not settle at full opacity');
 for(const word of await paragraph.locator('.word').all()){
  await word.evaluate(el=>{
   el.querySelector('.video-symbol').animate([{opacity:.8,filter:'blur(0px)'},{opacity:0,filter:'blur(3px)'}],{duration:900,easing:'ease-in-out',fill:'forwards'});
   el.querySelector('.latin').animate([{opacity:0,filter:'blur(4px)'},{opacity:1,filter:'blur(0px)'}],{duration:1100,easing:'ease-in-out',fill:'forwards'});
  });
  await word.dispatchEvent('pointerdown');await sleep(heading?650:80);
 }
 await sleep(heading?60:1200);
}
await page.waitForSelector('#earth-shell.complete');await sleep(1200);await page.waitForFunction(()=>window.terraIntro?.ready());await page.locator('#future').click();await page.mouse.move(0,0);await page.waitForFunction(()=>!document.querySelector('#earth-shell').open,null,{timeout:25000});await sleep(2000);
const cleanLength=(Date.now()-began)/1000;
await page.evaluate(()=>document.body.classList.add('video-year'));await sleep(6500);
await page.screenshot({path:work+'/14-letter-earth-year-end.png'});
const length=(Date.now()-began)/1000;await sleep(500);const video=page.video();await context.close();const clip={name:'14-letter-earth-year',path:await video.path(),length,tail:.5};await writeFile(work+'/cuts-year.json',JSON.stringify([clip],null,2));await writeFile(work+'/letter-year-timing.json',JSON.stringify({cleanLength}));console.log({length,cleanLength});await browser.close();

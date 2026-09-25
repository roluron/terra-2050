import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {enter} from '../qa/entrance.cjs';
const work=(process.env.QA_SORTIE||'/tmp/terra-qa')+'/work/instagram';
const browser=await chromium.launch({headless:false}),cuts=JSON.parse(await readFile(work+'/cuts-more.json','utf8').catch(()=>'[]'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function years(page,selector,start,end,duration){const began=Date.now();while(Date.now()-began<duration){const t=Math.min(1,(Date.now()-began)/duration),v=Math.round(start+(end-start)*t*t*(3-2*t));await page.locator(selector).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},v);await sleep(40)}await page.locator(selector).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},end)}
for(const name of ['04-year-ruler','05-summer-heat','06-one-planet','07-languages','08-two-cities']){
 if(process.env.SHOTS&&!process.env.SHOTS.split(',').includes(name))continue;
 const context=await browser.newContext({viewport:{width:1080,height:1080},recordVideo:{dir:work,size:{width:1080,height:1080}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=en');await page.evaluate(()=>document.fonts.ready);
 let began;
 if(name==='07-languages'){
  await page.locator('#language-dialog').waitFor();
  await page.addStyleTag({content:'.language-content{width:660px!important;padding:60px!important}.language-globe{width:82px;height:82px;margin-bottom:36px}#language-title{font-size:54px;max-width:500px;margin-bottom:36px}#language-options label{font-size:23px;min-height:70px}#language-options label:has(input:checked){background:transparent;border-color:transparent;box-shadow:none}#language-options label:has(input:focus-visible){outline:none}#language-options label:hover{background:#ffffff0c;border-color:#ffffff3d}.glass-cursor{display:none!important}'});
  await page.mouse.move(10,10);await sleep(1400);began=Date.now();
  await page.addStyleTag({content:'#language-title{font-size:54px!important;max-width:540px!important}#language-options span{font-size:23px!important}#language-options label{min-height:70px!important;outline:none!important;box-shadow:none!important}#language-options label:has(input:checked){background:transparent!important;border-color:transparent!important}#language-options label:hover{background:#ffffff12!important;border-color:#ffffff4a!important}'});
  await page.evaluate(()=>document.activeElement?.blur());
  for(const code of ['en','fr','ja','zh-Hant','vi','es','it']){await page.locator('#language-options label').filter({has:page.locator('input[value="'+code+'"]')}).hover();await sleep(850)}
  await page.mouse.move(10,10);await sleep(1000);
 }else{
  await enter(page);
  await page.addStyleTag({content:'#survol,#etiquettes,#titre,#recherche,#util,#map-inspector,#accroche,.glass-cursor{display:none!important}'});
  if(name==='04-year-ruler'){
   await page.addStyleTag({content:'#scene{visibility:hidden}#globe-dock>#timeline,body.pret #globe-dock>#timeline{bottom:auto!important;top:42%!important;width:660px!important}#globe-dock #timeline .an{font-size:210px!important;font-weight:300}#timeline .regle{height:62px;width:82%}#timeline .regle i{height:15px;width:2px}#curseur{visibility:hidden}body{background:#050606}'});
   await page.mouse.move(10,10);await sleep(500);began=Date.now();await sleep(700);await years(page,'#curseur',2026,2050,3800);await sleep(800);await years(page,'#curseur',2050,2026,3800);await sleep(700);
  }else if(name==='05-summer-heat'){
   await page.locator('.calque[data-cle=chaleur]').evaluate(el=>el.click());
   await page.getByRole('button',{name:'Got it',exact:true}).click();
   await page.addStyleTag({content:'#globe-dock>#timeline{bottom:70px!important}#globe-dock #timeline .an{font-size:88px!important}'});
   await page.evaluate(()=>{const h=document.createElement('div');h.textContent='SUMMER HEAT';h.style.cssText='position:fixed;top:94px;left:0;width:100%;text-align:center;font:400 13px var(--police);letter-spacing:3px;color:#fff;opacity:.6;pointer-events:none';document.body.append(h)});
   await page.mouse.move(10,10);await sleep(1200);began=Date.now();await sleep(900);await years(page,'#curseur',2026,2050,6500);await sleep(1800);
  }else if(name==='06-one-planet'){
   await page.addStyleTag({content:'#globe-dock{display:none!important}'});
   await page.mouse.move(540,540);await sleep(600);began=Date.now();await sleep(500);await page.mouse.down();
   const started=Date.now();while(Date.now()-started<6500){const t=(Date.now()-started)/6500;await page.mouse.move(540+250*Math.sin(t*Math.PI*.7),540+35*Math.sin(t*Math.PI));await sleep(30)}await page.mouse.up();await page.mouse.move(10,10);await sleep(2200);
  }else{
   await page.locator('#champ-recherche').evaluate(el=>{el.style.display='block'});
   await page.evaluate(()=>{document.querySelector('#recherche').style.setProperty('display','block','important')});
   await page.locator('#champ-recherche').fill('New York');await page.getByRole('option').filter({hasText:'New York'}).first().click();await page.locator('#dossier-comparer').click();await page.locator('#comparison-search').fill('Tokyo');await page.locator('#comparison-results [role=option]').first().click();
   await page.addStyleTag({content:'#city-comparison{width:920px!important;max-height:900px!important;background:#111316bf!important}#city-comparison .compare-shell{padding:46px!important}.compare-close,.compare-picker,.compare-swap,.compare-period,.compare-table-wrap tbody tr:nth-child(n+3),.compare-table-wrap td small,.compare-table-wrap th small{display:none!important}.compare-shell h2{font-size:44px!important}.compare-time{margin:30px 0!important}.compare-time output{font-size:90px!important}.compare-table-wrap td strong{font-size:48px!important}.compare-table-wrap th,.compare-table-wrap td{padding:24px 14px!important}.compare-table-wrap{overflow:visible!important}#dossier,#recherche,#globe-dock{display:none!important}#scene{opacity:.25}'});
   await page.evaluate(()=>document.querySelector('#recherche').style.setProperty('display','none','important'));
   await page.mouse.move(10,10);await years(page,'#comparison-year',2026,2026,1);await sleep(700);began=Date.now();await sleep(800);await years(page,'#comparison-year',2026,2050,5700);await sleep(1400);
  }
 }
 const length=(Date.now()-began)/1000;await page.screenshot({path:work+'/'+name+'-end.png'});await sleep(500);
 const video=page.video();await context.close();const previous=cuts.findIndex(c=>c.name===name);if(previous>=0)cuts.splice(previous,1);cuts.push({name,path:await video.path(),length,tail:.5});console.log(JSON.stringify(cuts.at(-1)));if(errors.length)throw Error(errors.join('\n'));
 await writeFile(work+'/cuts-more.json',JSON.stringify(cuts,null,2));
}
await browser.close();

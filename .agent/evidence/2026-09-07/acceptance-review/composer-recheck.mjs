import fs from 'node:fs';
import {chromium,webkit,devices} from 'playwright';
const OUT=new URL('.',import.meta.url).pathname, URL0=(process.env.URL0 || 'http://localhost:8080/');
const result={}; const save=()=>fs.writeFileSync(OUT+'composer-recheck.json',JSON.stringify(result,null,2));
async function open(type,opts={}) {const b=await type.launch({executablePath:type.executablePath()});const p=await b.newPage({...opts,locale:'en-US'});return{b,p}}
async function enter(p){await p.goto(URL0);await p.waitForSelector('#voile.pret',{timeout:60000});await p.click('#bouton-entree');await p.waitForTimeout(1500)}
async function search(p){await p.click('#champ-recherche');await p.fill('#champ-recherche','Paris');await p.getByRole('option').filter({hasText:'Paris'}).first().click()}
for(const [name,type,opts]of [['desktop-short',chromium,{viewport:{width:1440,height:500}}],['iphone-se',webkit,devices['iPhone SE']]]){
 const {b,p}=await open(type,opts);try{await enter(p);await search(p);await p.click('#dossier-story');await p.waitForSelector('#story-partager:not([disabled])');await p.waitForTimeout(600);
 const bounds=await p.evaluate(()=>{const q=[...document.querySelectorAll('.story-carte,#story-fermer,#story-partager,.story-opt')];return q.map(e=>{const r=e.getBoundingClientRect();return {label:e.id||e.className,x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right,within:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}})});
 const option=p.locator('#story-popup input[data-opt]').first(),before=await option.isChecked();await option.focus();await p.keyboard.press('Space');const toggled=before!==await option.isChecked();
 const focus=[];for(let n=0;n<12;n++){await p.keyboard.press(n<6?'Tab':'Shift+Tab');focus.push(await p.evaluate(()=>({id:document.activeElement.id,inside:!!document.activeElement.closest('#story-popup')})))};
 await p.screenshot({path:OUT+name+'-story.png'});await p.click('#story-fermer');const closed=await p.locator('#story-popup').isHidden();let doubleError=null;try{await p.locator('#dossier-story').dblclick({timeout:3000})}catch(e){doubleError=e.message;await p.screenshot({path:OUT+name+'-reopen-failure.png'});fs.writeFileSync(OUT+name+'-reopen-failure.json',JSON.stringify(await p.evaluate(()=>['dossier-story','timeline','dossier'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,scroll:e.scrollTop}})),null,2))};await p.waitForTimeout(650);const doubleStayed=await p.locator('#story-popup').isVisible();
 result[name]={bounds,toggled,focus,closed,doubleStayed,doubleError,pass:bounds.every(x=>x.within)&&toggled&&focus.every(x=>x.inside)&&closed&&doubleStayed};save();console.log(name,result[name].pass);
 }finally{await b.close()}
}
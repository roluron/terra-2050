import { enter as enterEarth } from './entrance.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
const out=new URL('file://' + path.resolve(process.env.QA_SORTIE || fs.mkdtempSync('/tmp/terra-surfaces-')) + '/'); fs.mkdirSync(out,{recursive:true}); const results=[];
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['iphone',webkit,devices['iPhone 15 Pro']]]){
if(process.env.QA_DEVICE && process.env.QA_DEVICE!==name) continue;
let stage='startup',page;
const browser=await engine.launch({executablePath:engine.executablePath()});
try{
 const context=await browser.newContext({...options,locale:'en-US'});
 page=await context.newPage();const activate=selector=>name==='iphone'?page.locator(selector).tap():page.click(selector); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.URL0||'http://localhost:8080/');await page.waitForSelector('#voile.pret', { state: 'attached' });await enterEarth(page);await page.waitForTimeout(1800);
 await page.keyboard.press('Meta+k');assert.equal(await page.locator('#champ-recherche').evaluate(e=>e===document.activeElement),true);
 await page.fill('#champ-recherche','Paris');await page.locator('#champ-recherche').dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});
 assert.equal(await page.locator('#dossier').evaluate(e=>e.classList.contains('ouvert')),false);
 await page.keyboard.press('Enter');await page.waitForTimeout(4200);
 assert.equal(await page.locator('#dossier-risques .risque').count(),6);
 assert.ok((await page.locator('#dossier-sources').textContent()).length>50);
 assert.ok((await page.locator('#dossier-pop').textContent()).length>5);
 await page.locator('#curseur').focus();await page.keyboard.press('Home');
 const details=[];
 for(const row of await page.locator('#dossier-risques .risque').all()){
   if(!await row.evaluate(e=>e.open)) {
     if(name==='iphone')await row.locator('summary').tap();else await row.locator('summary').click();
   }
   assert.equal(await row.locator('.detail').isVisible(),true);
   assert.equal(await row.locator('.detail').textContent(),await row.getAttribute('data-detail'));
   details.push(await row.locator('.detail').textContent());
 }
 assert.equal(new Set(details).size,6);
 const preserved=await page.locator('#dossier-risques>.risque[open]').count();
 await page.locator('#curseur').focus();for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('#dossier-risques>.risque[open]').count(),preserved);
 const alt=page.locator('#dossier-ailleurs .alt').first();const city=await alt.locator('.nom').textContent();await alt.click();await page.waitForTimeout(4200);assert.equal(await page.locator('#champ-recherche').inputValue(),city);
 await page.keyboard.press('Meta+k');await page.fill('#champ-recherche','');assert.ok((await page.locator('#resultats').textContent()).includes(city));
 await page.fill('#champ-recherche','Valence');const homonyms=await page.getByRole('option').allTextContents();assert.ok(homonyms.length>=2);assert.equal(new Set(homonyms).size,homonyms.length);
 await page.fill('#champ-recherche','atlantide');assert.ok((await page.locator('#resultats').textContent()).includes('Atlantis'));assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('atlantide')),true); await page.keyboard.press('Escape');stage='settings';await activate('#bouton-reglages');assert.equal(await page.locator('#bouton-position').count(),0);assert.equal(await page.locator('#bouton-langue').isVisible(),true);
 await page.screenshot({path:new URL(name+'-surfaces.png',out).pathname});
 assert.deepEqual(errors,[]);
 results.push({name,pass:true,keyboardSearch:true,delight:'Atlantide notice and globe flight triggered',IMEEnterIgnored:true,sixRiskDetails:details,alternative:city,recents:true,homonyms,locationRemoved:true,errors});
}catch(e){const state=page?await page.evaluate(()=>({menu:document.querySelector('#menu-reglages').className,settings:document.querySelector('#bouton-reglages').outerHTML,active:document.activeElement?.id,body:document.body.className})):null;if(page)await page.screenshot({path:new URL(name+'-failure.png',out).pathname});results.push({name,pass:false,stage,state,error:e.message});}finally{await browser.close();}console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(new URL('surfaces.json',out),JSON.stringify(results,null,2));process.exitCode=results.some(x=>!x.pass)?1:0;

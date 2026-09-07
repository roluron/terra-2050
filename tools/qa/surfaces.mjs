import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
const out=new URL('file://' + path.resolve(process.env.QA_SORTIE || fs.mkdtempSync('/tmp/terra-surfaces-')) + '/'); fs.mkdirSync(out,{recursive:true}); const results=[];
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['iphone',webkit,devices['iPhone 15 Pro']]]){
const browser=await engine.launch({executablePath:engine.executablePath()});
try{
 const context=await browser.newContext({...options,locale:'en-US',geolocation:{latitude:48.8566,longitude:2.3522},permissions:['geolocation']});
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.URL0||'http://localhost:8080/');await page.waitForSelector('#voile.pret');await page.click('#bouton-entree');await page.waitForTimeout(1800);
 await page.keyboard.press('Meta+k');assert.equal(await page.locator('#champ-recherche').evaluate(e=>e===document.activeElement),true);
 await page.fill('#champ-recherche','Paris');await page.locator('#champ-recherche').dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});
 assert.equal(await page.locator('#dossier').evaluate(e=>e.classList.contains('ouvert')),false);
 await page.keyboard.press('Enter');await page.waitForTimeout(4200);
 assert.equal(await page.locator('#dossier-risques .risque').count(),6);
 assert.ok((await page.locator('#dossier-sources').textContent()).length>50);
 assert.ok((await page.locator('#dossier-pop').textContent()).length>5);
 await page.locator('#curseur').focus();await page.keyboard.press('Home');
 const details=[];for(const row of await page.locator('#dossier-risques .risque').all()){const expected=await row.getAttribute('data-nom');await row.hover();await page.waitForFunction(name=>document.querySelector('#dossier-detail b')?.textContent===name,expected);details.push(await page.locator('#dossier-detail').textContent());} assert.equal(new Set(details).size,6);
 const alt=page.locator('#dossier-ailleurs .alt').first();const city=await alt.locator('.nom').textContent();await alt.click();await page.waitForTimeout(4200);assert.equal(await page.locator('#champ-recherche').inputValue(),city);
 await page.keyboard.press('Meta+k');await page.fill('#champ-recherche','');assert.ok((await page.locator('#resultats').textContent()).includes(city));
 await page.fill('#champ-recherche','Valence');const homonyms=await page.getByRole('option').allTextContents();assert.ok(homonyms.length>=2);assert.equal(new Set(homonyms).size,homonyms.length);
 await page.fill('#champ-recherche','atlantide');assert.ok((await page.locator('#resultats').textContent()).includes('Atlantis'));assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('atlantide')),true); await page.keyboard.press('Escape');await page.click('#bouton-reglages');await page.click('#bouton-position');await page.waitForTimeout(4200);const nearest=await page.locator('#champ-recherche').inputValue();assert.match(nearest,/^Paris/);
 await page.screenshot({path:new URL(name+'-surfaces.png',out).pathname});
 await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=(_success,failure)=>failure({code:1,message:'Permission denied'});});
 await page.click('#bouton-reglages');await page.click('#bouton-position');await page.waitForSelector('#accroche:not([hidden])');assert.match(await page.locator('#accroche-txt').textContent(),/Location unavailable/);await page.click('#accroche-txt');assert.equal(await page.locator('#champ-recherche').evaluate(e=>e===document.activeElement),true);assert.deepEqual(errors,[]);
 results.push({name,pass:true,keyboardSearch:true,delight:'Atlantide notice and globe flight triggered',IMEEnterIgnored:true,sixRiskDetails:details,alternative:city,recents:true,homonyms,geolocation:{nearest,coordinates:[48.8566,2.3522]},geolocationDenied:'Visible search fallback via injected permission error',errors});
}catch(e){results.push({name,pass:false,error:e.message});}finally{await browser.close();}console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(new URL('surfaces.json',out),JSON.stringify(results,null,2));process.exitCode=results.some(x=>!x.pass)?1:0;

import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900},locale:'en-US'}],['phone',webkit,{...devices['iPhone SE'],locale:'en-US'}]]){
 const browser=await engine.launch({headless:false});
 try{
  const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/'));await page.locator('#language-dialog[open]').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#language-continue').count(),0);
  await page.locator('#language-options input[value="it"]').hover();
  assert.equal(await page.locator('#language-options input:checked').inputValue(),'en');
  await page.locator('#language-options input[value="it"]').click();await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('html').getAttribute('lang'),'it');
  assert.equal(await page.locator('#earth-shell').isVisible(),true);
  await page.evaluate(async()=>{(await import('/i18n.mjs')).openLanguage(()=>{});});
  // la fleche droite choisit la langue suivante de la liste (chinois traditionnel
  // arrive apres l'italien depuis a9462fd) : l'attente se lit dans la liste
  const suivante=await page.locator('#language-options input').evaluateAll(inputs=>{const i=inputs.findIndex(x=>x.checked);return inputs[(i+1)%inputs.length].value;});
  await page.locator('#language-options input:checked').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#language-dialog').isVisible(),true);
  assert.equal(await page.locator('html').getAttribute('lang'),'it');
  await page.keyboard.press('Enter');await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('html').getAttribute('lang'),suivante);
  await page.evaluate(async()=>{(await import('/i18n.mjs')).openLanguage(()=>{});});
  await page.locator('#language-options input:checked').click();await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: browser-language default, no hover selection, one-click confirmation, same-language click, keyboard confirmation`);
 }finally{await browser.close();}
}

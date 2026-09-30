import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {chromium,webkit,devices} from 'playwright';
const url=process.env.URL0||'http://127.0.0.1:8088/';
const touchEngine=existsSync(webkit.executablePath())?webkit:chromium;
const prompts={en:'Select your language',fr:'Choisis ta langue',ja:'言語を選んでください',zh:'请选择语言',vi:'Chọn ngôn ngữ của bạn',es:'Elige tu idioma',it:'Scegli la tua lingua','zh-Hant':'請選擇語言'};
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900},locale:'en-US'}],['phone',touchEngine,{...devices['iPhone SE'],deviceScaleFactor:1,locale:'en-US',reducedMotion:'reduce'}]]){
 const browser=await engine.launch({headless:process.env.QA_HEADLESS==='1',...(engine===chromium&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 try{
  const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#language-dialog[open]').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#language-continue').count(),0);
  const initialUrl=page.url(),initialSaved=await page.evaluate(()=>localStorage.getItem('terra-langue'));
  const preview=async(code)=>{
   assert.equal(await page.locator('#language-options input:checked').inputValue(),code);
   assert.equal(await page.locator('#language-title').innerText(),prompts[code]);
   assert.equal(await page.locator('#language-dialog').getAttribute('lang'),code);
   assert.equal(await page.locator('#language-dialog').isVisible(),true);
   assert.equal(await page.locator('html').getAttribute('lang'),'en','preview does not confirm the app language');
   assert.equal(page.url(),initialUrl,'preview preserves the URL');
   assert.equal(await page.evaluate(()=>localStorage.getItem('terra-langue')),initialSaved,'preview is not saved');
  };
  await page.locator('#language-options input:checked').focus();
  await page.keyboard.press('ArrowDown');await preview('fr');
  await page.keyboard.press('ArrowUp');await preview('en');
  await page.keyboard.press('ArrowLeft');await preview('zh-Hant');
  await page.keyboard.press('ArrowRight');await preview('en');
  for(const code of ['fr','ja','zh','vi','es','it','zh-Hant','en']){
   await page.keyboard.press('ArrowDown');await preview(code);
  }
  await page.keyboard.press('ArrowDown');await preview('fr');
  await page.keyboard.press('Enter');await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  assert.equal(await page.evaluate(()=>localStorage.getItem('terra-langue')),'fr');
  assert.equal(new URL(page.url()).searchParams.get('lang'),'fr');
  assert.equal(await page.locator('#earth-shell').isVisible(),true);
  await page.evaluate(async()=>{(await import('./i18n.mjs')).openLanguage(()=>{});});
  assert.equal(await page.locator('#language-title').innerText(),prompts.fr,'reopening starts with the confirmed language');
  await page.locator('#language-options input[value="it"]').hover();
  assert.equal(await page.locator('#language-options input:checked').inputValue(),'fr');
  assert.equal(await page.locator('#language-title').innerText(),prompts.fr,'hover does not select a language');
  // Space retains native radio activation/confirmation, like a click.
  await page.locator('#language-options input[value="ja"]').focus();await page.keyboard.press('Space');
  await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('html').getAttribute('lang'),'ja');
  await page.evaluate(async()=>{(await import('./i18n.mjs')).openLanguage(()=>{});});
  await page.locator('#language-options input[value="it"]').click();await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('html').getAttribute('lang'),'it');
  await page.evaluate(async()=>{(await import('./i18n.mjs')).openLanguage(()=>{});});
  await page.locator('#language-options input:checked').click();await page.locator('#language-dialog').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);console.log(`PASS ${name} (${engine.name()}): all language previews, four arrows, wrap, Space, Enter, hover, click, reopen and saved preference`);
 }finally{await browser.close();}
}

import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {enter} from './entrance.cjs';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900},locale:'zh-TW'}],['phone',webkit,{...devices['iPhone SE'],locale:'zh-HK',reducedMotion:'reduce'}]]){
 const browser=await engine.launch({headless:false});try{
 const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8088/');
 await page.locator('#language-dialog').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hant');
 assert.equal(await page.locator('#language-options input').count(),8);assert.equal(await page.locator('#language-options input:checked').inputValue(),'zh-Hant');
 assert.match(await page.locator('#language-title').textContent(),/請選擇語言/);
 await enter(page);assert.match(page.url(),/lang=zh-Hant/);
 assert.equal(await page.locator('#map-toggle').getAttribute('data-short-label'),'指標');
 assert.match(await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--police')),/PingFang TC/);
 await page.locator('#champ-recherche').fill('New York');await page.getByRole('option').filter({hasText:'New York'}).first().click();
 await page.locator('#dossier-comparer').click();assert.match(await page.locator('#city-comparison').innerText(),/比較兩個地點/);
 await page.locator('.compare-close').click();await page.locator('#dossier-story').click();
 await page.waitForFunction(()=>!document.querySelector('#story-partager').disabled);assert.match(await page.locator('#story-popup').innerText(),/限時動態/);
 await page.screenshot({path:`/Users/robinmahieux/Documents/Codex/2026-09-16/t/outputs/traditional-${name}.png`});
 const supported=await page.evaluate(async()=>{const {supportedLanguage}=await import('./i18n.mjs');return ['zh-TW','zh-HK','zh-MO','zh-Hant-HK','zh-CN','zh-Hans'].map(supportedLanguage)});assert.deepEqual(supported,['zh-Hant','zh-Hant','zh-Hant','zh-Hant','zh','zh']);
 assert.deepEqual(errors,[]);console.log(`PASS ${name}: Traditional Chinese detection, picker, opening, comparison, story, fonts`);
 }finally{await browser.close()}
}

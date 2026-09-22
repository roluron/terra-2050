import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {discover} from './entrance.cjs';
const browser=await chromium.launch({headless:false});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:8088/?lang=en');
 await page.locator('#language-options label').first().hover();
 await page.waitForFunction(()=>document.querySelector('.glass-cursor.over-control:not([hidden])'));
 await discover(page);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'No stale language cursor');
 await page.locator('#future').hover();await page.waitForTimeout(150);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'CTA keeps its underline, without magnetic rectangle');
 const line=await page.locator('#future').evaluate(el=>{const s=getComputedStyle(el,'::after');return {content:s.content,height:s.height,width:s.width}});
 assert.equal(line.height,'1px');assert.notEqual(line.content,'none');assert.ok(parseFloat(line.width)>50);
 await page.screenshot({path:'/Users/robinmahieux/Documents/Codex/2026-09-16/t/outputs/future-underline.png'});
 await page.locator('#future').click();await page.mouse.move(650,450);await page.waitForTimeout(100);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'No cursor stranded during departure');
 await page.waitForFunction(()=>!document.querySelector('#earth-shell').open,{},{timeout:20000});
 await page.waitForTimeout(250);await page.mouse.move(700,420);await page.waitForTimeout(100);
 assert.equal(await page.locator('.glass-cursor').isVisible(),true,'Cursor resumes with mouse movement');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'Cursor clears when window loses focus');
 console.log('PASS language exit, underlined CTA, departure cleanup, resumed movement, blur');
}finally{await browser.close()}

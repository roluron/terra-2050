import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {discover,chromeArgs} from './entrance.cjs';
const browser=await chromium.launch({headless:false,args:chromeArgs});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=en');
 await page.locator('#language-options label').first().hover();await page.waitForTimeout(150);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'Language dialog keeps the native cursor');
 await discover(page);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'No stale language cursor');
 await page.locator('#future').hover();await page.waitForTimeout(150);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'CTA keeps its underline, without magnetic rectangle');
 const line=await page.locator('#future').evaluate(el=>{const s=getComputedStyle(el,'::after');return {content:s.content,height:s.height,width:s.width}});
 assert.equal(line.height,'1px');assert.notEqual(line.content,'none');assert.ok(parseFloat(line.width)>50);
 await page.screenshot({path:(process.env.QA_SORTIE||'/tmp/terra-qa')+'/outputs/future-underline.png'});
 await page.locator('#future').click();await page.mouse.move(650,450);await page.waitForTimeout(100);
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'No cursor stranded during departure');
 await page.waitForFunction(()=>!document.querySelector('#earth-shell').open,{},{timeout:20000});
 await page.waitForTimeout(250);await page.mouse.move(700,420);await page.waitForTimeout(100);
 assert.equal(await page.locator('.glass-cursor').isVisible(),true,'Cursor resumes with mouse movement');
 await page.mouse.move(200,450);await page.waitForTimeout(500);
 await page.waitForFunction(()=>{const e=document.querySelector('.glass-cursor');return e&&e.classList.contains('point')&&parseFloat(e.style.width)<8;},null,{timeout:5000}).catch(()=>{});
 assert.equal(await page.locator('.glass-cursor').evaluate(e=>e.classList.contains('point')&&parseFloat(e.style.width)<8),true,'Shrinks to a dot off the globe');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 assert.equal(await page.locator('.glass-cursor').isVisible(),false,'Cursor clears when window loses focus');
 console.log('PASS language exit, underlined CTA, departure cleanup, resumed movement, blur');
}finally{await browser.close()}

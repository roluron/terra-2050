import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {enter} from './entrance.cjs';
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['phone',webkit,devices['iPhone SE']]]){
 const browser=await engine.launch({headless:false});
 try{
  const page=await browser.newPage(options);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GLSL/i.test(m.text()))errors.push(m.text());});
  await page.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=it');await enter(page);
  const toggle=page.locator('#map-toggle'),panel=page.locator('#map-inspector');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#calques').isVisible(),false);
  const closed=await panel.boundingBox(),year=await page.locator('#timeline').boundingBox();
  const dock=await page.locator('#globe-dock').boundingBox();assert.ok(Math.abs(dock.x+dock.width/2-page.viewportSize().width/2)<1,'Dock is centered');
  assert.ok(closed.height<100);assert.ok(closed.y+closed.height>year.y);
  assert.ok(closed.x+closed.width<=year.x||closed.y>=year.y+year.height);
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  const anchored=await panel.boundingBox();assert.ok(Math.abs(anchored.y-closed.y)<1,'Opening does not move the dock');
  await page.locator('.calque').first().click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  if(await page.locator('#pedago').isVisible()){await page.locator('#pedago-fermer').click();await page.locator('#pedago').waitFor({state:'hidden'});}
  await toggle.click();await page.keyboard.press('Escape');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await page.waitForTimeout(250);await page.screenshot({path:`/tmp/terra-dock-${name}.png`});
  await toggle.click();const open=await page.locator('#map-options').boundingBox();assert.ok(open.y>=0&&open.y+open.height<=page.viewportSize().height);
  await page.waitForTimeout(250);await page.screenshot({path:`/tmp/terra-dock-${name}-open.png`});
  const handle=await toggle.boundingBox();assert.ok(handle.y>open.y+open.height&&handle.y+handle.height<=page.viewportSize().height,'Collapse control stays separate and visible');
  if(name==='phone'){await page.setViewportSize({width:568,height:320});const landscape=await page.locator('#map-options').boundingBox();assert.ok(landscape.y>=0&&landscape.y+landscape.height<320);}
  assert.deepEqual(errors,[]);
  console.log(`PASS ${name}: bottom dock, no year overlap, selection and Escape collapse`);
 }finally{await browser.close();}
}

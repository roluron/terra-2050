import fs from 'node:fs';
import { enter } from './entrance.cjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.QA_SORTIE||'/tmp/terra-motion';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:chromium.executablePath(),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const result={};const errors=[];
try{
 const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch();let html=await response.text();html=html.replace('</script>\n</body>',`globalThis.__motionReady=()=>!!uniformsGlobe.uScientific_river.value.image?.data;globalThis.__motionClock=()=>[uniformsGlobe.uTemps.value];globalThis.__motionProbe=()=>{
 controles.autoRotate=false;gsap.killTweensOf(camera.position);camera.position.copy(latLonVersVec3(23,90,2.6));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const target=cibles[0],w=target.width,h=target.height;
 const shot=(key,t,p)=>{for(const c of Object.values(CALQUES))c.uniforme.value=0;if(key)CALQUES[key].uniforme.value=1;feux.visible=key==='feux';uniformsGlobe.uIndice.value=0;uniformsGlobe.uTemps.value=t;uniformsGlobe.uProgression.value=p;moteur.setRenderTarget(target);moteur.render(scene,camera);const pixels=new Uint8Array(w*h*4);moteur.readRenderTargetPixels(target,0,0,w,h,pixels);moteur.setRenderTarget(null);return pixels;};
 const diff=(a,b)=>{let changed=0,total=0;for(let i=0;i<a.length;i+=4){let d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(d>0)changed++;total+=d;}return{changed,mean:total/(w*h*3)};};
 const animation={};for(const key of Object.keys(CALQUES))animation[key]=diff(shot(key,0,1),shot(key,1.7,1));const fireBaseline=diff(shot('feux',0,0),shot(null,0,0));const fireYear=diff(shot('feux',0,0),shot('feux',0,1)),riverYear=diff(shot('fleuves',0,0),shot('fleuves',0,1));const visibility=scene.children.map(o=>o.visible);scene.children.forEach(o=>o.visible=o.material===matAtmo);matAtmo.uniforms.uProgression.value=0;const heat2026=diff(shot('chaleur',0,0),shot('chaleur',1.7,0));matAtmo.uniforms.uProgression.value=1;const heat2050=diff(shot('chaleur',0,1),shot('chaleur',1.7,1));scene.children.forEach((o,i)=>o.visible=visibility[i]);return{animation,fireBaseline,fireYear,riverYear,heat2026,heat2050,width:w,height:h};};\n</script>\n</body>`);
  await route.fulfill({response,body:html});
 });
 await page.goto(process.env.URL0||'http://localhost:8087/');await enter(page);await page.waitForFunction(()=>globalThis.__motionReady());await page.waitForTimeout(1500);
 result.pixels=await page.evaluate(()=>globalThis.__motionProbe());
 for(const [k,v]of Object.entries(result.pixels.animation))assert.ok(v.changed>100,JSON.stringify({k,v}));
 assert.equal(result.pixels.heat2026.changed,0);assert.ok(result.pixels.heat2050.changed>100);
 assert.ok(result.pixels.fireBaseline.changed>100);assert.ok(result.pixels.fireYear.changed>100);assert.ok(result.pixels.riverYear.changed>0, 'Paired river epochs must change the source-backed map');assert.deepEqual(errors,[]);await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await enter(page);await page.waitForTimeout(1200);result.reducedClock=await page.evaluate(()=>globalThis.__motionClock());assert.deepEqual(result.reducedClock,[0]);result.pass=true;
}catch(e){result.pass=false;result.error=String(e);result.errors=errors;process.exitCode=1}finally{fs.writeFileSync(out+'/motion.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close()}

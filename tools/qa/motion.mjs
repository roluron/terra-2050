import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.QA_SORTIE||'/tmp/terra-motion';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const result={};
try{
 const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch();let html=await response.text();html=html.replace('</script>\n</body>',`globalThis.__motionProbe=()=>{
 controles.autoRotate=false;gsap.killTweensOf(camera.position);camera.position.copy(latLonVersVec3(25,40,2.6));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const target=cibles[0],w=target.width,h=target.height;
 const shot=(key,t,p)=>{for(const c of Object.values(CALQUES))c.uniforme.value=0;CALQUES[key].uniforme.value=1;feux.visible=key==='feux';uniformsGlobe.uIndice.value=0;uniformsGlobe.uTemps.value=t;feuxUniforms.uTemps.value=t;uniformsGlobe.uProgression.value=p;feuxUniforms.uProgression.value=p;moteur.setRenderTarget(target);moteur.render(scene,camera);const pixels=new Uint8Array(w*h*4);moteur.readRenderTargetPixels(target,0,0,w,h,pixels);moteur.setRenderTarget(null);return pixels;};
 const diff=(a,b)=>{let changed=0,total=0;for(let i=0;i<a.length;i+=4){let d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(d>0)changed++;total+=d;}return{changed,mean:total/(w*h*3)};};
 const animation={};for(const key of Object.keys(CALQUES))animation[key]=diff(shot(key,0,1),shot(key,1.7,1));return{animation,fireYear:diff(shot('feux',0,0),shot('feux',0,1)),riverYear:diff(shot('fleuves',0,0),shot('fleuves',0,1)),width:w,height:h};};\n</script>\n</body>`);
  await route.fulfill({response,body:html});
 });
 await page.goto(process.env.URL0||'http://localhost:8087/');await page.waitForSelector('#voile.pret');await page.click('#bouton-entree');await page.waitForTimeout(4500);
 result.pixels=await page.evaluate(()=>globalThis.__motionProbe());
 for(const [k,v]of Object.entries(result.pixels.animation))assert.ok(v.changed>100,JSON.stringify({k,v}));
 assert.ok(result.pixels.fireYear.changed>100);assert.equal(result.pixels.riverYear.changed,0);assert.deepEqual(errors,[]);result.pass=true;
}catch(e){result.pass=false;result.error=String(e);process.exitCode=1}finally{fs.writeFileSync(out+'/motion.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close()}

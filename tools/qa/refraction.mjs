import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {enter, injectModule, openSearch} from './entrance.cjs';
const out=process.env.QA_SORTIE||'/tmp/terra-refraction';await fs.mkdir(out,{recursive:true});
for(const [name,engine,options] of [['desktop',chromium,{viewport:{width:1440,height:900},deviceScaleFactor:2}],['phone',webkit,devices['iPhone SE']]]){
 const b=await engine.launch({headless:false});
 try{
  const p=await b.newPage({...options,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',async route=>{
   if(route.request().resourceType()!=='document')return route.continue();
   const response=await route.fetch();let body=await response.text();
   body=body.replace('moteur.render(scenePost, cameraPost);','if(globalThis.__flatGlass){matPost.uniforms.uVerreForce.value=0;matPost.uniforms.uVerreForce2.value=0;matPost.uniforms.uGlassRadii.value.fill(0);} moteur.render(scenePost, cameraPost);');
   body=injectModule(body,'globalThis.__glassProbe=()=>({search:matPost.uniforms.uVerreForce.value,panel:matPost.uniforms.uVerreForce2.value,radius:matPost.uniforms.uVerreRayon2.value});globalThis.__glassStop=()=>{controles.autoRotate=false;};');
   await route.fulfill({response,body});
  });
  await p.goto((process.env.URL0||'http://127.0.0.1:8088/')+'?lang=it#v=New%20York&an=2026&cc=US');await enter(p);await p.evaluate(()=>__glassStop());await p.waitForTimeout(1600);
  const a=await p.locator('#champ-recherche').boundingBox(),g=await p.locator('#bouton-reglages').boundingBox();assert.ok(g.x-a.x-a.width>=12,`${name} gap ${g.x-a.x-a.width}`);
  await openSearch(p);
  await p.waitForFunction(()=>__glassProbe().search>.1);
  const focused=await p.evaluate(()=>__glassProbe());assert.ok(focused.search>.1,'Focused search lens active');
  await p.locator('#bouton-reglages').click();await p.waitForTimeout(650);
  const type=await p.locator('#bouton-langue').evaluate(e=>{
    const reference=document.createElement('span');reference.style.fontSize='calc(1.3 * var(--ui-unit))';document.body.append(reference);
    const expectedFont=getComputedStyle(reference).fontSize;reference.remove();
    const s=getComputedStyle(e);return {actual:[s.fontSize,s.textTransform,s.letterSpacing],expectedFont};
  });assert.deepEqual(type.actual,[type.expectedFont,'none','normal']);
  await p.waitForFunction(()=>{const probe=__glassProbe();return probe.search>.1&&probe.panel>.1&&probe.radius>0;});
  const probe=await p.evaluate(()=>__glassProbe());assert.ok(probe.search>.1&&probe.panel>.1&&probe.radius>0);
  await p.screenshot({path:`${out}/${name}-settings.png`});
  await p.locator('#bouton-reglages').click();
  await p.waitForTimeout(450);await p.screenshot({path:`${out}/${name}-refracted.png`});
  await p.evaluate(()=>globalThis.__flatGlass=true);await p.waitForTimeout(100);await p.screenshot({path:`${out}/${name}-flat.png`});await p.evaluate(()=>globalThis.__flatGlass=false);
  await openSearch(p);await p.getByRole('option').filter({hasText:'New York'}).first().click();await p.locator('#dossier.ouvert').waitFor();
  await p.locator('#dossier-comparer').click();await p.waitForTimeout(300);assert.ok((await p.evaluate(()=>__glassProbe())).panel>.1,'Comparison lens active');await p.locator('.compare-close').click();
  await p.locator('#dossier-story').click();await p.waitForTimeout(500);assert.ok((await p.evaluate(()=>__glassProbe())).panel>.1,'Story lens active');await p.locator('#story-fermer').click();
  await p.locator('#dossier-croix').click();await p.waitForTimeout(2200);
  assert.deepEqual(errors,[]);console.log(`PASS ${name}: search gap ${g.x-a.x-a.width}px; quiet ${type.expectedFont} settings; active GPU refraction ${JSON.stringify(probe)}`);
 }finally{await b.close();}
}

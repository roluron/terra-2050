import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { enter } from './entrance.cjs';

const out = process.env.QA_SORTIE || '/Users/robinmahieux/Documents/Codex/2026-09-07/new-chat/outputs/scientific-maps';
await fs.mkdir(out, { recursive: true });
const result = { errors: [], failures: [], runtimeHashes: {}, method: 'Production materials, isolated globe renders; fixed camera/time/light, no atmosphere, markers, DOM or postprocessing. Separate real UI video.' };
async function probe() {
  const { climateAtYear, fireAtYear, loadFloodHazards } = await import('./climate-data.mjs');
  const { floodAtYear } = await import('./flood-data.mjs');
  const floods = await loadFloodHazards();
  const keys = ['chaleur', 'secheresse', 'stabilite', 'mer', 'fleuves', 'feux'];
  const names = ['heat', 'aridity', 'warming', 'coast', 'river'];
  const sourceChecks = [], sourceStats = {}, failures = [];
  const half = THREE.DataUtils.fromHalfFloat;
  const locations = [[48.75,2.25],[23.75,90.25],[-33.75,151.25],[12.25,-1.75],[0.25,-140.25],[89.75,-179.75],[-89.75,179.75]];
  for (const name of names) {
    const texture = uniformsGlobe['uScientific_' + name].value, data = texture.image.data;
    let valid = 0, changed = 0, positive = 0, negative = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i+3]) {
      valid++; const d = half(data[i+2])-half(data[i]);
      if (d) changed++; if (d > 0) positive++; if (d < 0) negative++;
    }
    sourceStats[name] = { valid, changed, positive, negative, metadata: texture.userData.scientific };
    for (const [lat,lon] of locations) {
      const x = Math.floor((lon+180)*2), y = Math.floor((90-lat)*2), offset = ((359-y)*720+x)*4;
      const actual = Array.from(data.slice(offset,offset+4),half);
      const expected = [2026,2030,2050].map(year => {
        if (name === 'coast' || name === 'river') {
          const value = floodAtYear(floods[name],lat,lon,year,name); return value.available ? value.fraction : NaN;
        }
        const value = climateAtYear(SCIENCE.climate,lat,lon,year)[{heat:'summerMaximum',aridity:'aridity',warming:'warming'}[name]];
        return name === 'aridity' ? Math.min(value,60) : value;
      });
      const available = expected.every(Number.isFinite);
      const pass = actual[3] === Number(available) && (!available || expected.every((value,i) => Math.abs(value-actual[i]) <= Math.max(1e-6,Math.abs(value)*.001)));
      sourceChecks.push({name,lat,lon,actual,expected,pass});
      if (!pass) failures.push(`Source texture mismatch ${name} ${lat},${lon}`);
    }
  }
  const fireTexture=uniformsGlobe.uFireWeather.value.image.data;
  for(const [lat,lon] of locations){
    const x=Math.floor((lon+180)/2.5),y=Math.floor((90-lat)/2.5),offset=((71-y)*144+x)*4;
    const actual=Array.from(fireTexture.slice(offset,offset+4),half),sample=fireAtYear(FIRE_WEATHER,lat,lon,2050);
    const expected=sample?[sample.near,sample.future,sample.signAgreement,1]:[0,0,0,0];
    const pass=expected.every((v,i)=>Math.abs(actual[i]-v)<=Math.max(1e-6,Math.abs(v)*.001));
    sourceChecks.push({name:'fire',lat,lon,actual,expected,pass});
    if(!pass)failures.push(`Fire texture geography mismatch ${lat},${lon}`);
  }
  const positions=feux.geometry.attributes.position.array, danger=feux.geometry.attributes.aDanger.array;
  let particleChecks=0;
  for(let i=0;i<danger.length/2;i+=17){
    const ll=versLatLon(new THREE.Vector3(...positions.slice(i*3,i*3+3)).normalize());
    const sample=fireAtYear(FIRE_WEATHER,ll[0],ll[1],2050);
    if(!sample || Math.abs(sample.near/366-danger[i*2])>1e-6 || Math.abs(sample.future/366-danger[i*2+1])>1e-6) failures.push(`Fire geography mismatch ${i}`);
    particleChecks++;
  }
  cancelAnimationFrame(compteurImages);
  const visibility=scene.children.map(o=>o.visible), saved=Object.fromEntries(Object.entries(uniformsGlobe).map(([k,v])=>[k,v.value]));
  const target=new THREE.WebGLRenderTarget(720,540), cam=camera.clone();cam.aspect=720/540;cam.updateProjectionMatrix();
  const images=[], pixels={}, controls=[];
  const render=(key,p,particles=false)=>{
    scene.children.forEach(o=>o.visible=o===globe || (particles && o===feux));
    for(const c of Object.values(CALQUES))c.uniforme.value=0;
    if(key)CALQUES[key].uniforme.value=1;
    uniformsGlobe.uIndice.value=0;uniformsGlobe.uEveil.value=1;uniformsGlobe.uTemps.value=2;uniformsGlobe.uProgression.value=p;
    moteur.setRenderTarget(target);moteur.render(scene,cam);
    const bytes=new Uint8Array(720*540*4);moteur.readRenderTargetPixels(target,0,0,720,540,bytes);return bytes;
  };
  const difference=(a,b)=>{let changed=0,sum=0,max=0;for(let i=0;i<a.length;i+=4){const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(d)changed++;sum+=d;max=Math.max(max,d);}return{changed,meanRGB:sum/(720*540*3),maxRGBSum:max};};
  const png=bytes=>{const canvas=document.createElement('canvas');canvas.width=720;canvas.height=540;const ctx=canvas.getContext('2d'),im=ctx.createImageData(720,540);for(let y=0;y<540;y++)im.data.set(bytes.subarray(y*720*4,(y+1)*720*4),(539-y)*720*4);ctx.putImageData(im,0,0);return canvas.toDataURL('image/png');};
  try {
    for(const [view,lat,lon] of [['africa',20,15],['asia',15,100],['australia',-25,135]]){
      cam.position.copy(latLonVersVec3(lat,lon,2.8));cam.lookAt(0,0,0);cam.updateMatrixWorld();
      const neutral=render(null,0);const control=difference(neutral,render(null,1));controls.push({view,...control});
      if(control.changed)failures.push(`Neutral year contamination ${view}`);
      for(const key of keys){
        const a=render(key,0),b=render(key,1),repeat=render(key,1);
        const change=difference(a,b),determinism=difference(b,repeat);
        pixels[`${view}/${key}`]={...change,repeatChanged:determinism.changed};
        if(determinism.changed)failures.push(`Nondeterministic render ${view}/${key}`);
        images.push({name:`isolated-${view}-${key}-2026`,data:png(a)},{name:`isolated-${view}-${key}-2050`,data:png(b)});
      }
      const fire0=render('feux',0,true),fire1=render('feux',1,true);
      pixels[`${view}/fire-with-particles`]=difference(fire0,fire1);
    }
    for(const key of keys)if(!Object.entries(pixels).some(([name,d])=>name.endsWith('/'+key)&&d.changed>0))failures.push(`No visible source map response ${key}`);
  } finally {
    scene.children.forEach((o,i)=>o.visible=visibility[i]);for(const[k,v]of Object.entries(saved))uniformsGlobe[k].value=v;
    moteur.setRenderTarget(null);target.dispose();compteurImages=requestAnimationFrame(boucle);
  }
  return {sourceChecks,sourceStats,particleChecks,pixels,controls,images,failures};
}
const browser = await chromium.launch({executablePath:chromium.executablePath(),headless:false});
const context = await browser.newContext({viewport:{width:1280,height:800},locale:'en-US',recordVideo:{dir:out,size:{width:1280,height:800}}});
const page = await context.newPage();
const pending=[];
page.on('pageerror',error=>result.errors.push({type:'pageerror',message:error.message}));
page.on('console',message=>{if(message.type()==='error'||/shader.*(fail|error)|VALIDATE_STATUS/i.test(message.text()))result.errors.push({type:message.type(),message:message.text()});});
page.on('response',response=>{const path=new URL(response.url()).pathname;if(/\.mjs$/.test(path))pending.push(response.body().then(bytes=>result.runtimeHashes[path]=createHash('sha256').update(bytes).digest('hex')).catch(()=>{}));});
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(), html=await response.text();
  result.runtimeHashes.index=createHash('sha256').update(html).digest('hex');
  const injection=`globalThis.__mapsProbe=${probe.toString()};globalThis.__mapsReady=()=>!!uniformsGlobe.uScientific_river.value.image?.data&&!!feux.geometry.attributes.aDanger.array.some(v=>v>0);`;
  const modified=html.replace('</script>\n</body>',injection+'\n</script>\n</body>');
  if(modified===html)throw new Error('QA instrumentation insertion failed');
  await route.fulfill({response,body:modified});
});
try {
  await page.goto(process.env.URL0||'http://localhost:8087/');await enter(page);
  await page.locator('.calque[data-cle="chaleur"]').click();
  if(await page.locator('#pedago').isVisible())await page.locator('#pedago-fermer').click();
  await page.waitForFunction(()=>globalThis.__mapsReady(),null,{timeout:30000});
  const audit=await page.evaluate(()=>globalThis.__mapsProbe());
  for(const image of audit.images)await fs.writeFile(`${out}/${image.name}.png`,Buffer.from(image.data.split(',')[1],'base64'));
  delete audit.images;Object.assign(result,audit);
  for(const key of ['chaleur','secheresse','stabilite','mer','fleuves','feux']){
    for(const active of await page.locator('.calque.actif').all())await active.click();
    await page.locator(`.calque[data-cle="${key}"]`).click();
    if(await page.locator('#pedago').isVisible())await page.locator('#pedago-fermer').click();
    await page.locator('#curseur').focus();await page.keyboard.press('Home');await page.waitForTimeout(700);
    await page.screenshot({path:`${out}/ui-${key}-2026.png`});
    for(let year=2027;year<=2050;year++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);}
    await page.waitForTimeout(700);await page.screenshot({path:`${out}/ui-${key}-2050.png`});
  }
}catch(error){result.failures.push(error.stack);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{
  await Promise.allSettled(pending);await context.close();await page.video().saveAs(`${out}/slider-animation.webm`);await browser.close();
  result.pass=!result.failures.length&&!result.errors.length;
  await fs.writeFile(`${out}/scientific-maps.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({pass:result.pass,failures:result.failures,errors:result.errors,pixels:result.pixels,indexHash:result.runtimeHashes.index}));
}
process.exitCode=result.pass?0:1;

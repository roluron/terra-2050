import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {enter, welcome, chooseLanguage} from './entrance.cjs';
import {mapDiagnosticCopy} from '../../map-diagnostic-copy.mjs';
import {warmingCopy} from '../../hover-diagnostic.mjs';
import {mapCopy, refinementCopy} from '../../refinement-copy.mjs';

// Browser integration checks. Numeric expectations use raw packaged fields,
// independently of production mapDiagnosticReading/physicalHover helpers.
const root = new URL('../../', import.meta.url);
const output = process.env.QA_SORTIE?pathToFileURL(resolve(process.env.QA_SORTIE,'data-integrity-ui')+'/'):new URL('audit/2026-10-01/floods/ui/', root);
await mkdir(output, {recursive:true});
const file = path => readFile(new URL(path, root));
const floats = bytes => new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength));
const cm = JSON.parse(await file('data/climate-manifest.json'));
const climate = {metadata:cm, values:floats(gunzipSync(await file('data/climate-grid.bin')))};
const fm = JSON.parse(await file('data/fire-weather.json'));
const fire = {metadata:fm, values:floats(await file('data/fire-weather.bin'))};
const floodmeta = JSON.parse(await file('data/flood-metadata.json')), floods = {};
for (const hazard of ['river','coast']) floods[hazard] = {metadata:{...floodmeta,...floodmeta.hazards[hazard]},
  values:floats(gunzipSync(await file(`data/flood-${hazard}.bin`)))};
const annual = JSON.parse(await file('data/population-annual.json'));
const filters = ['chaleur','secheresse','feux','mer','fleuves','stabilite','declin'];
const years = [2026,2028,2030,2040,2050];
const samples = [{name:'HCMC',iso:'VN',lat:10.78,lon:106.7},
  {name:'PNG',iso:'PG',lat:-9.48,lon:147.15}];
const rowAt = (grid,s) => Math.min(grid.metadata.height-1,Math.floor((90-s.lat)/180*grid.metadata.height))*grid.metadata.width
  +Math.floor(((s.lon+180)%360+360)%360/360*grid.metadata.width);
const interp = (h,n,f,y,hy) => y<2030?h+(n-h)*(y-hy)/(2030-hy):n+(f-n)*(y-2030)/20;
const mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
function expected(filter,year,s) {
  if (filter==='declin') return {available:!!annual[s.iso],annual:annual[s.iso]};
  if (['chaleur','secheresse','stabilite'].includes(filter)) {
    const off=rowAt(climate,s)*12;
    const at=(field,y)=>interp(...[field,field+4,field+8].map(i=>climate.values[off+i]),y,1985);
    const calc=y=>filter==='secheresse'?at(1,y)/(at(0,y)+10):at(filter==='chaleur'?2:0,y)-(filter==='stabilite'?climate.values[off]:0);
    const anchors=[2026,2030,2050].map(y=>({t:at(0,y),p:at(1,y)}));
    const available=filter!=='secheresse'||anchors.every(({t,p})=>Number.isFinite(t)&&Math.fround(t)>-10&&Number.isFinite(p)&&Math.fround(p)>=0);
    const baseline=calc(2026),value=calc(year),future=calc(2050);
    return {available:available&&[baseline,value,future].every(Number.isFinite),baseline,value,unit:filter==='secheresse'?'De Martonne':'°C',resolution:.5};
  }
  if (filter==='feux') {
    const off=rowAt(fire,s)*8, baseline=fire.values[off+1], future=fire.values[off+2];
    return {available:[baseline,future].every(x=>Number.isFinite(x)&&x>=0&&x<=366),baseline,
      value:baseline+(future-baseline)*(year-2026)/24,unit:'days/year',resolution:2.5};
  }
  const hazard=filter==='mer'?'coast':'river',grid=floods[hazard],fields=grid.metadata.fields,off=rowAt(grid,s)*fields.length;
  const v=field=>grid.values[off+fields.indexOf(field)];
  if (!(v('coverage')>0&&v('coverage')<=1)) return {available:false};
  const models=hazard==='river'?grid.metadata.models:['median'];
  const records=models.map(model=>(hazard==='river'?['historical',`near_model_${model}`,`model_${model}`]:['historical','near','future'])
    .map(p=>[v(p+'_mean_depth_m'),v(p+'_fraction_gt_0_5m')]))
    .filter(rows=>rows.every(([d,f])=>Number.isFinite(d)&&d>=0&&Number.isFinite(f)&&f>=0&&f<=1))
    .map(rows=>rows.map(r=>r[1]));
  if (!records.length) return {available:false};
  const hy=hazard==='river'?1980:1996.5;
  return {available:true,baseline:mean(records.map(r=>interp(...r,2026,hy)))*100,
    value:mean(records.map(r=>interp(...r,year,hy)))*100,unit:'%',resolution:.5};
}
// Explicit bounded rounding is required: a nonzero small change must not be
// turned into a factual claim of no change. Independently construct that text.
function format(value,locale,signed=false,digits=2) {
  const rounded=Number(value.toFixed(digits));
  if (value!==0&&rounded===0) {
    const bound=new Intl.NumberFormat(locale,{maximumFractionDigits:digits}).format(10**-digits);
    return signed?(value>0?`0 < Δ < ${bound}`:`−${bound} < Δ < 0`):(value>0?`< ${bound}`:`> −${bound}`);
  }
  return new Intl.NumberFormat(locale,{maximumFractionDigits:digits,signDisplay:signed?'exceptZero':'auto'})
    .format(Object.is(rounded,-0)?0:rounded).replace(/-/g,'−');
}
const dayUnits={fr:'jours/an',en:'days/year',it:'giorni/anno',es:'días/año',vi:'ngày/năm',ja:'日/年',zh:'天/年','zh-Hant':'天/年'};
function expectedDisplay(filter,year,mode,s,locale) {
  const ex=expected(filter,year,s);
  if (!ex.available) return {available:false,value:'',detail:null};
  if (filter==='declin') {
    const reference=mode==='change'?2026:2025,a=ex.annual,level=a[year-2025],baseline=a[reference-2025];
    return {available:true,value:`${format((level/baseline-1)*100,locale,true,1)} %`,
      detail:`${format(level,locale,false,0)} · ${reference} → ${year}`};
  }
  const unit=ex.unit==='days/year'?dayUnits[locale]:ex.unit;
  const changing=mode==='change',displayUnit=changing&&['mer','fleuves'].includes(filter)?mapCopy[locale][8]:unit;
  return {available:true,value:`${format(changing?ex.value-ex.baseline:ex.value,locale,changing||filter==='stabilite')} ${displayUnit}`,
    detail:changing?`2026: ${format(ex.baseline,locale)} ${unit} → ${year}: ${format(ex.value,locale)} ${unit}`:
      filter==='stabilite'?warmingCopy[locale].reference:'',resolution:ex.resolution};
}
const snapshotScript = () => {
  const el=document.getElementById('survol'), rect=el.getBoundingClientRect();
  return {name:el.querySelector('.s-nom').textContent,value:el.querySelector('.s-indice').textContent,
    subtitle:el.querySelector('.s-sous').textContent,detail:el.querySelector('.s-detail').textContent,
    note:el.querySelector('.s-note').textContent,visible:el.classList.contains('visible'),role:el.getAttribute('role'),
    bounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},viewport:{width:innerWidth,height:innerHeight},
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
};
const pointerOnly=process.env.QA_POINTER_ONLY==='1';
const report={phase:pointerOnly?'pointer':'full',profiles:[],matrix:[],locales:[],checks:[],notices:[],limitations:'Chromium with mobile emulation; no physical iPhone/Safari test. Numeric UI expectations derive from shipped fields, not independent raw TIFF acquisition.'};
function validate(snapshot,filter,year,mode,s,locale,context) {
  const ex=expectedDisplay(filter,year,mode,s,locale);
  assert.equal(snapshot.value,ex.value,context+' headline');
  if(ex.detail!==null)assert.equal(snapshot.detail,ex.detail,context+' comparison');
  else assert.ok(snapshot.detail,context+' missing message');
  assert.ok(snapshot.subtitle.includes(String(year)),context+' year');
  assert.ok(!snapshot.value.includes('/100'),context+' active filter must not fall back to overall score');
  if (ex.available&&filter!=='declin') {
    const prefix=mapDiagnosticCopy[locale][0].replace('{size}',format(ex.resolution,locale,false,1))
      .replace('{km}',String(Math.round(ex.resolution*111.2)));
    assert.ok(snapshot.note.startsWith(prefix),context+' local-cell support');
    if (['mer','fleuves'].includes(filter)) {
      assert.ok(snapshot.note.includes(mapDiagnosticCopy[locale][1]),context+' flood meaning');
      if(mode==='change')assert.ok(snapshot.value.endsWith(mapCopy[locale][8]),context+' percentage points');
      else assert.ok(snapshot.value.endsWith('%'),context+' percentage');
      assert.ok(!snapshot.value.endsWith(' m'),context+' fraction is not metres');
    }
  }
  if(mode==='change'&&filter!=='declin')assert.ok(snapshot.subtitle.includes(refinementCopy(locale).change),context+' reference label');
  if(ex.available&&mode==='value'&&filter==='stabilite')assert.equal(snapshot.subtitle,`${warmingCopy[locale].label} · ${year}`,context+' estimated warming label');
  assert.equal(snapshot.horizontalOverflow,false,context+' horizontal page overflow');
  const b=snapshot.bounds,v=snapshot.viewport;
  assert.ok(b.x>=7&&b.y>=7&&b.x+b.width<=v.width-7&&b.y+b.height<=v.height-7,context+' tooltip viewport containment');
}

const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let activePage=null,lastContext='initialization';
try {
  for(const [profile,options] of [['desktop',{viewport:{width:1280,height:800}}],
    ['mobile',{viewport:{width:393,height:852},isMobile:true,hasTouch:true}],
    ['compact',{viewport:{width:320,height:568},isMobile:true,hasTouch:true}]]) {
    if(process.env.QA_PROFILE&&process.env.QA_PROFILE!==profile)continue;
    if(process.env.QA_PROFILES&&!process.env.QA_PROFILES.split(',').includes(profile))continue;
    const page=await browser.newPage({...options,reducedMotion:'reduce'}),errors=[],shaderErrors=[];activePage=page;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader|GLSL|VALIDATE_STATUS|INVALID_OPERATION/i.test(m.text()))shaderErrors.push(m.text());});
    await page.route('**/*',async route=> {
      if(route.request().resourceType()!=='document')return route.continue();
      const response=await route.fetch(),html=await response.text();
      const marker='</script>\n</body>';
      assert.ok(html.includes(marker),'Expected final inline-module boundary for test-only hook');
      const body=html.replace(marker,`
        globalThis.__dataIntegrityAudit={
          ready:()=>!!PAYS_RASTER&&!!SCIENCE&&!!FIRE_WEATHER&&!!FLOOD_HAZARDS&&PAYS_LIGNES.length>0,
          show:(s,x=100,y=150,pinned=false)=>montrerSurvol(s,x,y,pinned),
          hide:()=>cacherSurvol(),
          filter:key=>{const current=document.querySelector('.calque.actif');if(current?.dataset.cle!==key){if(key)document.querySelector('.calque[data-cle="'+key+'"]').click();else current?.click();}document.getElementById('pedago-fermer').click();},
          mode:key=>document.querySelector('[data-map-mode="'+key+'"]').click(),
          point:async({lat=35,lon=105,distance=camera.position.length()}={})=>{
            cacherSurvol();arreterVolCamera();controles.autoRotate=false;controles.enableDamping=false;controles.update();
            camera.position.copy(latLonVersVec3(lat,lon,distance));camera.lookAt(0,0,0);
            controles.update();camera.updateMatrixWorld();majEtiquettes();
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            const v=latLonVersVec3(lat,lon).project(camera),cx=(v.x+1)*innerWidth/2,cy=(1-v.y)*innerHeight/2;
            // Chromium touch adjustment can prefer a nearby button even
            // outside its rectangle. Choose an actual empty canvas area.
            const targets=[...document.querySelectorAll('button,a,input,[role="button"]')].filter(el=>!el.closest('[inert]')&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).pointerEvents!=='none').map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
            const offsets=[0,...Array.from({length:10},(_,i)=>[-12*(i+1),12*(i+1)]).flat()];
            for(const dy of offsets)for(const dx of offsets){
              const x=Math.round(cx+dx),y=Math.round(cy+dy),s=sousPointeur(x,y);
              if([[-2,-2],[-2,2],[2,-2],[2,2],[0,0]].every(([ox,oy])=>document.elementFromPoint(x+ox,y+oy)===toile)&&s?.iso==='CN'&&targets.every(r=>x<r.left-32||x>r.right+32||y<r.top-32||y>r.bottom+32))return {x,y,s};
            }
            throw Error('No exposed Chinese canvas point');
          },
          freeze:()=>{cancelAnimationFrame(compteurImages);arreterVolCamera();controles.autoRotate=false;},
          render:()=>{boucle();cancelAnimationFrame(compteurImages);},
          hit:(x,y)=>sousPointeur(x,y),
          shader:s=>{const row=Math.min(359,Math.floor((90-s.lat)*2))*720+Math.floor(((s.lon+180)%360+360)%360*2),off=((359-Math.floor(row/720))*720+row%720)*4;
            const textures=Object.fromEntries(['aridityTemperature','aridityPrecipitation'].map(key=>{const texture=uniformsGlobe['uScientific_'+key].value;return [key,{width:texture.image.width,height:texture.image.height,float32:texture.image.data instanceof Float32Array,anchors:Array.from(texture.image.data.slice(off,off+4))}];}));
            return {textures,error:moteur.getContext().getError(),failedPrograms:moteur.info.programs.filter(p=>p.diagnostics&&!p.diagnostics.runnable).map(p=>({name:p.name,diagnostics:p.diagnostics})),programs:moteur.info.programs.length};},
          state:()=>({filter:filtreSurvol,year:etat.annee,mode:uniformsGlobe.uChange.value>.5?'change':'value',langue})
        };
      </script>\n</body>`);
      await route.fulfill({response,body});
    });
    await page.goto((process.env.URL0||'http://localhost:8080/')+'?lang=fr');
    await page.waitForSelector('#voile.pret',{state:'attached',timeout:30000});await welcome(page);
    await page.waitForSelector('#earth-shell.interaction-ready');
    await enter(page);
    await page.waitForFunction(()=>globalThis.__dataIntegrityAudit?.ready(),null,{timeout:60000});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('#map-toggle').click();
    const notice=page.locator('#map-options .v-science');await notice.scrollIntoViewIfNeeded();
    assert.equal(await notice.isVisible(),true,profile+' map model notice visible');
    assert.equal(await notice.evaluate(el=>el.previousElementSibling.id),'map-contact',profile+' model notice follows contact link');
    const noticeBounds=await notice.boundingBox();assert.ok(noticeBounds.x>=0&&noticeBounds.x+noticeBounds.width<=options.viewport.width,profile+' map notice horizontal bounds');
    assert.ok((await notice.textContent()).trim().length>50,profile+' translated model notice');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,profile+' map notice horizontal overflow');
    report.notices.push({profile,kind:'map-menu',text:await notice.textContent(),bounds:noticeBounds});
    if(profile==='compact')await page.screenshot({path:fileURLToPath(new URL('compact-map-notice.png',output))});
    await page.locator('#map-toggle').click();
    const pinned=profile!=='desktop',show=async(s,x=100,y=150)=>page.evaluate(({s,x,y,pinned})=>__dataIntegrityAudit.show(s,x,y,pinned),{s,x,y,pinned});
    const snapshot=()=>page.evaluate(snapshotScript);
    const year=async y=>{await page.locator('#curseur').fill(String(y));};
    const closeSettings=async()=>{if(await page.locator('#bouton-reglages').getAttribute('aria-expanded')==='true')await page.locator('#bouton-reglages').click();};
    let overlappingMenuChecks=0;
    const assertMenuHidesPin=async()=> {
      if(!pinned||!await page.locator('#survol').evaluate(el=>el.classList.contains('visible')))return false;
      assert.equal(await page.locator('#survol').isVisible(),false,profile+' pinned tooltip hidden while filter menu is open');
      assert.equal(await page.locator('#survol').evaluate(el=>getComputedStyle(el).pointerEvents),'none',profile+' pinned tooltip cannot intercept filter clicks');
      assert.equal(await page.locator('#survol').evaluate(el=>el.classList.contains('fige')),true,profile+' pin state preserved while hidden');
      overlappingMenuChecks++;return true;
    };
    const filter=async key=>{
      if(await page.locator(`.calque[data-cle="${key}"]`).getAttribute('aria-pressed')==='true')return;
      await page.locator('#map-toggle').click();const hadPin=await assertMenuHidesPin();await page.locator(`.calque[data-cle="${key}"]`).click();
      if(await page.locator('#pedago').isVisible()){await page.locator('#pedago-fermer').click();await page.locator('#pedago').waitFor({state:'hidden'});}
      if(hadPin)assert.equal(await page.locator('#survol').isVisible(),true,profile+' pin returns after filter choice');
    };
    const mode=async m=>{
      if(await page.locator('#map-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#map-toggle').click();
      const hadPin=await assertMenuHidesPin();await page.locator(`[data-map-mode="${m}"]`).click();await page.locator('#map-toggle').click();
      if(hadPin)assert.equal(await page.locator('#survol').isVisible(),true,profile+' pin returns after mode change');
    };
    const shaderChecks=[];
    if(!pointerOnly){
    for(const f of filters) {
      await filter(f);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const shader=await page.evaluate(s=>__dataIntegrityAudit.shader(s),samples[0]);
      assert.equal(shader.error,0,profile+'/'+f+' WebGL error');assert.deepEqual(shader.failedPrograms,[],profile+'/'+f+' shader compilation');
      assert.ok(shader.programs>0,profile+' renderer programs');
      for(const [key,field] of [['aridityTemperature',0],['aridityPrecipitation',1]]) {
        const t=shader.textures[key],off=rowAt(climate,samples[0])*12;
        assert.equal(t.width,720);assert.equal(t.height,360);assert.equal(t.float32,true);assert.equal(t.anchors[3],1);
        const anchors=[interp(climate.values[off+field],climate.values[off+field+4],climate.values[off+field+8],2026,1985),climate.values[off+field+4],climate.values[off+field+8]];
        anchors.forEach((expected,i)=>assert.ok(Math.abs(t.anchors[i]-expected)<=1e-6*Math.max(1,Math.abs(expected)),profile+'/'+f+'/'+key+' ingredient anchor'));
      }
      shaderChecks.push({filter:f,...shader});
      for(const m of ['value','change']) {
        await mode(m);
        for(const y of years) {
          await year(y);
          for(const s of samples) {
            lastContext=`${profile}/${f}/${m}/${y}/${s.name}`;await show(s);
            const snap=await snapshot();validate(snap,f,y,m,s,'fr',lastContext);
            report.matrix.push({context:lastContext,...snap});
          }
        }
      }
      console.log(`PASS ${profile} ${f}: two modes, five years, HCMC + PNG`);
    }
    // Same-country movements must be cached only within the same model cell.
    await filter('fleuves');await mode('value');await year(2050);
    const a=samples[0],b={...a,lat:10.35,lon:107.1};await show(a);
    const mutations=await page.evaluate(({a,pinned})=>{
      const el=document.getElementById('survol'),o=new MutationObserver(()=>{});o.observe(el,{subtree:true,childList:true,characterData:true});
      for(let n=0;n<30;n++)__dataIntegrityAudit.show({...a,lat:a.lat+.00001*n,lon:a.lon+.00001*n},100+n,150,pinned);
      const count=o.takeRecords().length;o.disconnect();return count;
    },{a,pinned});
    assert.equal(mutations,0,profile+' same-cell pointer cache');
    const before=await snapshot();await show(b);const after=await snapshot();
    assert.notEqual(expectedDisplay('fleuves',2050,'value',a,'fr').value,expectedDisplay('fleuves',2050,'value',b,'fr').value,'Distinct real Vietnamese coarse cells');
    assert.notEqual(after.value,before.value,profile+' same-country different-cell cache invalidation');
    validate(after,'fleuves',2050,'value',b,'fr',profile+' other cell');
    // NoData stays unavailable, while an actual covered zero stays numeric.
    await show({iso:'PG',lat:0,lon:-140});const missing=await snapshot();
    assert.equal(missing.value,'');assert.ok(missing.detail);assert.equal(missing.note,'');
    await filter('mer');await mode('value');await show({iso:'FR',lat:48.85,lon:2.35});const zero=await snapshot();
    assert.equal(zero.value,'0 %');assert.ok(zero.note.startsWith('Maille du modèle'));
    await mode('change');await show(samples[1]);const small=await snapshot();
    assert.match(small.value,/0 < Δ < 0,01 points de pourcentage/);assert.notEqual(small.value,'0 points de pourcentage');
    report.checks.push({profile,sameCellMutations:mutations,otherCellBefore:before.value,otherCellAfter:after.value,missing,zero,small});
    // Pinned touch diagnostics refresh without another canvas tap or show call.
    if(pinned) {
      await filter('fleuves');await mode('change');await year(2026);await show(a);
      await year(2040);validate(await snapshot(),'fleuves',2040,'change',a,'fr',profile+' pinned year refresh');
    }
    await year(2050);
    for(const locale of Object.keys(mapDiagnosticCopy)) {
      await chooseLanguage(page,locale);await closeSettings();
      for(const f of filters)for(const m of ['value','change']) {
        await page.evaluate(({f,m})=>{__dataIntegrityAudit.filter(f);__dataIntegrityAudit.mode(m);},{f,m});
        lastContext=`${profile}/${locale}/${f}/${m}`;await show(samples[1],options.viewport.width-2,options.viewport.height-2);
        const snap=await snapshot();validate(snap,f,2050,m,samples[1],locale,lastContext);report.locales.push({context:lastContext,...snap});
      }
      assert.ok((await page.locator('.score-method-note').textContent()).trim().length>25,profile+'/'+locale+' translated score notice');
      console.log(`PASS ${profile} ${locale}: seven filters, both modes, local-cell support and bounds`);
    }
    }
    await year(2050);await chooseLanguage(page,'fr');await closeSettings();
    await page.evaluate(()=>__dataIntegrityAudit.filter(null));
    const touchAnchor=pinned?{lat:39.9,lon:116.4}:{};
    lastContext=profile+'/real country first interaction';
    const point=await page.evaluate(anchor=>__dataIntegrityAudit.point(anchor),touchAnchor);
    assert.equal(point.s.iso,'CN');assert.ok(Number.isFinite(point.s.lat)&&Number.isFinite(point.s.lon));
    if(pinned) {
      await page.touchscreen.tap(point.x,point.y);
      await page.waitForFunction(()=>document.getElementById('survol').classList.contains('visible'));
      assert.equal(await page.evaluate(()=>document.body.classList.contains('dossier-ouvert')),false,profile+' first canvas tap must not open a newly revealed city');
      assert.equal((await snapshot()).role,'button');
      await page.locator('#survol').tap();await page.waitForFunction(()=>document.body.classList.contains('dossier-ouvert'));
      assert.match(await page.locator('#dossier-nom').textContent(),/Chine/);
    }else {
      await page.mouse.move(point.x,point.y);await page.waitForFunction(()=>document.getElementById('survol').classList.contains('visible'));
      await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>document.body.classList.contains('dossier-ouvert'));
    }
    const scoreNotice=page.locator('.score-method-note');await scoreNotice.scrollIntoViewIfNeeded();
    assert.equal(await scoreNotice.isVisible(),true,profile+' score method notice visible');assert.ok((await scoreNotice.textContent()).trim().length>50);
    const scoreBounds=await scoreNotice.boundingBox();assert.ok(scoreBounds.x>=0&&scoreBounds.x+scoreBounds.width<=options.viewport.width,profile+' score notice horizontal bounds');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,profile+' score notice horizontal overflow');
    report.notices.push({profile,kind:'score',text:await scoreNotice.textContent(),bounds:scoreBounds});
    if(profile==='compact')await page.screenshot({path:fileURLToPath(new URL('compact-score-notice.png',output))});
    await page.locator('#dossier-croix').click();await page.waitForFunction(()=>!document.body.classList.contains('dossier-ouvert'));
    // Genuine ray-cast coordinates, rather than a nearby city or its country
    // average, determine the active-filter physical reading.
    await filter('fleuves');await mode('change');await year(2050);
    lastContext=profile+'/real active-filter interaction';
    // Freeze only this final coordinate-input check so camera flights and
    // asynchronously positioned labels cannot change its target. Matrices
    // and shader compilation above run with the actual rendering loop.
    await page.evaluate(()=>{__dataIntegrityAudit.freeze();globalThis.__auditPointerEvents=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>__auditPointerEvents.push({type,target:e.target.id||e.target.tagName,className:e.target.className,text:e.target.textContent.slice(0,80),bounds:e.target.getBoundingClientRect().toJSON(),time:performance.now(),x:e.clientX,y:e.clientY}),true);});
    const real=await page.evaluate(()=>__dataIntegrityAudit.point({lat:35,lon:95,distance:2.4}));
    await page.evaluate(({x,y,s})=>{const el=document.elementFromPoint(x,y);globalThis.__auditBefore={x,y,s,target:el.id||el.tagName,className:el.className,text:el.textContent.slice(0,80),bounds:el.getBoundingClientRect().toJSON(),scrollY,viewport:{width:innerWidth,height:innerHeight,visualScale:visualViewport.scale,visualX:visualViewport.offsetLeft,visualY:visualViewport.offsetTop}};},real);
    if(pinned)await page.touchscreen.tap(real.x,real.y);else await page.mouse.move(real.x,real.y);
    await page.waitForFunction(()=>document.getElementById('survol').classList.contains('visible'));
    await page.waitForFunction(()=>{const style=getComputedStyle(document.getElementById('survol'));return Number(style.opacity)>.99&&style.visibility!=='hidden';});
    const hit=await page.evaluate(({x,y})=>__dataIntegrityAudit.hit(x,y),real),realSnapshot=await snapshot();
    validate(realSnapshot,'fleuves',2050,'change',hit,'fr',profile+' real ray-cast tooltip');
    await page.evaluate(()=>__dataIntegrityAudit.render());
    const pointerEvents=await page.evaluate(()=>__auditPointerEvents);
    await page.screenshot({path:fileURLToPath(new URL(`${profile}-real-pointer.png`,output))});
    assert.deepEqual(errors,[],profile+' browser errors');assert.deepEqual(shaderErrors,[],profile+' WebGL shader console errors');
    report.profiles.push({profile,options,errors,shaderErrors,shaderChecks,overlappingMenuChecks,pointerEvents,realHit:hit,realSnapshot});
    await writeFile(new URL('results.json',output),JSON.stringify(report,null,2)+'\n');
    console.log(pointerOnly?`PASS ${profile}: actual pointer/touch and visible model notices`:`PASS ${profile}: localized units/support, 8 languages, bounds, actual pointer/touch, NoData vs zero, tiny changes and cache`);
    await page.close();activePage=null;
  }
  await writeFile(new URL('results.json',output),JSON.stringify(report,null,2)+'\n');
  console.log(`PASS UI: ${report.matrix.length} numeric matrix states + ${report.locales.length} localized states across ${report.profiles.length} selected viewports`);
}catch(error) {
  if(activePage) {
    await activePage.screenshot({path:fileURLToPath(new URL('failure.png',output))}).catch(()=>{});
    report.failure={context:lastContext,message:error.message,snapshot:await activePage.evaluate(snapshotScript).catch(()=>null),pointerEvents:await activePage.evaluate(()=>globalThis.__auditPointerEvents).catch(()=>null),beforeInput:await activePage.evaluate(()=>globalThis.__auditBefore).catch(()=>null)};
  }
  await writeFile(new URL('failure.json',output),JSON.stringify({failure:report.failure,
    passed:{matrixStates:report.matrix.length,localeStates:report.locales.length,profiles:report.profiles.map(p=>p.profile)},
    limitations:report.limitations},null,2)+'\n');throw error;
}finally {await browser.close();}

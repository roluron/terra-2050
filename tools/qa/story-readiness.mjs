import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const start=html.indexOf('async function genererStory(opts){'),end=html.indexOf("  const cv = document.createElement('canvas');",start);
assert.ok(start>=0&&end>start);
const source=html.slice(start,end)+'return true;}';
for(const mode of ['loaded','rejected','pending']){
  let expire,cleared=false,loads=0;
  const state={lieuDossier:['Paris','FR',48.86,2.35,1,0,'Paris'],etat:{annee:2050},langue:'en',
    T:()=>({}),estPays:()=>false,getComputedStyle:()=>({getPropertyValue:()=>'sans-serif'}),
    document:{documentElement:{},body:{},fonts:{load:()=>{
      loads++;
      return mode==='loaded'?Promise.resolve([]):mode==='rejected'?Promise.reject(new Error('Font unavailable')):new Promise(()=>{});
    }}},
    setTimeout:(callback,duration)=>{assert.equal(duration,5000);expire=callback;return 1;},
    clearTimeout:()=>{cleared=true;},
  };
  vm.createContext(state);vm.runInContext(source,state);
  let finished=false;
  const ready=state.genererStory({}).then(value=>{finished=true;return value;});
  assert.equal(loads,6);
  if(mode==='pending'){
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(finished,false);assert.equal(typeof expire,'function');expire();
  }
  assert.equal(await ready,true);assert.equal(cleared,true);
}
assert.match(html,/62px "TWK Lausanne", sans-serif/);
for(const [path,functionName,bodyStart] of [
  ['thermal-logo.mjs','mountThermalLogo','  let lockup;'],
  ['presskit/logos/live/thermal-logo.mjs','mountThermalLogo','  let lockup;'],
  ['presskit/logos/live/earth-loop.mjs','mountEarthLoop',"  const canvas=document.createElement('canvas');"],
]){
  const moduleSource=await readFile(new URL('../../'+path,import.meta.url),'utf8');
  const begin=moduleSource.indexOf('export async function '+functionName+'('),finish=moduleSource.indexOf(bodyStart,begin);
  assert.ok(begin>=0&&finish>begin,path);
  const prefix=moduleSource.slice(begin,finish).replace(/^export /,'')+'return true;}';
  for(const mode of ['loaded','rejected','pending']){
    let expire,cleared=0,loads=0,completed=0;
    const lateFonts=[];
    const state={document:{fonts:{load:font=>{
      assert.match(font,/^(300|600) 100px "TWK Lausanne"$/);loads++;
      return mode==='loaded'?Promise.resolve([]):mode==='rejected'?Promise.reject(new Error('Font unavailable')):new Promise(resolve=>lateFonts.push(resolve));
    }}},setTimeout:(callback,duration)=>{assert.equal(duration,5000);expire=callback;return 1;},clearTimeout:()=>cleared++};
    vm.createContext(state);vm.runInContext(prefix,state);
    const ready=state[functionName]({}).then(value=>{completed++;return value;});
    assert.equal(loads,2,path);
    if(mode==='pending'){
      await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,0,path);expire();
    }
    assert.equal(await ready,true,path);assert.equal(cleared,1,path);
    for(const resolve of lateFonts)resolve([]);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(completed,1,path);assert.equal(cleared,1,path);
  }
}
for(const path of ['thermal-logo.mjs','presskit/logos/live/thermal-logo.mjs']){
  const moduleSource=await readFile(new URL('../../'+path,import.meta.url),'utf8');
  const begin=moduleSource.indexOf('export async function mountThermalLogo('),finish=moduleSource.indexOf('  const inkColor=',begin);
  assert.ok(begin>=0&&finish>begin,path);
  const prefix=moduleSource.slice(begin,finish).replace(/^export /,'').replaceAll('import.meta.url',"'https://example.test/thermal-logo.mjs'")+'drawReached++;return lockup;}';
  for(const mode of ['loaded','rejected','pending','throw']){
    const timers=new Map(),cleared=[],images=[];
    let id=0,lateImage,completed=0;
    class Image{
      constructor(){images.push(this);}
      decode(){
        if(mode==='throw')throw new Error('Decoder unavailable');
        return mode==='loaded'?Promise.resolve():mode==='rejected'?Promise.reject(new Error('Image unavailable')):new Promise(resolve=>{lateImage=resolve;});
      }
      removeAttribute(name){assert.equal(name,'src');this.removed=true;}
    }
    const state={Image,URL,drawReached:0,document:{fonts:{load:()=>Promise.resolve([])}},
      setTimeout:(callback,duration)=>{assert.ok(duration===5000||duration===30000);timers.set(++id,{callback,duration});return id;},
      clearTimeout:key=>{cleared.push(timers.get(key)?.duration);timers.delete(key);}};
    vm.createContext(state);vm.runInContext(prefix,state);
    const ready=state.mountThermalLogo({}).then(value=>{completed++;return value;});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(images.length,1,path);assert.equal(String(images[0].src),'https://example.test/thermal-wordmark.png');
    if(mode==='pending'){
      assert.equal(completed,0,path);assert.equal(timers.size,1,path);
      const timer=[...timers.values()][0];assert.equal(timer.duration,30000);timer.callback();
    }
    const image=await ready;
    assert.equal(image,mode==='loaded'?images[0]:null,path);
    assert.equal(state.drawReached,mode==='loaded'?1:0,path);
    assert.equal(!!images[0].removed,mode!=='loaded',path);
    assert.equal(timers.size,0,path);
    assert.deepEqual(cleared,mode==='throw'?[5000,undefined]:[5000,30000],path);
    lateImage?.();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(completed,1,path);assert.equal(state.drawReached,mode==='loaded'?1:0,path);assert.equal(timers.size,0,path);
  }
}
const earthSource=await readFile(new URL('../../presskit/logos/live/earth-loop.mjs',import.meta.url),'utf8');
const imageStart=earthSource.indexOf('  if(options.lockup){'),imageEnd=earthSource.indexOf('  for(let i=0;i<pixels.length;',imageStart);
assert.ok(imageStart>=0&&imageEnd>imageStart);
for(const mode of ['loaded','rejected','pending','throw']){
  let expire,lateImage,completed=0,cleared=0,removed=0,draws=0;
  const fixed=new Uint8Array([1,2,3,4]);
  const state={options:{lockup:'logo.png'},fixed,w:1600,h:500,size:340,left:96,baseline:377,
    ctx:{clearRect:()=>{},measureText:()=>({actualBoundingBoxLeft:1,actualBoundingBoxRight:100,actualBoundingBoxAscent:200,actualBoundingBoxDescent:2}),
      drawImage:()=>draws++,fillText:()=>{},getImageData:()=>({data:new Uint8Array([5,6,7,8])})},
    Image:class{
      decode(){if(mode==='throw')throw new Error('Decode unavailable');return mode==='loaded'?Promise.resolve():mode==='rejected'?Promise.reject(new Error('Image unavailable')):new Promise(resolve=>{lateImage=resolve;});}
      removeAttribute(name){assert.equal(name,'src');removed++;}
    },setTimeout:(callback,duration)=>{assert.equal(duration,30000);expire=callback;return 1;},clearTimeout:()=>cleared++};
  vm.createContext(state);vm.runInContext('async function load(){'+earthSource.slice(imageStart,imageEnd)+'return true;}',state);
  const ready=state.load().then(value=>{completed++;return value;});
  await new Promise(resolve=>setImmediate(resolve));
  if(mode==='pending'){assert.equal(completed,0);expire();}
  assert.equal(await ready,true);assert.equal(draws,mode==='loaded'?1:0);assert.equal(removed,mode==='loaded'?0:1);assert.equal(cleared,1);
  assert.deepEqual([...fixed],mode==='loaded'?[5,6,7,8]:[1,2,3,4]);
  lateImage?.();await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,1);assert.equal(draws,mode==='loaded'?1:0);
}
const previewSource=await readFile(new URL('../../presskit/logo-preview.mjs',import.meta.url),'utf8');
const cssStart=previewSource.indexOf('const styled='),cssEnd=previewSource.indexOf('let section=',cssStart);
assert.ok(cssStart>=0&&cssEnd>cssStart);
for(const mode of ['loaded','rejected','pending']){
  let expire,cleared=0,removed=0;
  const style={remove:()=>removed++},state={style,document:{head:{append:()=>{if(mode==='loaded')style.onload();if(mode==='rejected')style.onerror();}}},
    setTimeout:(callback,duration)=>{assert.equal(duration,30000);expire=callback;return 1;},clearTimeout:()=>cleared++};
  vm.createContext(state);vm.runInContext('async function load(){'+previewSource.slice(cssStart,cssEnd)+'return true;}',state);
  const ready=state.load().then(()=>true,()=>false);if(mode==='pending')expire();
  assert.equal(await ready,mode==='loaded');assert.equal(cleared,1);assert.equal(removed,mode==='loaded'?0:1);assert.equal(style.onload,null);assert.equal(style.onerror,null);
}
const pressSource=await readFile(new URL('../../presskit/press.mjs',import.meta.url),'utf8');
assert.match(pressSource,/import\('\.\/logo-preview\.mjs[^']*'\)\.catch/);
assert.doesNotMatch(pressSource,/import '\.\/logo-preview\.mjs/);
assert.match(pressSource,/map\(path=>loadSource\(new URL\(path,import\.meta\.url\)\)\)/);
console.log('PASS story/press readiness: font/image/CSS deadlines, preserved masks, cleanup, late settlement and independent media loading');

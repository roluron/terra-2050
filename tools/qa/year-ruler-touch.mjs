import assert from 'node:assert/strict';
import {createYearRuler} from '../../year-ruler.mjs';

globalThis.matchMedia=()=>({matches:true});
globalThis.document={createElement:()=>({style:{},getBoundingClientRect:()=>({left:0,width:1})})};
const handlers=new Map(),events=[];
const slider={min:'2026',max:'2050',step:'1',value:'2026',disabled:false,
  getBoundingClientRect:()=>({left:100,width:240}),
  addEventListener:(name,fn)=>handlers.set(name,fn),dispatchEvent:event=>events.push([event.type,slider.value,event.bubbles]),
  focus(){},setPointerCapture(id){this.captured=id;},hasPointerCapture(id){return this.captured===id;},releasePointerCapture(){this.captured=null;}};
const ruler={children:[],replaceChildren(...children){this.children=children;}};
createYearRuler(slider,ruler);
const send=(name,x,extra={})=>handlers.get(name)({pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,preventDefault(){},...extra});
send('pointerdown',150);assert.equal(slider.value,'2031');assert.equal(slider.captured,1);
send('pointermove',220);assert.equal(slider.value,'2038');
send('pointermove',400);assert.equal(slider.value,'2050');
send('pointermove',80);assert.equal(slider.value,'2026');
send('pointermove',340,{pointerId:2});assert.equal(slider.value,'2026');
send('pointermove',280);send('pointerup',280);assert.equal(slider.value,'2044');assert.equal(slider.captured,null);
assert.deepEqual(events.at(-1),['change','2044',true]);
send('pointermove',100);assert.equal(slider.value,'2044');
events.length=0;send('pointerdown',100);send('pointercancel',100);send('pointermove',340);
assert.equal(slider.value,'2026');assert.ok(events.every(([type])=>type!=='change'));
send('pointerdown',200);send('lostpointercapture',200);send('pointermove',340);assert.equal(slider.value,'2036');
send('pointerdown',340,{pointerType:'mouse'});assert.equal(slider.value,'2036');
send('pointerdown',340,{isPrimary:false});assert.equal(slider.value,'2036');
slider.disabled=true;send('pointerdown',340);assert.equal(slider.value,'2036');
slider.disabled=false;slider.value='2026';ruler.getClientRects=()=>[{}];
globalThis.matchMedia=()=>({matches:false});
const scale=()=>Number(ruler.children[0].style.transform.match(/scaleY\(([^)]+)\)/)?.[1]||1);
let update=createYearRuler(slider,ruler);
for(let i=0;i<3;i++)update();
assert.equal(scale(),2.103,'Default calls preserve the original 60fps easing');
for(const fps of [1,15,30,60,120]){
  update=createYearRuler(slider,ruler);
  for(let i=0;i<fps;i++)update(i/fps,1000/fps);
  assert.ok(scale()>=3&&scale()<=3.1,'Selected tick settles within one elapsed second at '+fps+'fps');
  assert.ok(Number(ruler.children[0].style.opacity)>.98,'Opacity settles at '+fps+'fps');
}
update=createYearRuler(slider,ruler);update(3.333,3333);assert.equal(scale(),3.1);
globalThis.matchMedia=()=>({matches:true});
update=createYearRuler(slider,ruler);update(0,0);assert.equal(scale(),3.1);
console.log('PASS: touch geometry/capture, default easing, elapsed-time settling at1–120fps and immediate reduced motion');

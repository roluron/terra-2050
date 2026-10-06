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
console.log('PASS: continuous touch years, endpoint clamping, capture, cancellation, second finger, disabled and native mouse path');

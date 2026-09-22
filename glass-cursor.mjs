export const glassCursor = {x:0,y:0,radius:0};
let hitGlobe=()=>false;
export function setCursorGlobeHitTest(test){hitGlobe=test;}
const fine=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const scene=document.querySelector('#scene'),lens=document.createElement('div');
lens.className='glass-cursor';lens.setAttribute('aria-hidden','true');lens.inert=true;
document.body.append(lens);
let x=0,y=0,fx=0,fy=0,pressed=false,frame=0,last=0;
function hide(){glassCursor.radius=0;lens.hidden=true;scene.classList.remove('glass-pointer');cancelAnimationFrame(frame);frame=0;}
function draw(t){
 if(!fine.matches||document.elementFromPoint(x,y)!==scene||!hitGlobe(x,y)){hide();return;}
 const dt=Math.min(32,t-last||16);last=t;
 const k=reduced.matches?1:1-Math.exp(-dt/55),size=pressed?36:50;
 fx+=(x-fx)*k;fy+=(y-fy)*k;
 Object.assign(lens.style,{left:fx-size/2+'px',top:fy-size/2+'px',width:size+'px',height:size+'px'});
 lens.hidden=false;scene.classList.add('glass-pointer');
 Object.assign(glassCursor,{x:fx,y:fy,radius:size/2});
 frame=requestAnimationFrame(draw);
}
document.addEventListener('pointermove',event=>{
 if(!fine.matches||event.pointerType!=='mouse'){hide();return;}
 x=event.clientX;y=event.clientY;
 if(!frame){fx=x;fy=y;frame=requestAnimationFrame(draw);}
},{passive:true});
document.addEventListener('pointerdown',()=>{pressed=true});
document.addEventListener('pointerup',()=>{pressed=false});
document.addEventListener('pointercancel',()=>{pressed=false;hide()});
document.addEventListener('pointerleave',hide);
document.addEventListener('keydown',hide,true);
window.addEventListener('blur',()=>{pressed=false;hide()});
window.addEventListener('pagehide',hide);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});
fine.addEventListener('change',hide);hide();

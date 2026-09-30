/* Un seul curseur pour tout le site, dessiné par nous : un point crème
   partout — le même point que sous les noms des villes — qui s'ouvre en
   lentille de verre quand il passe sur la Terre, et se referme en point en
   la quittant. Le curseur natif (flèche, main) est masqué tant que le point
   se dessine. Il reste natif quand une boîte modale est ouverte : la
   couche supérieure des <dialog> passe au-dessus de tout z-index. */
export const glassCursor = {x:0,y:0,radius:0};
let hitGlobe=()=>false;
export function setCursorGlobeHitTest(test){hitGlobe=test;}
const fine=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const scene=document.querySelector('#scene'),lens=document.createElement('div');
lens.className='glass-cursor point';lens.setAttribute('aria-hidden','true');lens.inert=true;
document.body.append(lens);
const POINT=6,POINT_CONTROLE=10,LENTILLE=50,LENTILLE_PRESSEE=36;
const CONTROLES='a,button,summary,label,input,select,textarea,[role=button],[role=option],.etiquette,#survol.fige';
let x=0,y=0,taille=POINT,pressed=false,frame=0,last=0,onScene=false;
function position(){
 // La position suit l'événement immédiatement ; seule la taille est amortie.
 lens.style.transform=`translate3d(${x-LENTILLE/2}px,${y-LENTILLE/2}px,0) scale(${taille/LENTILLE})`;
 Object.assign(glassCursor,{x,y,radius:onScene?taille/2:0});
}
function hide(){
 glassCursor.radius=0;lens.hidden=true;taille=POINT;onScene=false;
 document.body.classList.remove('curseur-verre');lens.classList.add('point');
 cancelAnimationFrame(frame);frame=0;
}
function draw(t){
 const sous=fine.matches&&!document.querySelector('dialog[open]')?document.elementFromPoint(x,y):null;
 if(!sous){hide();return;}
 const surGlobe=sous===scene&&hitGlobe(x,y);
 const surControle=!surGlobe&&!!sous.closest(CONTROLES);
 const cible=surGlobe?(pressed?LENTILLE_PRESSEE:LENTILLE):surControle?POINT_CONTROLE:pressed?POINT*.7:POINT;
 const dt=Math.min(32,t-last||16);last=t;
 const ks=reduced.matches?1:1-Math.exp(-dt/85);
 const avant=taille;taille+=(cible-taille)*ks;
 if(Math.abs(cible-taille)<.05)taille=cible;
 const point=!surGlobe;
 if(lens.classList.contains('point')!==point)lens.classList.toggle('point',point);
 if(lens.hidden){lens.hidden=false;document.body.classList.add('curseur-verre');position();}
 /* la réfraction suit la taille réelle : elle s'éteint avec la lentille
    au lieu de sauter, et n'agit que sur la toile (rien à déformer sous un panneau) */
 onScene=sous===scene;
 if(taille!==avant)position();
 glassCursor.radius=onScene?taille/2:0;
 frame=requestAnimationFrame(draw);
}
document.addEventListener('pointermove',event=>{
 if(!fine.matches||event.pointerType!=='mouse'){hide();return;}
 x=event.clientX;y=event.clientY;
 position();
 if(!frame){last=0;frame=requestAnimationFrame(draw);}
},{passive:true,capture:true});
document.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')pressed=true});
document.addEventListener('pointerup',()=>{pressed=false});
document.addEventListener('pointercancel',()=>{pressed=false;hide()});
document.addEventListener('pointerleave',hide);
document.addEventListener('keydown',hide,true);
window.addEventListener('blur',()=>{pressed=false;hide()});
window.addEventListener('pagehide',hide);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});
fine.addEventListener('change',hide);hide();

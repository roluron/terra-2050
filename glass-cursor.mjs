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
let x=0,y=0,fx=0,fy=0,taille=POINT,pressed=false,frame=0,last=0;
function hide(){
 glassCursor.radius=0;lens.hidden=true;taille=POINT;
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
 const k=reduced.matches?1:1-Math.exp(-dt/55),ks=reduced.matches?1:1-Math.exp(-dt/85);
 fx+=(x-fx)*k;fy+=(y-fy)*k;taille+=(cible-taille)*ks;
 if(Math.abs(cible-taille)<.05)taille=cible;
 Object.assign(lens.style,{left:fx-taille/2+'px',top:fy-taille/2+'px',width:taille+'px',height:taille+'px'});
 lens.classList.toggle('point',!surGlobe);
 lens.hidden=false;document.body.classList.add('curseur-verre');
 /* la réfraction suit la taille réelle : elle s'éteint avec la lentille
    au lieu de sauter, et n'agit que sur la toile (rien à déformer sous un panneau) */
 Object.assign(glassCursor,{x:fx,y:fy,radius:sous===scene?taille/2:0});
 frame=requestAnimationFrame(draw);
}
document.addEventListener('pointermove',event=>{
 if(!fine.matches||event.pointerType!=='mouse'){hide();return;}
 x=event.clientX;y=event.clientY;
 if(!frame){fx=x;fy=y;last=0;frame=requestAnimationFrame(draw);}
},{passive:true});
document.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')pressed=true});
document.addEventListener('pointerup',()=>{pressed=false});
document.addEventListener('pointercancel',()=>{pressed=false;hide()});
document.addEventListener('pointerleave',hide);
document.addEventListener('keydown',hide,true);
window.addEventListener('blur',()=>{pressed=false;hide()});
window.addEventListener('pagehide',hide);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});
fine.addEventListener('change',hide);hide();

/* Un seul curseur pour tout le site, dessiné par nous : un point crème
   partout — le même point que sous les noms des villes — qui s'ouvre en
   lentille de verre quand il passe sur la Terre, et se referme en point en
   la quittant. Le curseur natif (flèche, main) est masqué tant que le point
   se dessine. Il reste natif quand une boîte modale est ouverte : la
   couche supérieure des <dialog> passe au-dessus de tout z-index.
   Il a un état par contexte : point libre, point de contrôle (qui se serre
   à l'appui), point éteint sur un contrôle désactivé, effacé au-dessus d'un
   champ texte (le caret natif prend sa place), lentille sur la Terre —
   verrouillée tant qu'on fait tourner le globe. */
export const glassCursor = {x:0,y:0,radius:0};
let hitGlobe=()=>false;
export function setCursorGlobeHitTest(test){hitGlobe=test;}
const fine=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const scene=document.querySelector('#scene'),lens=document.createElement('div');
lens.className='glass-cursor point';lens.setAttribute('aria-hidden','true');lens.inert=true;
document.body.append(lens);
const POINT=6,POINT_CONTROLE=10,POINT_APPUI=7,LENTILLE=50,LENTILLE_PRESSEE=36;
const CONTROLES='a,button,summary,label,input,select,textarea,[role=button],[role=option],.etiquette,#survol.fige';
const TEXTE='input:not([type=range],[type=radio],[type=checkbox],[type=button],[type=submit]),textarea,[contenteditable=""],[contenteditable=true]';
const ETEINT=':disabled,[aria-disabled=true],.calques-indisponibles .calque';
/* taille : ressort amorti (raideur 380 s⁻², ζ ≈ 0,65) — la lentille s'ouvre
   avec un léger dépassement et s'écrase un peu à l'appui, comme une matière.
   position : τ court en point (il colle à la souris), long en lentille
   (elle garde son inertie de verre). */
const RAIDEUR=380,AMORTI=2*.65*Math.sqrt(RAIDEUR),TAU_POINT=12,TAU_LENTILLE=55;
let x=0,y=0,fx=0,fy=0,taille=POINT,vitesse=0,pressed=false,accroche=false,frame=0,last=0,cote=-1;
function hide(){
 glassCursor.radius=0;lens.hidden=true;taille=POINT;vitesse=0;accroche=false;
 document.body.classList.remove('curseur-verre');lens.className='glass-cursor point';
 cancelAnimationFrame(frame);frame=0;
}
function reveiller(){if(!frame&&!lens.hidden){last=0;frame=requestAnimationFrame(draw);}}
function draw(t){
 frame=0;
 const sous=fine.matches&&!document.querySelector('dialog[open]')?document.elementFromPoint(x,y):null;
 if(!sous){hide();return;}
 const surGlobe=accroche||(sous===scene&&hitGlobe(x,y));
 const controle=!surGlobe&&sous.closest(CONTROLES);
 const texte=!!controle&&controle.matches(TEXTE)&&!controle.matches(ETEINT);
 const eteint=!!controle&&!texte&&!!sous.closest(ETEINT);
 const cible=surGlobe?(pressed?LENTILLE_PRESSEE:LENTILLE)
  :controle&&!eteint&&!texte?(pressed?POINT_APPUI:POINT_CONTROLE)
  :pressed&&!eteint?POINT*.7:POINT;
 const dt=Math.min(50,t-last||16);last=t;
 if(reduced.matches){fx=x;fy=y;taille=cible;vitesse=0;}
 else{
  const ouverture=Math.min(1,Math.max(0,(taille-POINT_CONTROLE)/(LENTILLE-POINT_CONTROLE)));
  const k=1-Math.exp(-dt/(TAU_POINT+(TAU_LENTILLE-TAU_POINT)*ouverture));
  fx+=(x-fx)*k;fy+=(y-fy)*k;
  // ressort intégré en sous-pas : stable même quand une image dure 50 ms
  for(let reste=dt/1000;reste>0;reste-=.008){
   const h=Math.min(.008,reste);
   vitesse+=(RAIDEUR*(cible-taille)-AMORTI*vitesse)*h;taille+=vitesse*h;
  }
  if(taille<2){taille=2;vitesse=0;}
  if(Math.abs(cible-taille)<.05&&Math.abs(vitesse)<.5){taille=cible;vitesse=0;}
 }
 /* transform plutôt que left/top : aucune mise en page par image, et la
    croissance part exactement du centre. La largeur ne s'écrit que si elle
    change (pas de scale() : le trait d'1 px grossirait avec la lentille). */
 if(Math.abs(taille-cote)>.01){cote=taille;lens.style.width=lens.style.height=taille+'px';}
 lens.style.transform=`translate3d(${fx-taille/2}px,${fy-taille/2}px,0)`;
 lens.className='glass-cursor'+(surGlobe?'':' point')+(texte?' texte':'')+(eteint?' eteint':'');
 lens.hidden=false;document.body.classList.add('curseur-verre');
 /* la réfraction suit la taille réelle : elle s'éteint avec la lentille
    au lieu de sauter, et n'agit que sur la toile (rien à déformer sous un panneau) */
 Object.assign(glassCursor,{x:fx,y:fy,radius:sous===scene?taille/2:0});
 // au repos (souris immobile, taille posée), la boucle s'arrête ; un geste la relance
 const pose=Math.abs(x-fx)<.1&&Math.abs(y-fy)<.1&&taille===cible;
 if(!pose)frame=requestAnimationFrame(draw);
}
document.addEventListener('pointermove',event=>{
 if(!fine.matches||event.pointerType!=='mouse'){hide();return;}
 x=event.clientX;y=event.clientY;
 if(lens.hidden){fx=x;fy=y;lens.hidden=false;}
 reveiller();
},{passive:true});
document.addEventListener('pointerdown',event=>{
 if(event.pointerType!=='mouse')return;
 pressed=true;
 // appuyer sur la Terre accroche la lentille jusqu'au relâchement : faire
 // tourner le globe en glissant hors du limbe ne la referme plus
 accroche=event.target===scene&&hitGlobe(event.clientX,event.clientY);
 reveiller();
});
document.addEventListener('pointerup',()=>{pressed=false;accroche=false;reveiller();});
document.addEventListener('pointercancel',()=>{pressed=false;hide()});
document.addEventListener('pointerleave',hide);
// un panneau qui défile ou un zoom change ce qui est sous le point sans le bouger
document.addEventListener('scroll',reveiller,{capture:true,passive:true});
document.addEventListener('wheel',reveiller,{passive:true});
document.addEventListener('keydown',hide,true);
window.addEventListener('blur',()=>{pressed=false;hide()});
window.addEventListener('pagehide',hide);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});
fine.addEventListener('change',hide);hide();

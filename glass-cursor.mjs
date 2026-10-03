/* Un seul curseur pour tout le site, dessiné par nous : un point crème
   partout — le même point que sous les noms des villes — qui s'ouvre en
   lentille de verre quand il passe sur la Terre, et se referme en point en
   la quittant. Le curseur natif (flèche, main) est masqué tant que le point
   se dessine. Il reste natif quand une boîte modale est ouverte : la
   couche supérieure des <dialog> passe au-dessus de tout z-index.
   Il a un état par contexte : point libre, point de contrôle (qui se serre
   à l'appui), point éteint sur un contrôle désactivé, effacé au-dessus d'un
   champ texte (le caret natif prend sa place), trait sur un lien (en écho
   au soulignement), capsule sur la règle des années, anneau qui tourne sur
   un bouton occupé, point aimanté par le point d'une ville sous son nom,
   lentille sur la Terre — verrouillée tant qu'on fait tourner le globe. */
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
const LIEN='a,.fa-lien',REGLE='input[type=range]',OCCUPE='[aria-busy=true]';
// formes non rondes : [largeur, hauteur]
const TRAIT=[14,2],CAPSULE=[16,6],CAPSULE_APPUI=[20,5],ANNEAU=14,AIMANT=8;
/* taille : ressort amorti (raideur 380 s⁻², ζ ≈ 0,65) — la lentille s'ouvre
   avec un léger dépassement et s'écrase un peu à l'appui, comme une matière.
   position : prise directement sur l'événement, sans aucun retard
   (.agent/POINTER-PERFORMANCE.md) ; seule la taille est amortie. */
const RAIDEUR=380,AMORTI=2*.65*Math.sqrt(RAIDEUR);
let x=0,y=0,fx=0,fy=0,villeAimant=null,classe='',taille=POINT,vitesse=0,haut=POINT,vitesseH=0,coteH=-1,pressed=false,accroche=false,frame=0,last=0,cote=-1;
function hide(){
 glassCursor.radius=0;lens.hidden=true;taille=haut=POINT;vitesse=vitesseH=0;accroche=false;
 document.body.classList.remove('curseur-verre');villeAimant=null;
 lens.className=classe='glass-cursor point';
 cancelAnimationFrame(frame);frame=0;
}
/* position, dans le même tour que l'événement : le centre est le pointeur,
   ou, sous le nom d'une ville, un point aimanté vers le point de la ville */
function placer(){
 fx=x;fy=y;
 if(villeAimant?.isConnected){
  const b=villeAimant.getBoundingClientRect(),px=b.left+b.width/2,py=b.bottom-2;
  if(Math.hypot(px-x,py-y)<24+b.width/2){fx=x+(px-x)*.7;fy=y+(py-y)*.7;}
 }
 lens.style.transform=`translate3d(${fx-taille/2}px,${fy-haut/2}px,0)`;
 glassCursor.x=fx;glassCursor.y=fy;
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
 const actif=controle&&!eteint&&!texte;
 const occupe=actif&&!!controle.closest(OCCUPE);
 const regle=actif&&!occupe&&!!sous.closest(REGLE);
 const lien=actif&&!occupe&&!regle&&!!controle.closest(LIEN);
 const ville=actif&&!occupe&&controle.classList.contains('etiquette')?controle:null;
 let cible,cibleH;
 if(surGlobe)cible=cibleH=pressed?LENTILLE_PRESSEE:LENTILLE;
 else if(occupe)cible=cibleH=ANNEAU;
 else if(regle)[cible,cibleH]=pressed?CAPSULE_APPUI:CAPSULE;
 else if(lien)[cible,cibleH]=pressed?[TRAIT[0]*.8,TRAIT[1]]:TRAIT;
 else if(ville)cible=cibleH=pressed?POINT:AIMANT;
 else if(actif)cible=cibleH=pressed?POINT_APPUI:POINT_CONTROLE;
 else cible=cibleH=pressed&&!eteint?POINT*.7:POINT;
 /* aimant : sous le nom d'une ville, le point glisse vers le point de la
    ville (même crème) et s'y pose, sans quitter tout à fait la souris */
 let tx=x,ty=y;
 if(ville){
  const b=ville.getBoundingClientRect(),px=b.left+b.width/2,py=b.bottom-2;
  if(Math.hypot(px-x,py-y)<24+b.width/2){tx=x+(px-x)*.7;ty=y+(py-y)*.7;}
 }
 villeAimant=ville;
 const dt=Math.min(50,t-last||16);last=t;
 if(reduced.matches){taille=cible;haut=cibleH;vitesse=vitesseH=0;}
 else{
  // ressorts intégrés en sous-pas : stables même quand une image dure 50 ms
  for(let reste=dt/1000;reste>0;reste-=.008){
   const h=Math.min(.008,reste);
   vitesse+=(RAIDEUR*(cible-taille)-AMORTI*vitesse)*h;taille+=vitesse*h;
   vitesseH+=(RAIDEUR*(cibleH-haut)-AMORTI*vitesseH)*h;haut+=vitesseH*h;
  }
  if(taille<2){taille=2;vitesse=0;}
  if(haut<1.5){haut=1.5;vitesseH=0;}
  if(Math.abs(cible-taille)<.05&&Math.abs(vitesse)<.5){taille=cible;vitesse=0;}
  if(Math.abs(cibleH-haut)<.05&&Math.abs(vitesseH)<.5){haut=cibleH;vitesseH=0;}
 }
 /* transform plutôt que left/top : aucune mise en page par image, et la
    croissance part exactement du centre. La largeur ne s'écrit que si elle
    change (pas de scale() : le trait d'1 px grossirait avec la lentille). */
 const change=Math.abs(taille-cote)>.01||Math.abs(haut-coteH)>.01;
 if(Math.abs(taille-cote)>.01){cote=taille;lens.style.width=taille+'px';}
 if(Math.abs(haut-coteH)>.01){coteH=haut;lens.style.height=haut+'px';}
 // les classes ne s'écrivent que si l'état change (pas de recalcul de style par image)
 const nouvelle='glass-cursor'+(surGlobe?'':' point')+(texte?' texte':'')+(eteint?' eteint':'')+(occupe?' occupe':'');
 if(nouvelle!==classe)lens.className=classe=nouvelle;
 const montrer=lens.hidden;
 if(change||montrer||Math.abs(tx-fx)>.01||Math.abs(ty-fy)>.01)placer();
 if(montrer||!document.body.classList.contains('curseur-verre')){lens.hidden=false;document.body.classList.add('curseur-verre');}
 /* la réfraction suit la taille réelle : elle s'éteint avec la lentille
    au lieu de sauter, et n'agit que sur la toile (rien à déformer sous un panneau) */
 glassCursor.radius=sous===scene?taille/2:0;
 // au repos (souris immobile, taille posée), la boucle s'arrête ; un geste la relance
 const pose=taille===cible&&haut===cibleH;
 if(!pose)frame=requestAnimationFrame(draw);
}
document.addEventListener('pointermove',event=>{
 if(!fine.matches||event.pointerType!=='mouse'){hide();return;}
 x=event.clientX;y=event.clientY;
 // la position suit l'événement immédiatement (phase de capture) ; la
 // boucle ne fait que la taille et l'état
 placer();
 // caché (première entrée, boîte modale…) : c'est la boucle qui décide de le montrer
 if(lens.hidden){last=0;if(!frame)frame=requestAnimationFrame(draw);}
 else reveiller();
},{passive:true,capture:true});
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
// un bouton qui passe « occupé », ou une boîte modale qui s'ouvre, sous un point immobile
new MutationObserver(reveiller).observe(document.body,{subtree:true,attributes:true,attributeFilter:['aria-busy','disabled','open']});

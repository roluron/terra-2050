const surfaces = '.language-content,#map-options,#map-inspector,#dossier,#city-comparison,.pedago-carte,#menu-reglages,#champ-recherche,#bouton-reglages';
const enabled = matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
let frame = 0, active;
function clear() {
  // la position reste écrite : la lumière (finitions.css) s'éteint en fondu
  // là où elle était, au lieu de sauter au bord du panneau
  cancelAnimationFrame(frame);
  frame = 0;
  active = null;
}
document.addEventListener('pointermove', event => {
  if (!enabled.matches || event.pointerType !== 'mouse') return;
  const surface = event.target.closest(surfaces);
  if (surface !== active) {clear();active = surface;}
  if (!surface || frame) return;
  const {clientX,clientY} = event;
  frame = requestAnimationFrame(() => {
    const box = surface.getBoundingClientRect();
    surface.style.setProperty('--light-x',`${Math.round((clientX-box.left)/box.width*100)}%`);
    surface.style.setProperty('--light-y',`${Math.round((clientY-box.top)/box.height*100)}%`);
    frame = 0;
  });
},{passive:true});
document.addEventListener('pointerleave',clear);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
enabled.addEventListener('change',clear);

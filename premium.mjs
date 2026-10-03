const surfaces = '.language-content,#map-options,#map-inspector,#dossier,#city-comparison,.pedago-carte,#menu-reglages,#champ-recherche,#bouton-reglages';
const enabled = matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
let frame = 0, active;
/* la lumière (finitions.css) s'allume au survol et s'éteint en fondu là où
   elle était. --light-a est animé ici, pas par une transition CSS : une
   transition sur ces panneaux remplacerait les leurs. */
function allumer(surface, cible) {
  if (!surface) return;
  const depart = parseFloat(getComputedStyle(surface).getPropertyValue('--light-a')) || 0;
  for (const animation of surface.getAnimations()) if (animation.id === 'lumiere') animation.cancel();
  const animation = surface.animate([{'--light-a': depart}, {'--light-a': cible}],
    {duration: cible ? 450 : 600, easing: 'cubic-bezier(.165,.84,.44,1)', fill: 'forwards'});
  animation.id = 'lumiere';
}
function clear() {
  cancelAnimationFrame(frame);
  frame = 0;
  allumer(active, 0);
  active = null;
}
document.addEventListener('pointermove', event => {
  if (!enabled.matches || event.pointerType !== 'mouse') return;
  const surface = event.target.closest(surfaces);
  if (surface !== active) {clear();active = surface;allumer(surface, 1);}
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

/* appui : tout ce qui se touche s'enfonce de 3 % en 80 ms et revient en
   souplesse. En WAAPI sur `scale` : les transitions propres à chaque
   contrôle (fond, transform) restent intactes. */
const APPUYABLES = 'button,summary,[role=button],[role=option],#resultats li,#language-options label,.calque';
const douceur = matchMedia('(prefers-reduced-motion:no-preference)');
let enfonce = null;
function relacher() {
  if (!enfonce) return;
  const el = enfonce; enfonce = null;
  const depart = getComputedStyle(el).scale;
  el.getAnimations().forEach(a => { if (a.id === 'appui') a.cancel(); });
  const retour = el.animate([{scale: depart === 'none' ? 1 : depart}, {scale: 1}], {duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)'});
  retour.id = 'appui';
}
document.addEventListener('pointerdown', event => {
  if (!douceur.matches || event.button > 0) return;
  const el = event.target.closest?.(APPUYABLES);
  if (!el || el.matches(':disabled,[aria-disabled=true],.etiquette') || el.getBoundingClientRect().width > 360) return;
  relacher(); enfonce = el;
  el.animate([{scale: 1}, {scale: .97}], {duration: 80, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'}).id = 'appui';
}, {passive: true});
for (const type of ['pointerup', 'pointercancel', 'dragstart']) document.addEventListener(type, relacher, {passive: true});
window.addEventListener('blur', relacher);

/* sorties de boîtes modales (finitions.css) : `display` et `overlay` suivent
   la transition de sortie. Si le rendu est suspendu (onglet en arrière-plan,
   machine saturée), la transition ne progresse plus et la boîte fermée
   resterait affichée : une minuterie la termine une fois sa durée passée. */
for (const id of ['city-comparison', 'language-dialog']) {
  const dialog = document.getElementById(id);
  dialog?.addEventListener('close', () => setTimeout(() => {
    if (dialog.open) return;
    // seulement les animations finies (une animation infinie lève
    // InvalidStateError), et jamais d'exception vers la page
    for (const animation of dialog.getAnimations({subtree: true})) {
      const {iterations, endTime} = animation.effect?.getComputedTiming() || {};
      if (iterations === Infinity || !Number.isFinite(endTime)) continue;
      try { animation.finish(); } catch {}
    }
  }, 450));
}

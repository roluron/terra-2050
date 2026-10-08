import {mountEarthLoop} from './logos/live/earth-loop.mjs';
import {mountThermalLogo} from './logos/live/thermal-logo.mjs';
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./logo-preview.css',import.meta.url).href;
const styled=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=reject;});document.head.append(style);await styled;
let section=document.querySelector('.current-identity');
if(!section){section=document.createElement('section');section.className='section current-identity';document.querySelector('#media').before(section);}
section.setAttribute('aria-labelledby','identity-title');
section.innerHTML='<div class="section-heading"><h2 id="identity-title">A living identity.</h2><a href="https://github.com/roluron/terra-2050/releases/download/presskit-2026-10-08-clean/fromearth-current-thermal-logo.zip" download>Download the logo ↘</a></div><div id="press-logo" class="thermal-logo" role="img" aria-label="fromearth / 2050 — thermal animation on earth"><span class="thermal-fallback">from<strong>earth</strong><small>/ 2050</small></span></div><div class="logo-controls"><p id="logo-instructions">A seamless loop. Only earth is in motion.</p><button id="logo-pause" type="button" aria-pressed="false">Pause animation</button></div>';
const effect=await mountEarthLoop(section.querySelector('#press-logo'),{lockup:new URL('./logos/thermal-lockup-white.png',import.meta.url).href});
for(const element of document.querySelectorAll('.brand,.footer-wordmark')){
  element.classList.add('thermal-logo');element.removeAttribute('aria-hidden');element.setAttribute('aria-label','fromearth / 2050');
  await mountThermalLogo(element);
}
const button=section.querySelector('#logo-pause');
button.addEventListener('click',()=>{const paused=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(paused));effect?.setPaused(paused);button.textContent=document.documentElement.lang==='fr'?(paused?'Reprendre l’animation':'Mettre en pause'):(paused?'Resume animation':'Pause animation');});
if(!effect)button.hidden=true;
document.dispatchEvent(new Event('logo-ready'));

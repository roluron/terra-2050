import { translations } from './locales/catalog.mjs';
export { translations };
export const languageNames = {en:'English', fr:'Français', ja:'日本語', zh:'简体中文', vi:'Tiếng Việt', es:'Español', it:'Italiano'};
export function initialLanguage() {
  const requested = new URLSearchParams(location.search).get('lang');
  if (Object.hasOwn(translations, requested)) return requested;
  try { const saved = localStorage.getItem('terra-langue'); if (Object.hasOwn(translations, saved)) return saved; } catch {}
  return (navigator.languages || [navigator.language]).map(code => code.split('-')[0]).find(code => Object.hasOwn(translations, code)) || 'en';
}
let current = initialLanguage();
export const language = () => current;
export const getText = () => translations[current];
export const message = (key, values = {}) => getText().ui[key].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
export function setLanguage(code) {
  if (!Object.hasOwn(translations, code)) return;
  current = code;
  document.documentElement.lang = code;
  try { localStorage.setItem('terra-langue', code); } catch {}
  const url = new URL(location.href); url.searchParams.set('lang', code);
  history.replaceState(history.state, '', url);
  window.dispatchEvent(new CustomEvent('terra-language'));
}
const languagePrompts = {
  en: ['Select your language', 'Continue'], fr: ['Choisis ta langue', 'Continuer'],
  ja: ['言語を選んでください', '続ける'], zh: ['请选择语言', '继续'],
  vi: ['Chọn ngôn ngữ của bạn', 'Tiếp tục'], es: ['Elige tu idioma', 'Continuar'],
  it: ['Scegli la tua lingua', 'Continua'],
};
const languageDialog = document.getElementById('language-dialog');
let afterLanguage, welcome = false, closingLanguage = false;
document.getElementById('language-options').replaceChildren(...Object.entries(languageNames).map(([code, name]) => {
  const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
  input.type = 'radio'; input.name = 'language'; input.value = code;
  text.lang = code; text.textContent = name;
  input.addEventListener('change', () => setLanguage(code));
  label.append(input, text); return label;
}));
function syncLanguageDialog() {
  languageDialog.lang = current;
  document.getElementById('language-title').textContent = languagePrompts[current][0];
  document.querySelector('#language-continue span').textContent = languagePrompts[current][1];
  for (const input of languageDialog.querySelectorAll('input')) input.checked = input.value === current;
}
export function openLanguage(onClose, first = false) {
  if (languageDialog.open) return;
  afterLanguage = onClose; welcome = first; closingLanguage = false;
  syncLanguageDialog(); languageDialog.showModal();
  languageDialog.querySelector('input:checked').focus({preventScroll:true});
}
async function closeLanguage() {
  if (closingLanguage) return;
  closingLanguage = true;
  const content = languageDialog.querySelector('.language-content');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await content.animate([{opacity:1,filter:'blur(0px)',transform:'translateY(0)'},{opacity:0,filter:'blur(8px)',transform:'translateY(-8px)'}], {duration:420,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished;
  }
  languageDialog.close();
  for (const animation of content.getAnimations()) animation.cancel();
  afterLanguage?.();
}
languageDialog.querySelector('form').addEventListener('submit', event => {event.preventDefault(); closeLanguage();});
languageDialog.addEventListener('cancel', event => {event.preventDefault(); if (!welcome) closeLanguage();});
languageDialog.addEventListener('keydown', event => event.stopPropagation());
window.addEventListener('terra-language', syncLanguageDialog);
export function languageControl(button) {
  const sync = () => {button.textContent = languageNames[current] + ' ↗'; button.setAttribute('aria-label', languageNames[current] + ' — ' + getText().ui.language);};
  sync(); button.addEventListener('click', () => openLanguage(() => document.getElementById('bouton-reglages').focus({preventScroll:true})));
  window.addEventListener('terra-language', sync);
}
function translateStatic() {
  document.documentElement.lang = current;
  for (const element of document.querySelectorAll('[data-ui]')) element.textContent = getText().ui[element.dataset.ui];
}
translateStatic();
window.addEventListener('terra-language', translateStatic);

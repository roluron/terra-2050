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
export function languageSelect(select) {
  select.replaceChildren(...Object.entries(languageNames).map(([code, name]) => {
    const option = document.createElement('option'); option.value = code; option.lang = code; option.textContent = name; return option;
  }));
  select.value = current;
  select.setAttribute('aria-label', getText().ui.language);
  select.addEventListener('change', () => setLanguage(select.value));
  window.addEventListener('terra-language', () => {select.value = current; select.setAttribute('aria-label', getText().ui.language);});
}
function translateStatic() {
  document.documentElement.lang = current;
  for (const element of document.querySelectorAll('[data-ui]')) element.textContent = getText().ui[element.dataset.ui];
}
translateStatic();
window.addEventListener('terra-language', translateStatic);

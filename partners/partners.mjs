import { copy } from './copy.mjs?v=20261008-credit';

const requested = new URLSearchParams(location.search).get('lang');
let saved;
try { saved = localStorage.getItem('terra-langue'); } catch {}
const locale = (requested || saved || navigator.language).split('-')[0] === 'fr' ? 'fr' : 'en';
const text = copy[locale];
document.documentElement.lang = locale;
document.title = text.title;
document.querySelector('meta[name="description"]').content = text.description;
document.querySelector('meta[property="og:title"]').content = text.ogTitle;
document.querySelector('meta[property="og:description"]').content = text.ogDescription;
for (const element of document.querySelectorAll('[data-copy]')) element.textContent = text[element.dataset.copy];
for (const element of document.querySelectorAll('[data-copy-alt]')) element.alt = text[element.dataset.copyAlt];
for (const element of document.querySelectorAll('[data-copy-aria]')) element.setAttribute('aria-label', text[element.dataset.copyAria]);
for (const link of document.querySelectorAll('[data-language]')) {
  if (link.dataset.language === locale) link.setAttribute('aria-current', 'page');
}
for (const link of document.querySelectorAll('[data-explore]')) link.href = `../?lang=${locale}`;
document.querySelector('[data-contact]').href = `mailto:firstcontact@fromanother.love?subject=${encodeURIComponent(text.subject)}&body=${encodeURIComponent(text.emailBody)}`;

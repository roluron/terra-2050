import { startOrb } from './earth-orb.mjs';
import { language, getText, message, openLanguage } from './i18n.mjs';

const shell = document.querySelector('#earth-shell');
shell.showModal();
shell.addEventListener('cancel', event => event.preventDefault());
shell.addEventListener('keydown', event => event.stopPropagation());
const letter = document.querySelector('#letter');
const future = document.querySelector('#future');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const signs = Array.from('·✳+⋮✶⋅⊹✧');
const cuneiform = Array.from('𒀀𒆠𒇽𒈗𒌓');
const words = [];
let finished = 0;
const revealTimers = new Set();
openLanguage(() => {
  document.getElementById('earth-letter-main').hidden = false;
  shell.querySelector('h1').focus({preventScroll:true});
}, true);

function buildLetter() {
  for (const timer of revealTimers) clearInterval(timer);
  revealTimers.clear(); words.length = 0; finished = 0;
  shell.classList.remove('complete'); future.tabIndex = -1;
  const t = getText().ui;
  shell.lang = language(); shell.setAttribute('aria-label', t.letterLabel);
  shell.querySelector('h1').textContent = t.letterTitle;
  const body = document.createElement('p'), signature = document.createElement('p');
  body.append(t.letterOpening, document.createElement('br'), t.letterBody);
  signature.className = 'signature'; signature.textContent = t.letterSignature;
  letter.replaceChildren(body, signature); future.textContent = t.letterFuture;
  document.querySelector('#earth-recovery p').textContent = t.globeSlow;
  document.querySelector('#earth-retry').textContent = t.retry;
  const segmenter = new Intl.Segmenter(language(), {granularity:'word'});
for (const [line, paragraph] of [...letter.querySelectorAll('p')].entries()) {
  paragraph.style.setProperty('--line', line);
  for (const node of [...paragraph.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const fragment = document.createDocumentFragment();
    const segments = ['ja', 'zh'].includes(language())
      ? [...segmenter.segment(node.textContent)].reduce((parts, {segment, isWordLike}) => {
        if (!isWordLike && parts.length && !/\s/.test(segment)) parts[parts.length - 1] += segment;
        else parts.push(segment);
        return parts;
      }, []) : node.textContent.split(/(\s+)/);
    for (const text of segments) {
      if (!text.trim()) { fragment.append(text); continue; }
      const word = document.createElement('span');
      word.className = 'word';
      word.tabIndex = 0;
      word.setAttribute('role', 'button');
      word.setAttribute('aria-label', message('revealWord', {word: text}));
      const latin = document.createElement('span');
      latin.className = 'latin';
      latin.textContent = text;
      const glyphs = document.createElement('span');
      glyphs.className = 'glyphs';
      glyphs.setAttribute('aria-hidden', 'true');
      const index = words.length;
      glyphs.style.setProperty('--phase', `${-(index * .21 + line * .55)}s`);
      glyphs.textContent = signsFor(index, text.length);
      word.append(latin, glyphs);
      const item = { word, glyphs, text, index, started: false };
      words.push(item);
      word.addEventListener('pointerenter', () => reveal(item));
      word.addEventListener('pointerdown', () => reveal(item));
      word.addEventListener('focus', () => reveal(item));
      word.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); reveal(item); }
      });
      fragment.append(word);
    }
    node.replaceWith(fragment);
  }
}
}
buildLetter();
window.addEventListener('terra-language', () => { if (!departing) buildLetter(); });

function signsFor(index, length) {
  return Array.from({ length: Math.max(1, Math.ceil(length / 1.2)) }, (_, j) => signs[(index * 3 + j * 5) % signs.length]).join('');
}

function reveal(item) {
  if (item.started) return;
  item.started = true;
  const { word, glyphs, text, index } = item;
  word.classList.add('revealing');
  if (motion.matches) { finish(item); return; }
  let step = 0;
  const timer = setInterval(() => {
    step++;
    if (step === 8 || motion.matches) { clearInterval(timer); revealTimers.delete(timer); finish(item); return; }
    if (step < 4) glyphs.textContent = signsFor(index + step, text.length);
    else {
      glyphs.classList.add('roman');
      glyphs.textContent = Array.from(text, (character, position) => position < (step - 3) / 4 * text.length ? character : cuneiform[(position + step * 7 + index) % cuneiform.length]).join('');
    }
  }, 75);
  revealTimers.add(timer);
}

function finish({ word }) {
  word.classList.remove('revealing');
  word.classList.add('revealed');
  word.removeAttribute('role');
  word.removeAttribute('aria-label');
  word.tabIndex = -1;
  finished++;
  if (finished === words.length) {
    shell.classList.add('complete');
    future.tabIndex = 0;
  }
}

letter.addEventListener('pointermove', event => {
  for (const item of words) {
    if (item.started) continue;
    const rect = item.word.getBoundingClientRect();
    const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
    const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
    if (dx * dx + dy * dy < 30 * 30) reveal(item);
  }
});


let departing = false, entered = false, stopOrb, recoveryTimer;
const codeTimer = setInterval(() => {
  if (document.hidden || motion.matches || departing) return;
  const time = Math.floor(performance.now() / 900);
  for (const item of words) if (!item.started && (item.index + time) % 7 === 0) item.glyphs.textContent = signsFor(item.index + time, item.text.length);
}, 900);
function enter() {
  if (!departing || entered || !window.terraIntro?.ready()) return;
  try { entered = window.terraIntro.enter(); }
  catch { document.querySelector('#earth-recovery').hidden = false; }
}
window.addEventListener('terra-ready', enter);
document.querySelector('#earth-retry').addEventListener('click', () => location.reload());
future.addEventListener('click', () => {
  if (finished !== words.length || departing) return;
  departing = true;
  clearInterval(codeTimer);
  const origins = [];
  for (const element of shell.querySelectorAll('h1, .latin')) {
    const style = getComputedStyle(element);
    let offset = 0;
    for (const character of Array.from(element.textContent)) {
      const range = document.createRange();
      range.setStart(element.firstChild, offset); offset += character.length; range.setEnd(element.firstChild, offset);
      const rect = range.getBoundingClientRect();
      if (character.trim()) origins.push({x:rect.left+rect.width/2,y:rect.top+rect.height/2,character,font:`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`});
    }
  }
  document.querySelector('#earth-letter-main').inert = true;
  shell.classList.add('departing');
  enter();
  stopOrb = startOrb(document.querySelector('#earth-orb'), origins, {
    reduced: motion.matches || new URLSearchParams(location.hash.slice(1)).has('v'),
    ready: () => entered,
    points: () => window.terraIntro?.points() || [],
    materialize: () => shell.classList.add('materializing'),
    complete: () => {
      clearTimeout(recoveryTimer);
      window.terraIntro.complete();
      shell.close();
    }
  });
  recoveryTimer = setTimeout(() => { if (!entered) document.querySelector('#earth-recovery').hidden = false; }, 16000);
});
window.addEventListener('pagehide', () => { clearInterval(codeTimer); clearTimeout(recoveryTimer); stopOrb?.(); });

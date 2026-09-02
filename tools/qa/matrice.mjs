/* Matrice de lancement TERRA/2050 — 25 controles sur 7 configurations.
 *
 *   URL0=https://roluron.github.io/terra-2050/ node tools/qa/matrice.mjs
 *   node tools/qa/matrice.mjs                      (par defaut localhost:8080)
 *
 * SORT EN CODE 1 si un seul controle echoue. C est le point important : une
 * suite qui se contente d imprimer PASS et FAIL se lit au grep, et un grep
 * ne voit pas la difference entre « tout va bien » et « le script est mort
 * apres la troisieme ligne ». Lire ce code SANS TUBE : derriere un pipe,
 * $? renvoie le code du dernier maillon, pas celui-ci.
 *
 * Les navigateurs viennent de Playwright. Chemins surchargeables :
 *   QA_CHROMIUM=... QA_WEBKIT=... node tools/qa/matrice.mjs
 */
import fs from 'node:fs';

import { chromium, webkit, devices } from 'playwright';
const OUT = new URL('./shots2/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const URL0 = process.env.URL0 || 'http://localhost:8080/';
const CH = process.env.QA_CHROMIUM || '/Users/robinmahieux/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const WK = process.env.QA_WEBKIT || '/Users/robinmahieux/Library/Caches/ms-playwright/webkit-2272/pw_run.sh';
for (const [nom, p] of [['QA_CHROMIUM', CH], ['QA_WEBKIT', WK]])
  if (!fs.existsSync(p)) { console.error(`Navigateur introuvable (${nom}) : ${p}`); process.exit(2); }
const results = [];
const ok = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

async function open(bt, ctxOpts = {}, { init, route, hash = '' } = {}) {
  const browser = await bt.launch({ executablePath: bt === webkit ? WK : CH });
  const ctx = await browser.newContext(ctxOpts);
  if (init) await ctx.addInitScript(init);
  if (route) await ctx.route(route.url, r => r.fulfill({ status: 404, body: 'nope' }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon.ico')) errs.push('http ' + r.status() + ' ' + r.url()); });
  await page.goto(URL0 + hash, { waitUntil: 'load' });
  return { browser, page, errs };
}
const enter = async (page) => { await page.waitForSelector('#voile.pret', { timeout: 30000 }); await page.click('#bouton-entree'); await page.waitForTimeout(2500); };
const search = async (page, q, mobile) => {
  if (mobile) await page.tap('#champ-recherche'); else await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500); await page.keyboard.type(q); await page.waitForTimeout(600); await page.keyboard.press('Enter'); await page.waitForTimeout(2200);
};
const chrome = (page) => page.evaluate(() => ['recherche', 'calques', 'util', 'timeline', 'titre'].map(id => { const e = document.getElementById(id); const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { id, op: +cs.opacity, x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }));
const layout = (page) => page.evaluate(() => {
  const se = document.scrollingElement;
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.opacity !== '0' && cs.visibility !== 'hidden'; };
  const small = [...document.querySelectorAll('button,input,[role=button]')].filter(e => vis(e) && (e.getBoundingClientRect().width < 44 || e.getBoundingClientRect().height < 44)).map(e => e.id || e.className);
  const off = [...document.querySelectorAll('#titre,#recherche,#util,#calques,#timeline,#dossier.ouvert')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1; }).map(e => e.id);
  return { overflowX: se.scrollWidth > innerWidth, small, off, w: innerWidth, h: innerHeight };
});
const overlap = (a, b) => !(a.r <= b.x || b.r <= a.x || a.b <= b.y || b.b <= a.y);

// ---------- A. desktop 1280x720 : clavier timeline + duel ----------
{
  const { browser, page, errs } = await open(chromium, { viewport: { width: 1280, height: 720 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await enter(page);
  await search(page, 'Lisbon');
  ok('A fiche ouverte 1280x720', await page.$eval('#dossier', d => d.classList.contains('ouvert')));
  await page.focus('#curseur'); await page.keyboard.press('End'); await page.waitForTimeout(800);
  const an = await page.$eval('#curseur', c => c.value); const hash = await page.evaluate(() => location.hash);
  ok('A timeline clavier End → 2050 + lien', an === '2050' && hash.includes('an=2050'), `${an} ${hash}`);
  await page.keyboard.press('Home'); await page.waitForTimeout(600);
  ok('A timeline clavier Home → 2026', (await page.$eval('#curseur', c => c.value)) === '2026');
  const lay = await layout(page); ok('A layout 1280x720', !lay.overflowX && lay.off.length === 0, JSON.stringify(lay));
  await page.screenshot({ path: OUT + 'A-1280.png' });
  // duel via lien vs
  await page.goto('about:blank'); await page.goto(URL0 + '#v=Lisbon&an=2050&cc=PT&vs=Porto&vc=PT');
  await enter(page); await page.waitForTimeout(1500);
  const duel = await page.$eval('#dossier-duel', d => ({ hidden: d.hidden, txt: d.textContent.trim() }));
  ok('A duel par lien vs/vc', !duel.hidden && duel.txt.length > 0, JSON.stringify(duel));
  await page.screenshot({ path: OUT + 'A-duel.png' });
  // lien simple -> invitation -> 2e ville -> duel
  await page.goto('about:blank'); await page.goto(URL0 + '#v=Lisbon&an=2050&cc=PT');
  await enter(page); await page.waitForTimeout(4000);
  const acc = await page.$eval('#accroche', a => ({ hidden: a.hidden, txt: a.textContent.trim() }));
  ok('A invitation duel après lien simple', !acc.hidden && acc.txt.length > 0, JSON.stringify(acc));
  await search(page, 'Madrid');
  const duel2 = await page.$eval('#dossier-duel', d => ({ hidden: d.hidden, txt: d.textContent.trim() }));
  ok('A duel après choix 2e ville', !duel2.hidden, JSON.stringify(duel2));
  // spam
  await page.click('#dossier-croix'); await page.waitForTimeout(600);
  for (let i = 0; i < 12; i++) await page.click('.calque[data-cle=secheresse]', { force: true, timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(500); if (!(await page.$eval('#pedago', p => p.hidden))) await page.click('#pedago-fermer');
  await search(page, 'Cairo');
  for (let i = 0; i < 6; i++) await page.click('#dossier-partage', { force: true, timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(2000);
  ok('A spam calques/partage sans erreur', errs.length === 0, errs.join(' | '));
  await browser.close();
}
// ---------- B. iPhone paysage ----------
{
  const d = devices['iPhone 15 Pro landscape'];
  const { browser, page, errs } = await open(webkit, { ...d });
  await enter(page);
  const c = await chrome(page); const lay = await layout(page);
  ok('B iPhone paysage chrome dans le viewport', lay.off.length === 0 && !lay.overflowX, JSON.stringify(lay));
  await search(page, 'Bangkok', true);
  const lay2 = await layout(page);
  ok('B iPhone paysage fiche ouverte', (await page.$eval('#dossier', d => d.classList.contains('ouvert'))) && lay2.off.length === 0 && lay2.small.length === 0, JSON.stringify(lay2));
  const collide = await page.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    const vis = id => { const cs = getComputedStyle(document.getElementById(id)); return cs.opacity !== '0' && cs.visibility !== 'hidden'; };
    const pairs = [];
    if (vis('timeline') && vis('dossier') && hit(r('timeline'), r('dossier'))) pairs.push('timeline/dossier');
    if (vis('timeline') && vis('calques') && hit(r('timeline'), r('calques'))) pairs.push('timeline/calques');
    if (vis('calques') && vis('dossier') && hit(r('calques'), r('dossier'))) pairs.push('calques/dossier');
    return pairs;
  });
  ok('B iPhone paysage aucun chevauchement', collide.length === 0, collide.join(','));
  await page.screenshot({ path: OUT + 'B-landscape-dossier.png' });
  await page.tap('#dossier-story'); await page.waitForTimeout(2500);
  const st = await page.$eval('#story-partager', b => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
  ok('B iPhone paysage bouton story visible', st);
  await page.screenshot({ path: OUT + 'B-landscape-story.png' });
  ok('B iPhone paysage erreurs', errs.length === 0, errs.join(' | '));
  await browser.close();
}
// ---------- C. iPad ----------
{
  const { browser, page, errs } = await open(webkit, { ...devices['iPad Pro 11'] });
  await enter(page); await search(page, 'Tokyo', true);
  const lay = await layout(page);
  ok('C iPad fiche', (await page.$eval('#dossier', d => d.classList.contains('ouvert'))) && lay.off.length === 0 && lay.small.length === 0 && !lay.overflowX, JSON.stringify(lay));
  await page.screenshot({ path: OUT + 'C-ipad.png' });
  ok('C iPad erreurs', errs.length === 0, errs.join(' | '));
  await browser.close();
}
// ---------- D. reduced motion ----------
{
  const { browser, page, errs } = await open(chromium, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.waitForSelector('#voile.pret', { timeout: 30000 }); await page.click('#bouton-entree'); await page.waitForTimeout(1200);
  const c = await chrome(page);
  ok('D reduced-motion chrome visible', c.every(x => x.op > 0.9), JSON.stringify(c.map(x => x.id + ':' + x.op)));
  await search(page, 'Paris');
  ok('D reduced-motion fiche', await page.$eval('#dossier', d => d.classList.contains('ouvert')));
  ok('D reduced-motion erreurs', errs.length === 0, errs.join(' | '));
  await browser.close();
}
// ---------- E. panne données ----------
{
  const { browser, page, errs } = await open(chromium, { viewport: { width: 1280, height: 800 } }, { route: { url: '**/data/places.json' } });
  const pret = await page.waitForSelector('#voile.pret', { timeout: 30000 }).then(() => true).catch(() => false);
  ok('E panne données : voile prêt', pret);
  await page.click('#bouton-entree'); await page.waitForTimeout(2000);
  await page.keyboard.press('Meta+k'); await page.keyboard.type('Bang'); await page.waitForTimeout(800);
  const li = await page.$$eval('#resultats li', l => l.map(x => x.textContent.trim()));
  ok('E panne données : recherche ne plante pas', true, JSON.stringify(li));
  ok('E panne données : erreurs = 404 + 1 message', errs.filter(e => e.startsWith('données')).length === 1 && errs.filter(e => e.startsWith('pageerror')).length === 0, errs.join(' | '));
  await page.screenshot({ path: OUT + 'E-panne.png' });
  await browser.close();
}
// ---------- F. WebGL absent ----------
{
  const { browser, page } = await open(chromium, { viewport: { width: 1280, height: 800 } }, { init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; } });
  await page.waitForTimeout(2500);
  const sec = await page.$eval('#secours', s => ({ vis: getComputedStyle(s).display !== 'none' && getComputedStyle(s).opacity !== '0', txt: s.innerText.slice(0, 80) }));
  const voile = await page.$eval('#voile', v => getComputedStyle(v).visibility);
  ok('F WebGL absent : secours visible, voile retiré', sec.vis && voile === 'hidden', JSON.stringify({ sec, voile }));
  await page.screenshot({ path: OUT + 'F-secours.png' });
  await browser.close();
}
// ---------- G. persistance son + langue ----------
{
  const { browser, page, errs } = await open(chromium, { viewport: { width: 1280, height: 800 } });
  await enter(page);
  await page.click('#bouton-reglages'); await page.waitForTimeout(400); await page.click('#bouton-son'); await page.waitForTimeout(200); await page.click('#bouton-langue'); await page.waitForTimeout(400);
  const before = await page.evaluate(() => [document.getElementById('bouton-son').textContent, document.documentElement.lang]);
  await page.reload(); await enter(page);
  const after = await page.evaluate(() => [document.getElementById('bouton-son').textContent, document.documentElement.lang]);
  ok('G son + langue mémorisés après rechargement', before[0] === after[0] && before[1] === after[1] && /off/i.test(after[0]), JSON.stringify({ before, after }));
  // double clic Explorer
  await page.reload(); await page.waitForSelector('#voile.pret'); await page.$eval('#bouton-entree', b => { b.click(); b.click(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); b.click(); });
  await page.waitForTimeout(2500);
  const nAmb = await page.evaluate(() => Howler._howls.filter(h => h.playing()).length);
  ok('G triple clic Explorer : une seule boucle audio', nAmb <= 2, 'howls playing=' + nAmb);
  ok('G erreurs', errs.length === 0, errs.join(' | '));
  await browser.close();
}
const rates = results.filter(l => l.startsWith('FAIL'));
console.log(results.join('\n'));
console.log('\n' + (results.length - rates.length) + ' sur ' + results.length + ' controles passent.');
fs.writeFileSync(OUT + 'results.txt', results.join('\n'));
if (rates.length){
  console.error('MATRICE EN ECHEC : ' + rates.length + ' controle(s)');
  process.exit(1);
}
process.exit(0);

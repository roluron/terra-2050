import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright';

const url = process.env.URL0 || 'http://localhost:8080/';
const out = process.env.QA_SORTIE || fs.mkdtempSync(os.tmpdir() + '/terra-interactions-');
fs.mkdirSync(out, { recursive: true });
const results = [];
async function check(name, run) {
  try { await run(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: error.message }); }
  console.log(JSON.stringify(results.at(-1)));
  fs.writeFileSync(out + '/interactions.json', JSON.stringify(results, null, 2));
}

for (const [name, type, options] of [
  ['desktop', chromium, { viewport: { width: 1440, height: 900 } }],
  ['iphone', webkit, devices['iPhone 15 Pro']],
]) {
  const browser = await type.launch({ executablePath: type.executablePath() });
  try {
    const context = await browser.newContext({ ...options, locale: 'en-US' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url);
    await page.waitForSelector('#voile.pret').catch(error => {
      console.error('Startup errors:', errors); throw error;
    });
    await page.click('#bouton-entree');
    await page.waitForTimeout(2000);
    const search = async (query, country) => {
      await page.click('#champ-recherche');
      await page.fill('#champ-recherche', query);
      const option = country ? page.getByRole('option', { name: `${query} COUNTRY`, exact: true }) : page.getByRole('option').filter({ hasText: query }).first();
      await option.click();
      await page.waitForTimeout(4100);
    };
    await check(`${name}: no-data city → country → city`, async () => {
      await search('Funafuti');
      assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('sans-donnees')), true);
      await search('France', true);
      assert.equal(await page.locator('#dossier-comparer').isVisible(), true);
      assert.equal(await page.locator('#dossier .trajectoire').isVisible(), true);
      await search('Paris');
      assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('sans-donnees')), false);
      await page.screenshot({ path: `${out}/${name}-city.png` });
    });
    await check(`${name}: compare button → second city → duel`, async () => {
      await page.click('#dossier-comparer');
      await page.fill('#champ-recherche', 'Berlin');
      await page.getByRole('option').filter({ hasText: 'Berlin' }).first().click();
      await page.waitForTimeout(2500);
      assert.equal(await page.locator('#dossier-duel').isVisible(), true);
      const duel = await page.locator('#dossier-duel').textContent();
      assert.match(duel, /Paris/); assert.match(duel, /Berlin/);
      await page.screenshot({ path: `${out}/${name}-duel.png` });
    });
    await check(`${name}: story preview, close and reopen`, async () => {
      await page.click('#dossier-story');
      await page.waitForSelector('#story-popup:not([hidden])');
      await page.waitForSelector('#story-partager:not([disabled]):not([aria-busy="true"])');
      assert.equal(await page.locator('#story-partager').isEnabled(), true);
      await page.locator('.story-opt input').first().focus();
      for (const key of ['Tab', 'Shift+Tab']) for (let i = 0; i < 12; i++) {
        await page.keyboard.press(key);
        assert.equal(await page.locator('#story-popup').evaluate(e => e.contains(document.activeElement)), true);
        assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('ouvert')), true);
      }
      await page.screenshot({ path: `${out}/${name}-story.png` });
      await page.click('#story-fermer');
      await page.click('#dossier-story');
      assert.equal(await page.locator('#story-popup').isVisible(), true);
      await page.click('#story-fermer');
    });
    await check(`${name}: browser back closes dossier; forward reopens`, async () => {
      await page.goto(url);
      await page.waitForSelector('#voile.pret'); await page.click('#bouton-entree');
      await search('Paris');
      await page.goBack(); await page.waitForTimeout(1200);
      const back = await page.locator('#dossier').evaluate(e => e.classList.contains('ouvert'));
      assert.equal(back, false);
      await page.goForward(); await page.waitForTimeout(1800);
      assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('ouvert')), true);
    });
    await check(`${name}: city labels open a diagnosis`, async () => {
      await page.click('#dossier-croix'); await page.waitForTimeout(2500);
      const label = page.locator('.etiquette:not([hidden])').first();
      await label.waitFor();
      const target = await label.evaluate(e => {
        const r = e.getBoundingClientRect();
        return { city: e.textContent, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (name === 'iphone') await page.touchscreen.tap(target.x, target.y);
      else await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(2000);
      assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('ouvert')), true);
      assert.equal(await page.locator('#champ-recherche').inputValue(), target.city);
    });
    if (name === 'desktop') await check(`${name}: returning drag does not open a diagnosis`, async () => {
      await page.click('#dossier-croix'); await page.waitForTimeout(2500);
      await page.mouse.move(720, 450); await page.mouse.down();
      await page.mouse.move(780, 450, { steps: 3 });
      await page.mouse.move(720, 450, { steps: 3 }); await page.mouse.up();
      assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('ouvert')), false);
    });
    if (name === 'iphone') await check(`${name}: pinned tooltip is dismissed when the year changes`, async () => {
      await page.click('#dossier-croix'); await page.waitForTimeout(2500);
      const label = page.locator('.etiquette:not([hidden])').first();
      const box = await label.boundingBox(); assert.ok(box);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height + 5);
      assert.equal(await page.locator('#survol').evaluate(e => e.classList.contains('visible')), true);
      await page.locator('#curseur').focus(); await page.keyboard.press('Home');
      assert.equal(await page.locator('#survol').evaluate(e => e.classList.contains('visible')), false);
    });
    await check(`${name}: no browser errors`, async () => assert.deepEqual(errors, []));
  } finally { await browser.close(); }
}
process.exitCode = results.some(r => !r.pass) ? 1 : 0;

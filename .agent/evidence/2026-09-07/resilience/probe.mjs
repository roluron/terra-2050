import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright';
const out = new URL('file://' + fs.mkdtempSync('/tmp/terra-probe-') + '/');
fs.mkdirSync(out, { recursive: true });
const results = [];
for (const [name, engine, options] of [
  ['webp-fallback', chromium, { viewport: { width: 1440, height: 900 } }],
  ['blocked-storage', webkit, devices['iPhone 15 Pro']],
]) {
  const browser = await engine.launch({ executablePath: engine.executablePath() });
  try {
    const context = await browser.newContext(options);
    if (name === 'blocked-storage') await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } });
    });
    if (name === 'webp-fallback') await context.route('**/*.webp', route => route.fulfill({ status: 404, body: 'Unavailable' }));
    const page = await context.newPage(), errors = [], loaded = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() === 200 && /earth_.*\.(jpg|png)$/.test(r.url())) loaded.push(r.url()); });
    await page.goto(process.env.URL0 || 'http://localhost:8080/');
    await page.waitForSelector('#voile.pret');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id === 'bouton-entree' || document.activeElement === document.body), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id === 'bouton-entree' || document.activeElement === document.body), true);
    await page.click('#bouton-entree'); await page.waitForTimeout(1800);
    await page.click('#champ-recherche'); await page.fill('#champ-recherche', 'Paris');
    await page.getByRole('option').filter({ hasText: 'Paris' }).first().click();
    await page.waitForTimeout(4200);
    assert.equal(await page.locator('#dossier').evaluate(e => e.classList.contains('ouvert')), true);
    if (name === 'webp-fallback') { assert.ok(loaded.some(x => /earth_color_2048.jpg/.test(x))); assert.ok(loaded.some(x => /earth_mask_4320.png/.test(x))); }
    await page.click('#dossier-story');
    await page.waitForFunction(() => !document.querySelector('#story-partager').disabled);
    await page.waitForTimeout(600);
    assert.equal(await page.locator('#story-popup').isVisible(), true);
    await page.screenshot({ path: new URL(`${name}.png`, out).pathname });
    assert.deepEqual(errors, []);
    results.push({ name, pass: true, loaded, errors, focusTrap: true, story: true });
  } catch (error) { results.push({ name, pass: false, error: error.message }); }
  finally { await browser.close(); }
  console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(new URL('results.json', out), JSON.stringify(results, null, 2));
process.exitCode = results.some(x => !x.pass) ? 1 : 0;

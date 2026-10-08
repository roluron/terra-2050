import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { discover } from './entrance.cjs';

const url = process.env.URL0 || 'http://127.0.0.1:8089/?lang=en';
const out = process.env.QA_SORTIE || '/tmp/terra-share-control';
await fs.mkdir(out, { recursive: true });
const cases = [
  ['desktop', chromium, { viewport: { width: 1440, height: 900 } }],
  ['phone', webkit, devices['iPhone SE']],
  ['landscape', webkit, { ...devices['iPhone SE'], viewport: { width: 667, height: 375 } }],
  ['reduced-motion', chromium, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
];
for (const [name, engine, options] of cases.filter(([name]) => !process.env.QA_CASE || name === process.env.QA_CASE)) {
  const browser = await engine.launch({ headless: false });
  try {
    const page = await browser.newPage(options), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await discover(page);
    await page.evaluate(() => {
      window.shareEntrance = [];
      window.recordShareEntrance = true;
      function record() {
        const share = getComputedStyle(document.getElementById('share-view'));
        const settings = getComputedStyle(document.getElementById('bouton-reglages'));
        if (document.body.classList.contains('pret') && !document.getElementById('earth-shell').open) {
          window.shareEntrance.push({ share: Number(share.opacity), settings: Number(settings.opacity), shareTransform: share.transform, settingsTransform: settings.transform });
        }
        if (window.recordShareEntrance) requestAnimationFrame(record);
      }
      record();
    });
    await page.locator('#future').click();
    await page.waitForFunction(() => document.body.classList.contains('pret') && !document.getElementById('earth-shell').open && !document.body.classList.contains('entree-chrome'));
    await page.screenshot({ path: `${out}/${name}.png` });
    const evidence = await page.evaluate(() => {
      window.recordShareEntrance = false;
      const properties = ['width', 'height', 'background', 'border', 'borderRadius', 'boxShadow', 'backdropFilter', 'color'];
      const style = id => Object.fromEntries(properties.map(key => [key, getComputedStyle(document.getElementById(id))[key]]));
      return { share: style('share-view'), settings: style('bouton-reglages'), frames: window.shareEntrance };
    });
    await fs.writeFile(`${out}/${name}.json`, JSON.stringify({ ...evidence, errors }, null, 2));
    assert.ok(evidence.frames.length, 'Entrance was observed');
    assert.ok(evidence.frames.every(frame => Math.abs(frame.share - frame.settings) < .001 && frame.shareTransform === frame.settingsTransform), 'Share and settings reveal together on every observed frame');
    assert.deepEqual(evidence.share, evidence.settings, 'Share and settings have matching glass styling and size');
    assert.equal(await page.locator('#share-view').isVisible(), true);
    await page.locator('#share-view').click();
    await page.locator('#view-share[open]').waitFor();
    await page.locator('#view-share .ux-close').click();
    await page.locator('#explore-city').click();
    await page.locator('#champ-recherche').fill('Paris');
    assert.equal(await page.locator('#share-view').isVisible(), false, 'Share leaves room for expanded search');
    await page.locator('#champ-recherche').fill('');
    await page.keyboard.press('Escape');
    await page.locator('#share-view').waitFor({ state: 'visible' });
    assert.deepEqual(errors, [], 'No runtime errors');
    console.log(`${name}: PASS (${evidence.frames.length} entrance frames, matching styling, share dialog and search)`);
  } finally {
    await browser.close();
  }
}

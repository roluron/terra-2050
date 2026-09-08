import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { enter } from './entrance.cjs';

const out = process.env.QA_SORTIE || '/tmp/terra-fire-animation';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromium.executablePath() });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(process.env.URL0 || 'http://localhost:8087/');
  await enter(page);
  await page.locator('.calque[data-cle="feux"]').click();
  if (await page.locator('#pedago').isVisible()) await page.locator('#pedago-fermer').click();
  for (const year of [2026, 2050]) {
    await page.locator('#curseur').focus();
    await page.keyboard.press(year === 2026 ? 'Home' : 'End');
    await page.waitForTimeout(1000);
    await page.mouse.move(720, 390);
    await page.mouse.down();
    await page.waitForTimeout(600);
    for (let frame = 0; frame < 6; frame++) {
      await page.screenshot({ path: `${out}/${year}-${frame}.png` });
      await page.waitForTimeout(500);
    }
    await page.mouse.up();
  }
  assert.deepEqual(errors, []);
} finally {
  await context.close();
  await page.video().saveAs(`${out}/animation.webm`);
  await browser.close();
}
console.log(JSON.stringify({ video: `${out}/animation.webm`, errors }));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { enter } from './entrance.cjs';

const out = process.env.QA_SORTIE || '/tmp/terra-wildfire';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromium.executablePath() });
const evidence = { cities: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.goto(process.env.URL0 || 'http://localhost:8087/');
  await enter(page);
  await page.locator('.calque[data-cle="feux"]').click();
  if (await page.locator('#pedago').isVisible()) await page.locator('#pedago-fermer').click();
  const dragYear = async year => {
    const slider = page.locator('#curseur');
    const box = await slider.boundingBox();
    const current = Number(await slider.inputValue());
    const x = value => box.x + 3.5 + (box.width - 7) * (value - 2026) / 24;
    await page.mouse.move(x(current), box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x(year), box.y + box.height / 2, { steps: 24 });
    await page.mouse.up();
    assert.equal(Number(await slider.inputValue()), year);
    await page.locator('#layer-context').click();
    await page.waitForFunction(year => document.querySelector('#layer-context').textContent.includes(`${year} ·`), year);
    assert.match(await page.locator('#layer-context').textContent(), /not active fires[\s\S]*No colour = no change, not no risk/);
    await page.waitForTimeout(1200);
  };
  for (const year of [2026, 2038, 2050, 2026]) {
    await dragYear(year);
    await page.screenshot({ path: `${out}/map-${year}.png` });
  }
  for (const [name, option, baseline, future, delta] of [
    ['Paris', 'Paris France', 25.6, 32.8, '+7.2 pts'],
    ['Ouagadougou', /Ouagadougou/, 79.6, 79.2, '-0.4 pts'],
    ['Ho Chi Minh City', /Ho Chi Minh/, 45.6, 45.6, 'unchanged estimate'],
  ]) {
    await page.getByRole('combobox', { name: 'Search a place' }).fill(name);
    await page.getByRole('option', { name: option, exact: typeof option === 'string' }).first().click();
    await page.waitForFunction(() => !document.querySelector('#dossier').inert);
    const card = page.locator('#dossier-risques [data-cle="feux"]');
    const values = [];
    for (const year of [2026, 2038, 2050, 2026]) {
      await dragYear(year);
      const value = Number(await card.locator('.risk-number').textContent());
      assert.equal(await card.locator('.v-now').textContent(), 'Unvalidated proxy');
      assert.ok(Math.abs(value - (baseline + (future - baseline) * (year - 2026) / 24)) < .051);
      if (year === 2050) {
        assert.ok((await card.locator('.risk-change').textContent()).includes(delta));
        await card.screenshot({ path: `${out}/${name.replaceAll(' ', '-')}.png` });
      }
      values.push({ year, value, text: await card.innerText() });
    }
    evidence.cities.push({ name, values });
  }
  assert.deepEqual(evidence.errors, []);
  evidence.pass = true;
} catch (error) {
  evidence.pass = false;
  evidence.error = error.stack;
  process.exitCode = 1;
} finally {
  fs.writeFileSync(`${out}/wildfire.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
console.log(JSON.stringify(evidence));

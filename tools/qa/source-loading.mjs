import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { enter } from './entrance.cjs';
import {translations} from '../../locales/catalog.mjs';

const out = process.env.QA_SORTIE || '/tmp/terra-source-loading';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromium.executablePath() });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/data/flood-cities.bin', route => route.abort());
  await page.goto((process.env.URL0 || 'http://localhost:8087/') + '?lang=en#v=Conakry&an=2050&cc=GN&vs=Ouagadougou&vc=BF');
  await enter(page);
  await page.waitForFunction(label => [...document.querySelectorAll('.v-now')].filter(el => el.textContent === label).length === 6,translations.en.ui.download_failed);
  assert.equal(await page.locator('#dossier-risques').getByText(translations.en.ui.outside_usable_source_coverage, { exact: true }).count(), 0);
  await page.locator('#dossier-risques').screenshot({ path: out + '/download-failed.png' });
  await page.unroute('**/data/flood-cities.bin');
  await page.reload();
  await enter(page);
  await page.waitForFunction(() => document.querySelector('.risque[data-cle="feux"] .risk-number')?.textContent === '50.09');
  assert.equal(await page.locator('.risque[data-cle="mer"] .risk-number').innerText(), '0');
  assert.equal(await page.locator('#dossier-risques').getByText(translations.en.ui.no_estimate, { exact: true }).count(), 0);
  assert.equal(await page.locator('.risque[data-spatial="regional"]').count(), 4);
  assert.equal(await page.locator('.risque[data-value]').evaluateAll(rows => rows.filter(row => row.dataset.value !== '' && Number.isFinite(+row.dataset.value)).length), 6);
  assert.match(await page.locator('#dossier-duel').innerText(), /Ouagadougou 50/);
  assert.equal(await page.locator('.calque:disabled').count(), 0);
  assert.deepEqual(errors, []);
  await page.locator('#dossier-risques').screenshot({ path: out + '/conakry-restored.png' });
  console.log('PASS: download failure is distinct from missing coverage; reload restores Conakry and its comparison');
} finally {
  await browser.close();
}

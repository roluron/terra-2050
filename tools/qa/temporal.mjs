import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { enter } from './entrance.cjs';

const base = process.env.URL0 || 'http://localhost:8087/';
const annual = JSON.parse(fs.readFileSync(new URL('../../data/population-annual.json', import.meta.url)));
const browser = await chromium.launch({ headless: process.env.QA_HEADED !== '1',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let cases = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route(url => url.pathname === '/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('</script>\n</body>',
      `globalThis.__temporalRead=()=>({year:etat.annee,globe:uniformsGlobe.uProgression.value,readings:mesuresLieu(lieuDossier,etat.annee)});\n</script>\n</body>`);
    assert.ok(body.includes('globalThis.__temporalRead='));
    await route.fulfill({ response, body });
  });
  await page.goto(base);
  await enter(page);
  await page.waitForFunction(() => document.body.classList.contains('donnees-pretes'));
  for (const [name, iso] of [['Paris', 'FR'], ['Ho Chi Minh City', 'VN'], ['France', 'FR'], ['Ouagadougou', 'BF']]) {
    if (await page.locator('#dossier').evaluate(el => el.classList.contains('ouvert'))) await page.locator('#dossier-croix').click();
    await page.locator('#champ-recherche').fill(name);
    await page.getByRole('option', { name: name === 'France' ? /France (COUNTRY|PAYS)/ : new RegExp(name === 'Ho Chi Minh City' ? 'Ho Chi Minh' : name) }).first().click();
    await page.waitForFunction(() => !document.querySelector('#dossier').inert);
    await page.waitForTimeout(700);
    for (const year of [2026, 2030, 2038, 2050]) {
      console.log(`${name}/${year}`);
      await page.locator('#curseur').scrollIntoViewIfNeeded();
      await page.locator('#curseur').focus();
      await page.keyboard.press('Home');
      for (let y = 2026; y < year; y++) await page.keyboard.press('ArrowRight');
      await page.waitForFunction(year => document.querySelector('#dossier-annee').textContent === String(year), year);
      await page.waitForFunction(year => Math.abs(globalThis.__temporalRead().globe - (year - 2026) / 24) < .001, year);
      const state = await page.evaluate(() => ({ ...globalThis.__temporalRead(),
        population: document.querySelector('#dossier-pop').dataset.population,
        cards: [...document.querySelectorAll('#dossier-risques .risque')].map(el => ({ key: el.dataset.cle,
          value: el.dataset.value, change: el.dataset.change, unit: el.querySelector('.risk-reading small').textContent,
          number: el.querySelector('.risk-number').textContent, detail: el.querySelector('.detail').textContent })) }));
      assert.equal(state.year, year);
      assert.ok(Math.abs(state.globe - (year - 2026) / 24) < .001);
      assert.equal(Number(state.population), annual[iso][year - 2025]);
      assert.equal(state.cards.length, 6);
      for (const card of state.cards) {
        const source = state.readings[card.key];
        const label = `${name}/${year}/${card.key}`;
        if (!source?.available) {
          assert.equal(card.value, '', label);
          assert.equal(card.change, '', label);
          continue;
        }
        assert.notEqual(card.value, '', label);
        assert.notEqual(card.change, '', label);
        assert.ok(Math.abs(Number(card.value) - source.value) < 1e-6, label);
        assert.ok(Math.abs(Number(card.change) - source.change) < 1e-6, label);
        assert.ok(Math.abs(source.change - (source.value - source.baseline)) < 1e-6, label);
        if (year === 2050) assert.ok(Math.abs(source.value - source.future) < 1e-6, label);
        assert.equal(card.unit, card.key === 'eau' ? 'De Martonne' : source.unit, label);
        assert.equal(card.number, source.value.toLocaleString('en', { maximumFractionDigits: 2 }), label);
        assert.doesNotMatch(card.detail, /unvalidated proxy|fixed river|FABDEM|COAST-RP/i, label);
      }
      cases++;
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, cases, scope: 'Physical cards and annual population, four cities/country selections, 2026/2030/2038/2050', errors }));
} finally {
  await browser.close();
}

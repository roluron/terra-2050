import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium, webkit, devices } from 'playwright';
import { enter } from './entrance.cjs';

const base = process.env.URL0 || 'http://localhost:8087/';
const out = process.env.QA_SORTIE || '/Users/robinmahieux/Documents/Codex/2026-09-07/new-chat/outputs/scientific-ui';
await fs.mkdir(out, { recursive: true });
const results = [];
for (const [name, engine, options] of [
  ['desktop', chromium, { viewport: { width: 1440, height: 900 } }],
  ['mobile', webkit, { ...devices['iPhone 15 Pro'] }],
]) {
  if (process.env.QA_DEVICE && name !== process.env.QA_DEVICE) continue;
  const result = { name, started: new Date().toISOString(), failures: [], errors: [], checks: [], runtimeHashes: {} };
  const pending = [];
  const browser = await engine.launch({ executablePath: engine.executablePath(), headless: process.env.QA_HEADED !== '1' });
  const context = await browser.newContext({ ...options, locale: 'en-US',
    ...(process.env.QA_VIDEO === '1' ? { recordVideo: { dir: out, size: { width: 720, height: 450 } } } : {}) });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const check = (condition, description, evidence) => {
    if (!condition) result.failures.push({ description, evidence });
  };
  page.on('pageerror', error => result.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error' || /shader.*(error|fail)|VALIDATE_STATUS/i.test(message.text()))
      result.errors.push({ type: message.type(), message: message.text() });
  });
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (new URL(response.url()).origin === new URL(base).origin
        && (path === '/' || /(?:\.mjs|science.*\.js|climate-manifest\.json|fire-weather\.json|flood-cities\.json)$/.test(path))) {
      pending.push(response.body().then(bytes => {
        const digest = createHash('sha256').update(bytes).digest('hex');
        (result.runtimeHashes[path] ||= []).push(digest);
      }).catch(error => result.errors.push({ type: 'hash-read', path, message: error.message })));
    }
  });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await enter(page);
    await page.waitForFunction(() => document.body.classList.contains('donnees-pretes'));
    const cities = await page.evaluate(async () => {
      const { loadScientificMetrics } = await import('./science-metrics.mjs');
      const metrics = await loadScientificMetrics();
      const [places, bytes] = await Promise.all([fetch('./data/places.json').then(r => r.json()), fetch('./data/places.bin').then(r => r.arrayBuffer())]);
      const coordinates = new DataView(bytes);
      return ['Paris', 'Ouagadougou', 'Dhaka', 'Sydney'].map(name => {
        const index = places.villes.findIndex(row => row[4] === name);
        if (index < 0) throw new Error(`Missing source city ${name}`);
        const lat = coordinates.getInt16(index * 24, true) / 100, lon = coordinates.getInt16(index * 24 + 2, true) / 100;
        return { name, index, lat, lon, iso: places.villes[index][1],
          expected: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [2026 + i, metrics.forCity(index, lat, lon, 2026 + i)])) };
      });
    });
    for (const city of cities) {
      if (await page.locator('#dossier').evaluate(el => el.classList.contains('ouvert'))) await page.locator('#dossier-croix').click();
      await page.locator('#champ-recherche').fill(city.name);
      const option = page.getByRole('option').filter({ hasText: city.name }).first();
      await option.waitFor({ state: 'visible' });
      await option.click();
      await page.waitForFunction(city => document.querySelector('#dossier-nom')?.textContent === city && !document.querySelector('#dossier').inert, city.name);
      const years = name === 'desktop' && ['Paris', 'Dhaka'].includes(city.name)
        ? Array.from({ length: 25 }, (_, i) => 2026 + i) : [2026, 2030, 2038, 2050];
      for (const year of years) {
        const slider = page.locator('#curseur');
        await slider.scrollIntoViewIfNeeded();
        if (year === 2038 && name === 'desktop' && city.name === 'Ouagadougou') {
          const box = await slider.boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
          await slider.focus();
          await page.keyboard.press('Home');
          for (let i = 2026; i < year; i++) await page.keyboard.press('ArrowRight');
        }
        await page.waitForFunction(year => document.querySelector('#curseur').value === String(year)
          && document.querySelector('#dossier-annee').textContent === String(year), year);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const actual = await page.evaluate(() => ({
          score: document.querySelector('#dossier-score').textContent,
          noData: document.querySelector('#dossier').classList.contains('sans-donnees'),
          noDataExplanation: document.querySelector('#dossier-conseil').textContent,
          rows: [...document.querySelectorAll('#dossier-risques .risque')].map(el => ({
            key: el.dataset.cle, value: el.dataset.value, change: el.dataset.change, temporal: el.dataset.temporal,
            unit: el.querySelector('.risk-reading small').textContent,
            number: el.querySelector('.risk-number').textContent,
            changeLabel: el.querySelector('.risk-change').textContent,
            status: el.querySelector('.v-now').textContent, detail: el.querySelector('.detail').textContent,
          })), overflow: document.documentElement.scrollWidth > innerWidth,
        }));
        const expected = city.expected[year];
        check(actual.rows.length === 6, `${city.name}/${year}: six cards retained`, actual);
        for (const row of actual.rows) {
          const sample = expected[row.key];
          check(!!sample, `${city.name}/${year}: known axis`, row);
          if (!sample) continue;
          const label = `${city.name}/${year}/${row.key}`;
          check(sample.available ? row.value !== '' && Math.abs(Number(row.value) - sample.value) < 1e-6 : row.value === '', `${label}: source value`, { row, sample });
          check(sample.available ? row.change !== '' && Math.abs(Number(row.change) - sample.change) < 1e-6 : row.change === '', `${label}: source change`, { row, sample });
          if (sample.available) {
            const unit = row.key === 'eau' ? 'De Martonne' : sample.unit;
            check(row.unit === unit, `${label}: unit`, { expected: unit, row });
            const fmt = value => value.toLocaleString('en', { maximumFractionDigits: 2 });
            check(row.number === fmt(sample.value), `${label}: displayed rounded value`, row);
            check(row.changeLabel.startsWith(`2026: ${fmt(sample.baseline)} · `) && row.changeLabel.endsWith(unit), `${label}: fixed baseline label`, row);
            const direction = row.key === 'eau' ? sample.change < 0 ? 'Drier' : 'Wetter' : sample.change > 0 ? 'Increase' : 'Decrease';
            const status = year === 2026 ? 'Illustrative baseline' : Math.abs(sample.change) < 1e-7 ? 'Unchanged estimate' : direction;
            check(row.status === status, `${label}: direction label`, { expected: status, row });
          }
          check(!/hot\/dry.month|indice de chaleur >|heat index >|COAST-RP|FABDEM|unvalidated proxy/i.test(row.detail), `${label}: no stale proxy claim`, row.detail);
        }
        const complete = Object.values(expected).every(value => value.available);
        check(actual.noData === !complete, `${city.name}/${year}: score availability`, { complete, actual });
        if (!complete) check(!/\d/.test(actual.score), `${city.name}/${year}: unavailable score not numeric`, actual.score);
        if (!complete && city.name === 'Sydney') check(!/small island|atoll|outside the global climate grids/i.test(actual.noDataExplanation),
          `${city.name}/${year}: no-data explanation must describe partial source coverage`, actual.noDataExplanation);
        check(!actual.overflow, `${city.name}/${year}: viewport overflow`, actual);
        result.checks.push({ city: city.name, index: city.index, lat: city.lat, lon: city.lon, year, complete, ...actual });
        if (year === 2026 || year === 2050) {
          await page.locator('.fiche-corps').evaluate(el => el.scrollTop = 0);
          await page.screenshot({ path: `${out}/${name}-${city.name}-${year}.png` });
          if (city.name === 'Sydney') {
            await page.locator('#dossier-risques [data-cle="feux"]').scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${out}/${name}-${city.name}-${year}-available-cards.png` });
          }
        }
      }
    }
  } catch (error) {
    result.failures.push({ description: 'UI interaction failed', message: error.stack });
    await page.screenshot({ path: `${out}/${name}-failure.png` }).catch(() => {});
  } finally {
    await Promise.allSettled(pending);
    await context.close();
    await browser.close();
    result.pass = result.failures.length === 0 && result.errors.length === 0;
    result.finished = new Date().toISOString();
    results.push(result);
    await fs.writeFile(`${out}/scientific-ui.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ name, pass: result.pass, cases: result.checks.length,
      failures: result.failures.length, errors: result.errors, indexHashes: result.runtimeHashes['/'] }));
  }
}
process.exitCode = results.every(result => result.pass) ? 0 : 1;

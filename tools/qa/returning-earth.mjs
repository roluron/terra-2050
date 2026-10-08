import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';
import { discover } from './entrance.cjs';

const url = process.env.URL0 || 'http://127.0.0.1:8094/?lang=en';
const out = process.env.QA_SORTIE || '/tmp/terra-returning-earth';
await fs.mkdir(out, { recursive: true });
const cases = [
  ['desktop', chromium, { viewport: { width: 1440, height: 900 } }],
  ['phone', webkit, devices['iPhone 15 Pro']],
  ['landscape', webkit, { ...devices['iPhone 15 Pro'], viewport: { width: 852, height: 393 } }],
  ['reduced', chromium, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
];
for (const [name, engine, options] of cases.filter(([name]) => !process.env.QA_CASE || process.env.QA_CASE === name)) {
  const browser = await engine.launch({ headless: false });
  try {
    const context = await browser.newContext(options);
    await context.addInitScript(() => {
      localStorage.setItem('terra-intro-complete', '1');
      localStorage.setItem('terra-langue', 'en');
      window.returnFrames = [];
      window.orbDraws = 0;
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas.id === 'earth-orb') window.orbDraws++;
        return draw.apply(this, args);
      };
      let opened = false;
      function sample(now) {
        const shell = document.getElementById('earth-shell');
        if (shell?.open) opened = true;
        if (shell) window.returnFrames.push({ now, open: shell.open, veil: Number(getComputedStyle(shell).getPropertyValue('--earth-veil') || 1), ready: !!window.terraIntro?.ready(), draws: window.orbDraws });
        if (!opened || shell.open) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => console.error('request failed', request.url(), request.failure()?.errorText));
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    page.on('response', response => { if (response.status() >= 400) console.error('HTTP', response.status(), response.url()); });
    let held = false;
    await page.route('**/earth-surface.mjs', async route => {
      if (!held) { held = true; await new Promise(resolve => setTimeout(resolve, 1800)); }
      await route.continue();
    });
    const results = [];
    for (let visit = 0; visit < (process.env.QA_BASELINE ? 1 : 3); visit++) {
      if (visit) await page.reload(); else await page.goto(url);
      if (!visit) {
        await page.waitForTimeout(400);
        if (!process.env.QA_BASELINE) assert.equal(await page.locator('#boot-screen picture').isVisible(), false);
        await page.screenshot({ path: `${out}/${name}-loading.png` });
      }
      await page.waitForFunction(() => document.body.classList.contains('pret') && !document.getElementById('earth-shell').open, null, { timeout: 30000 }).catch(async error => {
        await page.screenshot({ path: `${out}/${name}-failure.png` });
        console.error(JSON.stringify({ errors, state: await page.evaluate(() => ({ ready: window.terraIntro?.ready(), body: document.body.className, recovery: document.getElementById('earth-recovery').hidden, progress: document.getElementById('jauge').textContent, resources: performance.getEntriesByType('resource').filter(resource => resource.duration > 5000).map(resource => resource.name) })) }));
        throw error;
      });
      await page.waitForFunction(() => !document.body.classList.contains('entree-chrome'));
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${out}/${name}-globe-${visit}.png` });
      const result = await page.evaluate(() => ({ frames: window.returnFrames, draws: window.orbDraws, languageOpen: document.getElementById('language-dialog').open }));
      results.push(result);
      if (!process.env.QA_BASELINE) {
        assert.equal(result.draws, 0, 'Returning visitors see the real globe without particle redraws');
        assert.equal(result.languageOpen, false);
        const open = result.frames.filter(frame => frame.open);
        assert.ok(open.length, 'Loading was sampled');
        assert.ok(open.every((frame, i) => !i || frame.veil <= open[i - 1].veil + .001), 'Reveal is monotone');
        assert.ok(open.every(frame => frame.ready || frame.veil === 1), 'Loading veil waits for readiness');
      }
    }
    await page.goto(url.split('#')[0] + '#v=Paris&an=2050&cc=FR');
    await page.waitForFunction(() => !document.getElementById('earth-shell').open && document.getElementById('dossier').classList.contains('ouvert'));
    assert.equal(await page.locator('#curseur').inputValue(), '2050');
    if (!process.env.QA_BASELINE) assert.equal(await page.evaluate(() => window.orbDraws), 0);
    assert.deepEqual(errors, []);
    await fs.writeFile(`${out}/${name}.json`, JSON.stringify({ results, errors, deepLink: true }, null, 2));
    console.log(`${name}: ${process.env.QA_BASELINE ? 'BASELINE' : 'PASS'} (${results.length} visits, draws ${results[0].draws}, deep link, no runtime errors)`);
    await context.close();
    if (name === 'desktop' && !process.env.QA_BASELINE) {
      const fresh = await browser.newPage(options);
      await fresh.goto(url);
      await discover(fresh);
      await fresh.locator('#future').click();
      await fresh.waitForFunction(() => !document.getElementById('earth-shell').open, null, { timeout: 20000 });
      assert.equal(await fresh.evaluate(() => localStorage.getItem('terra-intro-complete')), '1');
      await fresh.screenshot({ path: `${out}/first-visit-globe.png` });
      console.log('first visit: PASS (letter, transition, stored completion)');
    }
  } finally { await browser.close(); }
}

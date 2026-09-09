import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';
import { enter } from './entrance.cjs';

const out = process.env.QA_SORTIE || '/tmp/terra-globe-detail';
await fs.mkdir(out, { recursive: true });
for (const [name, engine, options, expected] of [
  ['desktop', chromium, { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 }, 8192],
  ['phone', webkit, devices['iPhone 15 Pro'], 4096],
]) {
  const browser = await engine.launch({ executablePath: engine.executablePath() });
  try {
    const page = await browser.newPage(options), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('</script>\n</body>',
        'globalThis.__detail=()=>({width:texCouleur.image.width,draws:moteur.info.render.calls});\n</script>\n</body>') });
    });
    await page.goto((process.env.URL0 || 'http://localhost:8087/') + '#v=Le%20Caire&an=2026&cc=EG');
    await enter(page);
    if (name === 'desktop') {
      const progress = await page.evaluate(async () => {
        const value = { progress: 0 };
        const tween = window.gsap.to(value, { progress: 1, duration: 1 });
        for (let frame = 0; frame < 4; frame++) {
          await new Promise(requestAnimationFrame);
          const until = performance.now() + 600;
          while (performance.now() < until) {}
        }
        await new Promise(requestAnimationFrame);
        tween.kill();
        return value.progress;
      });
      assert.equal(progress, 1, 'Transitions finish in real time after slow frames');
    }
    await page.waitForFunction(width => globalThis.__detail().width === width, expected);
    await page.locator('#dossier-nom').waitFor({ state: 'visible' });
    await page.locator('#dossier-story').focus();
    await page.locator('#dossier .fiche-methode summary').focus();
    const bounds = await page.evaluate(() => {
      const panel = document.querySelector('#dossier'), body = panel.querySelector('.fiche-corps');
      const p = panel.getBoundingClientRect(), title = document.querySelector('#dossier-nom').getBoundingClientRect();
      const footer = panel.querySelector('.actions').getBoundingClientRect(), b = body.getBoundingClientRect();
      return { scroll: panel.scrollTop, titleTop: title.top, panelTop: p.top, footerBottom: footer.bottom,
        panelBottom: p.bottom, bodyBottom: b.bottom, footerTop: footer.top, bodyScroll: body.scrollTop };
    });
    assert.equal(bounds.scroll, 0, JSON.stringify(bounds));
    assert.ok(bounds.titleTop >= bounds.panelTop && bounds.footerBottom <= bounds.panelBottom, JSON.stringify(bounds));
    assert.ok(bounds.bodyBottom <= bounds.footerTop + 1 && bounds.bodyScroll > 0, JSON.stringify(bounds));
    await page.screenshot({ path: `${out}/${name}-bottom.png` });
    await page.locator('.fiche-corps').evaluate(el => { el.scrollTop = 0; });
    await page.locator('#dossier-croix').focus();
    await page.screenshot({ path: `${out}/${name}-top.png` });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ name, pass: true, texture: expected, bounds }));
  } finally { await browser.close(); }
}

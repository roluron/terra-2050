import fs from 'node:fs';
import { chromium } from 'playwright';
const out = new URL('file://' + fs.mkdtempSync('/tmp/terra-probe-') + '/');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromium.executablePath() });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(process.env.URL0 || 'http://localhost:8080/');
  await page.waitForSelector('#voile.pret'); await page.click('#bouton-entree');
  await page.waitForTimeout(2000);
  await page.click('#champ-recherche'); await page.fill('#champ-recherche', 'Paris');
  await page.getByRole('option').filter({ hasText: 'Paris' }).first().click();
  await page.waitForTimeout(4000);
  await page.locator('#curseur').focus(); await page.keyboard.press('Home'); await page.waitForTimeout(800);
  await page.screenshot({ path: new URL('2026.png', out).pathname });
  await page.keyboard.press('End'); await page.waitForTimeout(800);
  await page.screenshot({ path: new URL('2050.png', out).pathname });
  await page.click('#dossier-croix'); await page.waitForTimeout(2500);
  for (const layer of await page.locator('.calque[data-cle]').all()) {
    await layer.click(); await page.waitForTimeout(200);
    if (await page.locator('#pedago').isVisible()) await page.click('#pedago-fermer');
  }
  await page.locator('#curseur').focus(); await page.keyboard.press('End');
  await page.waitForTimeout(5000);
  const sample = await page.evaluate(() => new Promise(resolve => {
    const frames = [], longTasks = [], start = performance.now();
    let previous = null;
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration }))));
    observer.observe({ type: 'longtask' });
    function frame(now) {
      if (previous !== null) frames.push(now - previous); previous = now;
      if (now - start < 8000) requestAnimationFrame(frame);
      else { observer.disconnect(); resolve({ frames, longTasks, duration: now - start }); }
    }
    requestAnimationFrame(frame);
  }));
  const result = { browser: await browser.version(), viewport: '1440x900 DPR1',
    workload: '7 layers enabled, year 2050, 5s warmup, 8s frame sample',
    source: 'PERF-REPORT.md: desktop 60 FPS and zero steady-state tasks over 50ms',
    fps: sample.frames.length / (sample.frames.reduce((a, b) => a + b, 0) / 1000), ...sample };
  fs.writeFileSync(new URL('sample.json', out), JSON.stringify(result, null, 2));
  await page.screenshot({ path: new URL('all-layers.png', out).pathname });
  console.log(JSON.stringify({ ...result, frames: `${result.frames.length} raw intervals in sample.json` }));
  if (result.fps < 60 || result.longTasks.length) process.exitCode = 1;
} finally { await browser.close(); }

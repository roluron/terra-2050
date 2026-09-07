import assert from 'node:assert/strict';
import {chromium, webkit, devices} from 'playwright';
import {enter} from './entrance.cjs';

for (const [name, engine, options] of [['desktop',chromium,{viewport:{width:1440,height:900}}],['phone',webkit,devices['iPhone 15 Pro']]]) {
  const browser = await engine.launch({executablePath:engine.executablePath()});
  try {
    const page = await browser.newPage(options), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      const body = (await response.text()).replace('</script>\n</body>', `globalThis.__polish=()=>({texture:texCouleur.image.width,heat:matAtmo.uniforms.uProgression.value,time:matAtmo.uniforms.uTemps.value,draws:moteur.info.render.calls});\n</script>\n</body>`);
      await route.fulfill({response,body});
    });
    await page.goto((process.env.URL0 || 'http://localhost:8087/') + '#v=Dacca&an=2050&cc=BD');
    await enter(page);
    await page.waitForFunction(() => globalThis.__polish().texture === 4096);
    const meters = await page.locator('.risk-meter').evaluateAll(elements => elements.map(el => {
      const track=el.getBoundingClientRect(), marker=el.querySelector('i').getBoundingClientRect();
      return marker.top >= track.top && marker.bottom <= track.bottom;
    }));
    assert.ok(meters.every(Boolean), 'Gauge endpoints remain inside their tracks');
    assert.equal(await page.locator('.risque[data-cle="mer"] .risk-number').innerText(), '100');
    await page.locator('.risque[data-cle="mer"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/terra-polish-${name}-risk.png`});
    assert.equal(await page.locator('[data-t="betaNotice"]').evaluate(el => /beta|bêta/i.test(el.textContent)), false);
    await page.locator('#dossier-comparer').click();
    assert.match(await page.locator('#champ-recherche').getAttribute('placeholder'), /Dhaka|Dacca/);
    assert.equal(await page.locator('#champ-recherche').inputValue(), '');
    await page.locator('#champ-recherche').fill('Paris');
    await page.locator('#resultats li').filter({hasText:'Paris'}).first().click();
    await page.waitForTimeout(2200);
    assert.match(await page.locator('#dossier-duel').innerText(), /Dhaka|Dacca/);
    assert.match(await page.locator('#dossier-duel').innerText(), /Paris/);
    await page.screenshot({path:`/tmp/terra-polish-${name}.png`});
    await page.locator('#dossier-croix').click();
    await page.waitForTimeout(2200);
    if (name === 'phone') {
      const rail = await page.locator('#calques').evaluate(el => ({client:el.clientWidth,scroll:el.scrollWidth,bottom:el.getBoundingClientRect().bottom,height:innerHeight}));
      assert.ok(rail.scroll > rail.client && rail.bottom < rail.height, 'Phone filters scroll horizontally inside viewport');
    }
    await page.screenshot({path:`/tmp/terra-polish-${name}-home.png`});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({name,pass:true,render:await page.evaluate(()=>globalThis.__polish())}));
  } finally { await browser.close(); }
}

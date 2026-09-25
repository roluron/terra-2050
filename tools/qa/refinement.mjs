import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, webkit, devices } from 'playwright';
import { discover } from './entrance.cjs';
import { moistureBand } from '../../refinement-copy.mjs';

assert.deepEqual([0,5,10,20,30,60,61].map(value=>moistureBand(value,'en')), ['Desert climate','Arid climate','Semi-dry climate','Moderately wet climate','Wet climate','Wet climate','Very wet climate']);
assert.equal(moistureBand(NaN,'en'),'');
assert.equal(moistureBand(-1,'en'),'');

const output = process.env.QA_SORTIE || '/tmp/terra-refinement';
fs.mkdirSync(output, {recursive:true});
for (const [name, engine, options] of [
  ['desktop', chromium, {viewport:{width:1440,height:900},deviceScaleFactor:2}],
  ['phone', webkit, {...devices['iPhone 15 Pro'],reducedMotion:'reduce'}]
]) {
  const browser = await engine.launch({executablePath:engine.executablePath(), headless:false});
  try {
    const page = await browser.newPage(options), errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
    await page.goto((process.env.URL0 || 'http://127.0.0.1:8088/') + '?lang=en');
    await page.locator('#language-dialog').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#language-dialog').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(5, 7, 7)'); // premium.css #050707 depuis a9462fd
    await page.screenshot({path:`${output}/${name}-language.png`});
    if (name === 'desktop') {
      await page.locator('#language-options label').filter({hasText:'Français'}).hover();
      await page.keyboard.press('Enter');
      await page.locator('#language-dialog').waitFor({state:'hidden'});
      assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
    } else {
      await page.locator('#language-options input[value="en"]').tap();
      await page.locator('#language-options input:checked').tap();
    }
    await discover(page);
    await page.locator('#future').click();
    await page.waitForFunction(() => !document.getElementById('earth-shell').open, null, {timeout:25000});
    await page.waitForTimeout(2000);
    await page.screenshot({path:`${output}/${name}-globe.png`});
    assert.equal(await page.locator('#bouton-son').getAttribute('class').then(c => c.includes('actif')), false);
    assert.equal(await page.evaluate(() => window.Howler._muted), true);
    await page.waitForFunction(() => document.body.classList.contains('donnees-pretes'));
    await page.locator('#champ-recherche').fill('New York');
    await page.getByRole('option').filter({hasText:'New York'}).first().click();
    await page.waitForFunction(() => document.querySelector('[data-cle="thermique"].risque')?.dataset.value);
    assert.doesNotMatch(await page.locator('#dossier-verdict-txt').innerText(), /No data|Sans données/i);
    assert.equal(await page.locator('.risque[data-cle="fleuves"]').getAttribute('data-spatial'), 'regional');
    await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('dossier')).opacity) >= .99);
    await page.screenshot({path:`${output}/${name}-new-york.png`});
    await page.locator('#dossier-comparer').click();
    await page.locator('#comparison-search').fill('San');
    await page.locator('#comparison-search').press('ArrowUp');
    assert.equal(await page.locator('#comparison-search').getAttribute('aria-activedescendant'), await page.locator('#comparison-results [role="option"]').last().getAttribute('id'));
    await page.locator('#comparison-search').fill('Ho Chi Minh');
    await page.locator('#comparison-search').press('ArrowDown');
    await page.locator('#comparison-search').press('Enter');
    assert.equal(await page.locator('#city-comparison tbody tr').count(), 7);
    assert.equal(await page.locator('#city-comparison td[data-value]').count(), 12);
    assert.equal(await page.locator('#city-comparison .moisture-band').count(), 2);
    const before = await page.locator('#city-comparison td[data-metric="thermique"]').first().getAttribute('data-value');
    await page.locator('#comparison-year').press('End');
    const after = await page.locator('#city-comparison td[data-metric="thermique"]').first().getAttribute('data-value');
    assert.notEqual(before, after);
    assert.equal(await page.locator('#curseur').inputValue(), '2050');
    await page.waitForURL(/an=2050/);
    await page.screenshot({path:`${output}/${name}-comparison.png`});
    const heads = await page.locator('#city-comparison thead th').allTextContents();
    await page.locator('.compare-swap').click();
    const swapped = await page.locator('#city-comparison thead th').allTextContents();
    assert.equal(heads[1], swapped[2]); assert.equal(heads[2], swapped[1]);
    await page.locator('.compare-close').click();
    assert.equal(await page.locator('#city-comparison').isVisible(), false);
    await page.locator('#dossier-comparer').click();
    await page.locator('#comparison-search').press('ArrowDown');
    assert.equal(await page.locator('#comparison-search').getAttribute('aria-expanded'), 'false');
    await page.locator('.compare-close').click();
    await page.locator('#bouton-reglages').click();
    await page.locator('#bouton-son').click();
    assert.equal(await page.evaluate(() => window.Howler._muted), false);
    assert.equal(await page.evaluate(() => window.Howler.volume()), 1);
    const locale = await page.locator('html').getAttribute('lang');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#voile').classList.contains('pret'));
    assert.equal(await page.evaluate(() => window.Howler._muted), true);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}: entrance, input, letter, transition, muted globe, New York coverage, comparison, timeline, swap`);
  } finally { await browser.close(); }
}

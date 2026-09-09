import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';
import { translations } from '../../locales/catalog.mjs';
import { discover, enter, welcome, chooseLanguage } from './entrance.cjs';

const url = process.env.URL0 || 'http://localhost:8087/';
const out = process.env.QA_SORTIE || '/tmp/terra-languages';
await fs.mkdir(out, {recursive:true});
for (const [name, engine, options] of [
  ['desktop', chromium, {viewport:{width:1440,height:900}}],
  ['phone', webkit, {...devices['iPhone 15 Pro'], reducedMotion:'reduce'}],
]) {
  const browser = await engine.launch({executablePath:engine.executablePath()});
  try {
    for (const code of ['en','fr','ja','zh','vi','es','it']) {
      const page = await browser.newPage(options), errors = [], text = translations[code];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url + '?lang=en#v=Le%20Caire&an=2050&cc=EG');
      await page.locator('#language-dialog').waitFor();
      assert.equal(await page.locator('#earth-letter-main').isVisible(), false);
      await page.locator(`#language-options input[value="${code}"]`).check();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.language-content')).opacity === '1');
      await page.screenshot({path:`${out}/${name}-${code}-welcome.png`});
      if (code === 'en') {
        await page.locator('#language-options input:checked').focus();
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        if (name === 'phone') {
          await page.setViewportSize({width:320,height:568});
          await page.locator('#language-continue').scrollIntoViewIfNeeded();
          assert.ok(await page.locator('.language-content').evaluate(el => el.getBoundingClientRect().right <= innerWidth));
          await page.screenshot({path:`${out}/phone-compact-welcome.png`});
          await page.setViewportSize(options.viewport);
        }
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#language-dialog').isVisible(), true);
      await welcome(page);
      assert.equal(await page.locator('html').getAttribute('lang'), code);
      assert.equal(await page.locator('#earth-shell h1').textContent(), text.ui.letterTitle);
      await discover(page);
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#future')).opacity) > .99);
      await page.locator('#earth-shell h1').click();
      await page.locator('#earth-shell').evaluate(el => {el.scrollTop=0;});
      assert.ok(await page.locator('#earth-shell').evaluate(el => el.scrollWidth <= el.clientWidth));
      assert.ok(await page.locator('.word').evaluateAll(words => words.every(word => word.getBoundingClientRect().width < innerWidth-40)));
      await page.screenshot({path:`${out}/${name}-${code}-letter.png`});
      await enter(page);
      await page.locator('#dossier.ouvert').waitFor();
      const historyState = await page.evaluate(() => history.state);
      await page.locator('#bouton-reglages').click();
      await chooseLanguage(page, code === 'en' ? 'fr' : 'en');
      await chooseLanguage(page, code);
      assert.deepEqual(await page.evaluate(() => history.state), historyState);
      if (await page.locator('#bouton-reglages').getAttribute('aria-expanded') === 'true') await page.locator('#bouton-reglages').click();
      assert.equal(await page.locator('#dossier-comparer').textContent(), text.comparer);
      assert.equal(await page.locator('.fiche-temps-label').textContent(), text.panelYear);
      await page.waitForFunction(() => document.querySelector('[data-cle="feux"] .risk-number')?.textContent !== '—');
      assert.equal(await page.locator('#dossier-risques [data-cle="feux"] small').textContent(), text.ui.daysyear);
      await page.screenshot({path:`${out}/${name}-${code}-risks.png`});
      await page.locator('#dossier .fiche-methode summary').click();
      assert.ok((await page.locator('#dossier .fiche-methode').textContent()).includes(text.panelMethodText));
      await page.screenshot({path:`${out}/${name}-${code}-panel.png`});
      const panel = await page.locator('#dossier').evaluate(el => ({top:el.scrollTop, width:el.scrollWidth, client:el.clientWidth}));
      assert.equal(panel.top, 0);
      assert.deepEqual(await page.locator('#dossier').evaluate(el => [...el.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>el.getBoundingClientRect().right+2).map(n=>n.id || n.className)), []);
      assert.ok(!/undefined|NaN/.test(await page.locator('#dossier').innerText()));
      await page.locator('#dossier-story').click();
      await page.locator('#story-partager').waitFor({state:'visible'});
      await page.waitForFunction(() => document.querySelector('#story-partager').getAttribute('aria-busy') === 'false');
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.story-carte')).opacity) > .99);
      assert.equal(await page.locator('#story-titre').textContent(), text.storyTitre);
      await page.screenshot({path:`${out}/${name}-${code}-story.png`});
      await page.goto(url + '?lang=toString');
      await page.locator('#language-dialog').waitFor();
      assert.equal(await page.locator('#language-options input:checked').inputValue(), code);
      assert.equal(await page.locator('html').getAttribute('lang'), code);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(JSON.stringify({name, code, pass:true}));
    }
  } finally {await browser.close();}
}

import assert from 'node:assert/strict';
import {chromium, devices} from 'playwright';
import {welcome, enter} from './entrance.cjs';

const browser = await chromium.launch({headless:true, executablePath:process.env.QA_CHROMIUM_PATH,
  args:['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const url = process.env.URL0 || 'http://localhost:8080/';
const profiles = [
  ['desktop', {viewport:{width:1280,height:720}, reducedMotion:'no-preference'}],
  ['phone', {...devices['iPhone 15 Pro'], reducedMotion:'no-preference'}],
  ['reduced', {viewport:{width:320,height:568}, reducedMotion:'reduce'}]
];
const decoded = page => page.locator('#earth-shell .revealing, #earth-shell .revealed').count();
async function attemptEarlyReveal(page) {
  await page.locator('#earth-shell .word').first().evaluate(word => {
    word.dispatchEvent(new PointerEvent('pointerenter'));
    word.dispatchEvent(new PointerEvent('pointerdown'));
    word.focus();
    word.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    word.dispatchEvent(new KeyboardEvent('keydown', {key:' ', bubbles:true}));
  });
}
try {
  for (const [name, options] of profiles) {
    const page = await browser.newPage(options), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '?lang=fr', {waitUntil:'domcontentloaded'});
    await page.locator('#language-dialog').waitFor();
    await welcome(page);
    const first = page.locator('#earth-shell .word').first();
    if (name !== 'reduced') {
      const rect = await first.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForTimeout(1400); // Reproduce interaction after the old one-second grace.
      await page.mouse.move(rect.x + rect.width / 2 + 1, rect.y + rect.height / 2);
      await attemptEarlyReveal(page);
      assert.equal(await decoded(page), 0, `${name}: hover, tap, focus and keys stay locked during arrival`);
      assert.equal(await first.getAttribute('tabindex'), '-1');
      if (name === 'desktop') {
        // The cancelled French animation must not unlock a newly built English letter.
        await page.evaluate(async () => (await import('./i18n.mjs')).setLanguage('en'));
        await page.waitForTimeout(6000);
        assert.equal(await page.locator('#earth-shell').evaluate(el => el.classList.contains('interaction-ready')), false);
        await attemptEarlyReveal(page);
        assert.equal(await decoded(page), 0, 'language rebuild keeps the new final line protected');
      }
    }
    await page.waitForSelector('#earth-shell.interaction-ready', {timeout:name === 'reduced' ? 2000 : 15000});
    const opacities = await page.locator('#earth-shell h1, #letter p').evaluateAll(lines => lines.map(line => Number(getComputedStyle(line).opacity)));
    assert.ok(opacities.every(opacity => opacity >= .999), `${name}: every line has finished appearing`);
    await page.waitForTimeout(250);
    assert.equal(await decoded(page), 0, `${name}: a resting pointer never auto-decodes`);
    assert.equal(await first.getAttribute('tabindex'), '0');
    if (options.hasTouch) await first.tap();
    else {
      const rect = await first.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    }
    await page.waitForFunction(() => document.querySelector('#earth-shell .revealing, #earth-shell .revealed'));
    await enter(page);
    assert.equal(await page.locator('#earth-shell').evaluate(el => el.open), false);
    assert.deepEqual(errors, [], `${name}: no runtime errors`);
    console.log(`PASS ${name}: arrival gate, fresh interaction, full reveal and globe entry`);
    await page.close();
  }
  const page = await browser.newPage({reducedMotion:'no-preference'});
  await page.goto(url + '?lang=fr');
  await page.locator('#language-dialog').waitFor();
  await welcome(page);
  assert.equal(await page.locator('#earth-shell').evaluate(el => el.classList.contains('interaction-ready')), false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForSelector('#earth-shell.interaction-ready', {timeout:2000});
  assert.equal(await decoded(page), 0);
  console.log('PASS: changing reduced-motion during arrival unlocks without decoding');
  await page.close();
} finally {
  await browser.close();
}

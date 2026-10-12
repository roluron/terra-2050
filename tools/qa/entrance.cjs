exports.welcome = async function(page) {
  if (await page.locator('#language-dialog').isVisible()) {
    await page.locator('#language-options input:checked').click();
    await page.locator('#language-dialog').waitFor({state:'hidden'});
  }
};
exports.chooseLanguage = async function(page, code) {
  if (await page.locator('#bouton-reglages').getAttribute('aria-expanded') !== 'true') await page.locator('#bouton-reglages').click();
  await page.locator('#bouton-langue').click();
  await page.locator(`#language-options input[value="${code}"]`).click();
  await page.locator('#language-dialog').waitFor({state:'hidden'});
};
exports.openSearch = async function(page) {
  const input = page.locator('#champ-recherche');
  if (await input.getAttribute('aria-hidden') === 'true') await page.locator('#explore-city').click();
  await input.click();
  return input;
};
exports.chooseFilter = async function(page, key) {
  const filter = page.locator(`.calque[data-cle="${key}"]`);
  if (!await filter.isVisible()) await page.locator('#map-toggle').click();
  await filter.click();
};
exports.discover = async function(page) {
  await page.waitForSelector('#voile.pret', { state: 'attached', timeout: 30000 });
  await exports.welcome(page);
  await page.waitForSelector('#earth-shell.interaction-ready');
  for (const word of await page.locator('#earth-shell .word').all()) await word.focus();
  await page.waitForSelector('#earth-shell.complete');
};
exports.enter = async function(page, repeated = false) {
  const returning = await page.locator('html').evaluate(el => el.classList.contains('returning-visit'));
  if (!returning) {
    await exports.discover(page);
    await page.locator('#future').click();
    if (repeated) {
      await page.locator('#future').dispatchEvent('click');
      await page.locator('#future').dispatchEvent('click');
    }
  }
  await page.waitForFunction(() => !document.getElementById('earth-shell').open, null, { timeout: 20000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.calque')].every(el => !el.style.opacity && !el.style.transform)).catch(async error => {
    console.error('Unfinished filter entrance', await page.evaluate(() => ({
      visibility: document.visibilityState,
      filters: [...document.querySelectorAll('.calque')].map(el => ({key: el.dataset.cle, style: el.getAttribute('style')})),
      animations: window.gsap?.globalTimeline.getChildren().filter(t => t.isActive()).map(t => ({time:t.time(), duration:t.duration(), targets:t.targets?.().map(el => el.id || el.className || typeof el)}))
    })));
    throw error;
  });
};
exports.injectModule = (html, code) => {
  const start = html.indexOf('<script type="module">');
  const end = html.indexOf('</script>', start);
  if (start < 0 || end < 0) throw new Error('Inline module fixture target missing');
  return html.slice(0, end) + '\n' + code + '\n' + html.slice(end);
};

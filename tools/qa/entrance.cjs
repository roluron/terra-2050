exports.discover = async function(page) {
  await page.waitForSelector('#voile.pret', { state: 'attached', timeout: 30000 });
  for (const word of await page.locator('#earth-shell .word').all()) await word.focus();
  await page.waitForSelector('#earth-shell.complete');
};
exports.enter = async function(page, repeated = false) {
  await exports.discover(page);
  await page.locator('#future').click();
  if (repeated) {
    await page.locator('#future').dispatchEvent('click');
    await page.locator('#future').dispatchEvent('click');
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

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
  await page.waitForFunction(() => [...document.querySelectorAll('.calque')].every(el => !el.style.opacity && !el.style.transform));
};

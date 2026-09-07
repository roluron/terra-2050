import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright';

const url = process.env.URL0 || 'http://localhost:8080/';
const out = process.env.QA_SORTIE || fs.mkdtempSync(os.tmpdir() + '/terra-sharing-');
fs.mkdirSync(out, { recursive: true });
const results = [];
for (const [name, type, options, native] of [
  ['download', chromium, { viewport: { width: 1440, height: 900 } }, false],
  ['native-contract', webkit, devices['iPhone 15 Pro'], true],
]) {
  const browser = await type.launch({ executablePath: type.executablePath() });
  try {
    const context = await browser.newContext(options);
    await context.addInitScript(native => {
      window.qaShares = [];
      Object.defineProperty(navigator, 'canShare', { value: () => native });
      Object.defineProperty(navigator, 'share', { value: async data => {
        const file = data.files[0];
        const img = new Image(); img.src = URL.createObjectURL(file); await img.decode();
        window.qaShares.push({ name: file.name, type: file.type, size: file.size,
          width: img.naturalWidth, height: img.naturalHeight, text: data.text });
        URL.revokeObjectURL(img.src);
      } });
    }, native);
    const page = await context.newPage();
    await page.goto(url); await page.waitForSelector('#voile.pret');
    await page.click('#bouton-entree'); await page.waitForTimeout(1500);
    await page.click('#champ-recherche'); await page.fill('#champ-recherche', 'Paris');
    await page.getByRole('option').filter({ hasText: 'Paris' }).first().click();
    await page.click('#dossier-story');
    const year = await page.locator('#curseur').inputValue();
    await page.waitForFunction(() => !document.querySelector('#story-partager').disabled);
    await page.waitForTimeout(4200);
    assert.equal(await page.locator('#curseur').inputValue(), year, 'Year changed after preview opened');
    if (native) {
      await page.click('#story-partager');
      await page.waitForFunction(() => window.qaShares.length === 1);
      const share = await page.evaluate(() => window.qaShares[0]);
      assert.equal(share.width, 1080); assert.equal(share.height, 1920);
      assert.equal(share.type, 'image/jpeg'); assert.ok(share.size > 10000);
      assert.ok(share.text.includes(`an=${year}`));
      results.push({ name, pass: true, year, share, limitation: 'Native OS and Instagram are not exercised by this adapter test.' });
    } else {
      const downloadEvent = page.waitForEvent('download');
      await page.click('#story-partager'); const download = await downloadEvent;
      assert.equal(await download.failure(), null);
      const path = `${out}/${download.suggestedFilename()}`;
      await download.saveAs(path);
      assert.ok(fs.statSync(path).size > 10000);
      results.push({ name, pass: true, year, file: path, size: fs.statSync(path).size });
    }
  } catch (error) { results.push({ name, pass: false, error: error.message }); }
  finally { await browser.close(); }
  console.log(JSON.stringify(results.at(-1)));
  fs.writeFileSync(`${out}/sharing.json`, JSON.stringify(results, null, 2));
}
process.exitCode = results.some(r => !r.pass) ? 1 : 0;

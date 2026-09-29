// Parcours complet (lettre → globe → réglages → filtres → recherche → fiche →
// comparaison) sur les formats qui cassaient : téléphone paysage (la loupe
// captait le toucher), tablette portrait (fiche trop étroite pour deux
// cartes), fenêtre basse de portable Windows. Aucun débordement horizontal,
// aucune erreur de page, chaque étape doit aboutir.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {discover} from './entrance.cjs';

const URL0 = process.env.URL0 || 'http://localhost:8087/';
const PROFILS = [
  ['iphone-se', {viewport:{width:375,height:667}, deviceScaleFactor:2, isMobile:true, hasTouch:true}],
  ['iphone-paysage', {viewport:{width:852,height:393}, deviceScaleFactor:2, isMobile:true, hasTouch:true}],
  ['ipad-mini-portrait', {viewport:{width:744,height:1133}, deviceScaleFactor:1, isMobile:true, hasTouch:true}],
  ['pc-1366', {viewport:{width:1366,height:768}}],
  ['portable-bas', {viewport:{width:1280,height:620}}],
];

const browser = await chromium.launch();
try {
  for (const [nom, options] of PROFILS) {
    const page = await browser.newPage({...options, locale:'fr-FR'}), erreurs = [];
    page.on('pageerror', e => erreurs.push(e.message));
    const etape = async (label, fn) => {
      try { await fn(); }
      catch (e) {
        await page.screenshot({path:`/tmp/terra-device-${nom}-${label}.png`}).catch(() => {});
        throw new Error(`${nom} / ${label} : ${e.message.split('\n')[0]}`);
      }
      const debord = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(debord <= 0, `${nom} / ${label} : debordement horizontal de ${debord}px`);
    };
    await page.goto(URL0);
    await etape('lettre', () => discover(page));
    await etape('globe', async () => {
      await page.locator('#future').click();
      await page.waitForFunction(() => !document.getElementById('earth-shell').open, null, {timeout:20000});
    });
    await etape('reglages', async () => {
      await page.locator('#bouton-reglages').click();
      await page.keyboard.press('Escape');
    });
    await etape('filtres', async () => {
      if (await page.locator('#map-toggle').isVisible()) {
        await page.locator('#map-toggle').click();
        await page.locator('#map-toggle').click();
      }
    });
    await etape('recherche', async () => {
      await page.locator('#champ-recherche').click({timeout:10000});
      await page.locator('#champ-recherche').fill('Paris');
      await page.locator('#resultats [role=option]').first().waitFor();
    });
    await etape('fiche', async () => {
      await page.locator('#resultats [role=option]').first().click({timeout:10000});
      await page.waitForSelector('#dossier', {state:'visible'});
      // l'unite d'une carte de risque ne sort jamais de sa carte
      await page.waitForFunction(() => document.querySelector('#dossier .risque .risk-reading'));
      const deborde = await page.locator('#dossier .risque').evaluateAll(cartes => cartes.filter(c => {
        const r = c.getBoundingClientRect(), l = c.querySelector('.risk-reading')?.getBoundingClientRect();
        return l && (l.right > r.right + 1);
      }).length);
      assert.equal(deborde, 0, `${nom} : une valeur de risque deborde de sa carte`);
    });
    await etape('comparaison', async () => {
      await page.locator('#dossier-comparer').scrollIntoViewIfNeeded();
      await page.locator('#dossier-comparer').click({timeout:10000});
      await page.locator('#comparison-search').waitFor();
    });
    assert.deepEqual(erreurs, [], `${nom} : erreurs de page`);
    console.log(JSON.stringify({nom, pass:true}));
    await page.close();
  }
} finally { await browser.close(); }

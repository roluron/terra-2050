import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { enter } from './entrance.cjs';
import { createGlobalSummary } from '../../global-summary.mjs';
import { summarizeText, summaryCopy } from '../../global-summary-copy.mjs';
import { historicalFilters } from '../../map-value-context.mjs';

const output = process.env.QA_SORTIE || '/tmp/terra-historical-headlines';
await mkdir(output, { recursive: true });
const root = new URL('../../', import.meta.url), file = path => readFile(new URL(path, root));
const floats = bytes => new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const climate = { metadata: JSON.parse(await file('data/climate-manifest.json')),
  values: floats(gunzipSync(await file('data/climate-grid.bin'))) };
const climateCoverage = new Uint8Array(gunzipSync(await file('data/climate-coverage.bin')));
const fire = { metadata: JSON.parse(await file('data/fire-weather.json')), values: floats(await file('data/fire-weather.bin')) };
const floodMeta = JSON.parse(await file('data/flood-metadata.json')), floods = {};
for (const hazard of ['coast', 'river']) floods[hazard] = { metadata: { ...floodMeta, ...floodMeta.hazards[hazard] },
  values: floats(gunzipSync(await file(`data/flood-${hazard}.bin`))) };
const population = JSON.parse(await file('data/population-annual.json'));
const expectedSummary = await createGlobalSummary({ climate, climateCoverage, fire, floods, population, yieldTask: async () => {} });
const filters = ['chaleur', 'secheresse', 'feux', 'mer', 'fleuves', 'declin', 'stabilite'];
const selectedFilters = process.env.QA_FILTERS ? filters.filter(filter => process.env.QA_FILTERS.split(',').includes(filter)) : filters;
assert.ok(selectedFilters.length, 'No valid filters selected');
const report = { profiles: [], headlines: [], defaults: [], checks: [], captures: [],
  limitations: 'Chromium headless with SwiftShader and mobile emulation at 393/320 px; no physical Safari/iPhone verification. Numeric formulas are independently checked in tools/qa/global-summary.mjs.' };
if (process.env.QA_APPEND === '1') {
  Object.assign(report, JSON.parse(await readFile(output + '/ui-summary.json', 'utf8')));
  delete report.status;
}
const browser = await chromium.launch({ headless: true,
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let activePage = null, context = 'initialization';
try {
  for (const [profile, options] of [['desktop', { viewport: { width: 1280, height: 800 } }],
    ['mobile', { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true }],
    ['compact', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }]]) {
    if (process.env.QA_PROFILE && process.env.QA_PROFILE !== profile) continue;
    if (process.env.QA_PROFILES && !process.env.QA_PROFILES.split(',').includes(profile)) continue;
    const page = await browser.newPage({ ...options, reducedMotion: 'reduce' }), errors = [], shaderErrors = [];
    activePage = page;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /WebGLProgram|shader|GLSL|INVALID_OPERATION|summary unavailable/i.test(message.text())) shaderErrors.push(message.text()); });
    await page.route('**/global-summary.mjs', async route => {
      const response = await route.fetch(), source = await response.text();
      assert.ok(source.includes('export async function createGlobalSummary('));
      const body = source.replace('export async function createGlobalSummary(', 'async function originalCreateGlobalSummary(') + `
        export async function createGlobalSummary(input) {
          globalThis.__summaryConstructionCount = (globalThis.__summaryConstructionCount || 0) + 1;
          const summary = await originalCreateGlobalSummary(input);
          return Object.freeze({reading(...args) {
            globalThis.__summaryReadCount = (globalThis.__summaryReadCount || 0) + 1;
            return summary.reading(...args);
          }});
        }`;
      await route.fulfill({ response, body });
    });
    await page.route('**/*', async route => {
      if (route.request().resourceType() !== 'document') return route.fallback();
      const response = await route.fetch(), html = await response.text(), marker = '</script>\n</body>';
      assert.ok(html.includes(marker));
      const body = html.replace(marker, `
        globalThis.__summaryAudit={
          ready:()=>!!globalSummary&&!!SCIENCE&&!!FIRE_WEATHER&&!!FLOOD_HAZARDS&&!!PAYS_RASTER,
          state:()=>({filter:filtreSurvol,year:etat.annee,langue,
            mode:uniformsGlobe.uReference.value>.5?'reference':uniformsGlobe.uChange.value>.5?'change':'value',
            layerStrength:CALQUES[filtreSurvol]?.uniforme.value,
            progression:etat.progression,
            controls:Object.fromEntries([...document.querySelectorAll('[data-map-mode]')].map(el=>[el.dataset.mapMode,el.getAttribute('aria-pressed')])),
            constructionCount:globalThis.__summaryConstructionCount,readCount:globalThis.__summaryReadCount}),
          frames:()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),
          align:async(lat=35,lon=15,distance=3.1)=>{
            cacherSurvol();arreterVolCamera();controles.autoRotate=false;controles.enableDamping=false;controles.update();
            camera.position.copy(latLonVersVec3(lat,lon,distance));camera.lookAt(0,0,0);controles.update();camera.updateMatrixWorld();majEtiquettes();
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          },
          show:(s,x=100,y=150,pinned=false)=>montrerSurvol(s,x,y,pinned),
          hide:()=>cacherSurvol(),
          city:()=>ouvrirDossier(LIEUX.find(l=>l[1]==='VN'&&l[0].includes('Minh'))||LIEUX.find(l=>l[1]==='FR')),
          closeCity:()=>fermerDossier(true),
          shader:()=>({error:moteur.getContext().getError(),failedPrograms:moteur.info.programs.filter(p=>p.diagnostics&&!p.diagnostics.runnable).map(p=>p.name),programs:moteur.info.programs.length})
        };
      </script>\n</body>`);
      await route.fulfill({ response, body });
    });
    context = profile + ' entrance';
    await page.goto((process.env.URL0 || 'http://localhost:8080/') + '?lang=en');
    await enter(page);
    await page.waitForFunction(() => globalThis.__summaryAudit?.ready(), null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(4, 4);
    const summary = page.locator('#filter-summary'), state = () => page.evaluate(() => __summaryAudit.state());
    const act = selector => options.hasTouch ? page.locator(selector).tap() : page.locator(selector).click();
    const closeSettings = async () => {
      if (await page.locator('#bouton-reglages').getAttribute('aria-expanded') === 'true') await act('#bouton-reglages');
    };
    const chooseLocale = async locale => {
      if ((await state()).langue === locale) return;
      if (await page.locator('#bouton-reglages').getAttribute('aria-expanded') !== 'true') await act('#bouton-reglages');
      await act('#bouton-langue'); await act(`#language-options input[value="${locale}"]`);
      await page.locator('#language-dialog').waitFor({ state: 'hidden' }); await closeSettings();
    };
    const openMenu = async () => {
      if (await page.locator('#map-toggle').getAttribute('aria-expanded') !== 'true') await act('#map-toggle');
    };
    const closeMenu = async () => {
      if (await page.locator('#map-toggle').getAttribute('aria-expanded') === 'true') await act('#map-toggle');
    };
    const filter = async key => {
      if ((await state()).filter === key) return;
      await openMenu();
      assert.equal(await summary.isVisible(), false, context + ' filter menu hides headline');
      await act(`.calque[data-cle="${key}"]`);
      if (await page.locator('#pedago').isVisible()) {
        assert.equal(await summary.isVisible(), false, context + ' pedagogy hides headline');
        await act('#pedago-fermer'); await page.locator('#pedago').waitFor({ state: 'hidden' });
      }
    };
    const mode = async key => { await openMenu(); await act(`[data-map-mode="${key}"]`); await closeMenu(); };
    const year = async value => { await page.locator('#curseur').fill(String(value)); await page.evaluate(() => __summaryAudit.frames()); };
    const snapshot = () => page.evaluate(() => {
      const summary = document.getElementById('filter-summary'), headline = summary.querySelector('.summary-headline'), reference = summary.querySelector('.summary-reference'), detail = summary.querySelector('.summary-detail');
      const rect = el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
      return { headline: headline.textContent, reference: reference.textContent, referenceHidden: reference.hidden, detail: detail.textContent, hidden: summary.hidden,
        bounds: rect(summary), headlineBounds: rect(headline), referenceBounds: rect(reference), detailBounds: rect(detail),
        filterBounds: rect(document.getElementById('map-inspector')), timelineBounds: rect(document.getElementById('timeline')),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        headlineOverflow: headline.scrollWidth > headline.clientWidth + 1, detailOverflow: detail.scrollWidth > detail.clientWidth + 1,
        viewport: {width:innerWidth,height:innerHeight} };
    });
    const validate = async (key, y, locale) => {
      const expected = summarizeText(key, expectedSummary.reading(key, y), locale, y), actual = await snapshot();
      report.lastSnapshot = { context, ...actual };
      assert.equal(await summary.isVisible(), true, context + ' headline visible');
      assert.equal(actual.headline, expected.headline, context + ' headline value');
      assert.equal(actual.reference, expected.reference || '', context + ' visible historical reference');
      assert.equal(actual.referenceHidden, !expected.reference, context + ' reference visibility');
      assert.equal(actual.detail, expected.detail, context + ' historical definition');
      assert.ok(actual.detailBounds.width <= actual.headlineBounds.width + 1, context + ' detail wraps within headline width');
      if (expected.reference) assert.ok(actual.referenceBounds.width <= actual.headlineBounds.width + 1, context + ' reference wraps within headline width');
      assert.equal(actual.overflow, false, context + ' page overflow');
      assert.equal(actual.headlineOverflow, false, context + ' headline overflow');
      assert.equal(actual.detailOverflow, false, context + ' detail overflow');
      const b = actual.bounds, v = actual.viewport;
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= v.width + 1 && b.y + b.height <= v.height + 1, context + ' headline fits viewport');
      for (const control of [actual.filterBounds, actual.timelineBounds]) {
        const horizontalOverlap = b.x < control.x + control.width && b.x + b.width > control.x;
        if (horizontalOverlap) assert.ok(b.y + b.height <= control.y + 1, context + ' headline clears adjacent bottom controls');
      }
      assert.ok(!/[{}]|undefined|NaN/.test(actual.headline + actual.detail), context + ' resolved copy');
      return actual;
    };
    const capture = async name => {
      await closeSettings(); await closeMenu(); await page.mouse.move(4, 4);
      await page.waitForFunction(() => __summaryAudit.state().layerStrength > .999);
      await page.waitForFunction(() => Math.abs(__summaryAudit.state().progression - (__summaryAudit.state().year - 2026) / 24) < .001);
      await page.waitForFunction(() => ['#titre', '#recherche', '#bouton-reglages', '#map-inspector', '#timeline .an', '#timeline .regle'].every(selector => {
        const el = document.querySelector(selector), rect = el.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) return false;
        for (let parent = el; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) < .99) return false;
        }
        return true;
      }));
      await page.evaluate(() => __summaryAudit.frames());
      assert.equal(await summary.isVisible(), true, context + ' screenshot summary visible');
      const path = `${output}/${profile}-${name}.png`;
      await page.screenshot({ path }); if (!report.captures.includes(path)) report.captures.push(path);
      report.checks = report.checks.filter(item => item.capture !== path);
      report.checks.push({capture:path,chrome:await page.evaluate(() => Object.fromEntries(['#titre','#recherche','#bouton-reglages','#map-inspector','#timeline .an','#timeline .regle'].map(selector => {
        const style = getComputedStyle(document.querySelector(selector));
        return [selector,{opacity:style.opacity,visibility:style.visibility,display:style.display}];
      })))});
    };
    assert.equal((await state()).filter, null, profile + ' starts with no filter');
    assert.equal(await summary.isVisible(), false, profile + ' no filter hides summary');
    assert.equal((await state()).constructionCount, 1, profile + ' one summary construction');
    const localesToRun = process.env.QA_PROOF_ONLY === '1' ? [] : process.env.QA_CAPTURE_ONLY === '1' ? ['en', 'fr'] : Object.keys(summaryCopy);
    for (const locale of localesToRun) {
      await chooseLocale(locale);
      for (const key of selectedFilters) {
        context = `${profile}/${locale}/${key}`; await filter(key);
        const defaultMode = historicalFilters.has(key) ? 'reference' : 'value';
        const s = await state();
        assert.equal(s.mode, defaultMode, context + ' default shader mode');
        assert.equal(s.controls[defaultMode], 'true', context + ' default control');
        if (locale === 'en') {
          report.defaults = report.defaults.filter(item => !(item.profile === profile && item.filter === key));
          report.defaults.push({ profile, filter: key, mode: s.mode });
        }
        for (const y of process.env.QA_CAPTURE_ONLY === '1' ? [key === 'declin' ? 2050 : 2026] : [2026, 2050]) {
          context = `${profile}/${locale}/${key}/${y}`; await year(y);
          const actual = await validate(key, y, locale);
          report.headlines = report.headlines.filter(item => !(item.profile === profile && item.locale === locale && item.filter === key && item.year === y));
          report.headlines.push({ profile, locale, filter: key, year: y, ...actual });
          const afterRefresh = await state(); await page.evaluate(() => __summaryAudit.frames());
          const afterFrames = await state();
          assert.equal(afterFrames.readCount, afterRefresh.readCount, context + ' no summary calculation every frame');
          assert.equal(afterFrames.constructionCount, 1, context + ' no rebuilding after year/language');
          if (['en', 'fr'].includes(locale) && (y === 2026 && ['chaleur', 'feux', 'secheresse', 'fleuves'].includes(key)
              || y === 2050 && key === 'declin')) await capture(`${locale}-${key}-${y}`);
          if (profile === 'compact' && locale === 'vi' && key === 'feux' && y === 2050) await capture('vi-feux-2050');
        }
        if (profile === 'compact') {
          await openMenu(); assert.equal(await summary.isVisible(), false, context + ' compact menu hides summary');
          const bounds = await page.locator('#map-options').boundingBox();
          assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 321 && bounds.y + bounds.height <= 569, context + ' compact menu bounds');
          assert.equal(await page.locator('#map-options').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, context + ' compact menu no overflow');
          if (locale === 'fr' && key === 'feux') {
            await page.locator('.map-scale small').first().scrollIntoViewIfNeeded();
            const path = `${output}/compact-fr-fire-reference-menu.png`; await page.screenshot({path}); if (!report.captures.includes(path)) report.captures.push(path);
          }
          await closeMenu();
        }
      }
      console.log(`PASS ${profile}/${locale}: ${selectedFilters.length} filters × ${process.env.QA_CAPTURE_ONLY === '1' ? 1 : 2} years, historical references and headline bounds`);
    }
    // An intentional mode is remembered across filters, years and language;
    // the headline still uses its fixed scientific historical reference.
    context = profile + ' remembered choices'; await chooseLocale('en'); await filter('chaleur'); await year(2026);
    await mode('change'); await validate('chaleur', 2026, 'en');
    await filter('secheresse'); await mode('value');
    await filter('chaleur'); assert.equal((await state()).mode, 'change');
    await year(2050); await chooseLocale('fr'); assert.equal((await state()).mode, 'change'); await validate('chaleur', 2050, 'fr');
    await filter('secheresse'); assert.equal((await state()).mode, 'value'); await validate('secheresse', 2050, 'fr');
    await filter('chaleur'); await mode('reference'); await year(2026);
    await act('#bouton-reglages'); assert.equal(await summary.isVisible(), false, context + ' settings hide summary');
    await closeSettings(); assert.equal(await summary.isVisible(), true, context + ' summary returns after settings');
    await page.evaluate(() => __summaryAudit.city());
    assert.equal(await summary.isVisible(), false, context + ' city sheet hides summary');
    await page.evaluate(() => __summaryAudit.closeCity());
    await page.waitForFunction(() => !document.body.classList.contains('dossier-ouvert'));
    assert.equal(await summary.isVisible(), true, context + ' summary returns after city sheet');
    await page.evaluate(() => __summaryAudit.align(35, 15, 3.1));
    await capture('fr-heat-2026-europe-africa-zoom');
    // Keep the local hover visible alongside the global headline for evidence.
    await page.mouse.move(4, 4);
    await page.evaluate(pinned => __summaryAudit.show({iso:'SA',lat:25,lon:45},80,100,pinned), !!options.hasTouch);
    assert.equal(await page.locator('#survol').isVisible(), true, context + ' hover visible in capture');
    assert.equal(await summary.isVisible(),!options.hasTouch,context+' mobile pin replaces the summary');
    await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('survol')).opacity) > .99);
    await page.evaluate(() => __summaryAudit.frames());
    const path = `${output}/${profile}-fr-heat-2026-local-and-global.png`; await page.screenshot({path}); if (!report.captures.includes(path)) report.captures.push(path);
    await page.evaluate(() => __summaryAudit.hide());
    assert.equal(await summary.isVisible(),true,context+' unpin restores the summary');
    await openMenu(); await act('.calque[data-cle="chaleur"]');
    assert.equal(await summary.isVisible(), false, context + ' disabling filter hides summary');
    const shader = await page.evaluate(() => __summaryAudit.shader());
    assert.equal(shader.error, 0, profile + ' WebGL error'); assert.deepEqual(shader.failedPrograms, [], profile + ' compiled programs');
    assert.ok(shader.programs > 0); assert.deepEqual(errors, [], profile + ' page errors'); assert.deepEqual(shaderErrors, [], profile + ' shader/summary errors');
    report.profiles = report.profiles.filter(item => item.profile !== profile);
    report.profiles.push({ profile, viewport: options.viewport, constructionCount: (await state()).constructionCount,
      shader, rememberedModes: true, yearAndLocaleRefresh: true, noPerFrameSummary: true,
      filterAndMenuAndSettingsAndCityHide: true, errors, shaderErrors });
    await writeFile(output + '/ui-summary.json', JSON.stringify(report, null, 2));
    console.log(`PASS ${profile}: remembered change/value modes, popup/menu hiding, zoom and GL programs`);
    await page.close(); activePage = null;
  }
  await writeFile(output + '/ui-summary.json', JSON.stringify({ status: 'PASS', ...report }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', profiles: report.profiles.length, defaults: report.defaults.length,
    headlines: report.headlines.length, captures: report.captures.length, output }, null, 2));
} catch (error) {
  if (activePage) await activePage.screenshot({ path: output + '/failure.png' }).catch(() => {});
  await writeFile(output + '/ui-summary-failure.json', JSON.stringify({ context, error: error.message, ...report }, null, 2));
  throw new Error(context + ': ' + error.message, { cause: error });
} finally { await browser.close(); }

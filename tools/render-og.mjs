import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { enter } from './qa/entrance.cjs';

// Rebuild the sharing image from production globe shaders and a fresh HTML
// composition. Run npm run dev first, then node tools/render-og.mjs.
// QA_URL overrides the local preview; QA_CHROMIUM_PATH selects a browser.
const width = 1200, height = 630;
const preview = new URL(process.env.QA_URL || 'http://127.0.0.1:8080/');
preview.searchParams.set('lang', 'en');
const output = new URL('../assets/fromearth-projections.jpg', import.meta.url);
const browser = await chromium.launch({ headless: true,
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch(), html = await response.text();
    const boundary = '</script>\n</body>';
    assert.ok(html.includes(boundary), 'Expected production inline-module boundary');
    const hook = `
      globalThis.__renderOgGlobe = async () => {
        cancelAnimationFrame(compteurImages);
        gsap.killTweensOf(camera.position);
        controles.autoRotate = false;
        controles.enableDamping = false;
        camera.position.copy(latLonVersVec3(20, -80, 3.8));
        camera.lookAt(0, 0, 0);
        controles.update();
        camera.aspect = 1200 / 630;
        camera.setViewOffset(1200, 630, -300, 0, 1200, 630);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        // Fix the texture resolution, camera, time and neutral 2026 state.
        const image = new Image();
        image.src = './assets/textures/earth_color_2048.webp';
        await image.decode();
        texCouleur.dispose();
        texCouleur.image = image;
        texCouleur.needsUpdate = true;
        for (const layer of Object.values(CALQUES)) layer.uniforme.value = 0;
        uniformsGlobe.uIndice.value = 0;
        uniformsGlobe.uProgression.value = 0;
        uniformsGlobe.uTemps.value = 0;
        matAtmo.uniforms.uProgression.value = 0;
        matAtmo.uniforms.uIntensite.value = 1;
        for (const child of scene.children) child.visible = child === globe || child.material === matAtmo;
        moteur.setPixelRatio(1);
        moteur.setSize(1200, 630);
        moteur.setClearColor(0x000000, 1);
        moteur.setRenderTarget(null);
        moteur.render(scene, camera);
        const failed = moteur.info.programs.filter(program => program.diagnostics && !program.diagnostics.runnable);
        if (failed.length) throw new Error('Production globe shader did not compile');
        return toile.toDataURL('image/png');
      };
    `;
    await route.fulfill({ response, body: html.replace(boundary, `${hook}\n${boundary}`) });
  });
  await page.goto(preview.href, { waitUntil: 'domcontentloaded' });
  await enter(page);
  await page.waitForFunction(() => typeof globalThis.__renderOgGlobe === 'function');
  const globeImage = await page.evaluate(() => globalThis.__renderOgGlobe());
  await page.evaluate(async source => {
    const style = document.createElement('style');
    style.textContent = `
      html,body { width:1200px!important; height:630px!important; margin:0!important;
        overflow:hidden!important; background:#000!important; }
      body > :not(#og-composition) { visibility:hidden!important; }
      body::before,body::after { display:none!important; }
      #og-composition { position:fixed; inset:0; width:1200px; height:630px; z-index:2147483647;
        overflow:hidden; background:#000; color:#F5F7FA; font-family:'TWK Lausanne',sans-serif;
        -webkit-font-smoothing:antialiased; }
      #og-globe { position:absolute; inset:0; width:1200px; height:630px; }
      #og-brand { position:absolute; left:66px; top:52px; display:flex; align-items:baseline; gap:.18em;
        font-size:44px; line-height:1; font-weight:300; }
      #og-brand .brand-name { letter-spacing:-.04em; }
      #og-brand .brand-year { letter-spacing:-.035em; }
      #og-brand em { font-style:normal; color:#1740A9; }
      #og-brand strong { font-weight:600; }
      #og-credit { position:absolute; left:68px; bottom:24px; display:grid; gap:6px; font-size:13px; color:rgba(245,247,250,.70); }
      #og-credit p { margin:0; }
      #og-credit a { color:inherit; text-decoration:none; }
      #og-heading { position:absolute; left:66px; top:181px; margin:0; width:530px;
        font-size:68px; line-height:.99; font-weight:400; letter-spacing:-3px; }
      #og-count { position:absolute; left:68px; top:429px; font-size:21px; font-weight:400;
        letter-spacing:-.25px; color:#F5F7FA; }
      #og-disclosure { position:absolute; left:68px; top:483px; width:457px; margin:0;
        font-size:18px; line-height:1.45; font-weight:400; letter-spacing:-.2px;
        color:rgba(245,247,250,.70); }
    `;
    document.head.append(style);
    const composition = document.createElement('main');
    composition.id = 'og-composition';
    composition.innerHTML = `
      <img id="og-globe" alt="Earth globe" />
      <div id="og-brand" aria-label="fromearth / 2050"><span class="brand-name">from<strong>earth</strong></span><em>/</em><span class="brand-year">2050</span></div>
      <h1 id="og-heading">Explore<br>climate<br>projections</h1>
      <p id="og-count">7 indicators · 34,099 cities</p>
      <p id="og-disclosure">Model estimates and an experimental index. Assumptions and source limits are disclosed.</p>
      <div id="og-credit"><p>From an idea by Robin M.</p><p>Created by <a href="https://fromanother.love">fromanother</a></p></div>
    `;
    document.body.append(composition);
    const image = document.getElementById('og-globe');
    image.src = source;
    await image.decode();
    await Promise.all([...composition.querySelectorAll('img:not(#og-globe)')].map(img=>img.decode()));
    await Promise.all(['400 68px "TWK Lausanne"','300 44px "TWK Lausanne"','600 44px "TWK Lausanne"'].map(font=>document.fonts.load(font)));
    await document.fonts.ready;
  }, globeImage);
  assert.deepEqual(errors, [], 'No browser errors during native-globe generation');
  const layout = await page.locator('#og-composition').evaluate(element => ({
    width: element.offsetWidth, height: element.offsetHeight,
    disclosure: element.querySelector('#og-disclosure').getBoundingClientRect().toJSON(),
  }));
  assert.equal(layout.width, width); assert.equal(layout.height, height);
  assert.ok(layout.disclosure.bottom <= height - 24, 'Disclosure fits within the image');
  await mkdir(new URL('../assets/', import.meta.url), { recursive: true });
  await page.locator('#og-composition').screenshot({ path: fileURLToPath(output), type: 'jpeg', quality: 93,
    animations: 'disabled', caret: 'hide', scale: 'css' });
  console.log(`Rendered ${fileURLToPath(output)} (${width} × ${height})`);
} finally {
  await browser.close();
}

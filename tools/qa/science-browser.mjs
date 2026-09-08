import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch(engine === chromium ? { executablePath: chromium.executablePath() } : {});
  try {
    const page = await browser.newPage();
    await page.goto(process.env.URL0 || 'http://localhost:8087/', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(async () => {
      const { loadFireWeather, loadFloodHazards, loadWorldClim, fireAtYear, climateAtYear, sampleGrid } = await import('./climate-data.mjs');
      const start = performance.now();
      const [fire, floods, climate] = await Promise.all([loadFireWeather(), loadFloodHazards(), loadWorldClim()]);
      return {
        milliseconds: Math.round(performance.now() - start),
        fireNear: fireAtYear(fire, 48.85, 2.35, 2026).value,
        fireFuture: fireAtYear(fire, 48.85, 2.35, 2050).value,
        sahara: fireAtYear(fire, 25, 10, 2050),
        coastBytes: floods.coast.values.byteLength,
        riverBytes: floods.river.values.byteLength,
        river: sampleGrid(floods.river, 23.81, 90.41),
        climateBytes: climate.values.byteLength + climate.points.byteLength,
        climate: sampleGrid(climate, 48.85, 2.35),
        climateYears: [2026, 2030, 2040, 2050].map(year => climateAtYear(climate, 48.85, 2.35, year)),
      };
    });
    assert.ok(Math.abs(result.fireNear - 27.77857142857143) < .001);
    assert.ok(Math.abs(result.fireFuture - 36.371428571428574) < .001);
    assert.equal(result.sahara, null);
    assert.ok(result.river.coverage > 0);
    assert.ok(result.river.future_mean_depth_m_p50 >= 0);
    assert.ok(result.climate.future_summerMaximum > result.climate.near_summerMaximum);
    assert.ok(result.climate.future_aridity < result.climate.near_aridity);
    assert.equal(result.climateYears[3].summerMaximum, result.climate.future_summerMaximum);
    assert.ok(result.climateYears[0].summerMaximum < result.climateYears[3].summerMaximum);
    for (const sample of result.climateYears) assert.equal(sample.aridity, sample.precipitation / (sample.temperature + 10));
    delete result.climateYears;
    delete result.river;
    delete result.climate;
    console.log(engine.name(), JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

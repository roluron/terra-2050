import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { enter } from '../../../tools/qa/entrance.cjs';

const browser = await chromium.launch({ executablePath: process.env.QA_CHROMIUM_PATH || '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace('</script>\n</body>', `
      globalThis.__firePopulationReady=()=>SCIENCE && PAYS_RASTER && Object.keys(PAYS_POP).length === 237;
      globalThis.__firePopulationAudit=()=>{
        let annualValues=0, populationTexels=0, fireTexels=0, fireCityYears=0;
        for(const [iso, series] of Object.entries(PAYS_POP)) for(let year=2025;year<=2050;year++){
          if(populationAnnuelle(iso,year)!==series[year-2025])throw Error('Population reader '+iso+' '+year);
          annualValues++;
        }
        const populationPixels=uniformsGlobe.uPopulation.value.image.data;
        PAYS_ISO.forEach((iso,index)=>{
          for(let year=2025;year<=2050;year++){
            const series=PAYS_POP[iso],offset=((year-2025)*256+index)*4;
            const decline=series?Math.min(1,Math.max(0,(1-series[year-2025]/series[0])/.30)):0;
            const change=series?1-series[year-2025]/series[1]:0;
            if(Math.abs(populationPixels[offset]-decline)>1e-6 || Math.abs(populationPixels[offset+1]-change)>1e-6
                || populationPixels[offset+3] !== (series?1:0))throw Error('Population texture '+iso+' '+year);
            populationTexels++;
          }
        });
        const firePixels=uniformsGlobe.uFireWeather.value.image.data,grid=SCIENCE.fire;
        for(let row=0;row<72;row++)for(let col=0;col<144;col++){
          const offset=(row*144+col)*8,target=((71-row)*144+col)*4;
          const valid=Number.isFinite(grid.values[offset+1])&&Number.isFinite(grid.values[offset+2]);
          const expected=valid?[grid.values[offset+1],grid.values[offset+2],grid.values[offset+6],1]:[0,0,0,0];
          expected.forEach((value,i)=>{if(firePixels[target+i]!==THREE.DataUtils.toHalfFloat(value))throw Error('Fire texture '+row+' '+col+' '+i);});
          fireTexels++;
        }
        for(const city of LIEUX)for(const year of [2026,2038,2050]){
          const index=SOURCE_INDEX.get(city);if(!Number.isInteger(index))continue;
          const reading=SCIENCE.forCity(index,city[2],city[3],year).feux;
          const row=Math.min(71,Math.floor((90-city[2])/180*72));
          const col=Math.floor((((city[3]+180)%360+360)%360)/360*144),offset=(row*144+col)*8;
          const near=grid.values[offset+1],future=grid.values[offset+2],valid=Number.isFinite(near)&&Number.isFinite(future);
          if(reading.available!==valid)throw Error('Fire city availability '+city[0]+' '+year);
          if(valid && Math.abs(reading.value-(near+(future-near)*(year-2026)/24))>1e-6)throw Error('Fire city value '+city[0]+' '+year);
          fireCityYears++;
        }
        return {annualValues,populationTexels,fireTexels,fireCityYears,paletteEntries:PAYS_ISO.length,
          samples:{GF:paysSous(4,-53),GP:paysSous(16.25,-61.5833333333333),RE:paysSous(-21.12,55.53),YT:paysSous(-12.82,45.166),GI:paysSous(36.14,-5.35)}};
      };
    </script>\n</body>`);
    assert.notEqual(body, await response.text(), 'QA hooks must be injected');
    await route.fulfill({ response, body });
  });
  await page.goto(process.env.URL0 || 'http://localhost:8080/?lang=en');
  await enter(page);
  await page.waitForFunction(() => globalThis.__firePopulationReady(), null, { timeout: 90000 });
  const result = await page.evaluate(() => globalThis.__firePopulationAudit());
  assert.equal(result.annualValues, 6162);
  assert.equal(result.populationTexels, 249 * 26);
  assert.equal(result.fireTexels, 10368);
  assert.equal(result.fireCityYears, 34099 * 3);
  assert.equal(result.paletteEntries, 249);
  assert.deepEqual(result.samples, { GF: 'GF', GP: 'GP', RE: 'RE', YT: 'YT', GI: null });
  assert.deepEqual(errors, []);
  const report = { pass: true, ...result, browser: 'Chromium', scope: 'All city fire values at three years, all population annual readers and palette/year texture cells, all fire texture cells, and real loaded raster territory lookups.' };
  fs.writeFileSync(new URL('browser-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

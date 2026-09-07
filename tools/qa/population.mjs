import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {enter} from './entrance.cjs';

const annual=JSON.parse(fs.readFileSync(new URL('../../data/population-annual.json',import.meta.url)));
const browser=await chromium.launch({executablePath:chromium.executablePath()});
try {
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    if(route.request().resourceType()!=='document')return route.continue();
    const response=await route.fetch();
    const body=(await response.text()).replace('</script>\n</body>',`
      globalThis.__populationReady=()=>uniformsGlobe.uPopulation.value!==texVide;
      globalThis.__populationAudit=async expected=>{
        let values=0,texels=0;
        for(const [iso,years] of Object.entries(expected))for(let y=0;y<26;y++){
          if(populationAnnuelle(iso,2025+y)!==years[y])throw Error('Annual value '+iso+' '+y);
          values++;
        }
        const pixels=uniformsGlobe.uPopulation.value.image.data;
        PAYS_ISO.forEach((iso,i)=>{
          for(let y=0;y<26;y++){
            const offset=(y*256+i)*4,a=expected[iso];
            const value=a?Math.round(Math.min(1,Math.max(0,(1-a[y]/a[0])/.30))*255):0;
            if(pixels[offset]!==value || pixels[offset+3]!== (a?255:0))throw Error('Population texture '+iso+' '+y);
            texels++;
          }
        });
        const texts=[],original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...args){texts.push(text);return original.call(this,text,...args);};
        try{await genererStory({population:true});}finally{CanvasRenderingContext2D.prototype.fillText=original;}
        return {values,texels,texts};
      };
    </script>\n</body>`);
    await route.fulfill({response,body});
  });
  await page.goto((process.env.URL0||'http://localhost:8087/')+'#v=Paris&an=2026&cc=FR');
  await enter(page);await page.waitForFunction(()=>globalThis.__populationReady());
  for(const year of [2026,2038,2050]){
    await page.locator('#curseur').fill(String(year));
    await page.waitForTimeout(600);
    const result=await page.evaluate(expected=>globalThis.__populationAudit(expected),annual);
    assert.equal(result.values,6162);
    assert.ok(result.texts.includes(`EXPERIMENTAL CLIMATE INDEX ${year}`));
    assert.ok(result.texts.includes('MODELLED INDICATORS · NOT A LOCAL FORECAST'));
    const label=`Country population · 2025 → ${year}`;
    const i=result.texts.indexOf(label);assert.ok(i>=0,label);
    const delta=Math.round((annual.FR[year-2025]/annual.FR[0]-1)*100);
    assert.equal(result.texts[i+1],`${delta>0?'+':delta<0?'−':''}${Math.abs(delta)} %`);
    assert.equal(Number(await page.locator('#dossier-pop').getAttribute('data-population')),annual.FR[year-2025]);
    console.log(JSON.stringify({year,annualValues:result.values,mapTexels:result.texels,storyPopulation:result.texts[i+1],pass:true}));
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }

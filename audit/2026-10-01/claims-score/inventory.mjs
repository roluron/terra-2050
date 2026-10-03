import fs from 'node:fs/promises';
import {translations} from '../../../locales/catalog.mjs';
import {refinementCopy} from '../../../refinement-copy.mjs';
import {hoverCopy} from '../../../hover-diagnostic.mjs';
import {replacements} from './copy-recommendations.mjs';

const languages=Object.keys(translations);
const targets=[
  {id:'habitability-intro', severity:'publication-claim',key:'sous2',value:t=>t.sous2,
   render:'index.html:228, [data-t=sous2], initial loader; no scientific limitations shown there',
   proposed:'sous2'},
  {id:'habitability-document-title',severity:'publication-claim',key:'ui.terra2050_will_your_city_still',value:t=>t.ui.terra2050_will_your_city_still,
   render:'index.html:3320, traduire() document.title; also OG/Twitter hardcoded at lines 12 and 24',proposed:'title'},
  {id:'wrong-country-indicator-population',severity:'active-incorrect-description',key:'ui.populationweighted_mean_of_listed_cities',value:t=>t.ui.populationweighted_mean_of_listed_cities,
   render:'index.html:2315,2330 country per-axis cards; city-comparison.mjs:58 country cells. mesuresLieu() takes available cities independently for each axis, not only cities with all six.',
   proposed:'populationweighted_mean_of_listed_cities'},
  {id:'old-population-source',severity:'active-attribution',key:'infoSource.declin',value:t=>t.infoSource.declin,
   render:'index.html:3275, first-use pedagogical source line. Current population pipeline directly imports UN; Our World in Data is not current numeric provenance.',proposed:'infoSourceDeclin'},
  {id:'country-hover-vs-local-map',severity:'active-spatial-metric-mismatch',key:'hoverCopy[locale][0..1]',
   value:(_t,lang)=>(hoverCopy[lang]||hoverCopy.en).slice(0,2),
   render:'index.html:3793–3804, country physicalHover; spatial scope differs for all six climate layers, and flood unit m differs from map fraction/pp.',proposed:null},
];
const inventory=targets.map(target=>({...target,value:undefined,
  locales:Object.fromEntries(languages.map(lang=>[lang,{current:target.value(translations[lang],lang),
    ...(target.proposed?{suggested:replacements[lang][target.proposed]}:{})}]))}));
const disclosure=Object.fromEntries(languages.map(lang=>[lang,{
  panelMethodText:translations[lang].panelMethodText,
  panelScenario:translations[lang].panelScenario,
  panelDataLimits:translations[lang].panelDataLimits,
  period:refinementCopy(lang).period,
}]));
await fs.writeFile(new URL('active-copy-inventory.json',import.meta.url),JSON.stringify({
  baseRevision:'57a0757d101a51206ba9758cfb59cbe45e0d35b2',languages,inventory,disclosure,
  scientificCaveat:'Read-only communication review. An accurate implementation does not validate local predictions or the custom composite index.'
},null,2)+'\n');
console.log(`Inventory written for ${languages.length} languages and ${inventory.length} active claim targets.`);

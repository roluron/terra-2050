import { refinementCopy, experienceCopy } from './refinement-copy.mjs';
import { warmingCopy } from './hover-diagnostic.mjs';

// Value mode uses the meaning of each stored metric. Only warming and
// population are differences from a reference; physical levels stay levels.
const references = {
  en: {
    fire: 'Threshold: local 95th FWI percentile, 1850–1899',
    flood: 'Valid source cells >0.5 m · 1-in-100-year flood',
    population: 'National population · Compared with 2025',
    populationValue: 'Change since 2025',
    populationHint: 'Annual UN medium projection. Colours show decline since 2025; the tooltip also reports growth.',
  },
  fr: {
    fire: 'Seuil : 95e percentile local de FWI, 1850–1899',
    flood: 'Cellules sources valides >0,5 m · Crue centennale',
    population: 'Population nationale · Par rapport à 2025',
    populationValue: 'Évolution depuis 2025',
    populationHint: 'Projection annuelle ONU, variante moyenne. Les couleurs indiquent le déclin depuis 2025 ; l’infobulle indique aussi les hausses.',
  },
  it: {
    fire: 'Soglia: 95º percentile locale FWI, 1850–1899',
    flood: 'Celle sorgente valide >0,5 m · Evento centennale',
    population: 'Popolazione nazionale · Rispetto al 2025',
    populationValue: 'Variazione dal 2025',
    populationHint: 'Proiezione annuale ONU, variante media. I colori mostrano il calo dal 2025; il tooltip indica anche la crescita.',
  },
  es: {
    fire: 'Umbral: percentil 95 local de FWI, 1850–1899',
    flood: 'Celdas de origen válidas >0,5 m · Evento centenario',
    population: 'Población nacional · Respecto a 2025',
    populationValue: 'Cambio desde 2025',
    populationHint: 'Proyección anual ONU, variante media. Los colores muestran el descenso desde 2025; la información emergente también indica el crecimiento.',
  },
  vi: {
    fire: 'Ngưỡng: phân vị FWI thứ 95 tại địa phương, 1850–1899',
    flood: 'Ô dữ liệu gốc hợp lệ >0,5 m · Lũ chu kỳ 100 năm',
    population: 'Dân số quốc gia · So với năm 2025',
    populationValue: 'Thay đổi từ 2025',
    populationHint: 'Dự báo dân số hằng năm của LHQ, phương án trung bình. Màu thể hiện mức giảm từ năm 2025; chú giải cũng hiển thị mức tăng.',
  },
  ja: {
    fire: 'しきい値：地域のFWIの95パーセンタイル、1850～1899年',
    flood: '浸水深0.5m超の有効な元データ格子 · 100年に1度の洪水',
    population: '国の人口 · 2025年との比較',
    populationValue: '2025年からの変化',
    populationHint: '国連の年次人口推計、中位推計。色は2025年からの減少を示し、ツールチップは増加も表示します。',
  },
  zh: {
    fire: '阈值：当地FWI第95百分位数，1850–1899年',
    flood: '有效原始网格浸水深度>0.5米 · 百年一遇洪水',
    population: '全国人口 · 相对于2025年',
    populationValue: '相对2025年的变化',
    populationHint: '联合国年度人口预测，中位方案。颜色表示相较2025年的下降；提示框也显示增长。',
  },
  'zh-Hant': {
    fire: '閾值：當地FWI第95百分位數，1850–1899年',
    flood: '有效原始網格浸水深度>0.5公尺 · 百年一遇洪水',
    population: '全國人口 · 相對於2025年',
    populationValue: '相對2025年的變化',
    populationHint: '聯合國年度人口推估，中位方案。顏色表示相較2025年的下降；提示框也顯示增長。',
  },
};

export function mapValueContext(filter, locale, year) {
  if (filter === 'stabilite') return warmingCopy[locale] || warmingCopy.en;
  const words = references[locale] || references.en;
  if (filter === 'declin') return {
    value: words.populationValue, reference: words.population, hint: words.populationHint,
  };
  const copy = refinementCopy(locale), guide = experienceCopy(locale);
  const reference = {
    chaleur: copy.summary[0],
    secheresse: `De Martonne · ${copy.humid}`,
    feux: words.fire,
    mer: words.flood,
    fleuves: words.flood,
  }[filter];
  return { value: guide.value.replace('{year}', year), reference: reference || '',
    hint: guide.valueHint.replace('{year}', year) };
}

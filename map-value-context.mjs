import { refinementCopy, experienceCopy } from './refinement-copy.mjs';
import { warmingCopy } from './hover-diagnostic.mjs';
import {readingCopy} from './reading-copy.mjs';

// Value mode uses the meaning of each stored metric. Only warming and
// population are differences from a reference; physical levels stay levels.
const references = {
  en: {
    fire: 'Threshold: local preindustrial 95th FWI percentile',
    flood: 'Valid source cells >0.5 m · 1-in-100-year flood',
    population: 'National population · Compared with 2025',
    populationValue: 'Change since 2025',
    populationHint: 'Annual UN medium projection. Colours show decline since 2025; the tooltip also reports growth.',
  },
  fr: {
    fire: 'Seuil : 95e percentile local de FWI préindustriel',
    flood: 'Cellules sources valides >0,5 m · Crue centennale',
    population: 'Population nationale · Par rapport à 2025',
    populationValue: 'Évolution depuis 2025',
    populationHint: 'Projection annuelle ONU, variante moyenne. Les couleurs indiquent le déclin depuis 2025 ; l’infobulle indique aussi les hausses.',
  },
  it: {
    fire: 'Soglia: 95º percentile locale FWI preindustriale',
    flood: 'Celle sorgente valide >0,5 m · Evento centennale',
    population: 'Popolazione nazionale · Rispetto al 2025',
    populationValue: 'Variazione dal 2025',
    populationHint: 'Proiezione annuale ONU, variante media. I colori mostrano il calo dal 2025; il tooltip indica anche la crescita.',
  },
  es: {
    fire: 'Umbral: percentil 95 local de FWI preindustrial',
    flood: 'Celdas de origen válidas >0,5 m · Evento centenario',
    population: 'Población nacional · Respecto a 2025',
    populationValue: 'Cambio desde 2025',
    populationHint: 'Proyección anual ONU, variante media. Los colores muestran el descenso desde 2025; la información emergente también indica el crecimiento.',
  },
  vi: {
    fire: 'Ngưỡng: phân vị FWI thứ 95 tại địa phương thời tiền công nghiệp',
    flood: 'Ô dữ liệu gốc hợp lệ >0,5 m · Lũ chu kỳ 100 năm',
    population: 'Dân số quốc gia · So với năm 2025',
    populationValue: 'Thay đổi từ 2025',
    populationHint: 'Dự báo dân số hằng năm của LHQ, phương án trung bình. Màu thể hiện mức giảm từ năm 2025; chú giải cũng hiển thị mức tăng.',
  },
  ja: {
    fire: 'しきい値：産業革命前の地域のFWIの95パーセンタイル',
    flood: '浸水深0.5m超の有効な元データ格子 · 100年に1度の洪水',
    population: '国の人口 · 2025年との比較',
    populationValue: '2025年からの変化',
    populationHint: '国連の年次人口推計、中位推計。色は2025年からの減少を示し、ツールチップは増加も表示します。',
  },
  zh: {
    fire: '阈值：工业化前当地FWI第95百分位数',
    flood: '有效原始网格浸水深度>0.5米 · 百年一遇洪水',
    population: '全国人口 · 相对于2025年',
    populationValue: '相对2025年的变化',
    populationHint: '联合国年度人口预测，中位方案。颜色表示相较2025年的下降；提示框也显示增长。',
  },
  'zh-Hant': {
    fire: '閾值：工業化前當地FWI第95百分位數',
    flood: '有效原始網格浸水深度>0.5公尺 · 百年一遇洪水',
    population: '全國人口 · 相對於2025年',
    populationValue: '相對2025年的變化',
    populationHint: '聯合國年度人口推估，中位方案。顏色表示相較2025年的下降；提示框也顯示增長。',
  },
};

export function mapValueContext(filter, locale, year) {
  const simple=readingCopy(locale);
  if (filter === 'stabilite') return {...(warmingCopy[locale] || warmingCopy.en),value:simple.historicalMode};
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
  return { value: simple.valueMode, reference: reference || '',
    hint: guide.valueHint.replace('{year}', year) };
}

export const historicalFilters = new Set(['chaleur', 'secheresse', 'feux', 'mer', 'fleuves']);
export const historicalPeriods = {chaleur:'1970–2000', secheresse:'1970–2000', feux:'1995–2014', mer:'1979–2014', fleuves:'1960–1999'};
const historicalCopy = {
  en:['Compared with {period}', 'Historical model reference · {period}', 'Colours show the change from this historical model reference.'],
  fr:['Par rapport à {period}', 'Référence historique du modèle · {period}', 'Les couleurs indiquent l’évolution par rapport à cette référence historique du modèle.'],
  it:['Rispetto al {period}', 'Riferimento storico del modello · {period}', 'I colori mostrano la variazione rispetto a questo riferimento storico del modello.'],
  es:['Respecto a {period}', 'Referencia histórica del modelo · {period}', 'Los colores muestran el cambio respecto a esta referencia histórica del modelo.'],
  vi:['So với {period}', 'Mốc lịch sử của mô hình · {period}', 'Màu thể hiện thay đổi so với mốc lịch sử này của mô hình.'],
  ja:['{period}年との比較', 'モデルの過去の基準 · {period}年', '色はこのモデルの過去の基準からの変化を示します。'],
  zh:['相对于{period}年', '模型历史基准 · {period}年', '颜色表示相对于此模型历史基准的变化。'],
  'zh-Hant':['相對於{period}年', '模型歷史基準 · {period}年', '顏色表示相對於此模型歷史基準的變化。'],
};
export function mapReferenceContext(filter, locale) {
  const words = historicalCopy[locale] || historicalCopy.en, period = historicalPeriods[filter];
  return { value: readingCopy(locale).historicalMode, reference: words[1].replace('{period}', period), hint: words[2] };
}

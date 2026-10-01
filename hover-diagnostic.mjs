// Country hover uses the same annual population and physical readings as the sheet.
export const hoverCopy = {
  fr: ['Moyenne des villes disponibles, pondérée par leur population.', 'Profondeur modélisée pour une crue centennale ; la carte représente une surface inondable.', 'Score expérimental des villes disponibles, pondéré par leur population.'],
  en: ['Available-city mean, weighted by city population.', 'Modelled depth for a 1-in-100-year flood; the map shows flood-prone area.', 'Experimental score of available cities, weighted by city population.'],
  it: ['Media delle città disponibili, ponderata per popolazione.', 'Profondità modellizzata per un evento centennale; la mappa mostra la superficie inondabile.', 'Punteggio sperimentale delle città disponibili, ponderato per popolazione.'],
  es: ['Media de las ciudades disponibles, ponderada por población.', 'Profundidad modelizada para un evento centenario; el mapa muestra superficie inundable.', 'Puntuación experimental de las ciudades disponibles, ponderada por población.'],
  vi: ['Trung bình các thành phố có dữ liệu, có trọng số theo dân số.', 'Độ sâu mô phỏng cho lũ chu kỳ 100 năm; bản đồ thể hiện diện tích có nguy cơ ngập.', 'Điểm thử nghiệm của các thành phố có dữ liệu, có trọng số theo dân số.'],
  ja: ['利用可能な都市の人口加重平均。', '100年に1度の洪水のモデル浸水深。地図は浸水想定面積を示します。', '利用可能な都市の実験的スコアの人口加重平均。'],
  zh: ['有数据城市按人口加权的平均值。', '百年一遇洪水的模拟水深；地图显示可能受淹的面积。', '有数据城市的实验性评分，按人口加权。'],
  'zh-Hant': ['有資料城市按人口加權的平均值。', '百年一遇洪水的模擬水深；地圖顯示可能受淹的面積。', '有資料城市的實驗性評分，按人口加權。'],
};
export const hoverMetricKey = { chaleur: 'thermique', secheresse: 'eau', feux: 'feux', mer: 'mer', fleuves: 'fleuves', stabilite: 'stabilite' };

// The stored warming level is already an anomaly from this historical mean.
export const warmingCopy = {
  fr: { label: 'Réchauffement local estimé', reference: 'Par rapport à la moyenne 1970–2000', value: 'Réchauffement total', hint: 'Réchauffement local estimé par rapport à la moyenne 1970–2000.' },
  en: { label: 'Estimated local warming', reference: 'Compared with the 1970–2000 average', value: 'Total warming', hint: 'Estimated local warming relative to the 1970–2000 average.' },
  it: { label: 'Riscaldamento locale stimato', reference: 'Rispetto alla media 1970–2000', value: 'Riscaldamento totale', hint: 'Riscaldamento locale stimato rispetto alla media 1970–2000.' },
  es: { label: 'Calentamiento local estimado', reference: 'Respecto a la media de 1970–2000', value: 'Calentamiento total', hint: 'Calentamiento local estimado respecto a la media de 1970–2000.' },
  vi: { label: 'Ước tính mức nóng lên tại địa phương', reference: 'So với trung bình giai đoạn 1970–2000', value: 'Mức nóng lên tổng cộng', hint: 'Ước tính mức nóng lên tại địa phương so với trung bình giai đoạn 1970–2000.' },
  ja: { label: '地域の温暖化の推計', reference: '1970～2000年の平均との比較', value: '温暖化の総量', hint: '1970～2000年の平均に対する地域の温暖化の推計。' },
  zh: { label: '当地变暖估计', reference: '相对于1970–2000年平均值', value: '总变暖幅度', hint: '相对于1970–2000年平均值的当地变暖估计。' },
  'zh-Hant': { label: '當地暖化估計', reference: '相對於1970–2000年平均值', value: '總暖化幅度', hint: '相對於1970–2000年平均值的當地暖化估計。' },
};

export function formatHoverNumber(value, locale, signed = false, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(digits));
  if (value !== 0 && rounded === 0) {
    const bound = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(10 ** -digits);
    if (signed) return value > 0 ? `0 < Δ < ${bound}` : `−${bound} < Δ < 0`;
    return value > 0 ? `< ${bound}` : `> −${bound}`;
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits,
    signDisplay: signed ? 'exceptZero' : 'auto' }).format(Object.is(rounded, -0) ? 0 : rounded).replace(/-/g, '−');
}

export function populationHover(annual, year, changing, locale) {
  const reference = changing ? 2026 : 2025;
  const value = annual?.[year - 2025], baseline = annual?.[reference - 2025];
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(baseline) || baseline <= 0) return null;
  return { value: `${formatHoverNumber((value / baseline - 1) * 100, locale, true)} %`,
    detail: `${formatHoverNumber(value, locale, false, 0)} · ${reference} → ${year}` };
}

export function physicalHover(reading, year, changing, locale, unit, changeUnit = unit) {
  if (!reading?.available || !Number.isFinite(reading.value) || !Number.isFinite(reading.baseline)) return null;
  // Derive the displayed delta from the same weighted level and reference.
  const value = changing ? reading.value - reading.baseline : reading.value;
  return { value: `${formatHoverNumber(value, locale, changing || reading.filter === 'stabilite', 2)} ${changing ? changeUnit : unit}`.trim(),
    detail: changing ? `2026: ${formatHoverNumber(reading.baseline, locale, false, 2)} ${unit} → ${year}: ${formatHoverNumber(reading.value, locale, false, 2)} ${unit}` : '' };
}

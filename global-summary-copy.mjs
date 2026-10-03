import { formatHoverNumber } from './hover-diagnostic.mjs';

export const summaryCopy = {
  en: {
    unavailable: 'Summary unavailable', heat: '{n} °C in the hottest month', warming: '{n} °C across modelled land',
    aridity: '{n}% of covered land becomes drier', fire: '{n} extreme fire-weather days/year',
    coast: 'Coastal flood-prone share: {n} pp', river: 'River flood-prone share: {n} pp', percentagePoints: 'pp = percentage points',
    population: '{n} billion people', land: 'Area-weighted covered land', burnable: 'Area-weighted modelled burnable land',
    domain: 'Valid source-cell fractions, weighted by represented area', compared: 'vs {period}', estimate: '{year} · interpolated model periods',
    heatDefinition: 'Monthly mean of daily maxima', aridityDefinition: 'Lower De Martonne index · not drought probability',
    flood: '100-year event · depth >0.5 m · no flood protection',
    fireThreshold: 'Local FWI 95th-percentile threshold: 1850–1899',
    populationDetail: '{year} · UN WPP medium · sum of {n} country/area projections',
  },
  fr: {
    unavailable: 'Synthèse indisponible', heat: '{n} °C au mois le plus chaud', warming: '{n} °C sur les terres modélisées',
    aridity: '{n} % des terres avec données deviennent plus sèches', fire: '{n} jours/an de météo extrême favorable aux feux',
    coast: 'Part exposée aux crues côtières : {n} points', river: 'Part exposée aux crues fluviales : {n} points', percentagePoints: 'Points de pourcentage',
    population: '{n} milliards d’habitants', land: 'Terres couvertes, pondérées par leur surface', burnable: 'Terres combustibles modélisées, pondérées par leur surface',
    domain: 'Fractions de cellules sources valides, pondérées par la surface représentée', compared: 'par rapport à {period}', estimate: '{year} · périodes du modèle interpolées',
    heatDefinition: 'Moyenne mensuelle des maxima quotidiens', aridityDefinition: 'Indice De Martonne plus bas · pas une probabilité de sécheresse',
    flood: 'Crue centennale · profondeur >0,5 m · sans protections',
    fireThreshold: 'Seuil local du 95e percentile de FWI : 1850–1899',
    populationDetail: '{year} · ONU, variante moyenne · somme des projections de {n} pays/territoires',
  },
  it: {
    unavailable: 'Sintesi non disponibile', heat: '{n} °C nel mese più caldo', warming: '{n} °C sulle terre modellizzate',
    aridity: 'Il {n}% delle terre con dati diventa più arido', fire: '{n} giorni/anno di condizioni estreme favorevoli agli incendi',
    coast: 'Quota soggetta a inondazioni costiere: {n} pp', river: 'Quota soggetta a inondazioni fluviali: {n} pp', percentagePoints: 'pp = punti percentuali',
    population: '{n} miliardi di persone', land: 'Terre coperte, ponderate per superficie', burnable: 'Terre combustibili modellizzate, ponderate per superficie',
    domain: 'Frazioni di celle sorgente valide, ponderate per superficie rappresentata', compared: 'rispetto a {period}', estimate: '{year} · periodi del modello interpolati',
    heatDefinition: 'Media mensile dei massimi giornalieri', aridityDefinition: 'Indice De Martonne inferiore · non una probabilità di siccità',
    flood: 'Evento centennale · profondità >0,5 m · senza protezioni',
    fireThreshold: 'Soglia locale del 95º percentile FWI: 1850–1899',
    populationDetail: '{year} · ONU, variante media · somma delle proiezioni di {n} paesi/territori',
  },
  es: {
    unavailable: 'Resumen no disponible', heat: '{n} °C en el mes más caluroso', warming: '{n} °C en las tierras modelizadas',
    aridity: 'El {n}% de las tierras con datos se vuelve más árido', fire: '{n} días/año de condiciones extremas favorables a incendios',
    coast: 'Proporción susceptible a inundaciones costeras: {n} pp', river: 'Proporción susceptible a inundaciones fluviales: {n} pp', percentagePoints: 'pp = puntos porcentuales',
    population: '{n} mil millones de personas', land: 'Tierras cubiertas, ponderadas por superficie', burnable: 'Tierras combustibles modelizadas, ponderadas por superficie',
    domain: 'Fracciones de celdas fuente válidas, ponderadas por superficie representada', compared: 'respecto a {period}', estimate: '{year} · periodos del modelo interpolados',
    heatDefinition: 'Media mensual de las máximas diarias', aridityDefinition: 'Índice De Martonne menor · no probabilidad de sequía',
    flood: 'Evento centenario · profundidad >0,5 m · sin protecciones',
    fireThreshold: 'Umbral local del percentil 95 de FWI: 1850–1899',
    populationDetail: '{year} · ONU, variante media · suma de proyecciones de {n} países/territorios',
  },
  vi: {
    unavailable: 'Chưa có dữ liệu tổng hợp', heat: '{n} °C trong tháng nóng nhất', warming: '{n} °C trên vùng đất được mô hình hóa',
    aridity: '{n}% vùng đất có dữ liệu trở nên khô hơn', fire: '{n} ngày/năm có thời tiết cực đoan thuận lợi cho cháy',
    coast: 'Tỷ lệ có nguy cơ ngập ven biển: {n} điểm %', river: 'Tỷ lệ có nguy cơ ngập do lũ sông: {n} điểm %', percentagePoints: 'Đơn vị: điểm phần trăm',
    population: '{n} tỷ người', land: 'Vùng đất có dữ liệu, có trọng số diện tích', burnable: 'Vùng đất có thể cháy được mô hình hóa, có trọng số diện tích',
    domain: 'Tỷ lệ ô nguồn hợp lệ, có trọng số diện tích được thể hiện', compared: 'so với {period}', estimate: '{year} · nội suy các giai đoạn mô hình',
    heatDefinition: 'Trung bình tháng của nhiệt độ tối đa hằng ngày', aridityDefinition: 'Chỉ số De Martonne thấp hơn · không phải xác suất hạn hán',
    flood: 'Lũ chu kỳ 100 năm · sâu >0,5 m · không tính công trình bảo vệ',
    fireThreshold: 'Ngưỡng FWI phân vị 95 tại địa phương: 1850–1899',
    populationDetail: '{year} · LHQ, phương án trung bình · tổng dự báo của {n} quốc gia/vùng lãnh thổ',
  },
  ja: {
    unavailable: '集計データなし', heat: '最も暑い月の気温 {n} °C', warming: 'モデル化された陸域の気温 {n} °C',
    aridity: 'データのある陸域の{n}%が乾燥化', fire: '極端な火災気象条件の日数 {n} 日/年',
    coast: '沿岸洪水想定割合：{n}ポイント', river: '河川洪水想定割合：{n}ポイント', percentagePoints: '単位：パーセントポイント',
    population: '{n}億人', land: 'データのある陸域の面積加重平均', burnable: 'モデル化された燃焼可能な陸域の面積加重平均',
    domain: '有効な元データセルの割合を対象面積で加重', compared: '{period}との比較', estimate: '{year}年 · モデル期間の補間',
    heatDefinition: '日最高気温の月平均', aridityDefinition: 'De Martonne指数の低下 · 干ばつ確率ではありません',
    flood: '100年に1度の洪水 · 深さ0.5m超 · 防護なし',
    fireThreshold: '地域のFWIの95パーセンタイル基準：1850～1899年',
    populationDetail: '{year}年 · 国連中位推計 · {n}か国・地域の推計の合計',
  },
  zh: {
    unavailable: '暂无汇总数据', heat: '最热月份气温 {n} °C', warming: '模型陆地区域气温 {n} °C',
    aridity: '{n}%的有数据陆地区域变得更干燥', fire: '每年极端火险天气天数 {n} 天',
    coast: '沿海洪水模拟占比：{n}个百分点', river: '河流洪水模拟占比：{n}个百分点', percentagePoints: '单位：百分点',
    population: '{n}亿人', land: '有数据陆地区域的面积加权平均', burnable: '模型可燃陆地区域的面积加权平均',
    domain: '有效源网格占比，按代表面积加权', compared: '相对于{period}', estimate: '{year}年 · 模型时段插值',
    heatDefinition: '日最高气温的月平均值', aridityDefinition: 'De Martonne指数下降 · 不是干旱概率',
    flood: '百年一遇洪水 · 深度>0.5米 · 无防护',
    fireThreshold: '当地FWI第95百分位数阈值：1850–1899年',
    populationDetail: '{year}年 · 联合国中位方案 · {n}个国家/地区预测的合计',
  },
  'zh-Hant': {
    unavailable: '暫無彙總資料', heat: '最熱月份氣溫 {n} °C', warming: '模型陸地區域氣溫 {n} °C',
    aridity: '{n}%的有資料陸地區域變得更乾燥', fire: '每年極端火險天氣天數 {n} 天',
    coast: '沿海洪水模擬占比：{n}個百分點', river: '河流洪水模擬占比：{n}個百分點', percentagePoints: '單位：百分點',
    population: '{n}億人', land: '有資料陸地區域的面積加權平均', burnable: '模型可燃陸地區域的面積加權平均',
    domain: '有效來源網格占比，按代表面積加權', compared: '相對於{period}', estimate: '{year}年 · 模型時段內插',
    heatDefinition: '日最高氣溫的月平均值', aridityDefinition: 'De Martonne指數下降 · 不是乾旱機率',
    flood: '百年一遇洪水 · 深度>0.5公尺 · 無防護',
    fireThreshold: '當地FWI第95百分位數閾值：1850–1899年',
    populationDetail: '{year}年 · 聯合國中位方案 · {n}個國家/地區預測的合計',
  },
};

const averageReference = {
  en: 'Compared with the {period} average',
  fr: 'Par rapport à la moyenne {period}',
  it: 'Rispetto alla media {period}',
  es: 'Respecto a la media de {period}',
  vi: 'So với trung bình giai đoạn {period}',
  ja: '{period}年の平均との比較',
  zh: '相对于{period}年平均值',
  'zh-Hant': '相對於{period}年平均值',
};

export function summarizeText(filter, reading, locale, year) {
  const copy = summaryCopy[locale] || summaryCopy.en;
  if (!reading?.available || !Number.isFinite(reading.value)) return { headline: '', detail: copy.unavailable };
  if (filter === 'declin') {
    // East Asian counters use 100 million rather than an English billion.
    const eastAsian = ['ja', 'zh', 'zh-Hant'].includes(locale);
    const n = formatHoverNumber(reading.value / (eastAsian ? 1e8 : 1e9), locale, false, 1);
    const headline = copy.population.replace('{n}', n);
    return { headline, detail: copy.populationDetail.replace('{year}', year).replace('{n}', reading.countryAreaCount) };
  }
  const key = { chaleur: 'heat', stabilite: 'warming', secheresse: 'aridity', feux: 'fire', mer: 'coast', fleuves: 'river' }[filter];
  if (!key) return { headline: '', detail: copy.unavailable };
  const signed = filter !== 'secheresse';
  const n = formatHoverNumber(reading.value, locale, signed, ['mer', 'fleuves'].includes(filter) ? 2 : 1);
  const period = reading.referencePeriod.join('–');
  const scope = filter === 'feux' ? copy.burnable : ['mer', 'fleuves'].includes(filter) ? copy.domain : copy.land;
  const details = [copy.estimate.replace('{year}', year), scope, reading.scenario];
  if (filter === 'chaleur') details.push(copy.heatDefinition);
  if (filter === 'secheresse') details.push(copy.aridityDefinition);
  if (filter === 'feux') details.push(copy.fireThreshold);
  if (['mer', 'fleuves'].includes(filter)) details.push(copy.percentagePoints, copy.flood);
  const reference = ['chaleur', 'stabilite', 'feux'].includes(filter)
    ? (averageReference[locale] || averageReference.en).replace('{period}', period)
    : copy.compared.replace('{period}', period);
  return { headline: copy[key].replace('{n}', n), reference, detail: details.join(' · ') };
}

export const copy = {
  en: {partial:'Partial coverage',coverage:'{n} of 6 indicators available. The overall score needs all six.',compare:'Compare two places',search:'Choose the second place',close:'Close comparison',swap:'Swap places',baseline:'2026 estimate',change:'Change since 2026',year:'Climate estimate',meaning:'What this means',cell:'Modelled depth at the city-centre cell for a 1-in-100-year flood event. Not current flooding or a whole-city assessment.',period:'Model estimates from multi-year averages, not an annual weather forecast.',missing:'This indicator has no comparable estimate in the source.',population:'Country population',humidity:'Moisture balance',humid:'Higher means wetter; lower means drier.',summary:['Typical daytime maximum in the hottest month.','Rainfall relative to temperature. Lower means drier.','Days with extreme local fire-weather conditions, not observed fires.','Water depth in a modelled coastal flood at the city centre.','Water depth in a modelled river flood at the city centre.','Local temperature rise relative to 1970–2000.']},
  fr: {partial:'Couverture partielle',coverage:'{n} indicateurs disponibles sur 6. Le score global exige les six.',compare:'Comparer deux lieux',search:'Choisir le second lieu',close:'Fermer la comparaison',swap:'Inverser les lieux',baseline:'Estimation 2026',change:'Évolution depuis 2026',year:'Estimation climatique',meaning:'Ce que cela signifie',cell:'Profondeur modélisée dans la cellule du centre-ville pour une crue centennale. Ce n’est ni une inondation actuelle ni un bilan de toute la ville.',period:'Estimations issues de moyennes sur plusieurs années, pas des prévisions météo annuelles.',missing:'La source ne fournit pas d’estimation comparable pour cet indicateur.',population:'Population du pays',humidity:'Bilan d’humidité',humid:'Plus élevé : plus humide. Plus bas : plus sec.',summary:['Maximum diurne moyen du mois le plus chaud.','Pluie rapportée à la température. Plus bas signifie plus sec.','Jours de météo localement extrême favorable aux feux, pas des incendies observés.','Profondeur d’une inondation côtière modélisée au centre-ville.','Profondeur d’une crue fluviale modélisée au centre-ville.','Hausse de température locale par rapport à 1970–2000.']}
};
Object.assign(copy.en, {
  regional: 'Regional estimate · 0.5° cell, about 55 km north–south',
  regionalScore: 'Includes regional estimates',
  regionalFlood: 'Mean modelled depth across the containing regional cell for a 1-in-100-year flood. Not current flooding; not a city-centre value.',
  nativeCell: 'Model cell at the city centre',
  noClimate: 'Climate estimates unavailable here; country population is available below'
});
Object.assign(copy.fr, {
  regional: 'Estimation régionale · cellule de 0,5°, environ 55 km du nord au sud',
  regionalScore: 'Inclut des estimations régionales',
  regionalFlood: 'Profondeur moyenne modélisée dans la cellule régionale contenant ce lieu, pour une crue centennale. Ce n’est ni une inondation actuelle ni une valeur au centre-ville.',
  nativeCell: 'Cellule du modèle au centre-ville',
  noClimate: 'Estimations climatiques indisponibles ici ; la population du pays figure ci-dessous'
});
copy.ja = {
  partial: '一部の指標のみ利用可能',
  coverage: '6指標のうち{n}指標を利用できます。総合スコアには6指標すべてが必要です。',
  compare: '2つの場所を比較', search: '2つ目の場所を選択', close: '比較を閉じる', swap: '場所を入れ替える',
  baseline: '2026年の推計', change: '2026年からの変化', year: '気候の推計', meaning: 'この数値の意味',
  cell: '100年に1度の規模の洪水を想定した、市中心部のモデル格子内の浸水深です。現在の浸水状況や都市全体の評価ではありません。',
  period: '複数年の平均に基づくモデル推計です。各年の天気予報ではありません。',
  missing: 'この指標について、比較可能な推計値がデータソースにありません。',
  population: '国の人口', humidity: '気温に対する降水量', humid: '高いほど湿潤、低いほど乾燥した気候を示します。',
  summary: ['最も暑い月の平均的な日中の最高気温。','気温に対する降水量。低いほど乾燥した気候を示します。','火災が発生しやすい、その地域で極端な気象条件の日数。観測された火災の数ではありません。','市中心部で想定される沿岸洪水の浸水深。','市中心部で想定される河川洪水の浸水深。','1970〜2000年を基準とした、その地域の気温上昇。'],
  regional: '地域推計 · 0.5°の格子、南北約55 km', regionalScore: '地域推計を含みます',
  regionalFlood: '100年に1度の規模の洪水を想定した、この場所を含む地域格子全体の平均浸水深です。現在の浸水状況でも、市中心部の値でもありません。',
  nativeCell: '市中心部に位置するモデル格子', noClimate: 'この場所の気候推計は利用できません。国の人口は下に表示しています。'
};
copy.zh = {
  partial: '部分指标可用', coverage: '6项指标中有{n}项可用。综合评分需要全部6项指标。',
  compare: '比较两个地点', search: '选择第二个地点', close: '关闭比较', swap: '交换地点',
  baseline: '2026年估算', change: '相较2026年的变化', year: '气候估算', meaning: '这意味着什么',
  cell: '在百年一遇洪水情景下，市中心所在模型网格的模拟水深。这不代表当前正在发生洪水，也不是对全市的评估。',
  period: '基于多年平均值的模型估算，并非逐年的天气预报。',
  missing: '数据源未提供此指标的可比估算值。', population: '全国人口', humidity: '降水与气温的关系',
  humid: '数值越高表示越湿润，越低表示越干燥。',
  summary: ['最热月份的平均日间最高气温。','相对于气温的降水量。数值越低表示越干燥。','当地出现极端火险气象条件的天数，并非观测到的火灾次数。','市中心模拟沿海洪水的水深。','市中心模拟河流洪水的水深。','相对于1970至2000年平均水平的当地气温升幅。'],
  regional: '区域估算 · 0.5°网格，南北跨度约55公里', regionalScore: '包含区域估算',
  regionalFlood: '在百年一遇洪水情景下，包含此地点的区域网格内的平均模拟水深。这不代表当前洪水，也不是市中心的数值。',
  nativeCell: '市中心所在的模型网格', noClimate: '此地点暂无气候估算；全国人口数据见下方。'
};
copy.vi = {
  partial: 'Có một phần dữ liệu', coverage: 'Có {n} trên 6 chỉ số. Điểm tổng hợp cần đủ cả sáu.',
  compare: 'So sánh hai địa điểm', search: 'Chọn địa điểm thứ hai', close: 'Đóng phần so sánh', swap: 'Đổi chỗ hai địa điểm',
  baseline: 'Ước tính năm 2026', change: 'Thay đổi so với năm 2026', year: 'Ước tính khí hậu', meaning: 'Ý nghĩa của số liệu',
  cell: 'Độ sâu ngập mô phỏng tại ô lưới ở trung tâm thành phố, trong kịch bản lũ có chu kỳ lặp lại 100 năm. Không phải tình trạng ngập hiện tại hay đánh giá cho toàn thành phố.',
  period: 'Ước tính từ mô hình dựa trên trung bình nhiều năm, không phải dự báo thời tiết từng năm.',
  missing: 'Nguồn dữ liệu không có ước tính tương ứng để so sánh cho chỉ số này.',
  population: 'Dân số cả nước', humidity: 'Tương quan lượng mưa và nhiệt độ', humid: 'Giá trị cao hơn nghĩa là ẩm hơn; thấp hơn nghĩa là khô hơn.',
  summary: ['Nhiệt độ cao nhất ban ngày trung bình trong tháng nóng nhất.','Lượng mưa tương quan với nhiệt độ. Giá trị thấp hơn nghĩa là khô hơn.','Số ngày có điều kiện thời tiết nguy hiểm cho cháy ở địa phương, không phải số vụ cháy quan sát được.','Độ sâu ngập ven biển mô phỏng tại trung tâm thành phố.','Độ sâu ngập do lũ sông mô phỏng tại trung tâm thành phố.','Mức tăng nhiệt độ địa phương so với trung bình giai đoạn 1970 đến 2000.'],
  regional: 'Ước tính khu vực · ô lưới 0,5°, dài khoảng 55 km theo hướng bắc nam', regionalScore: 'Có bao gồm ước tính khu vực',
  regionalFlood: 'Độ sâu ngập trung bình mô phỏng trên ô lưới khu vực chứa địa điểm này, trong kịch bản lũ có chu kỳ lặp lại 100 năm. Không phải ngập hiện tại hay số liệu riêng tại trung tâm thành phố.',
  nativeCell: 'Ô lưới mô hình tại trung tâm thành phố', noClimate: 'Chưa có ước tính khí hậu tại đây; dân số cả nước được hiển thị bên dưới.'
};
copy.es = {
  partial: 'Cobertura parcial', coverage: '{n} de 6 indicadores disponibles. La puntuación global necesita los seis.',
  compare: 'Comparar dos lugares', search: 'Elegir el segundo lugar', close: 'Cerrar comparación', swap: 'Intercambiar lugares',
  baseline: 'Estimación de 2026', change: 'Cambio desde 2026', year: 'Estimación climática', meaning: 'Qué significa',
  cell: 'Profundidad modelizada en la celda del centro de la ciudad para una inundación con un período de retorno de 100 años. No indica una inundación actual ni evalúa toda la ciudad.',
  period: 'Estimaciones del modelo basadas en promedios de varios años, no un pronóstico meteorológico anual.',
  missing: 'La fuente no ofrece una estimación comparable para este indicador.', population: 'Población del país',
  humidity: 'Relación entre lluvia y temperatura', humid: 'Un valor mayor indica más humedad; uno menor, más aridez.',
  summary: ['Máxima diurna media del mes más caluroso.','Precipitación en relación con la temperatura. Un valor menor indica más aridez.','Días con condiciones meteorológicas locales extremas favorables a incendios, no incendios observados.','Profundidad de una inundación costera modelizada en el centro de la ciudad.','Profundidad de una inundación fluvial modelizada en el centro de la ciudad.','Aumento de la temperatura local respecto a 1970 a 2000.'],
  regional: 'Estimación regional · celda de 0,5°, unos 55 km de norte a sur', regionalScore: 'Incluye estimaciones regionales',
  regionalFlood: 'Profundidad media modelizada en la celda regional que contiene este lugar para una inundación con un período de retorno de 100 años. No es una inundación actual ni un valor del centro de la ciudad.',
  nativeCell: 'Celda del modelo en el centro de la ciudad', noClimate: 'No hay estimaciones climáticas para este lugar; la población del país aparece abajo.'
};
copy.it = {
  partial: 'Copertura parziale', coverage: '{n} indicatori disponibili su 6. Il punteggio complessivo richiede tutti e sei.',
  compare: 'Confronta due luoghi', search: 'Scegli il secondo luogo', close: 'Chiudi il confronto', swap: 'Scambia i luoghi',
  baseline: 'Stima del 2026', change: 'Variazione dal 2026', year: 'Stima climatica', meaning: 'Cosa significa',
  cell: 'Profondità simulata nella cella del centro città per un’inondazione con un tempo di ritorno di 100 anni. Non indica un’inondazione in corso né una valutazione dell’intera città.',
  period: 'Stime del modello basate su medie pluriennali, non previsioni meteorologiche annuali.',
  missing: 'La fonte non fornisce una stima confrontabile per questo indicatore.', population: 'Popolazione del paese',
  humidity: 'Rapporto tra pioggia e temperatura', humid: 'Un valore più alto indica maggiore umidità; uno più basso, maggiore aridità.',
  summary: ['Massima diurna media del mese più caldo.','Precipitazioni in rapporto alla temperatura. Un valore più basso indica maggiore aridità.','Giorni con condizioni meteorologiche locali estreme favorevoli agli incendi, non incendi osservati.','Profondità di un’inondazione costiera simulata nel centro città.','Profondità di un’inondazione fluviale simulata nel centro città.','Aumento della temperatura locale rispetto al periodo dal 1970 al 2000.'],
  regional: 'Stima regionale · cella di 0,5°, circa 55 km da nord a sud', regionalScore: 'Include stime regionali',
  regionalFlood: 'Profondità media simulata nella cella regionale che contiene questo luogo, per un’inondazione con un tempo di ritorno di 100 anni. Non è un’inondazione in corso né un valore del centro città.',
  nativeCell: 'Cella del modello nel centro città', noClimate: 'Stime climatiche non disponibili qui; la popolazione del paese è riportata sotto.'
};
const riverLines = {
  en:'Moving lines trace river courses, not flood extent or predicted flow.',
  fr:'Les lignes animées suivent les fleuves, pas une étendue inondée ni un débit prévu.',
  ja:'動く線は河川の流路です。浸水範囲や予測流量ではありません。',
  zh:'动态线条表示河道，不表示淹水范围或预测流量。',
  vi:'Đường chuyển động thể hiện dòng sông, không phải vùng ngập hay lưu lượng dự báo.',
  es:'Las líneas animadas muestran los ríos, no la zona inundada ni el caudal previsto.',
  it:'Le linee animate indicano i corsi dei fiumi, non le aree allagate o la portata prevista.'
};
for (const [language, text] of Object.entries(riverLines)) copy[language].riverLines = text;
export const refinementCopy = language => copy[language] || copy.en;

const moistureBands = {
  en:['Desert climate','Arid climate','Semi-dry climate','Moderately wet climate','Wet climate','Very wet climate'],
  fr:['Climat désertique','Climat aride','Climat semi-sec','Climat modérément humide','Climat humide','Climat très humide'],
  ja:['砂漠気候','乾燥した気候','やや乾燥した気候','適度に湿潤な気候','湿潤な気候','非常に湿潤な気候'],
  zh:['沙漠气候','干旱气候','半干旱气候','适度湿润气候','湿润气候','非常湿润气候'],
  vi:['Khí hậu sa mạc','Khí hậu khô hạn','Khí hậu hơi khô','Khí hậu ẩm vừa','Khí hậu ẩm','Khí hậu rất ẩm'],
  es:['Clima desértico','Clima árido','Clima semiseco','Clima moderadamente húmedo','Clima húmedo','Clima muy húmedo'],
  it:['Clima desertico','Clima arido','Clima semisecco','Clima moderatamente umido','Clima umido','Clima molto umido']
};
export const moistureSource = 'https://www.miteco.gob.es/content/dam/miteco/es/calidad-y-evaluacion-ambiental/publicaciones/guiasimplificadaevaluacionriesgoseninglesversion2_tcm30-185046.pdf#page=86';
export function moistureBand(value, language) {
  if (!Number.isFinite(value) || value < 0) return '';
  return (moistureBands[language] || moistureBands.en)[value < 5 ? 0 : value < 10 ? 1 : value < 20 ? 2 : value < 30 ? 3 : value <= 60 ? 4 : 5];
}

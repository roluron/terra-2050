import traditional from './locales/zh-Hant-refinement.mjs';
export const mapCopy = {
 en: ['Change since 2026','Level','Sources & reading guide','Move the year to see where conditions change.','No change from the 2026 reference.','Colour saturates at the endpoints. Uncoloured areas may have no estimate.','wetter','drier','percentage points','population decline','population growth'],
 fr: ['Évolution depuis 2026','Niveau','Sources et lecture','Déplacez l’année pour voir où les conditions évoluent.','Aucun changement par rapport à la référence 2026.','La couleur sature aux extrémités. Une zone sans couleur peut manquer de données.','plus humide','plus sec','points de pourcentage','baisse de population','hausse de population'],
 it: ['Variazione dal 2026','Livello','Fonti e guida','Sposta l’anno per vedere dove cambiano le condizioni.','Nessuna variazione rispetto al riferimento 2026.','Il colore satura agli estremi. Le zone senza colore possono non avere dati.','più umido','più secco','punti percentuali','calo demografico','crescita demografica'],
 es: ['Cambio desde 2026','Nivel','Fuentes y guía','Mueve el año para ver dónde cambian las condiciones.','Sin cambio respecto a la referencia de 2026.','El color se satura en los extremos. Las zonas sin color pueden carecer de datos.','más húmedo','más seco','puntos porcentuales','descenso de población','crecimiento de población'],
 vi: ['Thay đổi từ 2026','Mức độ','Nguồn và cách đọc','Di chuyển năm để xem điều kiện thay đổi ở đâu.','Không thay đổi so với mốc 2026.','Màu bão hòa ở hai đầu. Vùng không màu có thể thiếu dữ liệu.','ẩm hơn','khô hơn','điểm phần trăm','giảm dân số','tăng dân số'],
 ja: ['2026年からの変化','水準','出典と読み方','年を動かして、変化する地域を見てください。','基準の2026年からの変化はありません。','両端で色が飽和します。色のない地域にはデータがない場合もあります。','より湿潤','より乾燥','パーセントポイント','人口減少','人口増加'],
 zh: ['相对2026年的变化','水平','来源与说明','拖动年份，查看各地区的变化。','相对2026年基准没有变化。','颜色在端点饱和。无颜色地区也可能缺少数据。','更湿润','更干燥','百分点','人口减少','人口增长']
};
export const mapPicker = {en:'Choose an indicator',fr:'Choisir un indicateur',it:'Scegli un indicatore',es:'Elige un indicador',vi:'Chọn chỉ số',ja:'指標を選ぶ',zh:'选择指标'};
export const floodMapMeaning = {
 en:'Share of model cells with flood depth above 0.5 m in a 1-in-100-year event. Change is measured in percentage points of this area, not population.',
 fr:'Part des cellules du modèle où la profondeur dépasse 0,5 m pour une crue centennale. L’évolution mesure des points de pourcentage de cette surface, pas la population.',
 it:'Quota di celle del modello con profondità superiore a 0,5 m per un evento centennale. La variazione è in punti percentuali di questa superficie, non della popolazione.',
 es:'Proporción de celdas con profundidad superior a 0,5 m en un evento centenario. El cambio mide puntos porcentuales de esta superficie, no población.',
 vi:'Tỷ lệ ô mô hình có độ sâu ngập trên 0,5 m trong sự kiện chu kỳ 100 năm. Thay đổi tính bằng điểm phần trăm diện tích này, không phải dân số.',
 ja:'100年に1度の洪水で浸水深が0.5mを超えるモデル格子の割合。変化はこの面積のパーセントポイントであり、人口ではありません。',
 zh:'百年一遇事件中水深超过0.5米的模型网格比例。变化以该面积的百分点表示，并非人口。'
};
export const copy = {
  en: {partial:'Partial coverage',coverage:'{n} of 6 indicators available. The overall score needs all six.',compare:'Compare two places',search:'Choose the second place',close:'Close comparison',swap:'Swap places',baseline:'2026 estimate',change:'Change since 2026',year:'Climate estimate',meaning:'What this means',cell:'Modelled depth at the city-centre cell for a 1-in-100-year flood event. Not current flooding or a whole-city assessment.',period:'Model estimates from multi-year averages, not an annual weather forecast.',missing:'This indicator has no comparable estimate in the source.',population:'Country population',humidity:'Moisture balance',humid:'Higher means wetter; lower means drier.',summary:['Typical daytime maximum in the hottest month.','Rainfall relative to temperature. Lower means drier.','Days with extreme local fire-weather conditions, not observed fires.','Water depth in a modelled coastal flood at the city centre.','Water depth in a modelled river flood at the city centre.','Local temperature rise relative to 1970–2000.']},
  fr: {partial:'Couverture partielle',coverage:'{n} indicateurs disponibles sur 6. Le score global exige les six.',compare:'Comparer deux lieux',search:'Choisir le second lieu',close:'Fermer la comparaison',swap:'Inverser les lieux',baseline:'Estimation 2026',change:'Évolution depuis 2026',year:'Estimation climatique',meaning:'Ce que cela signifie',cell:'Profondeur modélisée dans la cellule du centre-ville pour une crue centennale. Ce n’est ni une inondation actuelle ni un bilan de toute la ville.',period:'Estimations issues de moyennes sur plusieurs années, pas des prévisions météo annuelles.',missing:'La source ne fournit pas d’estimation comparable pour cet indicateur.',population:'Population du pays',humidity:'Bilan d’humidité',humid:'Plus élevé : plus humide. Plus bas : plus sec.',summary:['Maximum diurne moyen du mois le plus chaud.','Pluie rapportée à la température. Plus bas signifie plus sec.','Jours de météo localement extrême favorable aux feux, pas des incendies observés.','Profondeur d’une inondation côtière modélisée au centre-ville.','Profondeur d’une crue fluviale modélisée au centre-ville.','Hausse de température locale par rapport à 1970–2000.']}
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
  noClimate: 'Estimations climatiques indisponibles ici ; la population du pays figure ci-dessous'
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

// First-use guidance stays separate from the full scientific method.
const experience = {
  en: {journey:'Find your city',replace:'Choose another place',details:'Sources and limits',value:'Estimate in {year}',valueHint:'Colours show estimated conditions in {year}, rather than the change since 2026.',change:'Colours show how conditions change compared with 2026.',indicators:{
    chaleur:'This shows typical daytime heat in the hottest month, in °C. Higher values mean hotter summer days and more heat exposure. These are climate estimates, not record temperatures or a weather forecast.',
    feux:'This shows days per year with extreme weather that can favour fires. More days mean more frequent fire-prone conditions. It does not show active fires or predict where a fire will start.',
    secheresse:'This compares rainfall with temperature. Lower values mean a drier climate, which can add pressure on water supplies. It does not measure drinking-water availability or reservoir levels.',
    mer:'This shows coastal flooding in a modelled 1-in-100-year event. The map colours show the share of model cells with more than 0.5 m of water; the place view shows depth. Flood defences are excluded. It is not flooding happening now.',
    fleuves:'This shows river flooding in a modelled 1-in-100-year event. The map colours show the share of model cells with more than 0.5 m of water; the place view shows depth. Flood defences are excluded. It is not flooding happening now.',
    stabilite:'This shows how much the local annual temperature has changed, in °C, compared with 1970–2000. Higher values mean stronger local warming. It is a model estimate, not a tipping-point threshold.',
    declin:'This shows estimated population decline for a whole country. A larger decline means fewer residents at national scale. It does not predict your city’s population, jobs or services.'}},
  fr: {journey:'Trouver votre ville',replace:'Choisir un autre lieu',details:'Sources et limites',value:'Estimation en {year}',valueHint:'Les couleurs montrent les conditions estimées en {year}, plutôt que leur évolution depuis 2026.',change:'Les couleurs montrent comment les conditions évoluent par rapport à 2026.',indicators:{
    chaleur:'Ce chiffre indique la chaleur typique en journée pendant le mois le plus chaud, en °C. Plus il est élevé, plus les journées estivales sont chaudes et exposent à la chaleur. Il s’agit d’estimations climatiques, pas de records ni de prévisions météo.',
    feux:'Ce chiffre indique le nombre de jours par an avec une météo extrême favorable aux feux. Plus il est élevé, plus ces conditions sont fréquentes. Il ne montre ni les incendies en cours ni les lieux où un feu va démarrer.',
    secheresse:'Cet indicateur compare les pluies à la température. Une valeur basse signifie un climat plus sec, qui peut accentuer la pression sur l’eau. Il ne mesure ni l’accès à l’eau potable ni le niveau des réservoirs.',
    mer:'Cet indicateur montre une inondation côtière modélisée pour un événement centennal. La carte indique la part des cellules avec plus de 0,5 m d’eau ; la fiche du lieu indique la profondeur. Les protections sont exclues. Ce n’est pas une inondation en cours.',
    fleuves:'Cet indicateur montre une crue fluviale modélisée pour un événement centennal. La carte indique la part des cellules avec plus de 0,5 m d’eau ; la fiche du lieu indique la profondeur. Les protections sont exclues. Ce n’est pas une inondation en cours.',
    stabilite:'Ce chiffre indique le changement de température annuelle locale, en °C, par rapport à 1970–2000. Plus il est élevé, plus le réchauffement local est marqué. C’est une estimation du modèle, pas un seuil de basculement.',
    declin:'Cet indicateur montre la baisse estimée de population d’un pays entier. Une baisse plus forte signifie moins d’habitants à l’échelle nationale. Il ne prédit ni la population de votre ville, ni ses emplois ou services.'}},
  vi: {journey:'Tìm thành phố của bạn',replace:'Chọn địa điểm khác',details:'Nguồn dữ liệu và giới hạn',value:'Ước tính năm {year}',valueHint:'Màu thể hiện điều kiện ước tính năm {year}, không phải thay đổi so với năm 2026.',change:'Màu thể hiện điều kiện thay đổi như thế nào so với năm 2026.',indicators:{
    chaleur:'Chỉ số này thể hiện nhiệt độ ban ngày điển hình trong tháng nóng nhất, tính bằng °C. Giá trị càng cao, ngày hè càng nóng và mức tiếp xúc với nắng nóng càng lớn. Đây là ước tính khí hậu, không phải nhiệt độ kỷ lục hay dự báo thời tiết.',
    feux:'Chỉ số này thể hiện số ngày mỗi năm có thời tiết cực đoan thuận lợi cho cháy. Số ngày càng nhiều, các điều kiện dễ gây cháy càng thường xuyên. Chỉ số không thể hiện đám cháy đang diễn ra hay dự đoán nơi cháy bắt đầu.',
    secheresse:'Chỉ số này so sánh lượng mưa với nhiệt độ. Giá trị thấp hơn nghĩa là khí hậu khô hơn, có thể làm tăng áp lực lên nguồn nước. Chỉ số không đo khả năng tiếp cận nước uống hay mực nước hồ chứa.',
    mer:'Chỉ số này thể hiện ngập ven biển trong kịch bản mô phỏng có chu kỳ lặp lại 100 năm. Màu bản đồ thể hiện tỷ lệ ô lưới ngập trên 0,5 m; bảng địa điểm thể hiện độ sâu. Mô hình không tính công trình bảo vệ. Đây không phải tình trạng ngập hiện tại.',
    fleuves:'Chỉ số này thể hiện lũ sông trong kịch bản mô phỏng có chu kỳ lặp lại 100 năm. Màu bản đồ thể hiện tỷ lệ ô lưới ngập trên 0,5 m; bảng địa điểm thể hiện độ sâu. Mô hình không tính công trình bảo vệ. Đây không phải tình trạng ngập hiện tại.',
    stabilite:'Chỉ số này thể hiện thay đổi nhiệt độ trung bình năm tại địa phương, tính bằng °C, so với giai đoạn 1970 đến 2000. Giá trị cao hơn nghĩa là địa phương ấm lên nhiều hơn. Đây là ước tính mô hình, không phải ngưỡng đảo chiều khí hậu.',
    declin:'Chỉ số này thể hiện mức giảm dân số ước tính của cả nước. Mức giảm lớn hơn nghĩa là ít cư dân hơn ở quy mô quốc gia. Chỉ số không dự đoán dân số, việc làm hay dịch vụ của từng thành phố.'}},
  es: {journey:'Encuentra tu ciudad',replace:'Elegir otro lugar',details:'Fuentes y límites',value:'Estimación de {year}',valueHint:'Los colores muestran las condiciones estimadas en {year}, no el cambio desde 2026.',change:'Los colores muestran cómo cambian las condiciones respecto a 2026.',indicators:{
    chaleur:'Indica el calor diurno típico del mes más caluroso, en °C. Un valor mayor significa días de verano más calurosos y mayor exposición al calor. Son estimaciones climáticas, no récords ni un pronóstico meteorológico.',
    feux:'Indica los días al año con tiempo extremo favorable a incendios. Más días significan condiciones propicias más frecuentes. No muestra incendios activos ni predice dónde se iniciará un fuego.',
    secheresse:'Compara la lluvia con la temperatura. Un valor menor significa un clima más seco, que puede aumentar la presión sobre el agua. No mide el acceso al agua potable ni el nivel de los embalses.',
    mer:'Muestra una inundación costera modelizada para un evento centenario. El mapa indica la proporción de celdas con más de 0,5 m de agua; la ficha muestra la profundidad. No incluye defensas. No es una inundación actual.',
    fleuves:'Muestra una inundación fluvial modelizada para un evento centenario. El mapa indica la proporción de celdas con más de 0,5 m de agua; la ficha muestra la profundidad. No incluye defensas. No es una inundación actual.',
    stabilite:'Indica el cambio de temperatura anual local, en °C, respecto a 1970–2000. Un valor mayor significa más calentamiento local. Es una estimación del modelo, no un umbral de cambio irreversible.',
    declin:'Muestra el descenso de población estimado para todo un país. Un descenso mayor significa menos habitantes a escala nacional. No predice la población, los empleos ni los servicios de tu ciudad.'}},
  it: {journey:'Trova la tua città',replace:'Scegli un altro luogo',details:'Fonti e limiti',value:'Stima per il {year}',valueHint:'I colori mostrano le condizioni stimate nel {year}, non la variazione dal 2026.',change:'I colori mostrano come cambiano le condizioni rispetto al 2026.',indicators:{
    chaleur:'Indica il caldo diurno tipico del mese più caldo, in °C. Un valore più alto significa giornate estive più calde e maggiore esposizione al caldo. Sono stime climatiche, non record o previsioni del tempo.',
    feux:'Indica i giorni all’anno con condizioni meteorologiche estreme favorevoli agli incendi. Più giorni significano condizioni favorevoli più frequenti. Non mostra incendi attivi né prevede dove inizierà un incendio.',
    secheresse:'Confronta le precipitazioni con la temperatura. Un valore più basso indica un clima più secco, che può aumentare la pressione sulle risorse idriche. Non misura l’accesso all’acqua potabile o i livelli dei bacini.',
    mer:'Mostra un’inondazione costiera simulata per un evento centennale. La mappa indica la quota di celle con oltre 0,5 m d’acqua; la scheda del luogo mostra la profondità. Le difese sono escluse. Non è un’inondazione in corso.',
    fleuves:'Mostra un’inondazione fluviale simulata per un evento centennale. La mappa indica la quota di celle con oltre 0,5 m d’acqua; la scheda del luogo mostra la profondità. Le difese sono escluse. Non è un’inondazione in corso.',
    stabilite:'Indica la variazione della temperatura annuale locale, in °C, rispetto al 1970–2000. Un valore maggiore indica più riscaldamento locale. È una stima del modello, non una soglia di svolta climatica.',
    declin:'Mostra il calo demografico stimato per un intero paese. Un calo maggiore significa meno abitanti a livello nazionale. Non prevede popolazione, posti di lavoro o servizi della tua città.'}},
  ja: {journey:'あなたの街を探す',replace:'別の場所を選ぶ',details:'出典と限界',value:'{year}年の推計',valueHint:'色は{year}年の推計値を示します。2026年からの変化ではありません。',change:'色は2026年と比べた状況の変化を示します。',indicators:{
    chaleur:'最も暑い月の平均的な日中の最高気温を°Cで示します。高いほど夏の日中が暑く、暑さへの曝露が大きくなります。気候の推計であり、観測記録や天気予報ではありません。',
    feux:'火災が起きやすい極端な気象条件の日数を年単位で示します。多いほど、その条件が頻繁になります。発生中の火災や出火場所の予測ではありません。',
    secheresse:'降水量と気温の関係を示します。低いほど乾燥した気候で、水資源への負担が増す可能性があります。飲料水へのアクセスや貯水量は測定していません。',
    mer:'100年に1度の規模を想定した沿岸洪水です。地図は浸水深0.5mを超えるモデル格子の割合、場所の詳細は浸水深を示します。防護施設は考慮していません。現在の浸水状況ではありません。',
    fleuves:'100年に1度の規模を想定した河川洪水です。地図は浸水深0.5mを超えるモデル格子の割合、場所の詳細は浸水深を示します。防護施設は考慮していません。現在の浸水状況ではありません。',
    stabilite:'1970〜2000年と比べた、その地域の年平均気温の変化を°Cで示します。高いほど温暖化が大きいことを意味します。モデル推計であり、気候の転換点を示す値ではありません。',
    declin:'国全体の人口減少の推計です。減少が大きいほど、国全体の住民が少なくなります。個々の都市の人口、雇用、サービスの予測ではありません。'}},
  zh: {journey:'寻找你的城市',replace:'选择其他地点',details:'来源与局限',value:'{year}年估算',valueHint:'颜色表示{year}年的估算状况，而非相较2026年的变化。',change:'颜色表示相较2026年的状况变化。',indicators:{
    chaleur:'表示最热月份的典型日间最高气温，单位为°C。数值越高，夏季白天越热，热暴露越大。这是气候估算，不是气温纪录或天气预报。',
    feux:'表示每年出现极端火险气象条件的天数。天数越多，这些条件越常见。不表示正在发生的火灾，也不预测起火地点。',
    secheresse:'比较降水与气温。数值越低，气候越干燥，可能增加水资源压力。不衡量饮用水获取条件或水库水位。',
    mer:'表示百年一遇情景下的模拟沿海洪水。地图表示水深超过0.5米的模型网格比例，地点详情表示水深。不考虑防护设施，不代表当前洪水。',
    fleuves:'表示百年一遇情景下的模拟河流洪水。地图表示水深超过0.5米的模型网格比例，地点详情表示水深。不考虑防护设施，不代表当前洪水。',
    stabilite:'表示当地年平均气温相对1970至2000年的变化，单位为°C。数值越高，当地变暖越明显。这是模型估算，不是气候临界点阈值。',
    declin:'表示全国人口减少的估算。降幅越大，全国居民越少。不预测各城市的人口、就业或服务。'}},
  'zh-Hant': {journey:'尋找你的城市',replace:'選擇其他地點',details:'來源與限制',value:'{year}年估算',valueHint:'顏色表示{year}年的估算狀況，而非相較2026年的變化。',change:'顏色表示相較2026年的狀況變化。',indicators:{
    chaleur:'表示最熱月份的典型日間最高氣溫，單位為°C。數值越高，夏季白天越熱，熱曝露越大。這是氣候估算，不是氣溫紀錄或天氣預報。',
    feux:'表示每年出現極端火險氣象條件的天數。天數越多，這些條件越常見。不表示正在發生的火災，也不預測起火地點。',
    secheresse:'比較降水與氣溫。數值越低，氣候越乾燥，可能增加水資源壓力。不衡量飲用水取得條件或水庫水位。',
    mer:'表示百年一遇情境下的模擬沿海洪水。地圖表示水深超過0.5公尺的模型網格比例，地點詳情表示水深。不考慮防護設施，不代表當前洪水。',
    fleuves:'表示百年一遇情境下的模擬河流洪水。地圖表示水深超過0.5公尺的模型網格比例，地點詳情表示水深。不考慮防護設施，不代表當前洪水。',
    stabilite:'表示當地年平均氣溫相對1970至2000年的變化，單位為°C。數值越高，當地暖化越明顯。這是模型估算，不是氣候臨界點門檻。',
    declin:'表示全國人口減少的估算。降幅越大，全國居民越少。不預測各城市的人口、就業或服務。'}}
};
export const experienceCopy = language => experience[language] || experience.en;

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
copy['zh-Hant']=traditional.copy;
mapCopy['zh-Hant']=traditional.map;
mapPicker['zh-Hant']=traditional.picker;
floodMapMeaning['zh-Hant']=traditional.flood;
moistureBands['zh-Hant']=traditional.bands;
export function moistureBand(value, language) {
  if (!Number.isFinite(value) || value < 0) return '';
  return (moistureBands[language] || moistureBands.en)[value < 5 ? 0 : value < 10 ? 1 : value < 20 ? 2 : value < 30 ? 3 : value <= 60 ? 4 : 5];
}

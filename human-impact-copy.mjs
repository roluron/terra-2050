// Plain definitions and general effects. Effects are supported by separate
// research: they are not numerical outcomes calculated from Terra's grids.
export const filterKeys = ['chaleur','feux','secheresse','mer','fleuves','stabilite','declin'];
const names = {
 en:['Summer heat','Fire weather','Dryness','Coastal flooding','River flooding','Warming','Population'],
 fr:['Chaleur d’été','Météo et feux','Climat sec','Inondations côtières','Crues des fleuves','Réchauffement','Population'],
 es:['Calor de verano','Tiempo e incendios','Clima seco','Inundaciones costeras','Crecidas de ríos','Calentamiento','Población'],
 it:['Caldo estivo','Meteo e incendi','Clima secco','Inondazioni costiere','Piene dei fiumi','Riscaldamento','Popolazione'],
 vi:['Nắng nóng mùa hè','Thời tiết dễ cháy','Khí hậu khô','Ngập ven biển','Lũ sông','Nóng lên','Dân số'],
 ja:['夏の暑さ','火災を招く気象','乾燥','沿岸の浸水','河川の洪水','温暖化','人口'],
 zh:['夏季高温','火险天气','干燥','沿海洪水','河流洪水','变暖','人口'],
 'zh-Hant':['夏季高溫','火險天氣','乾燥','沿海洪水','河川洪水','暖化','人口'],
};
const definitions = {
 en:['Average daytime high in the hottest month.','Days with extreme weather that favours fires.','A lower number means a drier climate.','Estimated water depth during a rare coastal flood.','Estimated water depth during a rare river flood.','Average annual warming compared with past climate.','Estimated changes in country populations.'],
 fr:['Maximum diurne moyen du mois le plus chaud.','Jours de météo extrême favorable aux incendies.','Un chiffre plus bas indique un climat plus sec.','Profondeur estimée lors d’une inondation côtière rare.','Profondeur estimée lors d’une crue rare.','Réchauffement annuel moyen par rapport au climat passé.','Évolution estimée de la population des pays.'],
 es:['Máxima diurna media del mes más caluroso.','Días de tiempo extremo favorable a incendios.','Un número menor indica un clima más seco.','Profundidad estimada en una inundación costera poco frecuente.','Profundidad estimada en una crecida poco frecuente.','Calentamiento anual medio respecto al clima pasado.','Cambios estimados en la población de los países.'],
 it:['Massima diurna media del mese più caldo.','Giorni di meteo estremo favorevole agli incendi.','Un numero più basso indica un clima più secco.','Profondità stimata durante una rara inondazione costiera.','Profondità stimata durante una rara piena fluviale.','Riscaldamento medio annuo rispetto al clima passato.','Variazioni stimate della popolazione dei paesi.'],
 vi:['Nhiệt độ cao nhất ban ngày trung bình trong tháng nóng nhất.','Số ngày có thời tiết cực đoan thuận lợi cho cháy.','Giá trị thấp hơn nghĩa là khí hậu khô hơn.','Độ sâu nước ước tính khi có ngập ven biển hiếm gặp.','Độ sâu nước ước tính khi có lũ sông hiếm gặp.','Mức nóng lên trung bình năm so với khí hậu trước đây.','Thay đổi dân số ước tính ở từng quốc gia.'],
 ja:['最も暑い月の日最高気温の平均。','火災を招く極端な気象条件の日数。','数値が低いほど乾燥した気候です。','まれな沿岸洪水を想定した浸水深。','まれな河川洪水を想定した浸水深。','過去の気候と比べた年平均の気温上昇。','各国の人口変化の推計。'],
 zh:['最热月份的平均日最高气温。','出现极端火险天气的天数。','数值越低，气候越干燥。','模拟罕见沿海洪水时的水深。','模拟罕见河流洪水时的水深。','相较过去气候的年平均变暖幅度。','各国人口变化的估计。'],
 'zh-Hant':['最熱月份的平均日最高氣溫。','出現極端火險天氣的天數。','數值越低，氣候越乾燥。','模擬罕見沿海洪水時的水深。','模擬罕見河川洪水時的水深。','相較過去氣候的年平均暖化幅度。','各國人口變化的估計。'],
};
const effects = {
 en:['Heat can cut outdoor working hours and earnings.','Smoke can make air unsafe hundreds of kilometres from the fire.','Drier soil can mean smaller harvests and less food.','Seawater can leave wells too salty to drink from.','Flooded roads can delay ambulances and cut off hospitals.','Warming can let disease-carrying mosquitoes reach new areas.','Where populations shrink, schools and clinics may close.'],
 fr:['La chaleur peut réduire les heures de travail dehors et le revenu.','La fumée peut rendre l’air dangereux à des centaines de kilomètres du feu.','Des sols plus secs peuvent réduire les récoltes et la nourriture disponible.','L’eau de mer peut rendre l’eau des puits trop salée pour être bue.','Les routes inondées peuvent retarder les ambulances et isoler des hôpitaux.','Le réchauffement peut étendre les zones où vivent des moustiques porteurs de maladies.','Là où la population diminue, des écoles et centres de soins peuvent fermer.'],
 es:['El calor puede reducir las horas de trabajo al aire libre y los ingresos.','El humo puede volver el aire peligroso a cientos de kilómetros del fuego.','Un suelo más seco puede producir cosechas menores y menos alimentos.','El agua de mar puede dejar los pozos demasiado salados para beber.','Las carreteras inundadas pueden retrasar ambulancias y aislar hospitales.','El calentamiento puede llevar mosquitos que transmiten enfermedades a nuevas zonas.','Donde disminuye la población, pueden cerrar escuelas y centros de salud.'],
 it:['Il caldo può ridurre le ore di lavoro all’aperto e i guadagni.','Il fumo può rendere l’aria pericolosa a centinaia di chilometri dal fuoco.','Un suolo più secco può dare raccolti minori e meno cibo.','L’acqua di mare può rendere i pozzi troppo salati per bere.','Le strade allagate possono ritardare le ambulanze e isolare gli ospedali.','Il riscaldamento può portare zanzare che trasmettono malattie in nuove aree.','Dove la popolazione diminuisce, scuole e ambulatori possono chiudere.'],
 vi:['Nắng nóng có thể làm giảm giờ làm ngoài trời và thu nhập.','Khói có thể làm không khí độc hại cách đám cháy hàng trăm kilômét.','Đất khô hơn có thể làm giảm mùa màng và lượng lương thực.','Nước biển có thể làm nước giếng quá mặn để uống.','Đường ngập có thể làm chậm xe cứu thương và cô lập bệnh viện.','Khí hậu nóng lên có thể đưa muỗi truyền bệnh đến vùng mới.','Ở nơi dân số giảm, trường học và cơ sở y tế có thể đóng cửa.'],
 ja:['暑さで屋外の労働時間や収入が減ることがあります。','煙は数百キロ離れた場所の空気も危険にすることがあります。','土壌が乾くと収穫量が減り、食料が少なくなることがあります。','海水で井戸水が塩辛くなり、飲めなくなることがあります。','冠水した道路で救急車が遅れ、病院が孤立することがあります。','温暖化で病気を運ぶ蚊が新たな地域に広がることがあります。','人口が減る地域では学校や診療所が閉鎖されることがあります。'],
 zh:['高温可能减少户外工作时间和收入。','烟雾可能让数百公里外的空气也变得不安全。','土壤变干可能减少收成和食物供应。','海水可能让井水变得太咸，无法饮用。','道路淹水可能延误救护车，让医院与外界隔绝。','变暖可能让传播疾病的蚊子进入新地区。','人口减少的地方可能出现学校和诊所关闭。'],
 'zh-Hant':['高溫可能減少戶外工作時間和收入。','煙霧可能讓數百公里外的空氣也變得不安全。','土壤變乾可能減少收成和食物供應。','海水可能讓井水變得太鹹，無法飲用。','道路淹水可能延誤救護車，讓醫院與外界隔絕。','暖化可能讓傳播疾病的蚊子進入新地區。','人口減少的地方可能出現學校和診所關閉。'],
};
export const impactSources = {
 chaleur:{name:'ILO',url:'https://www.ilo.org/publications/working-warmer-planet-effect-heat-stress-productivity-and-decent-work'},
 feux:{name:'WHO',url:'https://www.who.int/news-room/fact-sheets/detail/wildfires-and-health'},
 secheresse:{name:'IPCC',url:'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-4/'},
 mer:{name:'IPCC',url:'https://www.ipcc.ch/site/assets/uploads/sites/3/2022/03/06_SROCC_Ch04_FINAL.pdf'},
 fleuves:{name:'WHO',url:'https://www.who.int/health-topics/floods'},
 stabilite:{name:'WHO',url:'https://www.who.int/europe/news-room/questions-and-answers/item/public-health-advice-on-mosquito-borne-diseases'},
 declin:{name:'OECD',url:'https://www.oecd.org/en/publications/access-and-cost-of-education-and-health-services_4ab69cf3-en/full-report/component-5.html'},
};
const context = {
 en:['Possible effect','A general example, not a calculated local outcome.'],fr:['Effet possible','Exemple général, pas une conséquence locale calculée.'],
 es:['Efecto posible','Ejemplo general, no una consecuencia local calculada.'],it:['Effetto possibile','Esempio generale, non una conseguenza locale calcolata.'],
 vi:['Tác động có thể xảy ra','Ví dụ chung, không phải tác động tại địa phương được tính từ bản đồ.'],ja:['起こりうる影響','一般的な例です。この場所の影響を計算した結果ではありません。'],
 zh:['可能的影响','一般示例，并非计算出的当地后果。'],'zh-Hant':['可能的影響','一般示例，並非計算出的當地後果。'],
};
export function humanCopy(locale) {
 const language=Object.hasOwn(names,locale)?locale:'en';
 const record=rows=>Object.fromEntries(filterKeys.map((key,i)=>[key,rows[language][i]]));
 return {names:record(names),definitions:record(definitions),effects:record(effects),effectLabel:context[language][0],effectScope:context[language][1]};
}

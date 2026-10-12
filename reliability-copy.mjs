const copy = {
  en: ['City names could not load.', 'Retry loading', 'No matching city. Try the city name or a nearby city.', 'Loading additional city names…', 'Report a problem'],
  fr: ['Les noms des villes n’ont pas pu charger.', 'Réessayer', 'Aucune ville correspondante. Essayez son nom ou une ville voisine.', 'Chargement des autres noms des villes…', 'Signaler un problème'],
  es: ['No se pudieron cargar los nombres de las ciudades.', 'Reintentar', 'No hay ciudades coincidentes. Prueba su nombre o una ciudad cercana.', 'Cargando más nombres de ciudades…', 'Informar de un problema'],
  it: ['Impossibile caricare i nomi delle città.', 'Riprova', 'Nessuna città corrispondente. Prova il nome o una città vicina.', 'Caricamento di altri nomi di città…', 'Segnala un problema'],
  vi: ['Không tải được tên các thành phố.', 'Thử lại', 'Không tìm thấy thành phố phù hợp. Hãy thử tên thành phố hoặc một thành phố gần đó.', 'Đang tải thêm tên thành phố…', 'Báo sự cố'],
  ja: ['都市名を読み込めませんでした。', '再試行', '一致する都市がありません。都市名または近くの都市をお試しください。', 'その他の都市名を読み込み中…', '問題を報告'],
  zh: ['无法加载城市名称。', '重试', '没有匹配的城市。请尝试城市名称或附近的城市。', '正在加载更多城市名称…', '报告问题'],
  'zh-Hant': ['無法載入城市名稱。', '重試', '沒有相符的城市。請嘗試城市名稱或附近的城市。', '正在載入更多城市名稱…', '回報問題'],
};
export function reliabilityCopy(locale) {
  const [failed, retry, empty, additional, report] = copy[locale] || copy.en;
  return {failed, retry, empty, additional, report};
}

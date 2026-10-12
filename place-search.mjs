export function normalizePlace(value = '') {
  return String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/đ/g, 'd').replace(/ß/g, 'ss').replace(/[.'’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const countryNames = new Map();
const regionLabels = ['en', 'fr', 'es', 'it', 'vi', 'ja', 'zh', 'zh-Hant', 'de', 'pt', 'ru', 'ar', 'ko']
  .map(locale => { try { return new Intl.DisplayNames([locale], {type: 'region'}); } catch { return null; } }).filter(Boolean);
function countryAliases(iso) {
  if (!countryNames.has(iso)) {
    const names = [iso, ...(iso === 'US' ? ['USA', 'United States of America'] : iso === 'GB' ? ['UK', 'Great Britain'] : [])];
    for (const labels of regionLabels) {
      try { names.push(labels.of(iso)); } catch {}
    }
    countryNames.set(iso, [...new Set(names.filter(Boolean).map(normalizePlace))]);
  }
  return countryNames.get(iso);
}

function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2; }
    else if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

export function createPlaceSearch(places, metadata = null) {
  const entries = places.map((place, index) => {
    const isCountry = place[5] === 2;
    const primary = [...new Set([place[0], place[6]].filter(Boolean).map(normalizePlace))];
    const extra = metadata?.places?.[index];
    const aliases = [...new Set([place[8], ...(extra?.[3] || [])].filter(Boolean).map(normalizePlace))]
      .filter(value => !primary.includes(value));
    const countries = countryAliases(place[1]);
    const region = extra && metadata?.regions?.[`${extra[1]}.${extra[2]}`];
    const regionNames = [...new Set([extra?.[2], ...(region || [])].filter(Boolean).map(normalizePlace))];
    return {place, isCountry, primary: isCountry ? [...new Set([...primary, ...countries])] : primary,
      aliases, qualifiers: [...countries, ...regionNames]};
  });
  const exactNames = new Map();
  const initials = new Map();
  for (const entry of entries) {
    for (const value of [...entry.primary, ...entry.aliases]) {
      if (!exactNames.has(value)) exactNames.set(value, []);
      exactNames.get(value).push(entry);
    }
    for (const initial of new Set([...entry.primary, ...entry.aliases].map(value => value[0]))) {
      if (!initials.has(initial)) initials.set(initial, []);
      initials.get(initial).push(entry);
    }
  }
  const rank = (entry, query) => {
    for (const [values, score] of [[entry.primary, 0], [entry.aliases, 1]]) {
      if (values.includes(query)) return score;
      if (!entry.isCountry && values.some(value => {
        if (!query.startsWith(`${value} `)) return false;
        const rest = query.slice(value.length + 1);
        return entry.qualifiers.includes(rest) || entry.qualifiers.some(qualifier =>
          rest.startsWith(`${qualifier} `) && entry.qualifiers.includes(rest.slice(qualifier.length + 1)));
      })) return score;
    }
    if (entry.primary.some(value => value.startsWith(query))) return 2;
    if (entry.aliases.some(value => value.startsWith(query))) return 3;
    if (entry.primary.some(value => value.includes(query))) return 4;
    if (query.length > 2 && entry.aliases.some(value => value.includes(query))) return 5;
    return Infinity;
  };
  return (value, {limit = 7, exclude, countriesOnly} = {}) => {
    const query = normalizePlace(value);
    if (!query) return [];
    const allowed = entry => entry.place !== exclude && (countriesOnly === undefined || entry.isCountry === countriesOnly);
    const exact = exactNames.get(query)?.filter(allowed);
    const qualified = new Set();
    const words = query.split(' ');
    for (let split = 1; split < words.length; split++) {
      for (const entry of exactNames.get(words.slice(0, split).join(' ')) || []) {
        if (allowed(entry) && rank(entry, query) < 2) qualified.add(entry);
      }
    }
    const candidates = exact?.length ? exact : qualified.size ? [...qualified] : initials.get(query[0]) || [];
    let matches = candidates.filter(allowed).map(entry => ({entry, score: rank(entry, query)}))
      .filter(match => match.score < 4);
    if (!matches.length) matches = entries.filter(allowed).map(entry => ({entry, score: rank(entry, query)}))
      .filter(match => Number.isFinite(match.score));
    if (!matches.length && query.length >= 5 && /^[a-z ]+$/.test(query)) {
      matches = entries.filter(allowed).filter(entry => entry.primary.some(name => name[0] === query[0] && oneEditApart(name, query)))
        .map(entry => ({entry, score: 6}));
    }
    matches.sort((a, b) => a.score - b.score || Number(a.entry.isCountry) - Number(b.entry.isCountry)
      || (b.entry.place[4] || 0) - (a.entry.place[4] || 0));
    const result = matches.slice(0, limit);
    const country = matches.find(match => match.entry.isCountry && match.score < 4);
    if (country && !result.includes(country) && countriesOnly === undefined) result.splice(limit - 1, 1, country);
    return result.map(match => match.entry.place);
  };
}

export function decodePlaceDirectory(json, buffer) {
  const rows = json?.villes;
  if (!Array.isArray(rows) || !rows.length || buffer.byteLength !== rows.length * 24) throw new Error('Invalid city directory size');
  const data = new DataView(buffer);
  return rows.map((row, index) => {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || !row[0].trim() || !/^[A-Z]{2}$/.test(row[1])
      || !Number.isSafeInteger(row[2]) || row[2] < 0 || ![0, 1].includes(row[3])
      || typeof row[4] !== 'string' || (row[5] !== undefined && typeof row[5] !== 'string')) throw new Error('Invalid city directory entry');
    const latitude = data.getInt16(index * 24, true) / 100, longitude = data.getInt16(index * 24 + 2, true) / 100;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Invalid city coordinates');
    return [row[0], row[1], latitude, longitude, row[2], row[3], row[4], null, row[5] || ''];
  });
}

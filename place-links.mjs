export function createPlaceLinks(cities, countries) {
  const indices = new WeakMap(cities.map((place, index) => [place, index]));
  function write(params, place, comparison = false) {
    const [name, country, kind, index, point] = comparison ? ['vs', 'vc', 'vk', 'vi', 'vp'] : ['v', 'cc', 'k', 'i', 'p'];
    params.set(name, place[0]); params.set(country, place[1]);
    params.set(kind, place[5] === 2 ? 'country' : 'city');
    if (place[5] !== 2) {
      params.set(index, indices.get(place)); params.set(point, `${place[2]},${place[3]}`);
    }
  }
  function resolve(params, comparison = false) {
    const [name, country, kind, index, point] = comparison ? ['vs', 'vc', 'vk', 'vi', 'vp'] : ['v', 'cc', 'k', 'i', 'p'];
    const wanted = params.get(name), iso = params.get(country)?.toUpperCase();
    if (!wanted || (params.has(country) && !/^[A-Z]{2}$/.test(iso))) return null;
    const type = params.get(kind);
    if (type && type !== 'city' && type !== 'country') return null;
    let coordinates;
    if (params.has(point)) {
      const parts = params.get(point).split(',');
      if (parts.length !== 2 || parts.some(value => !/^-?\d+(?:\.\d+)?$/.test(value))) return null;
      coordinates = parts.map(Number);
      if (Math.abs(coordinates[0]) > 90 || Math.abs(coordinates[1]) > 180) return null;
    }
    const matches = place => (place[0] === wanted || place[6] === wanted)
      && (!iso || place[1] === iso) && (!type || (place[5] === 2 ? 'country' : 'city') === type)
      && (!coordinates || (place[2] === coordinates[0] && place[3] === coordinates[1]));
    if (params.has(index)) {
      const raw = params.get(index);
      if (!/^\d+$/.test(raw) || !coordinates || type !== 'city') return null;
      const candidate = cities[Number(raw)];
      if (candidate && matches(candidate)) return candidate;
    }
    const candidates = [...cities, ...countries].filter(matches);
    return candidates.length === 1 ? candidates[0] : null;
  }
  return {
    resolve,
    recent(place) { const params = new URLSearchParams(); write(params, place); return params.toString(); },
    hash(place, year, comparison) {
      const params = new URLSearchParams(); write(params, place); params.set('an', year);
      if (comparison) write(params, comparison, true);
      return '#' + params.toString();
    },
    restoreRecent(value) {
      if (value.startsWith('v=')) return resolve(new URLSearchParams(value));
      const [name, iso] = value.split('|'), params = new URLSearchParams({v: name});
      if (iso) params.set('cc', iso);
      return resolve(params);
    }
  };
}

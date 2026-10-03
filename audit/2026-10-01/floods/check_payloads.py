"""Read-only exhaustive audit of shipped flood values; no original-TIFF claims.

Run from repo root: python audit/2026-10-01/floods/check_payloads.py
Uses independent NumPy arithmetic and does not call the production flood reader.
"""
from pathlib import Path
import gzip
import hashlib
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / 'data'
OUT = Path(__file__).resolve().parent
meta = json.loads((DATA / 'flood-metadata.json').read_text())
citymeta = json.loads((DATA / 'flood-cities.json').read_text())
report = {'scope': 'all shipped flood grid values and all 34,099 city records; original TIFFs unavailable',
          'original_source_access': '2026-10-01 HTTPS range request denied: proxy Tunnel connection failed: 403 Forbidden',
          'original_raw_reconstruction': 'NOT RUN: no local original TIFF cache found',
          'hashes': {}, 'grid': {}, 'cities': {}, 'examples': {}}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def payload(descriptor):
    encoded = (DATA / descriptor['file']).read_bytes()
    decoded = gzip.decompress(encoded)
    assert len(encoded) == descriptor['compressed_bytes']
    assert len(decoded) == descriptor['decoded_bytes']
    assert digest(encoded) == descriptor['sha256']
    assert digest(decoded) == descriptor['decoded_sha256']
    report['hashes'][descriptor['file']] = {'compressed': digest(encoded), 'decoded': digest(decoded), 'pass': True}
    return np.frombuffer(decoded, '<f4').reshape(-1, len(descriptor['fields']))

grids = {}
for hazard, desc in meta['hazards'].items():
    values = payload(desc)
    assert len(values) == 720 * 360
    ix = {f: i for i, f in enumerate(desc['fields'])}
    coverage = values[:, ix['coverage']]
    assert np.all(np.isfinite(coverage)) and np.all((coverage >= 0) & (coverage <= 1))
    valid = coverage > 0
    assert np.all(np.isnan(values[~valid, 1:]))
    assert np.all(np.isfinite(values[valid]))
    assert np.all(values[valid, 1:] >= 0)
    fractions = [i for f, i in ix.items() if 'fraction' in f or 'agreement' in f]
    assert np.all(values[valid][:, fractions] <= 1)
    # The coverage fraction must be an integer count of the 3,600 native cells.
    assert np.max(np.abs(coverage.astype('float64') * 3600 - np.round(coverage.astype('float64') * 3600))) < .001
    models = desc['models'] if hazard == 'river' else ['coastal-median']
    depth, fraction = [], []
    for model in models:
        prefixes = ['historical', 'near_model_' + model, 'model_' + model] if hazard == 'river' else ['historical', 'near', 'future']
        depth.append(values[:, [ix[p + '_mean_depth_m'] for p in prefixes]].astype('float64'))
        fraction.append(values[:, [ix[p + '_fraction_gt_0_5m'] for p in prefixes]].astype('float64'))
    depth, fraction = np.stack(depth), np.stack(fraction)
    # A threshold fraction must be consistent with nonnegative mean depth:
    # cells counted as >0.5m contribute >0.5m each to the mean.
    assert np.all(depth[:, valid] + 1e-7 >= .5 * fraction[:, valid])
    if hazard == 'river':
        for label, epochsuffix, anchorindex in [('future', '', 2), ('near', 'near_', 1)]:
            for metricname, samples in [('mean_depth_m', depth), ('fraction_gt_0_5m', fraction)]:
                qs = np.quantile(samples[:, valid, anchorindex], [.1, .5, .9], axis=0, method='linear')
                for q, expected in zip([10, 50, 90], qs):
                    np.testing.assert_allclose(values[valid, ix[f'{label}_{metricname}_p{q}']], expected.astype('float32'), rtol=2e-7, atol=1e-8)
                expected = np.mean(np.sign(samples[:, valid, anchorindex] - samples[:, valid, 0]) == np.sign(qs[1] - samples[:, valid, 0]), axis=0)
                np.testing.assert_array_equal(values[valid, ix[epochsuffix + metricname + '_change_sign_agreement']], expected.astype('float32'))
    midpoint = np.mean(desc['historical_period'])
    hyear = round(midpoint + .000001) if hazard == 'river' else midpoint
    progress = (2026 - hyear) / (2030 - hyear)
    baseline = np.mean(depth[:, :, 0] + (depth[:, :, 1] - depth[:, :, 0]) * progress, axis=0)
    future = np.mean(depth[:, :, 2], axis=0)
    basefraction = np.mean(fraction[:, :, 0] + (fraction[:, :, 1] - fraction[:, :, 0]) * progress, axis=0)
    futurefraction = np.mean(fraction[:, :, 2], axis=0)
    means = (depth.mean(axis=0), fraction.mean(axis=0))
    report['grid'][hazard] = {'cells': len(values), 'covered': int(valid.sum()), 'missing': int((~valid).sum()),
        'valid_zero_depth_2050': int(np.sum(valid & (future == 0))),
        'valid_positive_depth_2050': int(np.sum(valid & (future > 0))),
        'depth_2026_to_2050_increases': int(np.sum(valid & (future > baseline))),
        'depth_2026_to_2050_decreases': int(np.sum(valid & (future < baseline))),
        'fraction_2026_to_2050_increases': int(np.sum(valid & (futurefraction > basefraction))),
        'fraction_2026_to_2050_decreases': int(np.sum(valid & (futurefraction < basefraction))),
        'max_mean_depth_2050_m': float(np.max(future[valid])),
        'max_fraction_2050': float(np.max(futurefraction[valid])),
        'minimum_covered_fraction': float(np.min(coverage[valid])),
        'covered_fraction_below_10_percent': int(np.sum(valid & (coverage < .1))),
        'range_mask_quantiles_pass': True, 'baseline_anchor': hyear, 'baseline_2026_interpolation_fraction': progress}
    if hazard == 'river':
        paired = fraction[:, :, 2] - (fraction[:, :, 0] + (fraction[:, :, 1] - fraction[:, :, 0]) * progress)
        central = paired.mean(axis=0)
        nontrivial_positive = valid & (central > 1e-7)
        nontrivial_negative = valid & (central < -1e-7)
        positives = (paired > 1e-7).sum(axis=0)
        negatives = (paired < -1e-7).sum(axis=0)
        report['grid'][hazard]['fraction_model_disagreement'] = {
            'numerical_deadzone_fraction': 1e-7,
            'mean_increase_cells': int(nontrivial_positive.sum()),
            'mean_increase_fewer_than_three_models_increase': int(np.sum(nontrivial_positive & (positives < 3))),
            'mean_increase_at_least_three_models_decrease': int(np.sum(nontrivial_positive & (negatives >= 3))),
            'mean_decrease_at_least_three_models_increase': int(np.sum(nontrivial_negative & (positives >= 3))),
            'meaning': 'Mean direction need not match model-majority direction; not predictive probabilities.'}
    grids[hazard] = {'values': values, 'coverage': coverage, 'valid': valid,
        'depth': depth, 'fractions': fraction, 'baseline': baseline, 'future': future,
        'basefraction': basefraction, 'futurefraction': futurefraction, 'progress': progress}

cityvalues = payload(citymeta)
places = json.loads((DATA / 'places.json').read_text())['villes']
coords = (DATA / 'places.bin').read_bytes()
assert len(places) == len(cityvalues) == citymeta['count'] == 34099
assert digest((DATA / 'places.json').read_bytes()) == citymeta['places_sha256']
assert digest(coords) == citymeta['coordinates_sha256']
coord = np.ndarray((len(places), 2), dtype='<i2', buffer=coords, strides=(24, 2)).astype('float64') / 100
cix = {f: i for i, f in enumerate(citymeta['fields'])}
for source in citymeta['sources']:
    original = next(s for s in meta['sources'] if s['filename'] == source['filename'])
    for field in ['url', 'sha256', 'hazard', 'scenario', 'epoch', 'climate_period']:
        assert source.get(field) == original.get(field)
    a = cityvalues[:, cix[source['availability_field']]]
    d = cityvalues[:, cix[source['depth_field']]]
    assert np.all((a == 0) | (a == 1))
    assert np.all(np.isnan(d[a == 0]))
    assert np.all(np.isfinite(d[a == 1])) and np.all(d[a == 1] >= 0)
    assert int((a == 1).sum()) == source['available_count']

allcity = {}
for hazard in ['coast', 'river']:
    sources = [s for s in citymeta['sources'] if s['hazard'] == hazard]
    historical = next(s for s in sources if s['epoch'] == 'historical')
    models = [s.get('model') for s in sources if s['epoch'] == 2050]
    depths, available = [], []
    for model in models:
        selected = [historical] + [next(s for s in sources if s['epoch'] == e and s.get('model') == model) for e in [2030, 2050]]
        depths.append(cityvalues[:, [cix[s['depth_field']] for s in selected]].astype('float64'))
        available.append(np.all(cityvalues[:, [cix[s['availability_field']] for s in selected]] == 1, axis=1))
    depths, available = np.stack(depths), np.stack(available)
    # Importer says masks are identical. Verify that city-mask claims agree too.
    assert np.all(available == available[0])
    native = np.any(available, axis=0)
    progress = grids[hazard]['progress']
    baseline = np.mean(depths[:, :, 0] + (depths[:, :, 1] - depths[:, :, 0]) * progress, axis=0)
    future = np.mean(depths[:, :, 2], axis=0)
    rows = np.minimum(359, np.floor((90 - coord[:, 0]) * 2)).astype(int) * 720 + np.floor((coord[:, 1] + 180) % 360 * 2).astype(int)
    regional = ~native & grids[hazard]['valid'][rows]
    finalbaseline = np.where(regional, grids[hazard]['baseline'][rows], baseline)
    finalfuture = np.where(regional, grids[hazard]['future'][rows], future)
    finalavailable = native | regional
    report['cities'][hazard] = {'count': len(places), 'native_available': int(native.sum()),
        'native_zero_depth_2050': int(np.sum(native & (future == 0))),
        'native_positive_depth_2050': int(np.sum(native & (future > 0))),
        'native_missing': int((~native).sum()), 'regional_fallback': int(regional.sum()),
        'unavailable_after_fallback': int((~finalavailable).sum()),
        'regional_zero_depth_2050': int(np.sum(regional & (finalfuture == 0))),
        'regional_positive_depth_2050': int(np.sum(regional & (finalfuture > 0))),
        'max_native_depth_2050_m': float(np.max(future[native])), 'all_availability_fields_and_source_descriptors_pass': True}
    allcity[hazard] = (finalbaseline, finalfuture, finalavailable, regional, native)
    for iso in ['PG', 'VN', 'BD', 'FR']:
        country = np.array([p[1] == iso for p in places]) & finalavailable
        pop = np.array([p[2] for p in places], dtype='float64')[country]
        b, f = np.average(finalbaseline[country], weights=pop), np.average(finalfuture[country], weights=pop)
        report['examples'][f'{iso}-{hazard}-listed-city-mean'] = {'baseline2026_m': b, 'future2050_m': f,
            'change_m': f - b, 'cities': int(country.sum()), 'regional': int(np.sum(country & regional)),
            'listed_city_population': int(pop.sum()),
            'values': [{'name': p[4], 'baseline2026_m': float(finalbaseline[i]), 'future2050_m': float(finalfuture[i]),
                        'change_m': float(finalfuture[i] - finalbaseline[i]), 'regional': bool(regional[i]),
                        'lat': float(coord[i, 0]), 'lon': float(coord[i, 1])} for i,p in enumerate(places) if country[i]]}
    for name in ['Hô Chi Minh Ville', 'Ho Chi Minh City', 'Dhaka', 'Paris', 'Port Moresby', 'Lae']:
        hits = [i for i,p in enumerate(places) if name in (p[0], p[4])]
        if not hits: continue
        i = hits[0]; row = rows[i]; g = grids[hazard]
        report['examples'][f'{name}-{hazard}-local'] = {'lat': float(coord[i,0]), 'lon': float(coord[i,1]),
            'city2026_m': float(finalbaseline[i]) if finalavailable[i] else None,
            'city2050_m': float(finalfuture[i]) if finalavailable[i] else None,
            'regional_fallback': bool(regional[i]), 'grid_coverage': float(g['coverage'][row]),
            'grid2026_mean_depth_m': float(g['baseline'][row]) if g['valid'][row] else None,
            'grid2050_mean_depth_m': float(g['future'][row]) if g['valid'][row] else None,
            'grid2026_fraction': float(g['basefraction'][row]) if g['valid'][row] else None,
            'grid2050_fraction': float(g['futurefraction'][row]) if g['valid'][row] else None,
            'grid_fraction_change_percentage_points': float((g['futurefraction'][row]-g['basefraction'][row])*100) if g['valid'][row] else None}

# 2026 is an interpolation of different source eras; it is not measured data.
report['source_contract'] = {'scenario': meta['scenario'], 'return_period_years': meta['return_period_years'],
    'river_models': meta['hazards']['river']['models'],
    'river_historical': meta['hazards']['river']['historical_period'],
    'river_near_period': meta['hazards']['river']['near_climate_period'],
    'river_future_period': meta['hazards']['river']['future_climate_period'],
    'coast_historical': meta['hazards']['coast']['historical_period'],
    'coast_subsidence': meta['hazards']['coast']['subsidence'],
    'coast_sea_level_percentile': meta['hazards']['coast']['sea_level_percentile']}
(OUT / 'payload-results.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
print(json.dumps({'grid': report['grid'], 'cities': report['cities'],
                  'PG-river': {k:v for k,v in report['examples']['PG-river-listed-city-mean'].items() if k != 'values'}}, indent=2))

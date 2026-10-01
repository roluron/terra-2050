"""Independent shipped-data audit. Does not claim to reconstruct absent raw sources."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import urllib.request

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = ROOT / 'data'
BASE = '57a0757d101a51206ba9758cfb59cbe45e0d35b2'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def base_file(name):
    return subprocess.check_output(['git', 'show', BASE + ':data/' + name], cwd=ROOT)


def main():
    fm = json.loads(base_file('fire-weather.json'))
    fire_bytes = base_file(fm['file'])
    fire = np.frombuffer(fire_bytes, dtype='<f4').reshape(72, 144, 8)
    assert hashlib.sha256(fire_bytes).hexdigest() == fm['sha256']
    coverage = fire[:, :, 7]
    valid = coverage >= .2
    a = fire[valid]
    assert np.isfinite(coverage).all() and ((coverage >= 0) & (coverage <= 1)).all()
    assert np.isnan(fire[~valid, :7]).all() and np.isfinite(a).all()
    assert ((a[:, :3] >= 0) & (a[:, :3] <= 366)).all()
    assert ((a[:, 3:6] >= -366) & (a[:, 3:6] <= 366)).all()
    assert (a[:, 4] <= a[:, 5]).all()
    assert ((a[:, 6] >= 0) & (a[:, 6] <= 1)).all()
    error = np.abs(a[:, 2] - a[:, 1] - a[:, 3])
    assert error.max() < 1e-4
    rounded = a[:, 1:3].astype('float16').astype('float32')
    exact_delta = a[:, 2] - a[:, 1]
    texture_delta = rounded[:, 1] - rounded[:, 0]
    assert not (exact_delta * texture_delta < 0).any()
    fire_samples = {}
    for name, lat, lon in [('Paris', 48.85, 2.35), ('Ho Chi Minh City', 10.82, 106.63),
                           ('Ouagadougou', 12.37, -1.52), ('Sydney', -33.87, 151.21),
                           ('Los Angeles', 34.05, -118.24), ('Sahara', 25, 10)]:
        row, col = min(71, int((90 - lat) / 2.5)), int(((lon + 180) % 360) / 2.5)
        fire_samples[name] = {'row': row, 'column': col,
            **{k: float(v) if np.isfinite(v) else None for k, v in zip(fm['fields'], fire[row, col])}}
    pop_file = DATA / 'population-annual.json'
    pm = json.loads(base_file('population-provenance.json'))
    pop_bytes = base_file(pop_file.name)
    pop = json.loads(pop_bytes)
    assert hashlib.sha256(pop_bytes).hexdigest() == pm['derived_files'][pop_file.name]['sha256']
    assert len(pop) == 237 and sum(map(len, pop.values())) == 6162
    assert all(len(values) == 26 and all(type(v) is int and v > 0 for v in values) for values in pop.values())
    assert pm['years'] == list(range(2025, 2051)) and pm['array_index'] == 'year - 2025'
    assert pm['variant'] == 'Medium (VarID 2)' and pm['measure'].startswith('TPopulation1July')
    iso = json.loads(base_file('pays_index.json'))['iso']
    image = Image.open(io.BytesIO(base_file('pays.png')))
    territory_samples = {}
    for wanted, name, lat, lon in [('GF', 'French Guiana', 4, -53), ('GP', 'Guadeloupe', 16.265, -61.551),
        ('MQ', 'Martinique', 14.64, -61.024), ('RE', 'Reunion', -21.12, 55.53), ('YT', 'Mayotte', -12.82, 45.166),
        ('GI', 'Gibraltar', 36.14, -5.35), ('BQ', 'Bonaire', 12.19, -68.28), ('TK', 'Tokelau', -9.20, -171.8)]:
        x, y = int((lon + 180) / 360 * image.width), int((90 - lat) / 180 * image.height)
        cell = image.getpixel((x, y))
        found = iso[cell if isinstance(cell, int) else cell[0]]
        territory_samples[wanted] = {'name': name, 'coordinate': [lat, lon], 'pixel': [x, y], 'map_iso': found,
            'own_2026_population': pop[wanted][1], 'own_2050_population': pop[wanted][-1],
            'own_change_since_2026_percent': (pop[wanted][-1] / pop[wanted][1] - 1) * 100,
            'map_series_change_since_2026_percent': (pop[found][-1] / pop[found][1] - 1) * 100 if found in pop else None}
    population_samples = {country: {'2025': pop[country][0], '2026': pop[country][1], '2050': pop[country][-1],
        'change_from_2025_percent': (pop[country][-1] / pop[country][0] - 1) * 100,
        'change_from_2026_percent': (pop[country][-1] / pop[country][1] - 1) * 100}
        for country in ['CN', 'VN', 'FR', 'JP', 'IN', 'NG', 'TG', 'PG']}
    remote = []
    for url in [fm['article'], fm['source'].removesuffix('/content'), 'https://population.un.org/wpp/']:
        try:
            with urllib.request.urlopen(url, timeout=15) as response:
                response.read(256)
                remote.append({'url': url, 'status': response.status})
        except Exception as request_error:
            remote.append({'url': url, 'error': str(request_error)})
    out = {'base_commit': BASE,
        'scope': 'All shipped cells and annual values; local runtime checked separately. No independent raw-source reconstruction; raw inputs absent and original domains denied by network proxy.',
        'fire': {'sha256': hashlib.sha256(fire_bytes).hexdigest(), 'cells': 10368, 'valid_cells': int(valid.sum()),
            'missing_cells': int((~valid).sum()), 'model_count': fm['modelCount'],
            'positive_changes': int((a[:, 3] > 0).sum()), 'negative_changes': int((a[:, 3] < 0).sum()),
            'p10_p90_straddle_zero': int(((a[:, 4] < 0) & (a[:, 5] > 0)).sum()),
            'max_delta_vs_future_minus_near_error_days_per_year': float(error.max()),
            'texture_half_float_delta_max_error_days_per_year': float(np.abs(exact_delta - texture_delta).max()),
            'texture_nonzero_change_quantized_to_zero_cells': int(((exact_delta != 0) & (texture_delta == 0)).sum()),
            'field_ranges': {field: {'min': float(a[:, i].min()), 'max': float(a[:, i].max())} for i, field in enumerate(fm['fields'])},
            'samples': fire_samples},
        'population': {'sha256': hashlib.sha256(pop_bytes).hexdigest(), 'countries_and_areas': len(pop), 'annual_values': 6162,
            'years': [2025, 2050], 'raster_iso_count': len(iso), 'un_codes_not_in_raster': sorted(set(pop) - set(iso)),
            'raster_codes_without_un_series': sorted(set(iso) - set(pop)), 'samples': population_samples,
            'territory_raster_samples': territory_samples}, 'remote_source_access': remote}
    (HERE / 'results.json').write_text(json.dumps(out, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
    print(json.dumps({'fire_cells': 10368, 'fire_valid_cells': int(valid.sum()), 'population_values': 6162,
                      'territory_mismatches': len(territory_samples), 'pass': True}))


if __name__ == '__main__':
    main()

import argparse
import hashlib
import json
import pathlib

import math
import re
import struct


FIELDS = ['historical', 'near', 'future', 'pairedChangeMean',
          'pairedChangeP10', 'pairedChangeP90', 'signAgreement', 'burnableFraction']
MASK_MD5 = '0ae03f09f284a42de495faefa8099c4e'
PERIODS = {'historical': (1995, 2014), 'near': (2016, 2035), 'future': (2041, 2060)}


def verify(cache, data):
    import netCDF4
    import numpy as np

    manifest = json.loads((data / 'fire-weather.json').read_text())
    assert manifest['fields'] == FIELDS
    assert (manifest['width'], manifest['height']) == (144, 72)
    for name, period in PERIODS.items():
        assert manifest[name + 'Period'] == list(period)
    payload = (data / manifest['file']).read_bytes()
    assert hashlib.sha256(payload).hexdigest() == manifest['sha256']
    assert len(payload) == 144 * 72 * len(FIELDS) * 4
    actual = np.frombuffer(payload, dtype='<f4').reshape(72, 144, len(FIELDS))
    mask_bytes = (cache / 'spatial_info.nc').read_bytes()
    assert hashlib.md5(mask_bytes).hexdigest() == MASK_MD5
    assert hashlib.sha256(mask_bytes).hexdigest() == manifest['maskSha256']
    with netCDF4.Dataset(cache / 'spatial_info.nc') as dataset:
        latitude = np.asarray(dataset['lat'][:])
        longitude = np.asarray(dataset['lon'][:])
        coverage = 1 - np.ma.filled(dataset['fraction_infreq_burning'][:], np.nan)
    np.testing.assert_array_equal(latitude, np.arange(-88.75, 90, 2.5))
    np.testing.assert_array_equal(longitude, np.arange(1.25, 360, 2.5))
    assert coverage.shape == (72, 144) and np.isfinite(coverage).all()
    assert ((coverage >= 0) & (coverage <= 1)).all()
    lat_order = np.argsort(-latitude)
    lon_order = np.argsort((longitude + 180) % 360 - 180)
    np.testing.assert_array_equal(latitude[lat_order], np.arange(88.75, -90, -2.5))
    np.testing.assert_array_equal(((longitude + 180) % 360 - 180)[lon_order], np.arange(-178.75, 180, 2.5))
    models = {}
    for member in manifest['members']:
        path = cache / member['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == member['sha256'], path.name
        with netCDF4.Dataset(path) as dataset:
            model, experiment = dataset.source_id, dataset.experiment_id
            assert model == member['model']
            assert experiment in ('historical', manifest['scenario'])
            assert f'_{experiment}_{dataset.variant_label}_' in path.name
            entry = models.setdefault(model, {})
            assert experiment not in entry, ('duplicate model/experiment', model, experiment)
            np.testing.assert_array_equal(dataset['lat'][:], latitude)
            np.testing.assert_array_equal(dataset['lon'][:], longitude)
            variable = dataset['fwixd']
            assert variable.units == 'day' and variable.dimensions == ('lat', 'lon', 'time')
            assert '1850-01-01' in variable.ref_period and '1899-12-' in variable.ref_period
            assert 'hurs_tasmax_sfcWind_pr' in dataset.original_file_names
            time = dataset['time']
            dates = netCDF4.num2date(time[:], time.units, time.calendar)
            years = np.array([date.year for date in dates])
            assert np.array_equal(years, np.arange(1850, 2015) if experiment == 'historical' else np.arange(2015, 2101))
            values = np.ma.filled(variable[:], np.nan).astype('float64')
            assert np.isfinite(values).all() and ((values >= 0) & (values <= 366)).all()
            means = {}
            for name in (['historical'] if experiment == 'historical' else ['near', 'future']):
                start, end = PERIODS[name]
                selected = (years >= start) & (years <= end)
                assert selected.sum() == 20
                means[name] = values[:, :, selected].sum(axis=2, dtype='float64') / 20
            entry[experiment] = (dataset.variant_label, means)
    assert len(models) == manifest['modelCount'] and set(models) == set(manifest['models'])
    assert len(manifest['members']) == 2 * len(models)
    periods = {name: [] for name in PERIODS}
    for model in sorted(models):
        entry = models[model]
        assert set(entry) == {'historical', manifest['scenario']}
        assert entry['historical'][0] == entry[manifest['scenario']][0], ('unpaired realization', model)
        for _, means in entry.values():
            for name, values in means.items():
                periods[name].append(values)
    historical, near, future = [np.stack(periods[name]) for name in PERIODS]
    changes = future - near
    mean_change = np.mean(changes, axis=0)
    expected = {'historical': np.mean(historical, axis=0), 'near': np.mean(near, axis=0),
                'future': np.mean(future, axis=0), 'pairedChangeMean': mean_change,
                'pairedChangeP10': np.quantile(changes, .1, axis=0, method='linear'),
                'pairedChangeP90': np.quantile(changes, .9, axis=0, method='linear'),
                'signAgreement': np.mean(np.sign(changes) == np.sign(mean_change), axis=0),
                'burnableFraction': coverage}
    for index, field in enumerate(FIELDS):
        reference = expected[field].copy()
        if field != 'burnableFraction':
            reference[coverage < .2] = np.nan
        reference = reference[np.ix_(lat_order, lon_order)]
        np.testing.assert_array_equal(np.isnan(actual[:, :, index]), np.isnan(reference), err_msg=field)
        np.testing.assert_allclose(actual[:, :, index], reference, rtol=0, atol=1e-4, equal_nan=True, err_msg=field)
    valid = actual[:, :, 7] >= .2
    assert valid.any() and (~valid).any()
    assert np.isnan(actual[~valid, :7]).all() and np.isfinite(actual[valid]).all()
    assert ((actual[valid, :3] >= 0) & (actual[valid, :3] <= 366)).all()
    assert ((actual[valid, 3:6] >= -366) & (actual[valid, 3:6] <= 366)).all()
    assert (actual[valid, 4] <= actual[valid, 5]).all()
    assert ((actual[valid, 6:8] >= 0) & (actual[valid, 6:8] <= 1)).all()
    np.testing.assert_allclose(actual[valid, 2] - actual[valid, 1], actual[valid, 3], rtol=0, atol=1e-4)
    cases = [('Ouagadougou', 12.37, -1.52), ('Paris', 48.85, 2.35),
             ('Sydney', -33.87, 151.21), ('Los Angeles', 34.05, -118.24),
             ('Dhaka', 23.81, 90.41), ('Ho Chi Minh City', 10.82, 106.63),
             ('Sahara', 25, 10), ('former_sign_mismatch', 73.75, 96.25),
             ('northwest', 90, -180), ('southeast', -90, 180), ('equator', 0, 0)]
    samples = {}
    for name, lat, lon in cases:
        row = min(71, int((90 - lat) / 2.5))
        col = min(143, int((lon + 180) / 2.5))
        values = actual[row, col]
        samples[name] = {'row': row, 'column': col,
                         **{field: float(value) if np.isfinite(value) else None for field, value in zip(FIELDS, values)}}
    assert samples['Sahara']['historical'] is None and samples['Sahara']['burnableFraction'] < .2
    assert samples['former_sign_mismatch']['pairedChangeMean'] is not None
    print(json.dumps({'verifiedCells': 72 * 144, 'verifiedFields': FIELDS, 'models': len(models),
                      'validCells': int(valid.sum()), 'samples': samples}, indent=2, allow_nan=False))


def shipped(manifest, payload):
    assert manifest['schema'] == 2 and manifest['fields'] == FIELDS
    assert (manifest['width'], manifest['height'], manifest['resolutionDegrees']) == (144, 72, 2.5)
    assert manifest['layout'] == 'north-first, west-first, cell-interleaved float32 little-endian'
    assert manifest['units'] == 'days/year' and manifest['scenario'] == 'ssp370'
    assert manifest['nearLabelYear'] == 2026 and manifest['futureLabelYear'] == 2050
    assert manifest['biasCorrection'] is False
    for name, period in PERIODS.items():
        assert manifest[name + 'Period'] == list(period)
    models = manifest['models']
    assert len(models) == len(set(models)) == manifest['modelCount'] == 21
    pairs = {}
    for member in manifest['members']:
        assert re.fullmatch('[0-9a-f]{64}', member['sha256'])
        match = re.fullmatch(r'fwixd_ann_(.+)_(historical|ssp370)_(r[0-9]+i[0-9]+p[0-9]+f[0-9]+)_g025.nc', member['file'])
        assert match and match[1] == member['model'] and match[1] in models
        pair = pairs.setdefault(match[1], {})
        assert match[2] not in pair
        pair[match[2]] = match[3]
    assert set(pairs) == set(models)
    assert all(set(pair) == {'historical', 'ssp370'} and pair['historical'] == pair['ssp370'] for pair in pairs.values())
    assert re.fullmatch('[0-9a-f]{64}', manifest['maskSha256'])
    assert hashlib.sha256(payload).hexdigest() == manifest['sha256']
    assert len(payload) == 144 * 72 * len(FIELDS) * 4
    valid = 0
    for row in struct.iter_unpack('<8f', payload):
        historical, near, future, change, p10, p90, agreement, coverage = row
        assert math.isfinite(coverage) and 0 <= coverage <= 1
        if coverage < .2:
            assert all(math.isnan(value) for value in row[:7])
            continue
        valid += 1
        assert all(math.isfinite(value) for value in row)
        assert all(0 <= value <= 366 for value in row[:3])
        assert all(-366 <= value <= 366 for value in row[3:6])
        assert p10 <= p90 and 0 <= agreement <= 1
        assert abs((future - near) - change) < 1e-4
    assert 0 < valid < 144 * 72
    return {'verifiedCells': 144 * 72, 'validCells': valid, 'models': len(models),
            'scope': 'Shipped hashes, manifest, paired members and binary contracts; raw source not read'}


def autotest(manifest, payload):
    shipped(manifest, payload)
    rows = list(struct.iter_unpack('<8f', payload))
    valid = next(i for i, row in enumerate(rows) if row[7] >= .2)
    masked = next(i for i, row in enumerate(rows) if row[7] < .2)
    mutants = [('truncated', payload[:-4], None), ('hash', payload[:-1] + bytes([payload[-1] ^ 1]), None)]
    for name, index, field, value in [('change', valid, 3, 999), ('quantiles', valid, 4, 366),
                                      ('missing to zero', masked, 0, 0), ('coverage', valid, 7, 2)]:
        altered = bytearray(payload)
        struct.pack_into('<f', altered, (index * 8 + field) * 4, value)
        metadata = json.loads(json.dumps(manifest))
        metadata['sha256'] = hashlib.sha256(altered).hexdigest()
        mutants.append((name, altered, metadata))
    unpaired = json.loads(json.dumps(manifest))
    unpaired['members'][0]['file'] = unpaired['members'][0]['file'].replace('_r1', '_r9')
    mutants.append(('unpaired realization', payload, unpaired))
    for name, altered, metadata in mutants:
        try:
            shipped(metadata or manifest, altered)
        except (AssertionError, ValueError):
            continue
        raise AssertionError('Corruption accepted: ' + name)
    print(json.dumps({'pass': True, 'rejectedMutations': [name for name, _, _ in mutants]}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=pathlib.Path, help='Reconstruct all fields from cached official NetCDF files (requires numpy and netCDF4)')
    parser.add_argument('--autotest', action='store_true')
    parser.add_argument('--data', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parent.parent / 'data')
    args = parser.parse_args()
    manifest = json.loads((args.data / 'fire-weather.json').read_text())
    payload = (args.data / manifest['file']).read_bytes()
    if args.autotest:
        autotest(manifest, payload)
    else:
        print(json.dumps(shipped(manifest, payload)))
    if args.cache:
        verify(args.cache, args.data)

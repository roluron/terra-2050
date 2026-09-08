import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import gzip
import json
import math
from pathlib import Path
import ssl
import time
import urllib.request
import zipfile

import certifi
import numpy as np
import rasterio
from rasterio.windows import Window


WIDTH, HEIGHT = 2160, 1080
PERIODS = ('1970-2000', '2021-2040', '2041-2060')
VARIABLES = ('tmin', 'tmax', 'prec')
MODEL = 'MPI-ESM1-2-HR'
BASE = 'https://geodata.ucdavis.edu'
SAMPLES = [('Dhaka', 23.81, 90.41), ('Paris', 48.86, 2.35),
           ('Phoenix', 33.45, -112.07), ('Singapore', 1.35, 103.82),
           ('Sydney', -33.87, 151.21), ('Yakutsk', 62.03, 129.73),
           ('Pacific', 0, -140), ('northwest', 90, -180),
           ('southeast', -90, 180), ('equator', 0, 0)]
SAMPLES.append(('source_temperature_inversion', 90-(55.5)/6, -180+(1452.5)/6))


def sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1 << 20), b''):
            digest.update(block)
    return digest.hexdigest()


def source(period, variable):
    if period == PERIODS[0]:
        name = f'wc2.1_10m_{variable}.zip'
        url = f'{BASE}/climate/worldclim/2_1/base/{name}'
    else:
        name = f'wc2.1_10m_{variable}_{MODEL}_ssp370_{period}.tif'
        url = f'{BASE}/cmip6/10m/{MODEL}/ssp370/{name}'
    return name, url


def datasets(path):
    if path.suffix == '.zip':
        with zipfile.ZipFile(path) as archive:
            names = sorted(n for n in archive.namelist() if n.endswith('.tif'))
        assert len(names) == 12, (path, len(names))
        assert [int(Path(n).stem.rsplit('_', 1)[1]) for n in names] == list(range(1, 13))
        return [(f'/vsizip/{path.resolve()}/{name}', 1) for name in names]
    return [(str(path), month) for month in range(1, 13)]


def validate_grid(ds, count):
    assert (ds.width, ds.height, ds.count) == (WIDTH, HEIGHT, count), ds.profile
    assert ds.crs.to_epsg() == 4326, ds.crs
    np.testing.assert_allclose(tuple(ds.transform)[:6], (1/6, 0, -180, 0, -1/6, 90), atol=1e-9, rtol=0)
    assert all(scale == 1 for scale in ds.scales), ds.scales
    assert all(offset == 0 for offset in ds.offsets), ds.offsets


def acquire(cache, period, variable):
    name, url = source(period, variable)
    path = cache / name
    receipt = cache / (name + '.json')
    if path.exists() and receipt.exists():
        meta = json.loads(receipt.read_text())
        if meta['url'] == url and meta['sha256'] == sha256(path):
            print(f'cached {name}', flush=True)
            return meta
    part = cache / (name + '.part')
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Terra2050-climate-import/1'})
            with urllib.request.urlopen(request, context=ssl.create_default_context(cafile=certifi.where()), timeout=120) as response, part.open('wb') as stream:
                expected = response.headers.get('Content-Length')
                final_url = response.url
                modified = response.headers.get('Last-Modified')
                for block in iter(lambda: response.read(1 << 20), b''):
                    stream.write(block)
            if expected:
                assert part.stat().st_size == int(expected), 'incomplete download'
            part.replace(path)
            entries = datasets(path)
            with rasterio.open(entries[0][0]) as ds:
                validate_grid(ds, 1 if path.suffix == '.zip' else 12)
            meta = {'period': period, 'variable': variable, 'filename': name, 'url': url,
                    'resolved_url': final_url, 'sha256': sha256(path), 'bytes': path.stat().st_size,
                    'retrieved_utc': datetime.now(timezone.utc).isoformat(), 'last_modified': modified}
            receipt.write_text(json.dumps(meta, indent=2) + '\n')
            print(f'downloaded {name}: {meta["bytes"]} bytes sha256={meta["sha256"]}', flush=True)
            return meta
        except Exception as error:
            if attempt == 2:
                raise
            print(f'retry {name}: {error}', flush=True)
            time.sleep(2 ** attempt)


def read_months(path, window=None):
    months = []
    for filename, band in datasets(path):
        with rasterio.open(filename) as ds:
            validate_grid(ds, 1 if path.suffix == '.zip' else 12)
            a = ds.read(band, window=window, masked=True).astype('float64')
            months.append(a.filled(np.nan))
    return np.stack(months)


def physical_metrics(tmin, tmax, prec):
    valid = np.isfinite(tmin).all(axis=0) & np.isfinite(tmax).all(axis=0) & np.isfinite(prec).all(axis=0)
    valid &= (tmin <= tmax).all(axis=0) & (prec >= 0).all(axis=0)
    mean = ((tmin + tmax) / 2).mean(axis=0)
    rain = prec.sum(axis=0)
    hot = tmax.max(axis=0)
    arid_valid = valid & (mean > -10)
    aridity = np.full(mean.shape, np.nan)
    np.divide(rain, mean + 10, out=aridity, where=arid_valid)
    values = np.stack((mean, rain, hot, aridity)).astype('<f4')
    values[:, ~valid] = np.nan
    mask = valid.astype('u1') | (arid_valid.astype('u1') << 1)
    return values, mask


def cell(latitude, longitude):
    if not (math.isfinite(latitude) and math.isfinite(longitude) and -90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError('coordinates outside geographic bounds')
    return min(HEIGHT-1, math.floor((90-latitude)*6)), min(WIDTH-1, math.floor((longitude+180)*6))


def output_record(path):
    return {'file': path.name, 'bytes': path.stat().st_size, 'sha256': sha256(path)}


def self_test():
    lo = np.full((12, 1, 3), 10.)
    hi = np.full((12, 1, 3), 20.)
    rain = np.full((12, 1, 3), 25.)
    lo[:, 0, 1], hi[:, 0, 1] = -20., -10.
    rain[0, 0, 2] = np.nan
    values, mask = physical_metrics(lo, hi, rain)
    np.testing.assert_array_equal(values[:, 0, 0], [15., 300., 20., 12.])
    np.testing.assert_array_equal(mask, [[3, 1, 0]])
    assert np.isnan(values[3, 0, 1]) and np.isnan(values[:, 0, 2]).all()
    assert cell(90, -180) == (0, 0) and cell(-90, 180) == (1079, 2159)
    assert cell(0, 0) == (540, 1080)
    try:
        cell(math.nan, 0)
    except ValueError:
        pass
    else:
        raise AssertionError('nonfinite coordinates accepted')


def verify(cache, output, manifest):
    results = []
    for period in manifest['periods']:
        for key in ('grid', 'mask'):
            record = period[key]
            path = output / record['file']
            assert path.stat().st_size == record['bytes'] and sha256(path) == record['sha256']
        grid = np.memmap(output / period['grid']['file'], dtype='<f4', mode='r', shape=(4, HEIGHT, WIDTH))
        mask = np.memmap(output / period['mask']['file'], dtype='u1', mode='r', shape=(HEIGHT, WIDTH))
        assert np.isin(mask, [0, 1, 3]).all()
        assert np.isfinite(grid[:3, (mask & 1) != 0]).all()
        assert np.isnan(grid[:, mask == 0]).all()
        assert np.isnan(grid[3, (mask & 2) == 0]).all()
        assert np.isfinite(grid[3, (mask & 2) != 0]).all()
        for name, lat, lon in SAMPLES:
            row, col = cell(lat, lon)
            monthly = [read_months(cache / source(period['id'], v)[0], Window(col, row, 1, 1)).ravel() for v in VARIABLES]
            raw_valid = all(np.isfinite(a).all() for a in monthly)
            raw_valid = raw_valid and all(a <= b for a, b in zip(monthly[0], monthly[1])) and all(x >= 0 for x in monthly[2])
            expected = [math.nan] * 4
            expected_mask = 0
            if raw_valid:
                lo, hi, rain = monthly
                temp = math.fsum((float(a)+float(b))/2 for a, b in zip(lo, hi))/12
                annual_rain = math.fsum(float(x) for x in rain)
                expected = [temp, annual_rain, float(max(hi)), annual_rain/(temp+10) if temp > -10 else math.nan]
                expected_mask = 3 if temp > -10 else 1
            np.testing.assert_array_equal(grid[:, row, col], np.array(expected, dtype='<f4'))
            assert int(mask[row, col]) == expected_mask
            results.append({'period': period['id'], 'name': name, 'latitude': lat, 'longitude': lon,
                            'row': row, 'column': col, 'mask': expected_mask,
                            'values': [float(x) if math.isfinite(x) else None for x in grid[:, row, col]]})
    return results


def run():
    self_test()
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'data')
    parser.add_argument('--download-only', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--audit', type=Path)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    runtime_output = args.output
    args.output = args.audit or args.cache.parent / 'native-audit'
    manifest_path = args.output / 'climate-manifest.json'
    if args.verify_only:
        manifest = json.loads(manifest_path.read_text())
        for record in manifest['sources']:
            assert sha256(args.cache / record['filename']) == record['sha256']
        samples = verify(args.cache, args.output, manifest)
        assert samples == manifest['verification_samples']
        verify_runtime(runtime_output, args.output, manifest)
        print(f'PASS: hashes, masks, grid alignment and {len(samples)} source-derived samples')
        return
    with ThreadPoolExecutor(max_workers=2) as pool:
        sources = list(pool.map(lambda pair: acquire(args.cache, *pair), [(p, v) for p in PERIODS for v in VARIABLES]))
    if args.download_only:
        return
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {'abi': 'terra-climate-v1', 'width': WIDTH, 'height': HEIGHT,
        'crs': 'EPSG:4326', 'bounds': [-180, -90, 180, 90], 'resolution_degrees': 1/6,
        'layout': 'band-major, then row-major; north to south, west to east; no header',
        'byte_offset': '4 * (band * width * height + row * width + column)',
        'dtype': 'little-endian float32', 'nodata': 'IEEE NaN',
        'cell_center': {'longitude': '-180 + (column + 0.5)/6', 'latitude': '90 - (row + 0.5)/6'},
        'sampling': 'nearest cell center, ties toward south/east; clamp exact geographic endpoints; no nearest-land substitution',
        'mask': {'dtype': 'uint8', 'bit_0': 'all 36 monthly inputs finite, every tmin <= tmax, every precipitation >= 0',
                 'bit_1': 'De Martonne valid: bit_0 and annual_mean_temperature > -10 C'},
        'bands': [
            {'id': 'annual_mean_temperature', 'unit': 'degC', 'formula': 'mean_months((tmin+tmax)/2)', 'note': 'Derived midpoint estimate, equal month weights; not separately supplied tavg.'},
            {'id': 'annual_precipitation', 'unit': 'mm/year', 'formula': 'sum_months(prec)'},
            {'id': 'hottest_month_mean_daily_maximum_temperature', 'unit': 'degC', 'formula': 'max_months(tmax)', 'note': 'Monthly mean of daily maxima; not an extreme daily observation.'},
            {'id': 'de_martonne_aridity', 'unit': 'index', 'formula': 'annual_precipitation/(annual_mean_temperature+10)', 'note': 'Defined only for T > -10 C; larger means wetter relative to temperature. Not water availability.'}],
        'sources': sources, 'periods': [],
        'citations': ['https://www.worldclim.org/data/worldclim21.html', 'https://www.worldclim.org/data/cmip6/cmip6climate.html', 'https://www.worldclim.org/data/cmip6/cmip6_clim10m.html', 'https://doi.org/10.1002/joc.5086', 'https://statistics.cepal.org/portal/cepalstat/technical-sheet.html?indicator_id=4567&lang=en'],
        'disclosures': ['Historical data are interpolated climatology for 1970-2000, not present-day observations.',
                        'Future data are bias-corrected downscaled climatological period means from one model under SSP3-7.0 (ssp370), not annual forecasts.',
                        'No hot-day counts or monthly-distribution estimates of observed extremes are produced.',
                        'Source cells with any monthly tmin > tmax or negative precipitation are masked, never silently corrected.',
                        'Separate flood projections use 8.5 forcing; do not present the layers as a shared-scenario forecast.'],
        'importer_sha256': sha256(__file__)}
    for period in PERIODS:
        monthly = [read_months(args.cache / source(period, v)[0]) for v in VARIABLES]
        finite = np.isfinite(monthly[0]).all(axis=0) & np.isfinite(monthly[1]).all(axis=0) & np.isfinite(monthly[2]).all(axis=0)
        quality = {'missing_input_cells': int((~finite).sum()),
                   'temperature_inversion_cells': int((finite & (monthly[0] > monthly[1]).any(axis=0)).sum()),
                   'negative_precipitation_cells': int((finite & (monthly[2] < 0).any(axis=0)).sum())}
        values, mask = physical_metrics(*monthly)
        del monthly
        grid_path = args.output / f'climate-{period}.bin'
        mask_path = args.output / f'climate-{period}-mask.bin'
        values.tofile(grid_path)
        mask.tofile(mask_path)
        manifest['periods'].append({'id': period, 'years': list(map(int, period.split('-'))),
            'kind': 'historical_climatology' if period == PERIODS[0] else 'projected_climatology',
            'model': None if period == PERIODS[0] else MODEL,
            'scenario': None if period == PERIODS[0] else 'SSP3-7.0',
            'grid': output_record(grid_path), 'mask': output_record(mask_path),
            'source_quality': quality,
            'valid_cells': int(((mask & 1) != 0).sum()), 'aridity_valid_cells': int(((mask & 2) != 0).sum())})
        print(f'packaged {period}', flush=True)
    manifest['verification_samples'] = verify(args.cache, args.output, manifest)
    manifest_path.write_text(json.dumps(manifest, indent=2, allow_nan=False) + '\n')
    package_runtime(runtime_output, args.output, manifest)
    print(f'PASS: wrote {manifest_path}; {len(manifest["verification_samples"])} source-derived samples', flush=True)


def aggregate(grid):
    blocks = grid.reshape(4, 360, 3, 720, 3)
    valid = np.isfinite(blocks)
    coverage = valid.sum(axis=(2, 4)).astype('u1')
    total = np.where(valid, blocks, 0).sum(axis=(2, 4), dtype='float64')
    result = np.full(total.shape, np.nan, dtype='<f4')
    np.divide(total, coverage, out=result, where=coverage > 0)
    return result.transpose(1, 2, 0), coverage.transpose(1, 2, 0)


def place_cells(output):
    places = json.loads((output / 'places.json').read_text())['villes']
    raw = (output / 'places.bin').read_bytes()
    assert len(places) == 34099 and len(raw) == len(places) * 24
    coordinates = np.ndarray((len(places), 2), dtype='<i2', buffer=raw, strides=(24, 2)).astype('float64') / 100
    indices = np.array([cell(lat, lon) for lat, lon in coordinates])
    return indices[:, 0], indices[:, 1]


def write_compressed(path, values):
    raw = np.ascontiguousarray(values).tobytes()
    path.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    return {**output_record(path), 'compression': 'gzip', 'uncompressed_bytes': len(raw),
            'uncompressed_sha256': hashlib.sha256(raw).hexdigest(), 'shape': list(values.shape)}


def package_runtime(output, audit, native):
    output.mkdir(parents=True, exist_ok=True)
    rows, cols = place_cells(output)
    grids, counts, points = [], [], []
    for period in native['periods']:
        grid = np.memmap(audit / period['grid']['file'], dtype='<f4', mode='r', shape=(4, HEIGHT, WIDTH))
        reduced, coverage = aggregate(grid)
        grids.append(reduced)
        counts.append(coverage)
        points.append(grid[:, rows, cols].T)
    fields = [{**band, 'period': period, 'index': i*4+j} for i, period in enumerate(PERIODS) for j, band in enumerate(native['bands'])]
    meta = {k: native[k] for k in ('sources', 'citations', 'disclosures', 'verification_samples')}
    meta.update({'abi': 'terra-climate-v2', 'shape': [360, 720, 12], 'width': 720, 'height': 360,
        'dtype': 'little-endian float32', 'compression': 'gzip', 'nodata': 'IEEE NaN',
        'layout': 'row-major, cell-interleaved fields; north to south, west to east; no header',
        'byte_offset': '4 * ((row * 720 + column) * 12 + field)',
        'fields': fields, 'crs': 'EPSG:4326', 'bounds': [-180, -90, 180, 90], 'resolution_degrees': 0.5,
        'cell_center': {'longitude': '-180 + (column + 0.5)/2', 'latitude': '90 - (row + 0.5)/2'},
        'aggregation': 'Arithmetic mean of valid native 3x3 cells per derived metric; no imputation. De Martonne is mean of native indices, not ratio of averaged metrics. Zero coverage yields NaN.',
        'coverage_definition': 'uint8 valid native-cell count 0..9 for each field, same shape and cell-interleaved layout as grid',
        'periods': [{k: p[k] for k in ('id', 'years', 'kind', 'model', 'scenario', 'source_quality')} for p in native['periods']],
        'places': {'json': output_record(output / 'places.json'), 'coordinates': output_record(output / 'places.bin'),
                   'count': len(rows), 'coordinate_layout': 'places.bin 24-byte records; latitude, longitude int16LE at offsets 0,2 divided by 100',
                   'sampling': native['sampling'], 'layout': 'places.json villes order; point-interleaved 12 fields',
                   'native_shape': [1080, 2160], 'native_resolution_degrees': 1/6},
        'importer_sha256': sha256(__file__)})
    meta['grid'] = write_compressed(output / 'climate-grid.bin', np.concatenate(grids, axis=2).astype('<f4'))
    meta['coverage'] = write_compressed(output / 'climate-coverage.bin', np.concatenate(counts, axis=2))
    meta['points'] = write_compressed(output / 'climate-points.bin', np.concatenate(points, axis=1).astype('<f4'))
    (output / 'climate-manifest.json').write_text(json.dumps(meta, indent=2, allow_nan=False) + '\n')
    verify_runtime(output, audit, native)


def verify_runtime(output, audit, native):
    meta = json.loads((output / 'climate-manifest.json').read_text())
    arrays = {}
    for key in ('grid', 'coverage', 'points'):
        record = meta[key]
        path = output / record['file']
        assert sha256(path) == record['sha256'] and path.stat().st_size == record['bytes']
        raw = gzip.decompress(path.read_bytes())
        assert len(raw) == record['uncompressed_bytes'] and hashlib.sha256(raw).hexdigest() == record['uncompressed_sha256']
        arrays[key] = np.frombuffer(raw, dtype='u1' if key == 'coverage' else '<f4').reshape(record['shape'])
    for key in ('json', 'coordinates'):
        record = meta['places'][key]
        assert sha256(output / record['file']) == record['sha256']
    assert arrays['grid'].shape == arrays['coverage'].shape == (360, 720, 12)
    assert arrays['points'].shape == (34099, 12)
    assert (arrays['coverage'] <= 9).all()
    np.testing.assert_array_equal(np.isnan(arrays['grid']), arrays['coverage'] == 0)
    rows, cols = place_cells(output)
    for i, period in enumerate(native['periods']):
        grid = np.memmap(audit / period['grid']['file'], dtype='<f4', mode='r', shape=(4, HEIGHT, WIDTH))
        np.testing.assert_array_equal(arrays['points'][:, i*4:i*4+4], grid[:, rows, cols].T)
        for _, lat, lon in SAMPLES:
            row, col = cell(lat, lon)
            r, c = row//3, col//3
            block = grid[:, r*3:r*3+3, c*3:c*3+3]
            for j in range(4):
                values = [float(x) for x in block[j].ravel() if math.isfinite(x)]
                expected = np.float32(math.fsum(values)/len(values)) if values else np.float32(np.nan)
                np.testing.assert_array_equal(arrays['grid'][r, c, i*4+j], expected)
                assert arrays['coverage'][r, c, i*4+j] == len(values)
    print('PASS runtime: hashes, coverage, native 3x3 samples and all 34,099 city rows', flush=True)


if __name__ == '__main__':
    run()

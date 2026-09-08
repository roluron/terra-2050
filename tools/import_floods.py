import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import gzip
import json
from pathlib import Path
import re
import urllib.request

import numpy as np
import rasterio
from rasterio.windows import Window

BASE = 'https://aqueduct.wridata.org/AqueductFloods20/'
MODELS = ['00000NorESM1-M', '0000GFDL-ESM2M', '0000HadGEM2-ES', '00IPSL-CM5A-LR', 'MIROC-ESM-CHEM']
NODATA = -9999.0
RUNTIME_WIDTH, RUNTIME_HEIGHT, RUNTIME_FACTOR = 720, 360, 60


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def specifications(scenario, include_near=False):
    common = {'return_period_years': 100, 'unit': 'm', 'flood_protection': 'not modelled'}
    result = [
        dict(common, filename='inunriver_historical_000000000WATCH_1980_rp00100.tif', hazard='river',
             scenario='historical', model='WATCH', epoch='historical', climate_period=[1960, 1999]),
        dict(common, filename='inuncoast_historical_nosub_hist_rp0100_0.tif', hazard='coast',
             scenario='historical', epoch='historical', climate_period=[1979, 2014], subsidence=False),
        dict(common, filename=f'inuncoast_{scenario}_nosub_2050_rp0100_0_perc_50.tif', hazard='coast',
             scenario=scenario, epoch=2050, sea_level_percentile=50, subsidence=False),
    ]
    for model in MODELS:
        result.append(dict(common, filename=f'inunriver_{scenario}_{model}_2050_rp00100.tif',
                           hazard='river', scenario=scenario, model=model.lstrip('0'), epoch=2050,
                           climate_period=[2030, 2069]))
    if include_near:
        result.append(dict(common, filename=f'inuncoast_{scenario}_nosub_2030_rp0100_0_perc_50.tif', hazard='coast',
                           scenario=scenario, epoch=2030, sea_level_percentile=50, subsidence=False))
        for model in MODELS:
            result.append(dict(common, filename=f'inunriver_{scenario}_{model}_2030_rp00100.tif', hazard='river',
                               scenario=scenario, model=model.lstrip('0'), epoch=2030, climate_period=[2010, 2049]))
    return result


def acquire(spec, folder, expected):
    name = spec['filename']
    url = BASE + name
    request = urllib.request.Request(url, headers={'Range': 'bytes=0-16383'})
    with urllib.request.urlopen(request, timeout=45) as response:
        header = response.read()
        match = re.fullmatch(r'bytes 0-16383/(\d+)', response.headers.get('Content-Range', ''))
        if response.status != 206 or len(header) != 16384 or not match:
            raise ValueError(f'Invalid HTTP range response: {name}')
        size = int(match[1])
        etag = response.headers.get('ETag')
        metadata = {key: response.headers.get(key) for key in ['ETag', 'Last-Modified', 'x-amz-version-id']}
    path = folder / name
    cached = bool(expected.get(name)) and path.exists() and path.stat().st_size == size
    if cached and expected.get(name) and digest(path) != expected[name]:
        raise ValueError(f'Cached SHA-256 mismatch: {name}')
    if not cached:
        part = path.with_suffix('.tif.part')
        try:
            with part.open('wb') as output:
                for start in range(0, size, 4 * 1024 * 1024):
                    end = min(size - 1, start + 4 * 1024 * 1024 - 1)
                    headers = {'Range': f'bytes={start}-{end}'}
                    if etag:
                        headers['If-Match'] = etag
                    request = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(request, timeout=60) as response:
                        data = response.read()
                        if (response.status != 206 or len(data) != end - start + 1
                                or response.headers.get('Content-Range') != f'bytes {start}-{end}/{size}'
                                or response.headers.get('ETag') != etag):
                            raise ValueError(f'Invalid or changed range: {name} {start}')
                        output.write(data)
            if expected.get(name) and digest(part) != expected[name]:
                raise ValueError(f'Download SHA-256 mismatch: {name}')
            part.replace(path)
        finally:
            part.unlink(missing_ok=True)
    sha = digest(path)
    with rasterio.open(path) as source:
        if (source.count != 1 or source.dtypes != ('float32',) or source.crs.to_epsg() != 4326
                or source.nodata != NODATA or source.width != 43200 or source.height != 21600
                or not source.transform.almost_equals(rasterio.transform.from_origin(-180, 90, 1/120, 1/120))):
            raise ValueError(f'Unexpected raster contract: {name}')
        raster = dict(width=source.width, height=source.height, crs=str(source.crs),
                      transform=list(source.transform), nodata=source.nodata,
                      block_shapes=source.block_shapes, overviews=source.overviews(1))
    print(f'Acquired {name}: {size} bytes SHA256 {sha}', flush=True)
    return dict(spec, url=url, path=str(path.resolve()), bytes=size, sha256=sha,
                http=metadata, http_range_verified=True, raster=raster,
                cache_reused=cached, retrieved_utc=datetime.now(timezone.utc).isoformat())


def reduce_cells(values, factor):
    values = np.ma.masked_invalid(values)
    if np.any(values.compressed() < 0):
        raise ValueError('Negative valid inundation depth')
    height, width = values.shape
    shape = (height // factor, factor, width // factor, factor)
    valid = ~np.ma.getmaskarray(values)
    counts = valid.reshape(shape).sum(axis=(1, 3))
    total = values.filled(0).astype('float64').reshape(shape).sum(axis=(1, 3))
    flooded = ((values.filled(0) > 0.5) & valid).reshape(shape).sum(axis=(1, 3))
    result = np.full((3, height // factor, width // factor), NODATA, dtype='float32')
    np.divide(total, counts, out=result[0], where=counts > 0)
    np.divide(flooded, counts, out=result[1], where=counts > 0)
    result[2] = counts / (factor * factor)
    return result


def global_grid(path, output):
    with rasterio.open(path) as source:
        profile = source.profile.copy()
        profile.update(width=2160, height=1080, count=3, tiled=True, blockxsize=256,
                       blockysize=256, compress='deflate', predictor=3,
                       transform=source.transform * rasterio.Affine.scale(20, 20))
        with rasterio.open(output, 'w', **profile) as target:
            for row in range(1080):
                values = source.read(1, window=Window(0, row * 20, 43200, 20), masked=True)
                target.write(reduce_cells(values, 20), window=Window(0, row, 2160, 1))
            for band, label in enumerate(['mean_depth_m_valid_cells', 'fraction_valid_cells_depth_gt_0.5m', 'fraction_source_valid_cells'], 1):
                target.set_band_description(band, label)
    return dict(path=str(output.resolve()), sha256=digest(output), resolution_arcminutes=10,
                aggregation='Unweighted source-cell counts, not area-weighted land or population exposure')


def samples(path, folder):
    result = []
    with rasterio.open(path) as source:
        for name, lon, lat in [('hcmc', 106.7, 10.78), ('dhaka', 90.41, 23.81), ('ouagadougou', -1.52, 12.37)]:
            row, column = source.index(lon, lat)
            window = Window(column - 12, row - 12, 25, 25)
            data = source.read(1, window=window, masked=True)
            output = folder / f'{path.stem}-{name}.tif'
            profile = source.profile.copy()
            profile.update(width=25, height=25, transform=source.window_transform(window),
                           tiled=False, blockysize=25)
            with rasterio.open(output, 'w', **profile) as target:
                target.write(data.filled(NODATA), 1)
            valid = data.compressed()
            if not np.all(np.isfinite(valid)) or np.any(valid < 0):
                raise ValueError(f'Invalid depth samples: {path}')
            result.append(dict(name=name, center=[lon, lat], bounds=list(rasterio.windows.bounds(window, source.transform)),
                               path=str(output.resolve()), sha256=digest(output), valid_cells=int(valid.size),
                               nodata_cells=int(data.size - valid.size),
                               min_m=float(valid.min()) if valid.size else None,
                               max_m=float(valid.max()) if valid.size else None,
                               cells_gt_0_5m=int((valid > 0.5).sum())))
    return result


def self_test():
    values = np.ma.array([[0, 1], [2, 7]], mask=[[False, False], [False, True]], dtype='float32')
    result = reduce_cells(values, 2)
    np.testing.assert_allclose(result[:, 0, 0], [1, 2/3, 3/4])
    empty = reduce_cells(np.ma.masked_all((2, 2)), 2)
    np.testing.assert_array_equal(empty[:, 0, 0], [NODATA, NODATA, 0])
    threshold = reduce_cells(np.ma.array([[0, 0.5], [0.5, 1]]), 2)
    np.testing.assert_array_equal(threshold[:, 0, 0], [0.5, 0.25, 1])
    baseline = np.array([[[1]], [[0.5]], [[1]]], dtype='float32')
    models = [np.array([[[v]], [[v/4]], [[1]]], dtype='float32') for v in [0, 1, 1, 2, 4]]
    bands, names = ensemble_bands(baseline, models)
    assert float(bands[names.index('mean_depth_m_change_sign_agreement')][0, 0]) == np.float32(0.4)
    assert float(bands[names.index('fraction_gt_0_5m_change_sign_agreement')][0, 0]) == np.float32(0.6)
    print('PASS: valid zero, flooded fraction and NoData denominator')


def runtime_source(item):
    path = Path(item['path'])
    if digest(path) != item['sha256']:
        raise ValueError(f'Source SHA-256 mismatch: {path}')
    result = np.empty((3, RUNTIME_HEIGHT, RUNTIME_WIDTH), dtype='float32')
    mask_hash = hashlib.sha256()
    with rasterio.open(path) as source:
        if (source.shape != (21600, 43200) or source.count != 1
                or source.crs != rasterio.crs.CRS.from_epsg(4326)
                or source.nodata != NODATA or source.dtypes != ('float32',)
                or not source.transform.almost_equals(rasterio.transform.from_origin(-180, 90, 1/120, 1/120))):
            raise ValueError(f'Unexpected source grid: {path}')
        for row in range(RUNTIME_HEIGHT):
            data = source.read(1, window=Window(0, row * RUNTIME_FACTOR, 43200, RUNTIME_FACTOR), masked=True)
            data = np.ma.masked_invalid(data)
            mask_hash.update(np.packbits(~np.ma.getmaskarray(data)).tobytes())
            result[:, row:row+1] = reduce_cells(data, RUNTIME_FACTOR)
    print(f'Aggregated {path.name}', flush=True)
    return result, mask_hash.hexdigest()


def ensemble_bands(baseline, models):
    valid = baseline[2] > 0
    bands, names = [], []
    for metric, unit in [(0, 'mean_depth_m'), (1, 'fraction_gt_0_5m')]:
        stack = np.stack([model[metric] for model in models])
        percentiles = np.quantile(stack, [0.1, 0.5, 0.9], axis=0, method='linear').astype('float32')
        for percentile, values in zip([10, 50, 90], percentiles):
            values[~valid] = NODATA
            bands.append(values)
            names.append(f'future_{unit}_p{percentile}')
        signs = np.sign(stack - baseline[metric])
        agreement = np.mean(signs == np.sign(percentiles[1] - baseline[metric]), axis=0).astype('float32')
        agreement[~valid] = NODATA
        bands.append(agreement)
        names.append(f'{unit}_change_sign_agreement')
    return bands, names


def load_manifest(manifest_path, raw_directory=None):
    manifest = json.loads(manifest_path.read_text())
    if raw_directory is not None:
        for item in manifest['sources']:
            item['path'] = str(raw_directory / item['filename'])
    return manifest


def package_floods(manifest_path, output, raw_directory=None):
    manifest = load_manifest(manifest_path, raw_directory)
    sources = manifest['sources']
    scenarios = {item['scenario'] for item in sources if item['epoch'] == 2050}
    include_near = any(item['epoch'] == 2030 for item in sources)
    if len(scenarios) != 1 or len(sources) != (14 if include_near else 8):
        raise ValueError('Expected one scenario and complete historical/2050 sources, optionally complete 2030 sources')
    scenario = scenarios.pop()
    specs = specifications(scenario, include_near)
    by_name = {item['filename']: item for item in sources}
    for spec in specs:
        if spec['filename'] not in by_name or any(by_name[spec['filename']].get(k) != v for k, v in spec.items()):
            raise ValueError('Manifest does not match the supported RP100 source contract')
    sources = [by_name[spec['filename']] for spec in specs]
    arrays, masks = {}, {}
    for item in sources:
        arrays[item['filename']], mask_hash = runtime_source(item)
        hazard = item['hazard']
        if hazard in masks and masks[hazard] != mask_hash:
            raise ValueError(f'Native valid-cell masks differ within {hazard}; refuse incomparable endpoints')
        masks[hazard] = mask_hash
    output.mkdir(parents=True, exist_ok=True)
    metadata = dict(abi='terra-floods/2', width=RUNTIME_WIDTH, height=RUNTIME_HEIGHT,
                    crs='EPSG:4326', bounds=[-180, -90, 180, 90], row_order='north_to_south',
                    column_order='west_to_east', pixel_center={'lon': '-180+(x+0.5)/2', 'lat': '90-(y+0.5)/2'},
                    transform=[0.5, 0, -180, 0, -0.5, 90],
                    encoding='gzip', decoded_dtype='float32', byte_order='little',
                    layout='north-first, west-first, cell-interleaved float32 little-endian',
                    index='(y*width+x)*fields.length+fieldIndex', nodata='NaN',
                    sampling='Containing cell: x=floor((lon+180)*2), y=floor((90-lat)*2); wrap longitude, clamp latitude at poles. Nearest sampling; no neighbouring-cell fallback or interpolation across NoData.',
                    missing='coverage == 0; all other fields are NaN. Never interpret missing as zero hazard.',
                    coverage='Fraction of 3600 native 30-arcsecond cells that are valid, including valid zero depths.',
                    aggregation='60x60 native cells: mean depth including valid zeros; fraction strictly deeper than 0.5 m over valid cells. Unweighted cell counts, not population exposure or exact area fractions. Coarse cell summaries, not city-point depths.',
                    return_period_years=100, scenario=scenario,
                    quantiles='Linear empirical quantiles of five equally weighted climate-model grid metrics after spatial aggregation; descriptive model spread, not probabilistic confidence intervals or a simulated ensemble flood event.',
                    sign_agreement='Fraction of five models agreeing with the median change sign relative to historical. Existing fields use 2050-minus-historical; near_ fields use 2030-minus-historical. Exact float32 comparisons; zero is its own sign. Neither describes 2030-to-2050 agreement.',
                    paired_epoch_change='For 2030-to-2050 change, subtract near_model from matching model_ values before computing model quantiles or sign agreement. Do not subtract independently computed percentile bounds.',
                    time_interpolation='No annual data. Interpolation, if shown by a consumer, is illustrative only. Never label historical or 2030 as observed 2026.',
                    dataset=manifest['dataset'], methodology=manifest['methodology'], catalog=manifest['catalog'],
                    license=manifest['license'], limitations=manifest['limitations'], hazards={},
                    sources=[{k: v for k, v in item.items() if k not in ['path', 'samples', 'global_grid', 'cache_reused']} for item in sources])
    for hazard in ['coast', 'river']:
        selected = [item for item in sources if item['hazard'] == hazard]
        baseline_item = next(item for item in selected if item['epoch'] == 'historical')
        future_items = [item for item in selected if item['epoch'] == 2050]
        baseline = arrays[baseline_item['filename']]
        future = [arrays[item['filename']] for item in future_items]
        bands = [baseline[2], baseline[0], baseline[1]]
        names = ['coverage', 'historical_mean_depth_m', 'historical_fraction_gt_0_5m']
        for item, data in zip(future_items, future):
            prefix = 'future' if hazard == 'coast' else 'model_' + item['model']
            bands.extend([data[0], data[1]])
            names.extend([prefix + '_mean_depth_m', prefix + '_fraction_gt_0_5m'])
        if hazard == 'river':
            extra, extra_names = ensemble_bands(baseline, future)
            bands.extend(extra)
            names.extend(extra_names)
        near_items = [item for item in selected if item['epoch'] == 2030]
        near = [arrays[item['filename']] for item in near_items]
        for item, data in zip(near_items, near):
            prefix = 'near' if hazard == 'coast' else 'near_model_' + item['model']
            bands.extend([data[0], data[1]])
            names.extend([prefix + '_mean_depth_m', prefix + '_fraction_gt_0_5m'])
        if hazard == 'river' and near:
            extra, extra_names = ensemble_bands(baseline, near)
            bands.extend(extra)
            names.extend([name.replace('future_', 'near_', 1) if name.startswith('future_') else 'near_' + name for name in extra_names])
        values = np.stack(bands).astype('<f4')
        values[values == NODATA] = np.nan
        decoded = values.transpose(1, 2, 0).copy(order='C').tobytes()
        filename = f'flood-{hazard}.bin'
        path = output / filename
        with path.open('wb') as stream:
            with gzip.GzipFile(fileobj=stream, mode='wb', filename='', mtime=0, compresslevel=9) as compressed:
                compressed.write(decoded)
        metadata['hazards'][hazard] = dict(file=filename, fields=names,
                                          bands=[dict(index=i, name=name, unit='m' if 'depth_m' in name and 'agreement' not in name else '1') for i, name in enumerate(names)],
                                          band_count=len(bands), compressed_bytes=path.stat().st_size,
                                          decoded_bytes=len(decoded), sha256=digest(path), decoded_sha256=hashlib.sha256(decoded).hexdigest(),
                                          historical_period=baseline_item['climate_period'], future_epoch=2050,
                                          near_epoch=2030 if near_items else None,
                                          near_climate_period=[2010, 2049] if near_items and hazard == 'river' else None,
                                          near_reference='2030 climate epoch, not an annual 2026 observation' if near_items else None,
                                          period_source='Ward et al. 2020, Appendix A.1.1, page 10: 2030 uses 2010-49; 2050 uses 2030-69.' if hazard == 'river' else '2030/2050 coastal sea-level projection epochs; historical GTSR 1979-2014.',
                                          future_climate_period=[2030, 2069] if hazard == 'river' else None,
                                          sea_level_percentile=50 if hazard == 'coast' else None,
                                          subsidence=False if hazard == 'coast' else None,
                                          models=[item.get('model') for item in future_items] if hazard == 'river' else [],
                                          native_valid_mask_sha256=masks[hazard], native_masks_identical=True)
    (output / 'flood-metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    verify_package(manifest_path, output, raw_directory)


def verify_package(manifest_path, output, raw_directory=None):
    metadata = json.loads((output / 'flood-metadata.json').read_text())
    manifest = load_manifest(manifest_path, raw_directory)
    assert metadata['abi'] == 'terra-floods/2'
    assert (metadata['width'], metadata['height']) == (RUNTIME_WIDTH, RUNTIME_HEIGHT)
    assert metadata['encoding'] == 'gzip' and metadata['nodata'] == 'NaN'
    tested = 0
    for hazard, info in metadata['hazards'].items():
        assert info['fields'] == [band['name'] for band in info['bands']]
        path = output / info['file']
        assert digest(path) == info['sha256']
        decoded = gzip.decompress(path.read_bytes())
        assert len(decoded) == info['decoded_bytes']
        assert hashlib.sha256(decoded).hexdigest() == info['decoded_sha256']
        data = np.frombuffer(decoded, dtype='<f4').reshape(RUNTIME_HEIGHT, RUNTIME_WIDTH, info['band_count']).transpose(2, 0, 1)
        names = {band['name']: band['index'] for band in info['bands']}
        valid = data[0] > 0
        assert np.isfinite(data[:, valid]).all() and ((data[0] >= 0) & (data[0] <= 1)).all()
        assert np.isnan(data[1:, ~valid]).all()
        for band in info['bands'][1:]:
            values = data[band['index']][valid]
            assert (values >= 0).all()
            if band['unit'] == '1':
                assert (values <= 1).all()
        selected = [s for s in manifest['sources'] if s['hazard'] == hazard]
        for source in selected:
            assert digest(Path(source['path'])) == source['sha256']
            prefix = 'historical' if source['epoch'] == 'historical' else ('future' if hazard == 'coast' else 'model_' + source['model'])
            if source['epoch'] == 2030:
                prefix = 'near' if hazard == 'coast' else 'near_model_' + source['model']
            with rasterio.open(source['path']) as raw:
                for lon, lat in [(106.7, 10.78), (90.41, 23.81), (-1.52, 12.37), (2.35, 48.86), (0, -60)]:
                    x, y = int((lon + 180) * 2), int((90 - lat) * 2)
                    native = raw.read(1, window=Window(x * RUNTIME_FACTOR, y * RUNTIME_FACTOR, RUNTIME_FACTOR, RUNTIME_FACTOR), masked=True).compressed()
                    expected = [float(native.astype('float64').mean()), float((native > 0.5).mean()), len(native)/RUNTIME_FACTOR**2] if len(native) else [np.nan, np.nan, 0]
                    actual = data[[names[prefix + '_mean_depth_m'], names[prefix + '_fraction_gt_0_5m'], 0], y, x]
                    np.testing.assert_array_equal(actual, np.array(expected, dtype='float32'))
                    tested += 1
        if hazard == 'river':
          for epoch_prefix in ['', 'near_'] if info.get('near_epoch') else ['']:
            for metric in ['mean_depth_m', 'fraction_gt_0_5m']:
                models = np.stack([data[names[epoch_prefix + 'model_' + model + '_' + metric]] for model in info['models']])
                sorted_models = np.sort(models, axis=0)
                expected = [0.6 * sorted_models[0].astype('float64') + 0.4 * sorted_models[1], sorted_models[2],
                            0.4 * sorted_models[3].astype('float64') + 0.6 * sorted_models[4]]
                for q, values in zip([10, 50, 90], expected):
                    target_prefix = 'near_' if epoch_prefix else 'future_'
                    np.testing.assert_allclose(data[names[f'{target_prefix}{metric}_p{q}']][valid], values[valid].astype('float32'), rtol=2e-7, atol=0)
                base = data[names['historical_' + metric]]
                agreement = (np.sign(models-base) == np.sign(sorted_models[2]-base)).sum(axis=0)/5
                np.testing.assert_array_equal(data[names[epoch_prefix + metric + '_change_sign_agreement']][valid], agreement[valid].astype('float32'))
    print(f'PASS: package hashes, units, NoData, {tested} native-raster sample checks, all-cell river quantiles and agreement')


def city_coordinates(places_json, places_bin):
    places = json.loads(places_json.read_text())['villes']
    records = places_bin.read_bytes()
    if len(records) != len(places) * 24:
        raise ValueError('places.bin must have one 24-byte record per places.json entry')
    coords = np.ndarray((len(places), 2), dtype='<i2', buffer=records, strides=(24, 2)).astype('float64') / 100
    if np.any(np.abs(coords[:, 0]) > 90) or np.any(np.abs(coords[:, 1]) > 180):
        raise ValueError('Invalid city coordinates')
    return places, coords[:, ::-1]


def package_cities(manifest_path, output, places_json, places_bin, raw_directory=None):
    manifest = load_manifest(manifest_path, raw_directory)
    sources = manifest['sources']
    places_hash, coordinates_hash = digest(places_json), digest(places_bin)
    places, coords = city_coordinates(places_json, places_bin)
    order = np.lexsort((coords[:, 0], -coords[:, 1]))
    values = np.full((len(places), len(sources) * 2), np.nan, dtype='<f4')
    fields, source_fields = [], []
    for source_index, item in enumerate(sources):
        path = Path(item['path'])
        if digest(path) != item['sha256']:
            raise ValueError(f'Source SHA-256 mismatch: {path}')
        epoch = 'historical' if item['epoch'] == 'historical' else 'near' if item['epoch'] == 2030 else 'future'
        prefix = item['hazard'] + '_' + epoch
        if item['hazard'] == 'river' and epoch != 'historical':
            prefix += '_' + item['model']
        fields.extend([prefix + '_depth_m', prefix + '_available'])
        with rasterio.open(path) as source:
            if source.crs != rasterio.crs.CRS.from_epsg(4326) or source.nodata != NODATA:
                raise ValueError('Unexpected native raster CRS or NoData')
            for index, sample in zip(order, source.sample(coords[order], indexes=1, masked=True)):
                value = sample[0]
                available = not np.ma.is_masked(value) and np.isfinite(value) and value != NODATA
                if available and value < 0:
                    raise ValueError('Negative valid native flood depth')
                values[index, source_index * 2] = value if available else np.nan
                values[index, source_index * 2 + 1] = available
        source_fields.append(dict(filename=item['filename'], url=item['url'], sha256=item['sha256'],
                                  hazard=item['hazard'], epoch=item['epoch'], model=item.get('model'),
                                  scenario=item['scenario'], climate_period=item.get('climate_period'),
                                  sea_level_percentile=item.get('sea_level_percentile'), subsidence=item.get('subsidence'),
                                  depth_field=fields[-2], availability_field=fields[-1],
                                  available_count=int(values[:, source_index * 2 + 1].sum())))
        print(f'Sampled {len(places)} city coordinates: {item["filename"]}', flush=True)
    decoded = values.tobytes()
    if digest(places_json) != places_hash or digest(places_bin) != coordinates_hash:
        raise ValueError('City order or coordinates changed during sampling')
    output.mkdir(parents=True, exist_ok=True)
    path = output / 'flood-cities.bin'
    with path.open('wb') as stream:
        with gzip.GzipFile(fileobj=stream, mode='wb', filename='', mtime=0, compresslevel=9) as compressed:
            compressed.write(decoded)
    metadata = dict(abi='terra-flood-cities/1', file=path.name, fields=fields, count=len(places),
                    encoding='gzip', layout='places.json order, field-interleaved float32 little-endian',
                    index='placeIndex*fields.length+fieldIndex', nodata='NaN depth with availability 0; valid zero depth has availability 1',
                    places_file=places_json.name, places_sha256=places_hash,
                    coordinates_file=places_bin.name, coordinates_sha256=coordinates_hash,
                    coordinates_encoding='24-byte records, latitude int16LE at offset 0 and longitude int16LE at offset 2, divided by 100',
                    coordinate_precision_degrees=0.01, native_resolution_arcseconds=30,
                    sampling='Native grid cell at the stored city coordinate. No interpolation, neighbourhood search or borrowed zero. Stored coordinates have 0.01-degree precision.',
                    interpretation='Not property-level risk, citywide exposure or population exposure. No flood protection, annual forecast or observed 2026 value.',
                    return_period_years=100, sha256=digest(path), decoded_sha256=hashlib.sha256(decoded).hexdigest(),
                    compressed_bytes=path.stat().st_size, decoded_bytes=len(decoded), sources=source_fields,
                    methodology=manifest['methodology'], license=manifest['license'])
    (output / 'flood-cities.json').write_text(json.dumps(metadata, indent=2) + '\n')
    verify_cities(manifest_path, output, places_json, places_bin, raw_directory)


def verify_cities(manifest_path, output, places_json, places_bin, raw_directory=None):
    metadata = json.loads((output / 'flood-cities.json').read_text())
    assert digest(places_json) == metadata['places_sha256']
    assert digest(places_bin) == metadata['coordinates_sha256']
    places, coords = city_coordinates(places_json, places_bin)
    path = output / metadata['file']
    assert digest(path) == metadata['sha256']
    decoded = gzip.decompress(path.read_bytes())
    assert hashlib.sha256(decoded).hexdigest() == metadata['decoded_sha256']
    values = np.frombuffer(decoded, dtype='<f4').reshape(len(places), len(metadata['fields']))
    available = values[:, 1::2]
    assert np.isin(available, [0, 1]).all()
    assert np.isnan(values[:, ::2][available == 0]).all()
    assert np.isfinite(values[:, ::2][available == 1]).all()
    assert (values[:, ::2][available == 1] >= 0).all()
    sources = {s['filename']: s for s in load_manifest(manifest_path, raw_directory)['sources']}
    wanted = ['paris', 'ouagadougou', 'dhaka', 'ho chi minh', 'hô chi minh']
    indices = {0, len(places)-1, len(places)//2}
    indices.update(i for i, row in enumerate(places) if any(name in ' '.join(str(v).lower() for v in row) for name in wanted))
    tested = 0
    for item in metadata['sources']:
        source = sources[item['filename']]
        assert digest(Path(source['path'])) == item['sha256']
        field = metadata['fields'].index(item['depth_field'])
        with rasterio.open(source['path']) as raw:
            for i in sorted(indices):
                row, col = raw.index(*coords[i])
                sample = raw.read(1, window=Window(col, row, 1, 1), masked=True, boundless=True)[0, 0]
                ok = not np.ma.is_masked(sample) and np.isfinite(sample) and sample != NODATA
                np.testing.assert_array_equal(values[i, field:field+2], np.array([sample if ok else np.nan, float(ok)], dtype='float32'))
                tested += 1
    print(f'PASS: {len(places)} aligned cities, coordinate hashes, zero/NoData semantics, {tested} independent native-cell checks')


def main():
    parser = argparse.ArgumentParser(description='Acquire WRI Aqueduct v2 RP100 historical/2050 and optional 2030 flood depths; requires numpy and rasterio.')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--scenario', choices=['rcp4p5', 'rcp8p5'], default='rcp8p5')
    parser.add_argument('--expected-manifest', type=Path, help='Pin all source SHA-256 values from an earlier acquisition')
    parser.add_argument('--global-grid', action='store_true', help='Also aggregate each source to a 3-band 10-arcminute raster')
    parser.add_argument('--include-near', action='store_true', help='Also acquire the matched 2030 coastal and five river sources')
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--package-manifest', type=Path, help='Package already acquired sources offline using their pinned hashes')
    parser.add_argument('--runtime-output', type=Path, help='Destination for flood-*.bin and flood-metadata.json')
    parser.add_argument('--raw-directory', type=Path, help='Override source paths when relocating the pinned raw TIFFs')
    parser.add_argument('--verify-package', action='store_true', help='Verify existing runtime files against the acquired source rasters')
    parser.add_argument('--cities-only', action='store_true', help='Package or verify native cells at each city coordinate')
    parser.add_argument('--places-json', type=Path)
    parser.add_argument('--places-bin', type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.package_manifest:
        if args.runtime_output is None:
            parser.error('--runtime-output is required with --package-manifest')
        if args.cities_only:
            if args.places_json is None or args.places_bin is None:
                parser.error('--cities-only requires --places-json and --places-bin')
            operation = verify_cities if args.verify_package else package_cities
            operation(args.package_manifest, args.runtime_output, args.places_json, args.places_bin, args.raw_directory)
            return
        if args.verify_package:
            verify_package(args.package_manifest, args.runtime_output, args.raw_directory)
        else:
            package_floods(args.package_manifest, args.runtime_output, args.raw_directory)
        return
    if args.output is None:
        parser.error('--output is required')
    args.output.mkdir(parents=True, exist_ok=True)
    raw, clips = args.output / 'raw', args.output / 'samples'
    raw.mkdir(exist_ok=True)
    clips.mkdir(exist_ok=True)
    expected = {}
    specs = specifications(args.scenario, args.include_near)
    if args.expected_manifest:
        expected = {item['filename']: item['sha256'] for item in json.loads(args.expected_manifest.read_text())['sources']}
        if not all(spec['filename'] in expected for spec in specs):
            parser.error('Expected manifest does not cover requested sources')
    with ThreadPoolExecutor(max_workers=4) as pool:
        sources = list(pool.map(lambda spec: acquire(spec, raw, expected), specs))
    manifest = dict(dataset='WRI Aqueduct Floods Hazard Maps v2, corrected 2020-10-20',
                    methodology='https://files.wri.org/d8/s3fs-public/aqueduct-floods-methodology.pdf',
                    catalog='https://datasets.wri.org/datasets/aqueduct-floods-hazard-maps',
                    download_index=BASE + 'index.html',
                    license={'name': 'Creative Commons Attribution', 'url': 'http://www.opendefinition.org/licenses/cc-by', 'version': 'not specified by catalog'},
                    limitations=['No flood protection; not residual risk or flood probability at a property.',
                                 'River baseline 1960-1999 differs from coastal GTSR 1979-2014; no common observed baseline year.',
                                 '2050 river epoch is 2030-2069; no annual forecasts, no fabricated 2026 observation.',
                                 'RCP scenarios are not interchangeable with SSP3-7.0.',
                                 'Coastal median sea-level scenario excludes subsidence; not AR6 sea-level projections.',
                                 'Coastal and river floods are separate hazards; compound flooding is not modelled.',
                                 'Five river climate models kept separate; no invented ensemble flood event.',
                                 'Raster spatial extent is global; NoData and small-basin/local-process limitations remain.',
                                 'Remote object modification date is not the climate period or scientific release date.',
                                 'SHA-256 records downloaded bytes, not independent scientific validation.'],
                    software={'rasterio': rasterio.__version__, 'gdal': rasterio.__gdal_version__, 'numpy': np.__version__},
                    sources=sources)
    manifest_path = args.output / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    for item in sources:
        path = Path(item['path'])
        item['samples'] = samples(path, clips)
        if args.global_grid:
            item['global_grid'] = global_grid(path, args.output / f'{path.stem}-10min.tif')
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Wrote {manifest_path}: {len(sources)} sources, {sum(len(x["samples"]) for x in sources)} clips')


if __name__ == '__main__':
    main()

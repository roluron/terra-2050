import concurrent.futures
import gzip
import hashlib
import io
import json
from pathlib import Path
import time
import urllib.request
import zipfile

import numpy as np
from rasterio.io import MemoryFile

ROOT = Path(__file__).resolve().parents[2]
metadata = json.loads((ROOT / 'data/climate-manifest.json').read_text())
started = time.time()


def fetch(source):
    size = source['bytes']
    request = urllib.request.Request(source['url'], headers={'Range': f'bytes=0-{size-1}'})
    with urllib.request.urlopen(request, timeout=35) as response:
        payload = response.read(size + 1)
    assert hashlib.sha256(payload).hexdigest() == source['sha256'], source['filename']
    return source['period'], source['variable'], payload


def monthly(payload):
    if payload[:2] == b'PK':
        archive = zipfile.ZipFile(io.BytesIO(payload))
        names = sorted(name for name in archive.namelist() if name.endswith('.tif'))
        assert len(names) == 12
        arrays = []
        for name in names:
            with MemoryFile(archive.read(name)) as memory, memory.open() as dataset:
                assert dataset.scales == (1.0,)
                arrays.append(dataset.read(1, masked=True).astype('float64').filled(np.nan))
        return np.stack(arrays)
    with MemoryFile(payload) as memory, memory.open() as dataset:
        assert dataset.count == 12 and all(scale == 1 for scale in dataset.scales)
        return dataset.read(masked=True).astype('float64').filled(np.nan)


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    originals = list(pool.map(fetch, metadata['sources']))
native = []
for period in ['1970-2000', '2021-2040', '2041-2060']:
    inputs = {variable: monthly(payload) for source_period, variable, payload in originals if source_period == period}
    low, high, precipitation = [inputs[key] for key in ['tmin', 'tmax', 'prec']]
    valid = (np.isfinite(low).all(axis=0) & np.isfinite(high).all(axis=0)
             & np.isfinite(precipitation).all(axis=0) & (low <= high).all(axis=0)
             & (precipitation >= 0).all(axis=0))
    temperature = ((low + high) * 0.5).mean(axis=0)
    rainfall = precipitation.sum(axis=0)
    hottest = high.max(axis=0)
    aridity = np.full(temperature.shape, np.nan)
    np.divide(rainfall, temperature + 10, out=aridity, where=valid & (temperature > -10))
    fields = np.stack([temperature, rainfall, hottest, aridity]).astype('<f4')
    fields[:, ~valid] = np.nan
    native.append(fields)
    del inputs, low, high, precipitation, temperature, rainfall, hottest, aridity, fields
originals.clear()
matched = np.logical_and.reduce([np.isfinite(fields) for fields in native])
grids, counts = [], []
for fields in native:
    blocks = fields.reshape(4, 360, 3, 720, 3)
    mask = matched.reshape(blocks.shape)
    count = mask.sum(axis=(2, 4)).astype('u1')
    total = np.where(mask, blocks, 0).sum(axis=(2, 4), dtype='float64')
    grid = np.full(total.shape, np.nan, dtype='<f4')
    np.divide(total, count, out=grid, where=count > 0)
    grids.append(grid.transpose(1, 2, 0))
    counts.append(count.transpose(1, 2, 0))
expected_grid = np.concatenate(grids, axis=2)
expected_coverage = np.concatenate(counts, axis=2)
actual_grid = np.frombuffer(gzip.decompress((ROOT / 'data/climate-grid.bin').read_bytes()), dtype='<f4').reshape(360, 720, 12)
actual_coverage = np.frombuffer(gzip.decompress((ROOT / 'data/climate-coverage.bin').read_bytes()), dtype='u1').reshape(360, 720, 12)
coordinates = np.ndarray((34099, 2), dtype='<i2', buffer=(ROOT / 'data/places.bin').read_bytes(), strides=(24, 2)).astype('float64') / 100
rows = np.minimum(1079, np.floor((90 - coordinates[:, 0]) * 6)).astype(int)
columns = np.floor(((coordinates[:, 1] + 180) % 360) * 6).astype(int)
expected_points = np.concatenate([fields[:, rows, columns].T for fields in native], axis=1)
actual_points = np.frombuffer(gzip.decompress((ROOT / 'data/climate-points.bin').read_bytes()), dtype='<f4').reshape(34099, 12)


def differences(expected, actual):
    return int((~((expected == actual) | (np.isnan(expected) & np.isnan(actual)))).sum())


result = {'official_sources_verified': 9, 'grid_fields_compared': int(actual_grid.size),
          'grid_differences': differences(expected_grid, actual_grid),
          'coverage_fields_compared': int(actual_coverage.size),
          'coverage_differences': int((expected_coverage != actual_coverage).sum()),
          'point_fields_compared': int(actual_points.size),
          'point_differences': differences(expected_points, actual_points),
          'elapsed_seconds': round(time.time() - started, 1)}
print(json.dumps(result))
assert result['grid_differences'] == result['coverage_differences'] == result['point_differences'] == 0

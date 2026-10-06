import concurrent.futures
import gzip
import hashlib
import json
from pathlib import Path
import time
import urllib.request

import numpy as np
from rasterio.io import MemoryFile
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parents[2]
metadata = json.loads((ROOT / 'data/flood-metadata.json').read_text())
city_metadata = json.loads((ROOT / 'data/flood-cities.json').read_text())
grids = {hazard: np.frombuffer(gzip.decompress((ROOT / 'data' / descriptor['file']).read_bytes()), dtype='<f4').reshape(360, 720, len(descriptor['fields'])) for hazard, descriptor in metadata['hazards'].items()}
city_values = np.frombuffer(gzip.decompress((ROOT / 'data/flood-cities.bin').read_bytes()), dtype='<f4').reshape(34099, len(city_metadata['fields']))
coordinates = np.ndarray((34099, 2), dtype='<i2', buffer=(ROOT / 'data/places.bin').read_bytes(), strides=(24, 2)).astype('float64') / 100
locations = [(10.82, 106.63), (23.78, 90.38), (52.37, 4.9), (48.85, 2.35), (-33.87, 151.21), (31.23, 121.47), (0, 0), (-84, 0)]
city_indices = [int(np.square(coordinates - location).sum(axis=1).argmin()) for location in locations[:6]]
started = time.time()


def equals(left, right):
    return bool(left == right or np.isnan(left) and np.isnan(right))


def verify(source):
    size = source['bytes']
    request = urllib.request.Request(source['url'], headers={'Range': f'bytes=0-{size-1}'})
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = response.read(size + 1)
    assert hashlib.sha256(payload).hexdigest() == source['sha256'], source['filename']
    hazard, epoch = source['hazard'], source['epoch']
    prefix = 'historical' if epoch == 'historical' else ('near' if epoch == 2030 else 'future') if hazard == 'coast' else ('near_model_' if epoch == 2030 else 'model_') + source['model']
    fields = metadata['hazards'][hazard]['fields']
    indices = [fields.index('coverage'), fields.index(prefix + '_mean_depth_m'), fields.index(prefix + '_fraction_gt_0_5m')]
    descriptor = next(item for item in city_metadata['sources'] if item['filename'] == source['filename'])
    city_fields = [city_metadata['fields'].index(descriptor[key]) for key in ['depth_field', 'availability_field']]
    checks = 0
    with MemoryFile(payload) as memory, memory.open() as dataset:
        assert dataset.width == 43200 and dataset.height == 21600 and str(dataset.crs) == 'EPSG:4326'
        for latitude, longitude in locations:
            row = min(359, int(np.floor((90 - latitude) * 2)))
            column = int(np.floor(((longitude + 180) % 360) * 2))
            values = dataset.read(1, window=Window(column * 60, row * 60, 60, 60), masked=True)
            valid = values.compressed().astype('float64')
            assert np.isfinite(valid).all() and (valid >= 0).all()
            expected = [np.float32(len(valid) / 3600), np.float32(valid.mean()) if len(valid) else np.float32(np.nan), np.float32((valid > 0.5).mean()) if len(valid) else np.float32(np.nan)]
            actual = grids[hazard][row, column, indices]
            assert all(equals(left, right) for left, right in zip(expected, actual)), (source['filename'], latitude, longitude, expected, actual.tolist())
            checks += 3
        for city_index in city_indices:
            latitude, longitude = coordinates[city_index]
            row = min(21599, int(np.floor((90 - latitude) * 120)))
            column = int(np.floor(((longitude + 180) % 360) * 120))
            value = dataset.read(1, window=Window(column, row, 1, 1), masked=True)
            available = not bool(np.ma.getmaskarray(value)[0, 0])
            expected = [np.float32(value[0, 0]) if available else np.float32(0), np.float32(available)]
            actual = city_values[city_index, city_fields]
            assert all(equals(left, right) for left, right in zip(expected, actual)), (source['filename'], city_index, expected, actual.tolist())
            checks += 2
    return {'source': source['filename'], 'sha256_verified': True, 'exact_fields_compared': checks}


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(verify, metadata['sources']))
print(json.dumps({'official_sources_verified': len(results), 'exact_fields_compared': sum(item['exact_fields_compared'] for item in results),
                  'coarse_cells_per_source': len(locations), 'city_points_per_source': len(city_indices),
                  'differences': 0, 'elapsed_seconds': round(time.time() - started, 1),
                  'limit': 'Full source hashes and sampled native-to-shipped transformations, not exhaustive flood reconstruction.'}))

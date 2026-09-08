import argparse
import hashlib
import io
import json
import pathlib
import re
import struct
import urllib.request
import zipfile
import zlib


URL = 'https://www.research-collection.ethz.ch/server/api/core/bitstreams/21ebf431-5c20-4a85-82c6-bb96df91daaa/content'
HEADERS = {'User-Agent': 'Terra2050-data-import/1.0', 'Accept': '*/*'}
MASK_MD5 = '0ae03f09f284a42de495faefa8099c4e'


def fetch_range(start, end):
    request = urllib.request.Request(URL, headers={**HEADERS, 'Range': f'bytes={start}-{end}'})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 206:
            raise ValueError('Source must support byte ranges')
        data = response.read()
    if len(data) != end - start + 1:
        raise ValueError('Incomplete source range')
    return data


def acquire(cache, scenario):
    request = urllib.request.Request(URL.removesuffix('/content'), headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        metadata = json.load(response)
    size = metadata['sizeBytes']
    tail = fetch_range(size - 65536, size - 1)
    end = tail.rfind(b'PK\x05\x06')
    if end < 0:
        raise ValueError('ZIP end record missing')
    directory_size, directory_offset = struct.unpack_from('<II', tail, end + 12)
    directory = fetch_range(directory_offset, directory_offset + directory_size - 1)
    archive = zipfile.ZipFile(io.BytesIO(directory + tail[end:]))
    entries = {item.filename: item for item in archive.infolist()}
    selected = {}
    for name in sorted(entries):
        match = re.fullmatch(r'fwixd_ann_(.+)_' + scenario + r'_(r\di\dp\df\d)_g025.nc', name)
        if match:
            model, member = match.groups()
            historical = name.replace('_' + scenario + '_', '_historical_')
            if historical in entries and model not in selected:
                selected[model] = [historical, name]
    if not selected:
        raise ValueError('No paired historical and scenario models')
    provenance = {'source': URL, 'doi': '10.3929/ethz-b-000583391',
                  'archive': metadata['name'], 'archiveChecksum': metadata['checkSum'],
                  'scenario': scenario, 'members': []}
    for model, names in selected.items():
        for name in names:
            info = entries[name]
            target = cache / name
            if not target.exists():
                # zipfile rebases offsets when reading a detached central directory.
                offset = info.header_offset + directory_offset
                header = fetch_range(offset, offset + 29)
                if header[:4] != b'PK\x03\x04':
                    raise ValueError('ZIP local header mismatch')
                name_length, extra_length = struct.unpack_from('<HH', header, 26)
                begin = offset + 30 + name_length + extra_length
                compressed = fetch_range(begin, begin + info.compress_size - 1)
                if info.compress_type != zipfile.ZIP_DEFLATED:
                    raise ValueError('Unsupported compression')
                data = zlib.decompress(compressed, -15)
                if len(data) != info.file_size or zlib.crc32(data) != info.CRC:
                    raise ValueError('Source integrity check failed')
                target.write_bytes(data)
            data = target.read_bytes()
            if len(data) != info.file_size or zlib.crc32(data) != info.CRC:
                raise ValueError(f'Invalid cached member: {name}')
            provenance['members'].append({'model': model, 'file': name,
                                           'sha256': hashlib.sha256(data).hexdigest(),
                                           'crc32': f'{info.CRC:08x}'})
        print(model, flush=True)
    (cache / 'source-manifest.json').write_text(json.dumps(provenance, indent=2) + '\n')
    mask_url = URL.replace('21ebf431-5c20-4a85-82c6-bb96df91daaa', 'b352bee1-2806-497a-a008-89b582712617')
    request = urllib.request.Request(mask_url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    if hashlib.md5(data).hexdigest() != MASK_MD5:
        raise ValueError('Land-cover mask differs from published checksum')
    (cache / 'spatial_info.nc').write_bytes(data)
    return provenance


def package(cache, output):
    import netCDF4
    import numpy as np

    provenance = json.loads((cache / 'source-manifest.json').read_text())
    if hashlib.md5((cache / 'spatial_info.nc').read_bytes()).hexdigest() != MASK_MD5:
        raise ValueError('Invalid cached land-cover mask')
    groups = {}
    for member in provenance['members']:
        path = cache / member['file']
        if hashlib.sha256(path.read_bytes()).hexdigest() != member['sha256']:
            raise ValueError('Changed source member')
        groups.setdefault(member['model'], []).append(path)
    historical, near, future = [], [], []
    expected_lat = np.arange(-88.75, 90, 2.5)
    expected_lon = np.arange(1.25, 360, 2.5)
    for model, paths in groups.items():
        for path in paths:
            with netCDF4.Dataset(path) as dataset:
                assert dataset.source_id == model
                assert np.array_equal(dataset['lat'][:], expected_lat)
                assert np.array_equal(dataset['lon'][:], expected_lon)
                variable = dataset['fwixd']
                assert variable.units == 'day'
                assert variable.dimensions == ('lat', 'lon', 'time')
                time = dataset['time']
                years = np.array([date.year for date in netCDF4.num2date(time[:], time.units, time.calendar)])
                values = np.ma.filled(variable[:], np.nan)
                assert np.isfinite(values).all() and values.min() >= 0 and values.max() <= 366
                periods = [(1995, 2014, historical)] if dataset.experiment_id == 'historical' else [(2016, 2035, near), (2041, 2060, future)]
                if dataset.experiment_id != 'historical':
                    assert dataset.experiment_id == provenance['scenario']
                for start, end, target in periods:
                    selected = (years >= start) & (years <= end)
                    assert selected.sum() == 20 and len(set(years[selected])) == 20
                    target.append(values[:, :, selected].mean(axis=2))
    assert len(historical) == len(near) == len(future) == len(groups)
    with netCDF4.Dataset(cache / 'spatial_info.nc') as dataset:
        assert np.array_equal(dataset['lat'][:], expected_lat)
        assert np.array_equal(dataset['lon'][:], expected_lon)
        coverage = np.asarray(1 - dataset['fraction_infreq_burning'][:])
    near, future = np.array(near), np.array(future)
    delta = future - near
    mean_delta = np.mean(delta, axis=0)
    agreement = np.mean(np.sign(delta) == np.sign(mean_delta), axis=0)
    fields = np.stack([np.mean(historical, axis=0), np.mean(near, axis=0),
                       np.mean(future, axis=0), mean_delta,
                       np.quantile(delta, .1, axis=0), np.quantile(delta, .9, axis=0),
                       agreement, coverage], axis=-1)
    fields[coverage < .2, :7] = np.nan
    # North-first rows and -180..180 columns match the globe texture coordinates.
    fields = np.roll(fields[::-1], 72, axis=1).astype('<f4')
    output.mkdir(parents=True, exist_ok=True)
    payload = fields.tobytes()
    (output / 'fire-weather.bin').write_bytes(payload)
    assert np.array_equal(np.frombuffer(payload, dtype='<f4').reshape(fields.shape), fields, equal_nan=True)
    provenance.update({
        'schema': 2, 'metric': 'Days per year above the local preindustrial FWI 95th percentile',
        'units': 'days/year', 'thresholdReference': '1850–1899 (as recorded in source NetCDF)',
        'historicalPeriod': [1995, 2014], 'nearPeriod': [2016, 2035], 'futurePeriod': [2041, 2060],
        'nearLabelYear': 2026, 'futureLabelYear': 2050,
        'timeline': 'Linear interpolation between two 20-year model climatologies; not observed annual fires',
        'ensemble': 'Equal weight per model; first available paired single-digit realization; arithmetic mean of 20-year means',
        'modelCount': len(groups), 'models': list(groups), 'biasCorrection': False,
        'uncertainty': '10th–90th percentiles of paired model changes; model spread, not a confidence interval',
        'resolutionDegrees': 2.5, 'width': 144, 'height': 72, 'layout': 'north-first, west-first, cell-interleaved float32 little-endian',
        'fields': ['historical', 'near', 'future', 'pairedChangeMean', 'pairedChangeP10', 'pairedChangeP90', 'signAgreement', 'burnableFraction'],
        'nodata': 'NaN; cells with more than 80% infrequently burning land cover excluded',
        'maskSource': 'spatial_info.nc, ESA CCI land cover 2016, distributed with the source dataset',
        'maskSha256': hashlib.sha256((cache / 'spatial_info.nc').read_bytes()).hexdigest(),
        'license': 'CC BY 4.0', 'article': 'https://essd.copernicus.org/articles/15/2153/2023/',
        'file': 'fire-weather.bin', 'sha256': hashlib.sha256(payload).hexdigest(),
        'limitations': ['Weather potential, not ignition, burned area or active fires', 'Regional grid; not a city-scale forecast', 'Uncorrected climate-model biases', 'Static 2016 land cover; no projected vegetation or land-use change']
    })
    (output / 'fire-weather.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps({'models': len(groups), 'validCells': int(np.isfinite(fields[:, :, 0]).sum()),
                      'increaseCells': int(np.count_nonzero(fields[:, :, 3] > 0)),
                      'decreaseCells': int(np.count_nonzero(fields[:, :, 3] < 0)), 'bytes': len(payload)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=pathlib.Path, required=True)
    parser.add_argument('--scenario', choices=['ssp126', 'ssp245', 'ssp370', 'ssp585'], default='ssp370')
    parser.add_argument('--output', type=pathlib.Path)
    parser.add_argument('--cached', action='store_true')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    if not args.cached:
        acquire(args.cache, args.scenario)
    if args.output:
        package(args.cache, args.output)

"""Pinned Natural Earth map-unit raster matched to UN demographic-area codes.

python tools/pays_raster.py --source-50m path.geojson --source-10m path.geojson
python tools/pays_raster.py --autotest         # reconstruct without product writes
python tools/pays_raster.py --verify-shipped   # shipped checks, no network

50m map units separate French overseas areas and Caribbean Netherlands.
Gibraltar alone uses the 10m source. Missing sources are downloaded and hashed.
Classification uses cell centres and never artificially enlarges tiny islands.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import re
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
W, H = 2160, 1080
COMMIT = 'ca96624a56bd078437bca8184e78163e5039ad19'
SOURCE_BASE = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{COMMIT}/geojson/'
SOURCES = {
    '50m': {'file': 'ne_50m_admin_0_map_units.geojson',
            'sha256': 'b8d421aca6e9e08e8cdf09cc26af111cc3e0deba4fe915611d58ade71e8a4db0'},
    '10m': {'file': 'ne_10m_admin_0_map_units.geojson',
            'sha256': '57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862'},
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source(path, scale):
    descriptor = SOURCES[scale]
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(SOURCE_BASE + descriptor['file'], timeout=60) as response:
            raw = response.read()
        if sha(raw) != descriptor['sha256']:
            raise ValueError('Downloaded Natural Earth source hash mismatch: ' + scale)
        path.write_bytes(raw)
    raw = path.read_bytes()
    if sha(raw) != descriptor['sha256']:
        raise ValueError('Cached Natural Earth source hash mismatch: ' + scale)
    data = json.loads(raw)
    if data.get('type') != 'FeatureCollection':
        raise ValueError('Expected Natural Earth FeatureCollection')
    return data['features']


def iso2(feature):
    value = feature['properties'].get('ISO_A2_EH')
    return value if isinstance(value, str) and re.fullmatch('[A-Z]{2}', value) else None


def paint_polygon(raster, rings, index):
    """Even-odd scanlines at pixel centres; interior rings remain holes."""
    vertices = np.asarray([point for ring in rings for point in ring], dtype='float64')
    if vertices.ndim != 2 or vertices.shape[1] != 2 or not np.isfinite(vertices).all():
        raise ValueError('Invalid polygon coordinates')
    if not ((vertices[:, 0] >= -180) & (vertices[:, 0] <= 180)
            & (vertices[:, 1] >= -90) & (vertices[:, 1] <= 90)).all():
        raise ValueError('Coordinate outside lon/lat bounds')
    edge_groups = []
    for ring in rings:
        points = np.asarray(ring, dtype='float64')
        if len(points) < 4 or not np.array_equal(points[0], points[-1]):
            raise ValueError('Natural Earth ring must be closed')
        edge_groups.append((points[:-1, 0], points[:-1, 1], points[1:, 0], points[1:, 1]))
    x1, y1, x2, y2 = [np.concatenate([edges[i] for edges in edge_groups]) for i in range(4)]
    first = max(0, int(np.ceil((90 - vertices[:, 1].max()) * H / 180 - .5)))
    last = min(H, int(np.ceil((90 - vertices[:, 1].min()) * H / 180 - .5)))
    for row in range(first, last):
        latitude = 90 - (row + .5) * 180 / H
        crossed = (y1 > latitude) != (y2 > latitude)
        crossings = np.sort(x1[crossed] + (latitude - y1[crossed])
                            * (x2[crossed] - x1[crossed]) / (y2[crossed] - y1[crossed]))
        if len(crossings) % 2:
            raise ValueError('Unpaired polygon scanline crossings')
        for left, right in zip(crossings[::2], crossings[1::2]):
            start = max(0, int(np.ceil((left + 180) * W / 360 - .5)))
            end = min(W, int(np.ceil((right + 180) * W / 360 - .5)))
            raster[row, start:end] = index


def rasterise(features_50m, features_10m):
    features = [feature for feature in features_50m if iso2(feature)]
    gibraltar = [feature for feature in features_10m if iso2(feature) == 'GI']
    if len(gibraltar) != 1 or any(iso2(feature) == 'GI' for feature in features):
        raise ValueError('Unexpected Gibraltar source selection')
    features.extend(gibraltar)
    codes = [''] + sorted({iso2(feature) for feature in features})
    if len(codes) > 256:
        raise ValueError('Palette exceeds the one-byte / 256-column contract')
    indices = {code: index for index, code in enumerate(codes)}
    raster = np.zeros((H, W), dtype='uint8')
    for feature in features:
        geometry = feature['geometry']
        if geometry['type'] not in {'Polygon', 'MultiPolygon'}:
            raise ValueError('Unexpected map-unit geometry')
        polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
        for rings in polygons:
            paint_polygon(raster, rings, indices[iso2(feature)])
    return Image.fromarray(raster), codes


def read(image, codes, latitude, longitude):
    x = min(W - 1, max(0, int((longitude + 180) * W / 360)))
    y = min(H - 1, max(0, int((90 - latitude) * H / 180)))
    return codes[image.getpixel((x, y))]


WITNESSES = [(48.85, 2.35, 'FR'), (40.71, -74, 'US'), (-29.533, 28.6, 'LS'),
    (1.35, 103.82, 'SG'), (70, -45, 'GL'), (35.68, 139.69, 'JP'),
    (-33.87, 151.21, 'AU'), (55.75, 37.62, 'RU'), (-23.55, -46.63, 'BR'),
    (30.04, 31.24, 'EG'), (0, -160, ''), (43.73, 7.42, 'MC'),
    (4, -53, 'GF'), (16.25, -61.5833333333333, 'GP'), (-21.12, 55.53, 'RE'),
    (-12.82, 45.166, 'YT'), (36.14, -5.35, ''),
    (-29.31, 27.48, 'ZA'), (64.18, -51.72, '')]


def verify(image, codes):
    if image.mode != 'L' or image.size != (W, H) or codes[0] != '' or len(codes) != len(set(codes)) or len(codes) > 256:
        raise ValueError('Invalid raster dimensions, palette or sentinel')
    if max(image.tobytes()) >= len(codes):
        raise ValueError('Pixel outside the ISO palette')
    for latitude, longitude, expected in WITNESSES:
        actual = read(image, codes, latitude, longitude)
        if actual != expected:
            raise ValueError(f'Witness mismatch: {latitude}, {longitude}: {actual!r} != {expected!r}')
    annual = json.loads((ROOT / 'data/population-annual.json').read_text())
    if not set(annual).issubset(codes):
        raise ValueError('Missing UN demographic-area code in palette')
    return {'witnesses': len(WITNESSES), 'palette_entries': len(codes), 'un_series_codes': len(annual)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-50m', type=Path, default=ROOT / 'raw' / SOURCES['50m']['file'])
    parser.add_argument('--source-10m', type=Path, default=ROOT / 'raw' / SOURCES['10m']['file'])
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data')
    parser.add_argument('--autotest', action='store_true')
    parser.add_argument('--verify-shipped', action='store_true')
    args = parser.parse_args()
    if args.verify_shipped:
        image = Image.open(args.output_dir / 'pays.png')
        codes = json.loads((args.output_dir / 'pays_index.json').read_text())['iso']
        provenance = json.loads((args.output_dir / 'pays-provenance.json').read_text())
        for name, descriptor in provenance['outputs'].items():
            if sha((args.output_dir / name).read_bytes()) != descriptor['sha256']:
                raise ValueError('Shipped raster hash mismatch: ' + name)
        print(json.dumps({'pass': True, **verify(image, codes), 'scope': 'Shipped geographic witnesses and provenance hashes; source reconstruction requires pinned GeoJSON.'}))
        return
    image, codes = rasterise(source(args.source_50m, '50m'), source(args.source_10m, '10m'))
    report = verify(image, codes)
    if not args.autotest:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        image.save(args.output_dir / 'pays.png', optimize=True)
        index = {'w': W, 'h': H, 'iso': codes}
        (args.output_dir / 'pays_index.json').write_text(json.dumps(index, separators=(',', ':')) + '\n')
        counts = Counter(image.tobytes())
        annual = json.loads((ROOT / 'data/population-annual.json').read_text())
        provenance = {'dataset': 'Natural Earth admin-0 map units', 'repository': 'https://github.com/nvkelso/natural-earth-vector',
            'source_commit': COMMIT, 'generated_utc_date': datetime.now(timezone.utc).date().isoformat(), 'license': 'Public domain',
            'sources': {scale: {**descriptor, 'url': SOURCE_BASE + descriptor['file']} for scale, descriptor in SOURCES.items()},
            'selection': 'All 50m map units with valid ISO_A2_EH; Gibraltar alone from 10m. Features sharing an ISO code use one palette entry. Unassigned ISO -99 units are not assigned an invented country.',
            'raster': {'width': W, 'height': H, 'resolution_degrees': 1 / 6, 'orientation': 'north-first, west-first',
                       'method': 'Even-odd polygon scanlines at cell centres; polygon holes excluded; no outline dilation or artificial enlargement of small islands.',
                       'pixel_coordinate': 'longitude = -180 + (x+0.5)/6; latitude = 90 - (y+0.5)/6',
                       'lookup': 'x=floor((lon+180)*6), y=floor((90-lat)*6), clamped to grid bounds',
                       'encoding': 'uint8 grayscale; 0=no assigned map unit; nonzero value indexes pays_index.json iso',
                       'palette_entries_including_zero': len(codes)},
            'un_population_series_codes_in_palette': len(annual),
            'un_population_series_without_raster_cells': sorted(code for code in annual if counts[codes.index(code)] == 0),
            'limitations': ['Simplified Natural Earth geography, not a legal or property boundary.',
                           'Demographic areas such as French overseas territories are distinct from sovereign-country population series.',
                           'Areas smaller than a raster cell may have no sampled cell centres; annual series can be available while map coverage is incomplete.',
                           'Codes and disputed boundaries follow the pinned Natural Earth source; this is not an independent political classification.'],
            'outputs': {name: {'sha256': sha((args.output_dir / name).read_bytes()), 'bytes': (args.output_dir / name).stat().st_size}
                        for name in ['pays.png', 'pays_index.json']}}
        (args.output_dir / 'pays-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps({'pass': True, **report, 'scope': 'Reconstructed from checked official Natural Earth GeoJSON sources', 'writes': not args.autotest}))


if __name__ == '__main__':
    main()

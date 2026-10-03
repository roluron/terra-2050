"""Independently check territory pixel centres against official polygon extract."""
from collections import Counter
import hashlib
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def in_ring(longitude, latitude, ring):
    inside = False
    for (ax, ay), (bx, by) in zip(ring[:-1], ring[1:]):
        if (ay > latitude) != (by > latitude):
            crossing = ax + (latitude - ay) * (bx - ax) / (by - ay)
            if longitude < crossing:
                inside = not inside
    return inside


def in_feature(longitude, latitude, feature):
    geometry = feature['geometry']
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(sum(in_ring(longitude, latitude, ring) for ring in polygon) % 2 == 1 for polygon in polygons)


def main():
    index = json.loads((ROOT / 'data/pays_index.json').read_text())
    codes = index['iso']
    image = Image.open(ROOT / 'data/pays.png')
    provenance = json.loads((ROOT / 'data/pays-provenance.json').read_text())
    assert image.mode == 'L' and image.size == (2160, 1080)
    assert len(codes) == len(set(codes)) == 249 and codes[0] == ''
    assert max(image.tobytes()) < len(codes) <= 256
    annual = json.loads((ROOT / 'data/population-annual.json').read_text())
    assert len(annual) == 237 and set(annual).issubset(codes)
    for name, descriptor in provenance['outputs'].items():
        assert hashlib.sha256((ROOT / 'data' / name).read_bytes()).hexdigest() == descriptor['sha256']
    features = json.loads((HERE / 'territory-source-extract.geojson').read_text())['features']
    counts = Counter(image.tobytes())
    report = {}
    for feature in features:
        code = feature['properties']['ISO_A2_EH']
        palette_index = codes.index(code)
        painted = 0
        # Every painted territory cell must contain a real geographic cell centre.
        for offset, value in enumerate(image.tobytes()):
            if value != palette_index:
                continue
            row, column = divmod(offset, 2160)
            longitude, latitude = -180 + (column + .5) / 6, 90 - (row + .5) / 6
            assert in_feature(longitude, latitude, feature), (code, latitude, longitude)
            painted += 1
        assert painted == counts[palette_index]
        report[code] = {'correctly_contained_pixels': painted, 'un_series_available': code in annual}
    # Missing tiny territory geometry does not become the nearby state's series.
    for latitude, longitude in [(36.14, -5.35), (-9.20, -171.8)]:
        pixel = image.getpixel((int((longitude + 180) * 6), int((90 - latitude) * 6)))
        assert pixel == 0
    zero_pixel = sorted(code for code in annual if counts[codes.index(code)] == 0)
    assert zero_pixel == provenance['un_population_series_without_raster_cells']
    out = {'pass': True, 'palette_entries': len(codes), 'un_series_in_palette': 237,
        'territories': report, 'un_series_without_raster_cells': zero_pixel,
        'scope': 'Every corrected territory pixel independently checked by point-in-polygon; shipped hashes and UN-code compatibility. Tiny areas are not enlarged.'}
    (HERE / 'geography-results.json').write_text(json.dumps(out, indent=2) + '\n')
    print(json.dumps(out))


if __name__ == '__main__':
    main()

import hashlib
import json
import math
import os
from pathlib import Path
import struct
import subprocess
import sys

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
KEYS = ['thermal', 'aridity', 'fire', 'coast', 'river', 'climate_shift']
WEIGHTS = [.22, .18, .12, .20, .16, .12]


def verify(names, data, thermal, tides):
    assert len(data) == len(names) * 24, 'City record length mismatch'
    assert len(thermal) == len(names) * 6, 'Thermal record length mismatch'
    assert len(tides) == len(names) * 2, 'Tide record length mismatch'
    changes = {k: dict(increase=0, decrease=0, unchanged=0) for k in KEYS}
    scored = 0
    for i, name in enumerate(names):
        record = data[i * 24:(i + 1) * 24]
        lat, lon = struct.unpack_from('<hh', record)
        assert -9000 <= lat <= 9000 and -18000 <= lon <= 18000, name
        if record[4] == 255:
            continue
        scored += 1
        a, b = record[4:10], record[10:16]
        assert max(a + b) <= 250, name
        assert a[4] == b[4], 'A fixed river reference cannot acquire annual change'
        for k, x, y in zip(KEYS, a, b):
            changes[k]['increase' if y > x else 'decrease' if y < x else 'unchanged'] += 1
        for year in range(2026, 2051):
            t = (year - 2026) / 24
            values = [(x * (1 - t) + y * t) / 250 for x, y in zip(a, b)]
            score = 100 * (1 - .5 * sum(v * w for v, w in zip(values, WEIGHTS)) - .5 * max(values))
            assert math.isfinite(score) and -.000001 <= score <= 100.000001, (name, year)
            assert all(min(x, y) / 250 - 1e-9 <= v <= max(x, y) / 250 + 1e-9
                       for x, y, v in zip(a, b, values)), (name, year)
    return dict(records=len(names), scored=scored, no_data=len(names) - scored,
                city_years_checked=scored * 25, endpoint_changes=changes)


def main():
    folder = ROOT / 'data'
    names = json.loads((folder / 'places.json').read_text())['villes']
    data = (folder / 'places.bin').read_bytes()
    thermal = (folder / 'thermo.bin').read_bytes()
    tides = (folder / 'maree.bin').read_bytes()
    if '--autotest' in sys.argv:
        for invalid in [data[:-1], data[:4] + bytes([254]) + data[5:]]:
            try:
                verify(names, invalid, thermal, tides)
            except AssertionError:
                continue
            raise AssertionError('Corrupt city data was accepted')
        print('PASS: truncated records and out-of-range penalties rejected')
        return
    report = verify(names, data, thermal, tides)
    report['grid_channels'] = {}
    for family, keys in [('a', ['heat', 'frost', 'aridity']), ('b', ['fire', 'coast', 'legacy_river_unused'])]:
        a = Image.open(folder / f'grille_{family}_2026.png').convert('RGB')
        b = Image.open(folder / f'grille_{family}_2050.png').convert('RGB')
        assert a.size == b.size == (2160, 1080)
        for k, x, y in zip(keys, a.split(), b.split()):
            changed = ImageChops.difference(x, y).getbbox() is not None
            report['grid_channels'][k] = 'changing endpoints' if changed else 'fixed endpoints'
            if k != 'legacy_river_unused':
                assert changed, k
    for name in ['grille_c.png', 'grille_d.png']:
        assert Image.open(folder / name).size == (2160, 1080)
    report['grid_channels']['river'] = 'fixed blue channel of grille_d.png'
    source = (ROOT / 'index.html').read_text()
    assert 'b26.b *' not in source and 'gb.b *' not in source, 'Legacy river estimate used in globe'
    annual = json.loads((folder / 'population-annual.json').read_text())
    provenance = json.loads((folder / 'population-provenance.json').read_text())
    assert len(annual) == 237
    assert all(len(a) == 26 and all(isinstance(n, int) and n > 0 for n in a) for a in annual.values())
    assert hashlib.sha256((folder / 'population-annual.json').read_bytes()).hexdigest() == provenance['derived_files']['population-annual.json']['sha256']
    assert len(json.loads((folder / 'pays_index.json').read_text())['iso']) <= 256
    assert 'gc.b * terre *' not in source, 'Legacy endpoint-interpolated population used in globe'
    report['population'] = dict(countries=len(annual), annual_values=sum(map(len, annual.values())),
                                years=[2025, 2050], source='UN WPP 2024 medium, including official Togo update')
    report['hashes'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                        for p in sorted(folder.iterdir()) if p.is_file()}
    run = subprocess.run([sys.executable, str(ROOT / 'tools/pipeline.py')], capture_output=True, text=True)
    assert run.returncode != 0 and 'BLOCKED' in run.stderr, 'Legacy regeneration must fail closed'
    report['scientific_accuracy'] = 'UNVERIFIED: missing current generators, source manifests and local validation'
    report['scope'] = 'Encoding, all selected years and endpoint consistency; not scientific validation'
    out = Path(os.environ.get('QA_SORTIE', '/tmp/terra-data-audit'))
    out.mkdir(parents=True, exist_ok=True)
    (out / 'temporal-data-audit.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()

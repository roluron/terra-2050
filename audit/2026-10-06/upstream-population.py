import concurrent.futures
import csv
from decimal import Decimal
import gzip
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
metadata = json.loads((ROOT / 'data/population-provenance.json').read_text())
sources = [source for source in metadata['sources'] if source['path'] in ['WPP2024_Demographic_Indicators_Medium.csv.gz', 'togo-update.zip']]


def fetch(source):
    size = source['bytes']
    request = urllib.request.Request(source['url'], headers={'Range': f'bytes=0-{size-1}'})
    with urllib.request.urlopen(request, timeout=35) as response:
        payload = response.read(size + 1)
    assert hashlib.sha256(payload).hexdigest() == source['sha256'], source['path']
    return source['path'], payload


def extract(payload):
    countries, world = {}, {}
    for record in csv.DictReader(io.StringIO(payload.decode('utf-8-sig'))):
        year = int(record['Time'])
        if record['VarID'] != '2' or not 2025 <= year <= 2050:
            continue
        people = Decimal(record['TPopulation1July']) * 1000
        assert people == people.to_integral_value()
        if record['LocID'] == '900':
            world[year] = int(people)
        if record['LocTypeName'] == 'Country/Area':
            annual = countries.setdefault(record['ISO2_code'], {})
            assert year not in annual
            annual[year] = int(people)
    return countries, world


with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    originals = dict(pool.map(fetch, sources))
countries, world = extract(gzip.decompress(originals['WPP2024_Demographic_Indicators_Medium.csv.gz']))
archive = zipfile.ZipFile(io.BytesIO(originals['togo-update.zip']))
revised, _ = extract(archive.read('WPP2024_Demographic_Indicators_Medium_Update.csv'))
assert set(revised) == {'TG'}
countries.update(revised)
shipped = json.loads((ROOT / 'data/population-annual.json').read_text())
assert len(countries) == 237 and set(countries) == set(shipped)
assert all(set(annual) == set(range(2025, 2051)) for annual in countries.values())
mismatches = [(code, year) for code, annual in countries.items() for year, value in annual.items() if shipped[code][year - 2025] != value]
print(json.dumps({'official_hashes': 'both match', 'countries': len(countries), 'revised_countries': list(revised),
                  'compared_values': sum(map(len, countries.values())), 'different_values': len(mismatches),
                  'original_world_vs_revised_sum': {year: {'original_world': world[year], 'revised_sum': sum(annual[year] for annual in countries.values())} for year in [2025, 2026, 2030, 2050]}}))
assert not mismatches

import argparse
from collections import Counter, defaultdict
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import struct
import tempfile
import unicodedata
import zipfile


SOURCE_URL = 'https://download.geonames.org/export/dump/cities15000.zip'
ADMIN_URL = 'https://download.geonames.org/export/dump/admin1CodesASCII.txt'
DATA = Path(__file__).resolve().parent.parent / 'data'
SCHEMA = ['geonamesId', 'iso2', 'admin1', 'aliases']


def normalize(name):
    name = ''.join(c for c in unicodedata.normalize('NFKD', name).casefold() if not unicodedata.combining(c))
    return re.sub(r'[^\w]+', ' ', name).strip()


def read_source(archive):
    records = defaultdict(list)
    ids = set()
    with zipfile.ZipFile(archive) as source:
        with source.open('cities15000.txt') as stream:
            for number, line in enumerate(stream, 1):
                fields = line.decode('utf-8').rstrip('\r\n').split('\t')
                if len(fields) != 19:
                    raise ValueError(f'Invalid GeoNames row {number}')
                gid, lat, lon = int(fields[0]), float(fields[4]), float(fields[5])
                iso, admin = fields[8], fields[10]
                if gid <= 0 or gid in ids or not re.fullmatch(r'[A-Z]{2}', iso) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    raise ValueError(f'Invalid GeoNames identity or coordinates on row {number}')
                ids.add(gid)
                aliases = list(dict.fromkeys(name for name in [fields[1], fields[2], *fields[3].split(',')] if name))
                if not aliases:
                    raise ValueError(f'Empty GeoNames names on row {number}')
                record = [gid, iso, admin, aliases]
                key = (iso, round(round(lat, 3) * 100), round(round(lon, 3) * 100))
                records[key].append((record, {normalize(name) for name in aliases}))
    return records, len(ids)


def enrich(rows, coordinates, records):
    if len(coordinates) != len(rows) * 24:
        raise ValueError('places.bin must contain one 24-byte record per city')
    matched, unmatched, ambiguous = [], [], []
    for index, row in enumerate(rows):
        if not isinstance(row, list) or len(row) < 5 or not all(isinstance(row[i], str) for i in (0, 1, 4)):
            raise ValueError(f'Invalid places.json row {index}')
        aliases = row[5] if len(row) > 5 else ''
        if isinstance(aliases, str):
            aliases = [aliases]
        if not isinstance(aliases, list) or not all(isinstance(name, str) for name in aliases):
            raise ValueError(f'Invalid existing aliases on row {index}')
        names = {normalize(name) for name in [row[0], row[4], *aliases] if name}
        lat, lon = struct.unpack_from('<hh', coordinates, index * 24)
        candidates = [record for record, source_names in records.get((row[1], lat, lon), []) if names & source_names]
        if len(candidates) == 1:
            matched.append(candidates[0])
        else:
            matched.append(None)
            (unmatched if not candidates else ambiguous).append(index)
    counts = Counter(record[0] for record in matched if record is not None)
    duplicate = [index for index, record in enumerate(matched) if record is not None and counts[record[0]] > 1]
    for index in duplicate:
        matched[index] = None
    return matched, {'matched': sum(record is not None for record in matched), 'unmatched': unmatched,
                     'ambiguous': ambiguous, 'duplicate': duplicate}


def read_regions(path):
    regions = {}
    for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        fields = line.split('\t')
        if len(fields) != 4 or not re.fullmatch(r'[A-Z]{2}\.[^\s.]+', fields[0]) or fields[0] in regions:
            raise ValueError(f'Invalid admin1 row {number}')
        aliases = list(dict.fromkeys(name for name in fields[1:3] if name))
        if not aliases:
            raise ValueError(f'Empty admin1 names on row {number}')
        regions[fields[0]] = aliases
    return regions


def validate(document):
    if document.get('version') != 1 or document.get('schema') != SCHEMA:
        raise ValueError('Invalid search metadata schema')
    places, inputs, stats = document['places'], document['inputs'], document['stats']
    if not isinstance(places, list) or len(places) != inputs['count']:
        raise ValueError('Search metadata count mismatch')
    for value in [document['source']['sha256'], document['source']['admin1']['sha256'], inputs['placesJsonSha256'], inputs['placesBinSha256']]:
        if not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{64}', value):
            raise ValueError('Invalid input fingerprint')
    date.fromisoformat(document['source']['date'])
    for key, names in document['regions'].items():
        if not re.fullmatch(r'[A-Z]{2}\.[^\s.]+', key) or not isinstance(names, list) or not names or not all(isinstance(name, str) and name for name in names):
            raise ValueError('Invalid search region')
    ids = set()
    missing = set()
    for index, record in enumerate(places):
        if record is None:
            missing.add(index)
            continue
        if not isinstance(record, list) or len(record) != 4:
            raise ValueError(f'Invalid search entry {index}')
        gid, iso, admin, aliases = record
        if type(gid) is not int or gid <= 0 or gid in ids or not isinstance(iso, str) or not re.fullmatch(r'[A-Z]{2}', iso):
            raise ValueError(f'Invalid search identity {index}')
        if not isinstance(admin, str) or not isinstance(aliases, list) or not aliases or not all(isinstance(name, str) and name for name in aliases):
            raise ValueError(f'Invalid search aliases or region {index}')
        if len(aliases) != len(set(aliases)):
            raise ValueError(f'Duplicate search aliases {index}')
        ids.add(gid)
    reported = [index for reason in ('unmatched', 'ambiguous', 'duplicate') for index in stats[reason]]
    if len(reported) != len(set(reported)) or set(reported) != missing or stats['matched'] != len(ids):
        raise ValueError('Search mapping statistics mismatch')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--admin1', required=True, type=Path)
    parser.add_argument('--source-date', required=True, type=date.fromisoformat)
    args = parser.parse_args()
    json_bytes = (DATA / 'places.json').read_bytes()
    bin_bytes = (DATA / 'places.bin').read_bytes()
    rows = json.loads(json_bytes)['villes']
    records, source_count = read_source(args.archive)
    places, stats = enrich(rows, bin_bytes, records)
    document = {'version': 1, 'schema': SCHEMA,
                'source': {'url': SOURCE_URL, 'date': args.source_date.isoformat(),
                           'sha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(),
                           'admin1': {'url': ADMIN_URL, 'sha256': hashlib.sha256(args.admin1.read_bytes()).hexdigest()},
                           'attribution': 'GeoNames, CC BY 4.0', 'license': 'https://creativecommons.org/licenses/by/4.0/'},
                'inputs': {'placesJsonSha256': hashlib.sha256(json_bytes).hexdigest(),
                           'placesBinSha256': hashlib.sha256(bin_bytes).hexdigest(), 'count': len(rows)},
                'places': places, 'regions': read_regions(args.admin1), 'stats': stats}
    validate(document)
    output = DATA / 'place-search.json'
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=DATA, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            json.dump(document, stream, ensure_ascii=False, separators=(',', ':'))
            stream.flush()
        except Exception:
            temporary.unlink(missing_ok=True)
            raise
    temporary.replace(output)
    print(json.dumps({'sourceCities': source_count, 'originalCities': len(rows), 'matched': stats['matched'],
                      'unmatched': len(stats['unmatched']), 'ambiguous': len(stats['ambiguous']),
                      'duplicate': len(stats['duplicate']), 'bytes': output.stat().st_size, 'output': str(output)}))


if __name__ == '__main__':
    main()

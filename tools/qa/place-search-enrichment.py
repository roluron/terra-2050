from copy import deepcopy
from datetime import date
import importlib.util
from pathlib import Path
import struct
import tempfile
import zipfile


path = Path(__file__).resolve().parents[1] / 'enrich_place_search.py'
spec = importlib.util.spec_from_file_location('enrichment', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fails(call):
    try:
        call()
    except ValueError:
        return
    raise AssertionError('Invalid input was accepted')


def record(gid, name, ascii_name, aliases, iso='DE', admin='02'):
    fields = [''] * 19
    for key, value in {0: gid, 1: name, 2: ascii_name, 3: aliases, 4: 10.1234, 5: 20.5678,
                       7: 'PPL', 8: iso, 10: admin, 14: 20000}.items():
        fields[key] = str(value)
    return '\t'.join(fields)


with tempfile.TemporaryDirectory() as directory:
    archive = Path(directory) / 'cities15000.zip'
    with zipfile.ZipFile(archive, 'w') as stream:
        stream.writestr('cities15000.txt', '\n'.join([
            record(1, 'München', 'Muenchen', 'Munich,ミュンヘン,München'),
            record(2, 'Shared', 'Shared', ''), record(3, 'Shared', 'Shared', ''),
            record(4, 'Toronto', 'Toronto', '', 'CA', '08'),
            record(5, 'Los Angeles', 'Los Angeles', '', 'US', 'CA'),
        ]))
    records, count = module.read_source(archive)
    assert count == 5
    row = ['Munich', 'DE', 20000, 0, 'Munich', '']
    coordinate = struct.pack('<hh', 1012, 2057) + bytes(20)
    rows = [row, ['Shared', 'DE', 20000, 0, 'Shared', ''], ['Unknown', 'DE', 20000, 0, 'Unknown', '']]
    places, stats = module.enrich(rows, coordinate * 3, records)
    assert places == [[1, 'DE', '02', ['München', 'Muenchen', 'Munich', 'ミュンヘン']], None, None]
    assert stats == {'matched': 1, 'unmatched': [2], 'ambiguous': [1], 'duplicate': []}
    duplicates, duplicate_stats = module.enrich([row, row], coordinate * 2, records)
    assert duplicates == [None, None] and duplicate_stats['duplicate'] == [0, 1]
    mismatch, _ = module.enrich([row], struct.pack('<hh', 1013, 2057) + bytes(20), records)
    assert mismatch == [None]
    wrong_country, _ = module.enrich([['Munich', 'FR', 20000, 0, 'Munich', '']], coordinate, records)
    assert wrong_country == [None]
    fails(lambda: module.enrich(rows, bytes(24), records))
    admin = Path(directory) / 'admin1.txt'
    admin.write_text('US.CA\tCalifornia\tCalifornia\t1\nCA.08\tOntario\tOntario\t2\nDE.02\tBayern\tBavaria\t3\n')
    regions = module.read_regions(admin)
    assert regions == {'US.CA': ['California'], 'CA.08': ['Ontario'], 'DE.02': ['Bayern', 'Bavaria']}
    document = {'version': 1, 'schema': module.SCHEMA, 'source': {'sha256': 'a' * 64,
                'date': date.today().isoformat(), 'admin1': {'sha256': 'b' * 64}},
                'inputs': {'count': 3, 'placesJsonSha256': 'c' * 64, 'placesBinSha256': 'd' * 64},
                'places': places, 'regions': regions, 'stats': stats}
    module.validate(document)
    invalid = deepcopy(document)
    invalid['places'].append(places[0])
    invalid['inputs']['count'] = 4
    fails(lambda: module.validate(invalid))
    invalid = deepcopy(document)
    invalid['stats']['unmatched'] = []
    fails(lambda: module.validate(invalid))
    invalid = deepcopy(document)
    invalid['source']['sha256'] = 'bad'
    fails(lambda: module.validate(invalid))
    admin.write_text('US.CA\tCalifornia\tCalifornia\t1\nUS.CA\tOther\tOther\t2\n')
    fails(lambda: module.read_regions(admin))

print('PASS: source aliases, exact coordinate/name/ISO joins, ambiguity/duplicates, regions and metadata validation')

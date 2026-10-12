import ast
import json
import pathlib
import tempfile
import zipfile


source = pathlib.Path(__file__).resolve().parents[1] / 'pipeline.py'
tree = ast.parse(source.read_text())
city_function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'villes')
main_function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'main')
names_index = next(i for i, node in enumerate(main_function.body)
                   if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == 'noms' for target in node.targets))
names_assignment = main_function.body[names_index]
serialized_names = main_function.body[names_index + 1].value.args[0]

fixtures = [
    (1, 'München', 'Muenchen', 'DE', 48.137, 11.575, 100, 'PPL'),
    (2, '東京', 'Tokyo', 'JP', 35.676, 139.65, 200, 'PPLC'),
    (3, 'São Teste', 'Sao Teste', 'BR', -23.55, -46.633, 100, 'PPL'),
    (4, 'Original', 'Original', 'FR', 45.1234, 1.5678, 50, 'PPL'),
]
localized = {1: ('Munich', 'Munich'), 2: ('Tokyo', 'Tokyo'), 3: ('São Teste', 'São Teste')}
lines = []
expected = []
for gid, name, ascii_name, iso, lat, lon, population, feature in fixtures:
    fields = [''] * 19
    for column, value in {0: gid, 1: name, 2: ascii_name, 4: lat, 5: lon, 7: feature, 8: iso, 14: population}.items():
        fields[column] = str(value)
    lines.append('\t'.join(fields))
    french, english = localized.get(gid, (None, None))
    expected.append([french or name, iso, round(lat, 3), round(lon, 3), population,
                     int(feature == 'PPLC'), english or french or name])
expected.sort(key=lambda row: -row[4])

with tempfile.TemporaryDirectory() as directory:
    raw = pathlib.Path(directory)
    with zipfile.ZipFile(raw / 'cities15000.zip', 'w') as archive:
        archive.writestr('cities15000.txt', '\n'.join(lines))
    namespace = {'RAW': raw, '_VILLES_CACHE': None, 'zipfile': zipfile,
                 'noms_localises': lambda ids: {gid: value for gid, value in localized.items() if gid in ids}}
    exec(compile(ast.Module(body=[city_function], type_ignores=[]), str(source), 'exec'), namespace)
    rows = namespace['villes']()
    assert [row[:7] for row in rows] == expected
    assert [row[7] for row in rows] == ['', 'Muenchen', 'Sao Teste', '']
    assert namespace['villes']() is rows
    namespace.update(v=rows, json=json)
    exec(compile(ast.Module(body=[names_assignment], type_ignores=[]), str(source), 'exec'), namespace)
    document = json.loads(eval(compile(ast.Expression(serialized_names), str(source), 'eval'), namespace))
    assert document['schema'] == ['nom_fr', 'iso2', 'pop', 'capitale', 'nom_en', 'alias']
    assert document['villes'] == [[row[0], row[1], row[4], row[5], row[6], row[7]] for row in rows]

print('PASS: aliases and six-field export preserved; coordinates, population, capital flags, order and cache unchanged')

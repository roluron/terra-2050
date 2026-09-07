import argparse
import csv
import gzip
import hashlib
import io
import json
import re
import zipfile
from decimal import Decimal
from pathlib import Path


def checked(path, expected):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f'SHA-256 mismatch: {path}')
    return data


def extract(data):
    countries = {}
    for row in csv.DictReader(io.StringIO(data.decode('utf-8-sig'))):
        year = int(row['Time'])
        if row['LocTypeName'] != 'Country/Area' or row['VarID'] != '2' or not 2025 <= year <= 2050:
            continue
        code = row['ISO2_code']
        people = Decimal(row['TPopulation1July']) * 1000
        if (not re.fullmatch('[A-Z]{2}', code) or row['Variant'] != 'Medium'
                or not people.is_finite() or people <= 0 or people != people.to_integral_value()):
            raise ValueError(f'Invalid population record: {code} {year}')
        annual = countries.setdefault(code, {})
        if year in annual:
            raise ValueError(f'Duplicate population record: {code} {year}')
        annual[year] = int(people)
    for code, annual in countries.items():
        if sorted(annual) != list(range(2025, 2051)):
            raise ValueError(f'Incomplete annual series: {code}')
    return {code: [annual[year] for year in range(2025, 2051)] for code, annual in countries.items()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, help='Official WPP2024 medium CSV.gz')
    parser.add_argument('update', type=Path, help='Official Togo CSV update.zip')
    parser.add_argument('output', type=Path, help='Output JSON: persons on 1 July, array index = year - 2025')
    args = parser.parse_args()
    if args.output.resolve() in {args.source.resolve(), args.update.resolve()}:
        parser.error('Output must not overwrite either input')
    source = checked(args.source, '286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc')
    update = checked(args.update, 'eb7846bf5d937ee15060198e1130e770b885e58c24035b314966681ed929ca9f')
    countries = extract(gzip.decompress(source))
    with zipfile.ZipFile(io.BytesIO(update)) as archive:
        revised = extract(archive.read('WPP2024_Demographic_Indicators_Medium_Update.csv'))
    if len(countries) != 237 or set(revised) != {'TG'} or 'TG' not in countries:
        raise ValueError('Unexpected source or update coverage')
    countries.update(revised)
    args.output.write_text(json.dumps(countries, sort_keys=True, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

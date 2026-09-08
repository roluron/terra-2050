import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def population(payload, provenance):
    assert hashlib.sha256(payload).hexdigest() == provenance['derived_files']['population-annual.json']['sha256']
    annual = json.loads(payload)
    assert len(annual) == 237
    assert all(re.fullmatch('[A-Z]{2}', code) and len(values) == 26
               and all(type(n) is int and n > 0 for n in values)
               for code, values in annual.items())
    return {'countries': len(annual), 'annual_values': sum(map(len, annual.values())), 'years': [2025, 2050]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--autotest', action='store_true')
    args = parser.parse_args()
    folder = ROOT / 'data'
    payload = (folder / 'population-annual.json').read_bytes()
    provenance = json.loads((folder / 'population-provenance.json').read_text())
    report = population(payload, provenance)
    legacy = subprocess.run([sys.executable, str(ROOT / 'tools/pipeline.py')], capture_output=True, text=True)
    assert legacy.returncode != 0 and 'BLOCKED' in legacy.stderr, 'Legacy regeneration must fail closed'
    if args.autotest:
        annual = json.loads(payload)
        mutants = [payload[:-1], payload.replace(b'FR', b'ZZ', 1)]
        annual['FR'] = annual['FR'][:-1]
        mutants.append(json.dumps(annual).encode())
        for index, invalid in enumerate(mutants):
            metadata = json.loads(json.dumps(provenance))
            if index == 2:
                metadata['derived_files']['population-annual.json']['sha256'] = hashlib.sha256(invalid).hexdigest()
            try:
                population(invalid, metadata)
            except (AssertionError, ValueError):
                continue
            raise AssertionError('Corrupt annual population accepted')
        print('PASS: population hash and rehashed incomplete annual series rejected')
    # These reader suites include corrupted coordinate/order hashes and missing-model fixtures.
    for suite in ['flood-data.mjs', 'science-metrics.mjs']:
        subprocess.run(['node', str(ROOT / 'tools/qa' / suite)], cwd=ROOT, check=True)
    print(json.dumps({'pass': True, 'population': report,
                      'scope': 'Shipped readers, native city coverage, paired flood epochs and annual population integrity; raw-source reconstruction requires explicit importer audit.'}))


if __name__ == '__main__':
    main()

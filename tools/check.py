"""Lance tous les contrôles du projet et rend UN code de sortie.

    python3 tools/check.py                       # les contrôles rapides
    URL0=https://roluron.github.io/terra-2050/ python3 tools/check.py --qa
    python3 tools/check.py --autotest            # prouve que ce lanceur sait dire non

Il **découvre** les contrôles au lieu de les énumérer : tout `tools/verifier_*.py`
et tout `tools/qa/*.mjs`. Un contrôle ajouté demain sera lancé sans que personne
ne pense à l'inscrire ici, et c'est le seul moyen que son absence ne passe pas
pour un silence rassurant.

Trois règles apprises en écrivant les contrôles qu'il lance :

  - Le code de sortie se lit SANS TUBE. Derrière un pipe, `$?` est celui du
    dernier maillon.
  - Zéro contrôle découvert n'est pas un succès. C'est une panne du lanceur.
  - Une suite sautée le dit à voix haute. Un contrôle silencieusement absent
    ressemble trait pour trait à un contrôle qui passe.
"""
import os
import argparse
import json
import hashlib
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
TOOLS = RACINE / "tools"


def lancer(nom, argv, env=None):
    r = subprocess.run(argv, cwd=RACINE, capture_output=True, text=True,
                       env={**os.environ, **(env or {})})
    etat = "OK   " if r.returncode == 0 else "ECHEC"
    sortie = Path(os.environ["QA_SORTIE"])
    (sortie / (nom.replace(" ", "_") + ".log")).write_text(
        json.dumps({"command": argv, "exit_code": r.returncode}) + "\n" + r.stdout + r.stderr,
        encoding="utf8")
    print(f"{etat}  {nom}  (code {r.returncode})", flush=True)
    if r.returncode != 0:
        for ligne in (r.stdout + r.stderr).strip().splitlines()[-12:]:
            print("       | " + ligne)
    return int(r.returncode != 0)


def trouver():
    """Les contrôles ne sont jamais énumérés : on les cherche."""
    py = sorted(TOOLS.glob("verifier_*.py"))
    qa = sorted((TOOLS / "qa").glob("*.mjs"))
    return py, qa


def executer(avec_qa: bool, shard=None) -> int:
    py, qa = trouver()
    if not py and not qa:
        print("ECHEC  aucun controle decouvert — le lanceur est casse, "
              "pas le projet")
        return 1

    fautes = 0
    for f in py:
        fautes += lancer(f.name, [sys.executable, str(f)])
        fautes += lancer(f.name + " --autotest", [sys.executable, str(f), "--autotest"])

    if shard:
        index, count = shard
        selected = qa[index - 1::count]
        if not selected:
            print('ECHEC  empty QA shard')
            return 1
        for f in qa:
            if f not in selected:
                print(f'DELEGUE  {f.name}  (another shard; requires all {count} shards)')
        qa = selected

    for f in qa:
        if not avec_qa:
            print(f"SAUTE  {f.name}  (lance avec --qa ; demande un navigateur "
                  f"Playwright et environ 3 minutes)")
            continue
        suite_out = Path(os.environ['QA_SORTIE']) / f.stem
        suite_out.mkdir(parents=True, exist_ok=True)
        fautes += lancer(f.name, ["node", str(f)], {'QA_SORTIE': str(suite_out)})

    total = len(py) * 2 + (len(qa) if avec_qa else 0)
    print(f"\n{total - fautes} sur {total} controles passent"
          f"{'' if avec_qa else ' (suites QA non lancees)'}.")
    return 1 if fautes else 0


def autotest() -> int:
    global TOOLS
    original = TOOLS
    try:
        with tempfile.TemporaryDirectory(prefix='terra-runner-mutation-') as folder:
            TOOLS = Path(folder)
            assert executer(False) == 1, 'Empty discovery accepted'
            control = TOOLS / 'verifier_new.py'
            control.write_text('import sys\nsys.exit(0)\n', encoding='utf8')
            assert trouver()[0] == [control], 'New control not discovered'
            assert executer(False) == 0, 'Healthy control rejected'
            control.write_text('import sys\nsys.exit(1)\n', encoding='utf8')
            assert executer(False) == 1, 'Failed control accepted'
            control.write_text("import sys\nsys.exit(int('--autotest' in sys.argv))\n", encoding='utf8')
            assert executer(False) == 1, 'Failed mutation test accepted'
            from unittest.mock import patch
            qa = TOOLS / 'qa'
            qa.mkdir()
            for i in range(7):
                (qa / f'case-{i}.mjs').touch()
            seen = []
            def record(name, argv, env=None):
                if name.endswith('.mjs'):
                    seen.append(name)
                return 0
            with patch(__name__ + '.lancer', side_effect=record):
                for count in (3, 4):
                    seen.clear()
                    for index in range(1, count + 1):
                        assert executer(True, (index, count)) == 0
                    assert sorted(seen) == [p.name for p in sorted(qa.glob('*.mjs'))]
        print('OK     discovery, empty suite, failure, failed mutation-test propagation and complete disjoint shards')
        return 0
    finally:
        TOOLS = original


if __name__ == "__main__":
    sortie = Path(os.environ.setdefault("QA_SORTIE", tempfile.mkdtemp(prefix="terra-check-"))).resolve()
    sortie.mkdir(parents=True, exist_ok=True)
    os.environ["QA_SORTIE"] = str(sortie)
    revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=RACINE, capture_output=True, text=True)
    etat = subprocess.run(["git", "status", "--porcelain"], cwd=RACINE, capture_output=True, text=True)
    fichiers = ["index.html", "terra-menus.css", "package-lock.json"]
    fichiers += [str(p.relative_to(RACINE)) for p in sorted((RACINE / "tools").rglob("*"))
                 if p.is_file() and p.suffix in (".py", ".mjs")]
    (sortie / "snapshot.json").write_text(json.dumps({
        "revision": revision.stdout.strip(), "url": os.environ.get("URL0", "http://localhost:8087/"),
        "workingTree": etat.stdout.strip(),
        "sha256": {p: hashlib.sha256((RACINE / p).read_bytes()).hexdigest()
                   for p in fichiers if (RACINE / p).exists()}
    }, indent=2), encoding="utf8")
    print("Preuves : " + str(sortie), flush=True)
    if "--autotest" in sys.argv:
        code = autotest()
        print("Le lanceur est porteur." if code == 0
              else "Le lanceur ne prouve rien : A REPARER.")
        sys.exit(code)

    parser = argparse.ArgumentParser()
    parser.add_argument('--qa', action='store_true')
    parser.add_argument('--qa-shard', '--shard', dest='qa_shard', help='1-based INDEX/TOTAL; every shard is required for full browser coverage')
    args = parser.parse_args()
    shard = None
    if args.qa_shard:
        try:
            shard = tuple(map(int, args.qa_shard.split('/')))
            assert len(shard) == 2 and 1 <= shard[0] <= shard[1] and args.qa
        except (ValueError, AssertionError):
            parser.error('--qa-shard requires --qa and INDEX/TOTAL with 1 <= INDEX <= TOTAL')
    code = executer(args.qa, shard)
    print("Tout est vert." if code == 0 else "AU MOINS UN CONTROLE ECHOUE.")
    sys.exit(code)

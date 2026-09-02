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
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
TOOLS = RACINE / "tools"


def lancer(nom, argv, env=None):
    r = subprocess.run(argv, cwd=RACINE, capture_output=True, text=True,
                       env={**os.environ, **(env or {})})
    etat = "OK   " if r.returncode == 0 else "ECHEC"
    print(f"{etat}  {nom}  (code {r.returncode})")
    if r.returncode != 0:
        for ligne in (r.stdout + r.stderr).strip().splitlines()[-12:]:
            print("       | " + ligne)
    return r.returncode


def trouver():
    """Les contrôles ne sont jamais énumérés : on les cherche."""
    py = sorted(TOOLS.glob("verifier_*.py"))
    qa = sorted((TOOLS / "qa").glob("*.mjs"))
    return py, qa


def executer(avec_qa: bool) -> int:
    py, qa = trouver()
    if not py and not qa:
        print("ECHEC  aucun controle decouvert — le lanceur est casse, "
              "pas le projet")
        return 1

    fautes = 0
    for f in py:
        fautes += lancer(f.name, [sys.executable, str(f)])
        fautes += lancer(f.name + " --autotest", [sys.executable, str(f), "--autotest"])

    for f in qa:
        if not avec_qa:
            print(f"SAUTE  {f.name}  (lance avec --qa ; demande un navigateur "
                  f"Playwright et environ 3 minutes)")
            continue
        fautes += lancer(f.name, ["node", str(f)])

    total = len(py) * 2 + (len(qa) if avec_qa else 0)
    print(f"\n{total - fautes} sur {total} controles passent"
          f"{'' if avec_qa else ' (suites QA non lancees)'}.")
    return 1 if fautes else 0


def autotest() -> int:
    """Prouve que le lanceur voit un contrôle qu'il ne connaissait pas, et
    qu'il échoue quand ce contrôle échoue."""
    faux = TOOLS / "verifier_zzz_autotest.py"
    echecs = 0
    try:
        avant_py, _ = trouver()
        faux.write_text("import sys\nsys.exit(1)\n", encoding="utf8")
        apres_py, _ = trouver()
        if len(apres_py) != len(avant_py) + 1:
            print("ECHEC  autotest : le lanceur n a pas decouvert le nouveau controle")
            echecs += 1
        else:
            print("OK     autotest : un controle ajoute est decouvert")

        r = subprocess.run([sys.executable, __file__], cwd=RACINE,
                           capture_output=True, text=True)
        if r.returncode == 0:
            print("ECHEC  autotest : un controle en echec n a pas fait echouer le lanceur")
            echecs += 1
        else:
            print("OK     autotest : un controle en echec fait echouer le lanceur")
    finally:
        faux.unlink(missing_ok=True)

    r = subprocess.run([sys.executable, __file__], cwd=RACINE,
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("ECHEC  autotest : le projet sain est refuse")
        print(r.stdout[-800:])
        echecs += 1
    else:
        print("OK     autotest : le projet sain passe")

    return 1 if echecs else 0


if __name__ == "__main__":
    if "--autotest" in sys.argv:
        code = autotest()
        print("Le lanceur est porteur." if code == 0
              else "Le lanceur ne prouve rien : A REPARER.")
        sys.exit(code)

    code = executer("--qa" in sys.argv)
    print("Tout est vert." if code == 0 else "AU MOINS UN CONTROLE ECHOUE.")
    sys.exit(code)

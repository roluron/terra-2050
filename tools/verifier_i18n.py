"""Contrôle des dictionnaires FR/EN de index.html.

Une clé présente dans une langue et absente dans l'autre ne casse rien : elle
affiche `undefined` dans l'interface, ou rien du tout, et seul un lecteur de
cette langue-là s'en aperçoit. C'est exactement le défaut qu'une relecture
manuelle valide une fois puis laisse pourrir.

    python3 tools/verifier_i18n.py
    python3 tools/verifier_i18n.py --autotest

Trois contrôles :

  1. SYMÉTRIE — les deux dictionnaires portent les mêmes clés, au premier
     niveau et à l'intérieur de chaque sous-objet.
  2. CLÉ MANQUANTE — toute clé lue dans le code existe dans les dictionnaires.
  3. CLÉ MORTE — signalée, jamais fatale, et les conteneurs lus par variable
     (`t.calque[cle]`) sont exclus : leurs sous-clés ne peuvent pas être
     prouvées mortes par une lecture statique. Un contrôle qui crie sur des
     faux positifs fait perdre plus de temps qu'il n'en gagne.

Le code de retour vaut 1 si 1 ou 2 échoue. À lire SANS TUBE.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "index.html"


def dictionnaires(src: str):
    """Rend {langue: {cle: [sous-cles]}}.

    Ecrire un parseur JavaScript en Python etait l erreur : ma premiere version
    bouclait sans fin sur les chaines. Node sait deja lire du JavaScript, on
    lui donne le litteral et on lui demande la forme.
    """
    debut = src.index("const TEXTES = {")
    fin = src.index("\n};", debut)
    litteral = src[debut + len("const TEXTES = "):fin + 2]

    with tempfile.TemporaryDirectory() as d:
        mod = Path(d) / "textes.mjs"
        mod.write_text(
            "const TEXTES = %s;\n"
            "const forme = {};\n"
            "for (const [lang, dico] of Object.entries(TEXTES)) {\n"
            "  forme[lang] = {};\n"
            "  for (const [cle, val] of Object.entries(dico))\n"
            "    forme[lang][cle] = (val && typeof val === 'object' && !Array.isArray(val))\n"
            "      ? Object.keys(val).sort() : [];\n"
            "}\n"
            "console.log(JSON.stringify(forme));\n" % litteral,
            encoding="utf8")
        r = subprocess.run(["node", str(mod)], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("lecture du dictionnaire impossible :\n" + r.stderr)
    return json.loads(r.stdout)


def cles_utilisees(src: str):
    """Clés de premier niveau lues dans le code, plus les conteneurs dynamiques."""
    lues, dynamiques = set(), set()
    for pat in (r"T\(\)\.([A-Za-z0-9_]+)", r"\bt\.([A-Za-z0-9_]+)"):
        lues |= set(re.findall(pat, src))
    for pat in (r"T\(\)\.([A-Za-z0-9_]+)\[", r"\bt\.([A-Za-z0-9_]+)\["):
        dynamiques |= set(re.findall(pat, src))
    lues |= set(re.findall(r'data-t="([A-Za-z0-9_]+)"', src))
    return lues, dynamiques


def verifier(src: str, bavard: bool = True) -> int:
    dicos = dictionnaires(src)
    fr, en = dicos["fr"], dicos["en"]
    fautes = 0

    manquantes_en = sorted(set(fr) - set(en))
    manquantes_fr = sorted(set(en) - set(fr))
    for nom, liste in (("EN", manquantes_en), ("FR", manquantes_fr)):
        for c in liste:
            if bavard:
                print("ECHEC  cle « %s » absente du dictionnaire %s" % (c, nom))
            fautes += 1

    for c in sorted(set(fr) & set(en)):
        for sous, langue in ((set(fr[c]) - set(en[c]), "EN"),
                             (set(en[c]) - set(fr[c]), "FR")):
            for s in sorted(sous):
                if bavard:
                    print("ECHEC  sous-cle « %s.%s » absente du dictionnaire %s"
                          % (c, s, langue))
                fautes += 1

    lues, dynamiques = cles_utilisees(src)
    for c in sorted(lues - set(fr) - {"lang"}):
        if bavard:
            print("ECHEC  cle « %s » lue dans le code mais absente des dictionnaires" % c)
        fautes += 1

    mortes = sorted(set(fr) - lues - dynamiques - {"lang"})
    if mortes and bavard:
        print("NOTE   cles definies et jamais lues : %s" % ", ".join(mortes))

    if bavard:
        print("OK     %d cles, %d sous-objets, symetrie FR/EN"
              % (len(fr), sum(1 for c in fr if fr[c])) if not fautes else "")
    return 1 if fautes else 0


def autotest() -> int:
    """Prouve que le contrôle sait dire non, sur chacun de ses deux axes."""
    src = SOURCE.read_text(encoding="utf8")
    echecs = 0

    if verifier(src, bavard=False) != 0:
        print("ECHEC  autotest : le fichier sain est deja refuse")
        return 1
    print("OK     autotest : le fichier sain passe")

    # Une cle retiree de EN seulement. On prend la PREMIERE cle simple venue
    # plutot qu un nom en dur : mon autotest visait « fermer », je l ai
    # supprimee comme cle morte, et le test a casse au lieu de tester.
    i = src.index("\n  en: {")
    m = re.search(r"^    [A-Za-z0-9_]+: '[^']*',\n", src[i:], re.M)
    if not m:
        print("ECHEC  autotest : aucune cle simple trouvee dans EN")
        return 1
    ampute = src[:i] + src[i:].replace(m.group(0), "", 1)
    if verifier(ampute, bavard=False) == 0:
        print("ECHEC  autotest : une cle absente de EN est passee")
        echecs += 1
    else:
        print("OK     autotest : une cle absente de EN est vue")

    # une clé lue dans le code mais définie nulle part
    trouve = re.search(r"T\(\)\.([A-Za-z0-9_]+)\b", src)
    invente = src.replace("T()." + trouve.group(1), "T().cleQuiNExistePas", 1)
    if verifier(invente, bavard=False) == 0:
        print("ECHEC  autotest : une cle inventee dans le code est passee")
        echecs += 1
    else:
        print("OK     autotest : une cle inventee dans le code est vue")

    return 1 if echecs else 0


if __name__ == "__main__":
    if "--autotest" in sys.argv:
        code = autotest()
        print("Le controle est porteur." if code == 0
              else "Le controle ne prouve rien : A REPARER.")
        sys.exit(code)

    code = verifier(SOURCE.read_text(encoding="utf8"))
    print("Dictionnaires FR/EN coherents." if code == 0
          else "Dictionnaires incoherents : NE PAS DEPLOYER.")
    sys.exit(code)

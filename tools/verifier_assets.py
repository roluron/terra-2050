"""Contrôle de fidélité des textures WebP servies par le site.

Pourquoi ce fichier existe : WebP est lossy par défaut. Une texture de données
réencodée par distraction en lossy s'affiche exactement pareil et décale
silencieusement ses valeurs — le globe est beau, les chiffres sont faux, et
rien ne casse. La vérification faite une fois à la main ne survit pas au
prochain qui régénère les images.

    python3 tools/verifier_assets.py [dossier]
    python3 tools/verifier_assets.py --autotest

Sortie : une ligne par paire, code de retour 1 si une seule échoue.

`--autotest` prouve que le contrôle sait dire non : il fabrique une image de
BRUIT, l'encode une fois sans perte et une fois en lossy, et vérifie que la
première passe et que la seconde échoue.

Le bruit n'est pas un détail, et la raison est mesurée : une image uniforme ET
sans couleur (R=G=B) revient identique au bit près après un encodage lossy,
faute de chroma à sous-échantillonner et de détail à quantifier. Vérifié sur
une tuile 100 %% océan du vrai masque : identique. Une image de contrôle
uniforme et grise passerait donc au vert sans rien avoir vérifié. Un aplat
coloré, lui, perd 2 à 3 niveaux.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops

Image.MAX_IMAGE_PIXELS = None
DEFAUT = Path(__file__).resolve().parent.parent / "assets" / "textures"

# (webp servi, original, mode). « exact » = doit être identique au pixel :
# ce sont les images dont un canal porte une valeur, pas une couleur.
PAIRES = [
    ("earth_mask_4320.webp", "earth_mask_4320.png", "exact"),
    ("earth_color_4096.webp", "earth_color_4096.jpg", "psnr>=38"),
    ("earth_color_2048.webp", "earth_color_2048.jpg", "psnr>=38"),
]


# Une image dont un canal porte une VALEUR ne tolere aucune perte. Le mode se
# declare a la main dans PAIRES, donc c est la faute la plus facile a commettre :
# ajouter une grille ou un masque en « psnr>= » au lieu de « exact ».
MOTS_DONNEES = ("mask", "masque", "grille", "grid", "data", "depth", "height")


def verifier_declarations(paires=None) -> int:
    fautes = 0
    for nom_webp, _, mode in (paires or PAIRES):
        donnee = any(m in nom_webp.lower() for m in MOTS_DONNEES)
        if donnee and mode != "exact":
            print(f"ECHEC  {nom_webp:24} declare « {mode} » : une image de "
                  f"donnees doit etre « exact »")
            fautes += 1
    return 1 if fautes else 0


def dire(bavard: bool, texte: str) -> None:
    if bavard:
        print(texte)


def psnr(a: Image.Image, b: Image.Image) -> float:
    h = ImageChops.difference(a, b).convert("L").histogram()
    n = sum(h)
    eqm = sum(i * i * v for i, v in enumerate(h)) / n
    return 99.0 if eqm == 0 else 10 * math.log10(255 * 255 / eqm)


def verifier(racine: Path, paires=None, bavard: bool = True) -> int:
    echecs = 0
    for nom_webp, nom_src, mode in (paires or PAIRES):
        p_webp, p_src = racine / nom_webp, racine / nom_src
        if not p_webp.exists() or not p_src.exists():
            dire(bavard, f"ECHEC  {nom_webp:24} fichier manquant")
            echecs += 1
            continue

        webp = Image.open(p_webp).convert("RGB")
        src = Image.open(p_src).convert("RGB")

        if webp.size != src.size:
            dire(bavard, f"ECHEC  {nom_webp:24} {webp.size} au lieu de {src.size}")
            echecs += 1
            continue

        if mode == "exact":
            identique = ImageChops.difference(webp, src).getbbox() is None
            dire(bavard, f"{'OK   ' if identique else 'ECHEC'}  {nom_webp:24} "
                 f"sans perte, identique au pixel : {identique}")
            echecs += not identique
        else:
            seuil = float(mode.split(">=")[1])
            d = psnr(webp, src)
            dire(bavard, f"{'OK   ' if d >= seuil else 'ECHEC'}  {nom_webp:24} "
                 f"PSNR {d:.1f} dB (seuil {seuil:.0f})")
            echecs += d < seuil

        # une texture plus lourde que son original ne sert à rien
        if p_webp.stat().st_size >= p_src.stat().st_size:
            dire(bavard, f"ECHEC  {nom_webp:24} plus lourde que l'original "
                 f"({p_webp.stat().st_size} >= {p_src.stat().st_size})")
            echecs += 1

    return 1 if echecs else 0


def autotest() -> int:
    """Prouve que le contrôle sait refuser. Sans cela, il pourrait très bien
    comparer un fichier à lui-même et rester vert pour toujours."""
    import random
    import tempfile

    random.seed(1789)
    n = 256
    bruit = Image.frombytes(
        "RGB", (n, n), bytes(random.randrange(256) for _ in range(n * n * 3)))

    echecs = 0
    with tempfile.TemporaryDirectory() as d:
        rep = Path(d)
        bruit.save(rep / "src.png")
        bruit.save(rep / "sans_perte.webp", "WEBP", lossless=True, method=4)
        bruit.save(rep / "avec_perte.webp", "WEBP", quality=80, method=4)

        # D ABORD : l image temoin doit etre reellement abimee par le lossy.
        # Une image uniforme et sans couleur y survit intacte, et tout le reste
        # du test passerait alors au vert sans rien avoir verifie.
        src = Image.open(rep / "src.png").convert("RGB")
        perdue = Image.open(rep / "avec_perte.webp").convert("RGB")
        if ImageChops.difference(src, perdue).getbbox() is None:
            print("ECHEC  autotest : l image temoin survit au lossy, elle ne "
                  "peut rien prouver (uniforme ? sans couleur ?)")
            return 1
        print("OK     autotest : l image temoin est bien abimee par le lossy")

        bon = verifier(rep, [("sans_perte.webp", "src.png", "exact")], bavard=False)
        mauvais = verifier(rep, [("avec_perte.webp", "src.png", "exact")], bavard=False)

        if bon != 0:
            print("ECHEC  autotest : une image sans perte a ete refusee")
            echecs += 1
        else:
            print("OK     autotest : une image sans perte est acceptee")

        if mauvais == 0:
            print("ECHEC  autotest : une image LOSSY est passee — le controle ne controle rien")
            echecs += 1
        else:
            print("OK     autotest : une image lossy est refusee")

    return 1 if echecs else 0


if __name__ == "__main__":
    if "--autotest" in sys.argv:
        code = autotest()
        print("Le controle est porteur." if code == 0
              else "Le controle ne prouve rien : A REPARER AVANT DE S EN SERVIR.")
        sys.exit(code)

    racine = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAUT
    code = verifier_declarations() | verifier(racine)
    print("Toutes les textures sont fidèles." if code == 0
          else "Au moins une texture est infidèle : NE PAS DÉPLOYER.")
    sys.exit(code)

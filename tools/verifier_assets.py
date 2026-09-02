"""Contrôle de fidélité des textures WebP servies par le site.

Pourquoi ce fichier existe : WebP est lossy par défaut. Une texture de données
réencodée par distraction en lossy s'affiche exactement pareil et décale
silencieusement ses valeurs — le globe est beau, les chiffres sont faux, et
rien ne casse. La vérification faite une fois à la main ne survit pas au
prochain qui régénère les images.

    python3 tools/verifier_assets.py [dossier]

Sortie : une ligne par paire, code de retour 1 si une seule échoue.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops

Image.MAX_IMAGE_PIXELS = None
RACINE = Path(sys.argv[1]) if len(sys.argv) > 1 else (
    Path(__file__).resolve().parent.parent / "assets" / "textures")

# (webp servi, original, mode). « exact » = doit être identique au pixel :
# ce sont les images dont un canal porte une valeur, pas une couleur.
PAIRES = [
    ("earth_mask_4320.webp", "earth_mask_4320.png", "exact"),
    ("earth_color_4096.webp", "earth_color_4096.jpg", "psnr>=38"),
    ("earth_color_2048.webp", "earth_color_2048.jpg", "psnr>=38"),
]


def psnr(a: Image.Image, b: Image.Image) -> float:
    h = ImageChops.difference(a, b).convert("L").histogram()
    n = sum(h)
    eqm = sum(i * i * v for i, v in enumerate(h)) / n
    return 99.0 if eqm == 0 else 10 * math.log10(255 * 255 / eqm)


def verifier() -> int:
    echecs = 0
    for nom_webp, nom_src, mode in PAIRES:
        p_webp, p_src = RACINE / nom_webp, RACINE / nom_src
        if not p_webp.exists() or not p_src.exists():
            print(f"ECHEC  {nom_webp:24} fichier manquant")
            echecs += 1
            continue

        webp = Image.open(p_webp).convert("RGB")
        src = Image.open(p_src).convert("RGB")

        if webp.size != src.size:
            print(f"ECHEC  {nom_webp:24} {webp.size} au lieu de {src.size}")
            echecs += 1
            continue

        if mode == "exact":
            identique = ImageChops.difference(webp, src).getbbox() is None
            print(f"{'OK   ' if identique else 'ECHEC'}  {nom_webp:24} "
                  f"sans perte, identique au pixel : {identique}")
            echecs += not identique
        else:
            seuil = float(mode.split(">=")[1])
            d = psnr(webp, src)
            print(f"{'OK   ' if d >= seuil else 'ECHEC'}  {nom_webp:24} "
                  f"PSNR {d:.1f} dB (seuil {seuil:.0f})")
            echecs += d < seuil

        # une texture plus lourde que son original ne sert à rien
        if p_webp.stat().st_size >= p_src.stat().st_size:
            print(f"ECHEC  {nom_webp:24} plus lourde que l'original "
                  f"({p_webp.stat().st_size} >= {p_src.stat().st_size})")
            echecs += 1

    return 1 if echecs else 0


if __name__ == "__main__":
    code = verifier()
    print("Toutes les textures sont fidèles." if code == 0
          else "Au moins une texture est infidèle : NE PAS DÉPLOYER.")
    sys.exit(code)

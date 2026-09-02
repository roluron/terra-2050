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


def codec_webp(chemin: Path):
    """Le mode d'encodage est ecrit DANS le fichier, pas dans notre table.

    En-tete RIFF : « RIFF » (0-4), taille, « WEBP » (8-12), puis le tag du
    codec (12-16). « VP8L » est le seul mode sans perte. Attention au
    raccourci « VP8L ou VP8  » : un WebP lossy AVEC ALPHA se declare « VP8X »,
    verifie ici meme. On exige donc VP8L et on refuse tout le reste, ce qui
    couvre le cas alpha sans avoir a le nommer.
    """
    with open(chemin, "rb") as f:
        tete = f.read(16)
    if len(tete) < 16 or tete[:4] != b"RIFF" or tete[8:12] != b"WEBP":
        return None
    return tete[12:16]


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

        # Convertir LES DEUX en RGB effaçait le canal alpha des deux cotes :
        # un alpha ecrase passait pour identique. La source fait foi, on
        # compare dans SON mode. Sans exiger l egalite des modes pour autant :
        # WebP n a pas de niveaux de gris, un masque « L » ressort toujours en
        # RGB, et l exiger refuserait tous les masques du monde.
        webp_brut = Image.open(p_webp)
        src = Image.open(p_src)
        if "A" in src.getbands() and "A" not in webp_brut.getbands():
            dire(bavard, f"ECHEC  {nom_webp:24} la source a un canal alpha, "
                 f"le fichier livre ne l a pas")
            echecs += 1
            continue
        webp = webp_brut.convert(src.mode)

        if webp.size != src.size:
            dire(bavard, f"ECHEC  {nom_webp:24} {webp.size} au lieu de {src.size}")
            echecs += 1
            continue

        if mode == "exact":
            # La comparaison au pixel est AVEUGLE sur une region uniforme et
            # sans couleur : une tuile 100 % ocean de ce masque survit intacte
            # a un encodage lossy. L en-tete, lui, ne ment pas.
            codec = codec_webp(p_webp)
            if codec != b"VP8L":
                dire(bavard, f"ECHEC  {nom_webp:24} encode en {codec} : "
                     f"une image de donnees doit etre en VP8L (sans perte)")
                echecs += 1
                continue
            # PAS getbbox() : sur une image RGBA il est alpha-conscient et
            # renvoie None malgre des pixels RGB differents — verifie ici, 16
            # pixels sur 4096 ecrases sans qu il les voie. La comparaison
            # d octets ne ment pas.
            identique = webp.tobytes() == src.tobytes()
            dire(bavard, f"{'OK   ' if identique else 'ECHEC'}  {nom_webp:24} "
                 f"sans perte, identique au pixel : {identique}")
            echecs += not identique
        else:
            seuil = float(mode.split(">=")[1])
            d = psnr(webp.convert("RGB"), src.convert("RGB"))
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

        # Le cas que la comparaison au pixel ne peut pas voir : un aplat gris
        # encode en lossy revient identique, seul l en-tete le trahit.
        Image.new("RGB", (n, n), (128, 128, 128)).save(rep / "aplat.png")
        Image.new("RGB", (n, n), (128, 128, 128)).save(
            rep / "aplat_lossy.webp", "WEBP", quality=95, method=4)
        pixels_aveugles = ImageChops.difference(
            Image.open(rep / "aplat.png").convert("RGB"),
            Image.open(rep / "aplat_lossy.webp").convert("RGB")).getbbox() is None
        attrape = verifier(rep, [("aplat_lossy.webp", "aplat.png", "exact")], bavard=False)
        if not pixels_aveugles:
            print("OK     autotest : (ce Pillow abime meme un aplat gris, cas non couvert)")
        elif attrape == 0:
            print("ECHEC  autotest : un lossy identique au pixel est passe — "
                  "l en-tete n est pas lu")
            echecs += 1
        else:
            print("OK     autotest : un lossy indetectable au pixel est "
                  "rattrape par l en-tete")

        # Alpha : un canal ecrase doit etre vu, et un RGBA sain doit passer.
        # C est le meme piege dans les deux sens, a une ligne d ecart.
        # 256 px : sous 64 px le WebP est plus lourd que le PNG et la regle de
        # poids se declencherait sur la fixture. Alpha jamais nul : WebP
        # lossless ecrase le RGB des pixels totalement transparents, c est une
        # vraie perte mais elle n a rien a voir avec ce qu on teste ici.
        m = 256
        rgba = Image.frombytes("RGBA", (m, m), bytes(
            (random.randrange(256) if i % 4 < 3 else random.randrange(1, 256))
            for i in range(m * m * 4)))
        rgba.save(rep / "a_src.png")
        rgba.save(rep / "a_bon.webp", "WEBP", lossless=True)
        rgba.convert("RGB").save(rep / "a_casse.webp", "WEBP", lossless=True)
        if verifier(rep, [("a_bon.webp", "a_src.png", "exact")], bavard=False) != 0:
            print("ECHEC  autotest : un RGBA sans perte est refuse a tort")
            echecs += 1
        else:
            print("OK     autotest : un RGBA sans perte est accepte")
        if verifier(rep, [("a_casse.webp", "a_src.png", "exact")], bavard=False) == 0:
            print("ECHEC  autotest : un canal alpha perdu est passe inaperçu")
            echecs += 1
        else:
            print("OK     autotest : un canal alpha perdu est refuse")

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

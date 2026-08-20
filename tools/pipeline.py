"""Pipeline hors-ligne TERRA/2050 : sources climatiques réelles -> data/.

Sorties :
  data/places.json          annuaire de villes GeoNames (nom, ISO2, lat, lon, population)
  data/risques_2026.png     RGB 2160x1080 = chaleur, secheresse, feux (horizon 2026)
  data/risques_2050.png     idem, horizon 2050
  data/risques_mer.png      RGB = submersion 2026, submersion 2050, argiles
  data/risques_stat.png     RGB = inondations 2026, inondations 2050, masque terre
  data/rivers.json          polylignes des grands fleuves (Natural Earth)

Sources (toutes librement téléchargeables, sans clé) :
  WorldClim 2.1 10' historique 1970-2000 (tmax, prec)
  WorldClim/CMIP6 MPI-ESM1-2-HR SSP3-7.0 10' (tmax, prec) 2021-2040, 2041-2060, 2061-2080
  NOAA ETOPO 2022 v1 60" surface elevation
  Natural Earth 10m rivers & lake centerlines
  GeoNames cities15000

Usage : python3 tools/pipeline.py <dossier_raw>
"""
import json, pathlib, struct, sys, zipfile

import numpy as np
import tifffile
from scipy.ndimage import distance_transform_edt, gaussian_filter

W, H = 2160, 1080                      # 10 arc-minutes : résolution native WorldClim
RAW = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'raw')
OUT = pathlib.Path(__file__).resolve().parent.parent / 'data'
OUT.mkdir(exist_ok=True)

# Périodes CMIP6 -> année centrale, pour interpoler la timeline 2026-2050.
KNOTS = [(1985, 'hist'), (2030, '2021_2040'), (2050, '2041_2060'), (2070, '2061_2080')]

# Élévation du niveau marin (m) par rapport à 2020, GMSL médiane SSP3-7.0, IPCC AR6 tab. 9.9.
SLR = {2026: 0.03, 2050: 0.15}
# Marge de marée/surcote ajoutée au niveau moyen pour définir la cote submersible.
SURCOTE = 2.0


def norm(a, lo, hi):
    return np.clip((a - lo) / (hi - lo), 0, 1)


def lire_periode(var, cle):
    """12 bandes mensuelles float32 (1080, 2160) pour une variable et une période."""
    if cle == 'hist':
        z = zipfile.ZipFile(RAW / f'wc_{var}_hist.zip')
        noms = sorted(n for n in z.namelist() if n.endswith('.tif'))
        bandes = [tifffile.imread(z.open(n)) for n in noms]
        a = np.stack(bandes, axis=-1)
    else:
        a = tifffile.imread(RAW / f'{var}_{cle}.tif')
    a = np.asarray(a, dtype=np.float32)
    a[a < -1e30] = np.nan
    assert a.shape == (H, W, 12), f'{var} {cle}: {a.shape}'
    return a


def interp_annee(par_periode, annee):
    """Interpole entre les périodes CMIP6 encadrant `annee`."""
    xs = [k for k, _ in KNOTS]
    for i in range(len(xs) - 1):
        if xs[i] <= annee <= xs[i + 1] or i == len(xs) - 2:
            t = (annee - xs[i]) / (xs[i + 1] - xs[i])
            t = float(np.clip(t, 0, 1))
            a, b = par_periode[KNOTS[i][1]], par_periode[KNOTS[i + 1][1]]
            return a * (1 - t) + b * t
    raise AssertionError


def masque_terre():
    """Masque terre issu de WorldClim : les océans y sont NaN."""
    a = lire_periode('tmax', 'hist')[:, :, 0]
    return ~np.isnan(a)


def canal_chaleur(tmax_an):
    """Jours annuels au-dessus de 35 °C, estimés depuis les tmax mensuels.

    tmax mensuel = moyenne des maxima journaliers du mois. La distribution
    journalière autour de cette moyenne est proche d'une normale d'écart-type
    ~3.5 °C sous nos latitudes ; la fraction de jours > 35 °C est donc
    P(X > 35) avec X ~ N(tmax_m, 3.5).
    """
    lat = np.abs(np.linspace(90 - 90 / H, -90 + 90 / H, H))[:, None, None]
    sigma = 1.7 + 2.6 * np.clip(lat / 55.0, 0, 1)     # ~1.7 °C aux tropiques, ~4.3 °C aux hautes latitudes
    z = (35.0 - tmax_an) / sigma
    frac = 0.5 * (1.0 - np.vectorize(_erf)(z / np.sqrt(2.0)))
    jours = np.nansum(frac * 30.4, axis=-1)
    return jours


def _erf(x):
    # Abramowitz & Stegun 7.1.26 — suffisant ici, évite une dépendance de plus.
    s = 1.0 if x >= 0 else -1.0
    x = abs(x)
    t = 1.0 / (1.0 + 0.3275911 * x)
    y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741)
                * t - 0.284496736) * t + 0.254829592) * t * np.exp(-x * x)
    return s * y


def canal_aridite(tmax_an, prec_an):
    """Indice d'aridité de De Martonne : P / (T + 10). Bas = sec."""
    p = np.nansum(prec_an, axis=-1)
    t = np.nanmean(tmax_an, axis=-1) - 5.0      # tmax -> proxy de température moyenne
    return p / np.maximum(t + 10.0, 1.0)


def canal_feux(tmax_an, prec_an, terre):
    """Danger météo de feu : mois chauds et secs, pondérés par la végétation
    disponible (un désert sans combustible ne brûle pas)."""
    pm = np.nan_to_num(prec_an)
    tm = np.nan_to_num(tmax_an)
    secheresse_mois = np.clip(1.0 - pm / 60.0, 0, 1) * np.clip((tm - 18.0) / 17.0, 0, 1)
    danger = secheresse_mois.max(axis=-1)
    p_annuel = pm.sum(axis=-1)
    combustible = np.clip((p_annuel - 120.0) / 500.0, 0, 1)     # ni désert nu, ni tourbière
    return danger * combustible * terre


def charger_elevation(cotes):
    """ETOPO 60'' -> pour chaque cote, fraction de pixels terrestres sous la cote.

    Le fichier fait 21600x10800 float32 (900 Mo) : lecture par bandes de lignes,
    réduction 10x10 en une passe.
    """
    src = tifffile.TiffFile(RAW / 'etopo_60s.tif')
    page = src.pages[0]
    sh, sw = page.shape
    fx, fy = sw // W, sh // H
    assert (fx, fy) == (10, 10), (sh, sw)

    frac = {c: np.zeros((H, W), np.float32) for c in cotes}
    terre = np.zeros((H, W), np.float32)
    arr = page.asarray(out='memmap')
    for j in range(H):
        bloc = np.asarray(arr[j * fy:(j + 1) * fy], dtype=np.float32)
        bloc = bloc.reshape(fy, W, fx)
        sol = bloc > -0.5
        n_sol = sol.sum(axis=(0, 2))
        terre[j] = n_sol / (fx * fy)
        for c in cotes:
            bas = sol & (bloc <= c)
            frac[c][j] = bas.sum(axis=(0, 2)) / np.maximum(n_sol, 1)
    del arr
    src.close()
    return frac, terre


def canal_fleuves(prec_an, terre):
    """Proximité d'un grand fleuve x intensité du mois le plus humide."""
    masque = rasteriser_fleuves()
    dist = distance_transform_edt(~masque)                   # en pixels de 10'
    proximite = np.exp(-(dist / 6.0) ** 2)
    intensite = np.clip(np.nan_to_num(prec_an).max(axis=-1) / 260.0, 0, 1)
    return proximite * intensite * terre


def rasteriser_fleuves():
    """Trace les polylignes Natural Earth dans une grille booléenne W x H."""
    z = zipfile.ZipFile(RAW / 'ne_rivers.zip')
    shp = next(n for n in z.namelist() if n.endswith('.shp'))
    buf = z.read(shp)
    grille = np.zeros((H, W), bool)
    pos = 100                                                # en-tête .shp
    while pos + 8 <= len(buf):
        _, longueur = struct.unpack('>ii', buf[pos:pos + 8])
        corps = pos + 8
        pos = corps + longueur * 2
        (typ,) = struct.unpack('<i', buf[corps:corps + 4])
        if typ != 3:                                         # PolyLine seulement
            continue
        n_parts, n_pts = struct.unpack('<ii', buf[corps + 36:corps + 44])
        d = corps + 44 + n_parts * 4
        pts = np.frombuffer(buf, '<f8', count=n_pts * 2, offset=d).reshape(-1, 2)
        x = np.clip(((pts[:, 0] + 180.0) / 360.0 * W).astype(int), 0, W - 1)
        y = np.clip(((90.0 - pts[:, 1]) / 180.0 * H).astype(int), 0, H - 1)
        grille[y, x] = True
    return grille


def exporter_fleuves(seuil_rang=4):
    """Polylignes Natural Earth des grands fleuves -> data/rivers.json.

    Remplace les six tracés dessinés à la main : vraie géométrie, noms FR/EN.
    """
    z = zipfile.ZipFile(RAW / 'ne_rivers.zip')
    base = 'ne_10m_rivers_lake_centerlines'
    dbf = z.read(base + '.dbf')
    nrec = struct.unpack('<i', dbf[4:8])[0]
    hlen = struct.unpack('<h', dbf[8:10])[0]
    rlen = struct.unpack('<h', dbf[10:12])[0]
    champs, off = [], 32
    while dbf[off] != 0x0D:
        champs.append((dbf[off:off + 11].split(b'\0')[0].decode(), dbf[off + 16]))
        off += 32
    attrs = []
    for i in range(nrec):
        p, ligne = hlen + i * rlen + 1, {}
        for nom, taille in champs:
            ligne[nom] = dbf[p:p + taille].decode('utf8', 'replace').strip(' \x00\t')
            p += taille
        attrs.append(ligne)

    buf = z.read(base + '.shp')
    sorties, pos, i = [], 100, 0
    while pos + 8 <= len(buf):
        _, longueur = struct.unpack('>ii', buf[pos:pos + 8])
        corps = pos + 8
        pos = corps + longueur * 2
        (typ,) = struct.unpack('<i', buf[corps:corps + 4])
        a = attrs[i]
        i += 1
        if typ != 3:
            continue
        try:
            rang = int(a.get('scalerank') or 99)
        except ValueError:
            rang = 99
        if rang > seuil_rang:
            continue
        n_parts, n_pts = struct.unpack('<ii', buf[corps + 36:corps + 44])
        parts = np.frombuffer(buf, '<i4', count=n_parts, offset=corps + 44)
        pts = np.frombuffer(buf, '<f8', count=n_pts * 2,
                            offset=corps + 44 + n_parts * 4).reshape(-1, 2)
        for k in range(n_parts):
            deb = parts[k]
            fin = parts[k + 1] if k + 1 < n_parts else n_pts
            seg = pts[deb:fin][::3]                      # décimation 1 point sur 3
            if len(seg) < 2:
                continue
            sorties.append({
                'nom': a.get('name_fr') or a.get('name') or '',
                'name': a.get('name_en') or a.get('name') or '',
                'pts': [[round(float(y), 2), round(float(x), 2)] for x, y in seg],
            })
    return sorties


def canal_argiles(terre):
    """Retrait-gonflement des argiles : bassins sédimentaires argileux
    (France + grandes plaines connues). Faute de source globale ouverte,
    ce calque reste indicatif et est étiqueté comme tel dans l'interface."""
    bassins = [                     # lat, lon, rayon °, intensité
        (48.6, 2.4, 3.2, 0.95), (44.8, 0.3, 2.6, 0.85), (43.6, 3.9, 2.0, 0.80),
        (45.8, 4.9, 1.8, 0.70), (47.3, -0.6, 2.2, 0.65), (51.5, 0.1, 2.0, 0.75),
        (41.9, 12.5, 2.2, 0.55), (39.5, -4.0, 3.0, 0.60), (32.8, -96.8, 4.0, 0.85),
        (29.8, -95.4, 3.2, 0.80), (-25.5, 28.2, 3.5, 0.70), (-34.6, -58.4, 3.0, 0.55),
        (28.6, 77.2, 3.5, 0.60), (35.7, 139.7, 1.6, 0.40),
    ]
    lat = np.linspace(90 - 90 / H, -90 + 90 / H, H)[:, None]
    lon = np.linspace(-180 + 180 / W, 180 - 180 / W, W)[None, :]
    out = np.zeros((H, W), np.float32)
    for la, lo, r, amp in bassins:
        d2 = ((lat - la) ** 2 + ((lon - lo) * np.cos(np.radians(la))) ** 2) / (r * r)
        out = np.maximum(out, amp * np.exp(-d2))
    return out * terre


def ecrire_png(chemin, canaux):
    """PNG RGB strictement — pas de canal alpha.

    Un canal alpha rendrait les données illisibles côté client : canvas
    getImageData dé-prémultiplie, donc tout pixel d'alpha nul renvoie RGB = 0.
    Les mêmes fichiers servent au shader et à l'échantillonnage du dossier.
    """
    from PIL import Image
    assert len(canaux) == 3, 'trois canaux par texture'
    rgb = np.stack([np.clip(c * 255.0, 0, 255).astype(np.uint8) for c in canaux], axis=-1)
    Image.fromarray(rgb, 'RGB').save(chemin, optimize=True)
    print('  ->', chemin.name, chemin.stat().st_size // 1024, 'Ko')


def villes():
    z = zipfile.ZipFile(RAW / 'cities15000.zip')
    lignes = z.read('cities15000.txt').decode('utf8').splitlines()
    par_pays = {}
    for ligne in lignes:
        f = ligne.split('\t')
        pop = int(f[14] or 0)
        par_pays.setdefault(f[8], []).append((pop, f[1], float(f[4]), float(f[5]), f[7]))
    sortie = []
    for iso, liste in par_pays.items():
        liste.sort(reverse=True)
        # les 6 plus grandes de chaque pays + toutes celles au-dessus de 200 000
        garde = {id(v): v for v in liste[:6]}
        for v in liste:
            if v[0] >= 200_000:
                garde[id(v)] = v
        for pop, nom, lat, lon, code in garde.values():
            sortie.append([nom, iso, round(lat, 3), round(lon, 3), pop,
                           1 if code == 'PPLC' else 0])
    sortie.sort(key=lambda v: -v[4])
    return sortie


def main():
    print('· masque terre')
    terre = masque_terre().astype(np.float32)

    print('· climat WorldClim / CMIP6')
    tmax = {cle: lire_periode('tmax', cle) for _, cle in KNOTS}
    prec = {cle: lire_periode('prec', cle) for _, cle in KNOTS}

    print('· élévation ETOPO')
    cotes = {an: SLR[an] + SURCOTE for an in (2026, 2050)}
    frac_sous, terre_etopo = charger_elevation(sorted(set(cotes.values())))
    terre = np.maximum(terre, terre_etopo > 0.5)

    couches = {}
    for an in (2026, 2050):
        t = interp_annee(tmax, an)
        p = interp_annee(prec, an)
        jours35 = canal_chaleur(t)
        aridite = canal_aridite(t, p)
        couches[an] = dict(
            chaleur=norm(np.nan_to_num(jours35), 0, 150) * terre,
            secheresse=norm(-np.nan_to_num(aridite, nan=40.0), -40, -5) * terre,
            feux=canal_feux(t, p, terre),
            mer=frac_sous[cotes[an]] * terre,
            fleuves=canal_fleuves(p, terre),
        )

    argiles = canal_argiles(terre)

    print('· écriture')
    for an in (2026, 2050):
        c = couches[an]
        ecrire_png(OUT / f'risques_{an}.png',
                   [gaussian_filter(c['chaleur'], 0.6), gaussian_filter(c['secheresse'], 0.6),
                    gaussian_filter(c['feux'], 0.6)])
    ecrire_png(OUT / 'risques_mer.png',
               [couches[2026]['mer'], couches[2050]['mer'], argiles])
    ecrire_png(OUT / 'risques_stat.png',
               [couches[2026]['fleuves'], couches[2050]['fleuves'], terre])

    fl = exporter_fleuves()
    (OUT / 'rivers.json').write_text(json.dumps(fl, ensure_ascii=False, separators=(',', ':')))
    print(f'  -> rivers.json {len(fl)} tronçons, {(OUT / "rivers.json").stat().st_size // 1024} Ko')

    v = villes()
    (OUT / 'places.json').write_text(json.dumps(
        {'schema': ['nom', 'iso2', 'lat', 'lon', 'pop', 'capitale'], 'villes': v},
        ensure_ascii=False, separators=(',', ':')))
    print(f'  -> places.json {len(v)} villes, {(OUT / "places.json").stat().st_size // 1024} Ko')


if __name__ == '__main__':
    main()

"""Pipeline hors-ligne TERRA/2050 : sources climatiques réelles -> data/.

Sorties :
  data/places.json          annuaire de villes GeoNames (nom, ISO2, lat, lon, population)
  data/grille_a_2026.png    RGB 2160x1080 = jours d'indice de chaleur >32C, jours <0C, deficit hydrique
  data/grille_a_2050.png    idem, horizon 2050
  data/grille_b_2026.png    RGB = danger de feu, submersion, inondation fluviale
  data/grille_b_2050.png    idem, horizon 2050
  data/grille_c.png         RGB = argiles (indicatif), masque terre, reserve
  data/rivers.json          polylignes des grands fleuves (Natural Earth)

Sources (toutes librement téléchargeables, sans clé) :
  WorldClim 2.1 10' historique 1970-2000 (tmax, tmin, prec, vapr)
  JRC Global River Flood Hazard rp100 (crue centennale, profondeur)
  Oelsmann et al. 2025 (Zenodo 19830370) — subsidence cotiere VLM
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


def canal_chaleur_humide(tmax_an, vapr_hist, tmax_hist):
    """Jours annuels au-dessus de 32 °C d'indice de chaleur (heat index).

    L'inconfort thermique réel dépend de l'humidité : 35 °C secs à Phoenix et
    33 °C moites à Singapour ne se vivent pas pareil. On calcule l'indice de
    chaleur de Rothfusz à partir de la température et de l'humidité relative,
    cette dernière étant déduite de la pression de vapeur observée (WorldClim
    vapr, 1970-2000) et de la pression de vapeur saturante.

    Pour les horizons futurs, l'humidité relative est tenue constante — c'est
    l'hypothèse standard au premier ordre des projections CMIP6 — donc la
    pression de vapeur suit le réchauffement de tmax.
    """
    es = lambda t: 0.6108 * np.exp(17.27 * t / (t + 237.3))     # kPa, Tetens
    hr_hist = np.clip(vapr_hist / np.maximum(es(tmax_hist), 1e-3), 0.05, 1.0)
    hr = hr_hist                                                # humidité relative conservée
    T = tmax_an * 9 / 5 + 32                                    # Rothfusz travaille en °F
    R = hr * 100
    HI = (-42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
          - 6.83783e-3 * T ** 2 - 5.481717e-2 * R ** 2 + 1.22874e-3 * T ** 2 * R
          + 8.5282e-4 * T * R ** 2 - 1.99e-6 * T ** 2 * R ** 2)
    HI = np.where(T < 80, T, HI)
    HI = (HI - 32) * 5 / 9                                      # retour en °C
    lat = np.abs(np.linspace(90 - 90 / H, -90 + 90 / H, H))[:, None, None]
    sigma = 1.7 + 2.6 * np.clip(lat / 55.0, 0, 1)
    z = (32.0 - HI) / sigma
    frac = 0.5 * (1.0 - np.vectorize(_erf)(z / np.sqrt(2.0)))
    return np.nansum(frac * 30.4, axis=-1)


def canal_froid(tmin_an):
    """Jours annuels sous 0 °C, estimés depuis les tmin mensuels.

    Même hypothèse gaussienne que canal_chaleur, sur la borne basse : c'est le
    coût de chauffage et le gel, l'autre moitié du confort thermique.
    """
    lat = np.abs(np.linspace(90 - 90 / H, -90 + 90 / H, H))[:, None, None]
    sigma = 2.0 + 3.2 * np.clip(lat / 55.0, 0, 1)
    z = (0.0 - tmin_an) / sigma
    frac = 0.5 * (1.0 + np.vectorize(_erf)(z / np.sqrt(2.0)))
    return np.nansum(frac * 30.4, axis=-1)


def canal_aridite(tmax_an, prec_an):
    """Indice d'aridité de De Martonne : P / (T + 10). Bas = sec."""
    p = np.nansum(prec_an, axis=-1)
    t = np.nanmean(tmax_an, axis=-1) - 5.0      # tmax -> proxy de température moyenne
    return p / np.maximum(t + 10.0, 1.0)


def canal_feux(tmax_an, prec_an, terre, deficit):
    """Danger météo de feu : mois chauds et secs, pondérés par la végétation
    disponible (un désert sans combustible ne brûle pas).

    Calibré sur les régimes connus : les moyennes mensuelles lissent les
    vagues de chaleur, donc les seuils sont bas (75 mm, 16 °C) et le danger
    moyenne les DEUX pires mois — sinon la Méditerranée et le sud-est
    australien, régimes épisodiques, sortent quasi éteints.
    """
    pm = np.nan_to_num(prec_an)
    tm = np.nan_to_num(tmax_an)
    secheresse_mois = np.clip(1.0 - pm / 75.0, 0, 1) * np.clip((tm - 16.0) / 15.0, 0, 1)
    tri = np.sort(secheresse_mois, axis=-1)
    danger = tri[..., -2:].mean(axis=-1)
    p_annuel = pm.sum(axis=-1)
    combustible = np.clip((p_annuel - 100.0) / 420.0, 0, 1)     # ni désert nu, ni tourbière
    # l'aridité annuelle sépare les régimes que les moyennes mensuelles
    # confondent : un été anglais et un été de Canberra ont des mois moyens
    # voisins, mais pas le même déficit hydrique de fond
    aride = np.nan_to_num(deficit)
    brut = danger * combustible * (0.35 + 0.65 * aride)
    return np.clip(brut, 0, 1) ** 0.7 * terre


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
    """Proximité d'un grand fleuve x intensité de crue de SON bassin.

    La crue est portée par la pluie du bassin, pas par la pluie locale : le
    Nil inonde Le Caire avec l'eau des hauts plateaux éthiopiens alors qu'il
    ne pleut pas au Caire. Chaque fleuve reçoit donc le maximum de pluie
    mensuelle rencontré LE LONG DE SON TRACÉ, et chaque texel proche d'un
    fleuve hérite de la valeur du tronçon le plus proche.
    """
    intensite_locale = np.clip(np.nan_to_num(prec_an).max(axis=-1) / 260.0, 0, 1)
    fleuves = exporter_fleuves()
    en_cellules = []
    for f in fleuves:
        cellules = []
        for la, lo in f['pts']:
            x = min(W - 1, max(0, int(round((lo + 180) / 360 * W))))
            y = min(H - 1, max(0, int(round((90 - la) / 180 * H))))
            cellules.append((y, x))
        en_cellules.append(cellules)
    # le bassin se calcule par fleuve NOMMÉ, tous tronçons confondus : le
    # tronçon égyptien du Nil est désertique, sa crue vient des tronçons amont
    def cle_bassin(f, cellules):
        # nom + région grossière du premier point : deux « Colorado » sur deux
        # continents ne partagent plus leur crue
        y0, x0 = cellules[0] if cellules else (0, 0)
        return (f['name'] or f['nom'] or id(f), y0 // 120, x0 // 120)
    bassin_par_nom = {}
    for f, cellules in zip(fleuves, en_cellules):
        m = max(intensite_locale[y, x] for y, x in cellules)
        k = cle_bassin(f, cellules)
        bassin_par_nom[k] = max(bassin_par_nom.get(k, 0.0), m)
    valeur_fleuve = np.zeros((H, W), np.float32)
    masque = np.zeros((H, W), bool)
    for f, cellules in zip(fleuves, en_cellules):
        bassin = bassin_par_nom[cle_bassin(f, cellules)]
        for y, x in cellules:
            masque[y, x] = True
            valeur_fleuve[y, x] = max(valeur_fleuve[y, x], bassin)
    dist, (iy, ix) = distance_transform_edt(~masque, return_indices=True)
    proximite = np.exp(-(dist / 6.0) ** 2)
    return proximite * valeur_fleuve[iy, ix] * terre


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


def declin_population():
    """Variation de population 2025 -> 2050 par pays (ONU WPP 2024, variante
    médiane, miroir Our World in Data) : {ISO_A2: pct}, et la grille W x H du
    DÉCLIN (0-1, 0 = stable ou croissance) rasterisée depuis Natural Earth."""
    import csv, io
    from PIL import Image, ImageDraw

    # % de variation par ISO3
    delta3 = {}
    with open(RAW / 'owid_population_projections.csv') as fh:
        courant = {}
        for r in csv.reader(fh):
            if r[0] == 'entity':
                continue
            code, an = r[1], int(r[2])
            if not code or code.startswith('OWID'):
                continue
            val = r[3] or r[4]
            if val and an in (2025, 2050):
                courant.setdefault(code, {})[an] = float(val)
        for c, v in courant.items():
            if 2025 in v and 2050 in v and v[2025] > 0:
                delta3[c] = (v[2050] / v[2025] - 1.0) * 100.0

    # polygones Natural Earth admin-0 + attributs ISO
    z = zipfile.ZipFile(RAW / 'ne_admin0.zip')
    dbf = z.read('ne_10m_admin_0_countries.dbf')
    nrec = struct.unpack('<i', dbf[4:8])[0]
    hlen = struct.unpack('<h', dbf[8:10])[0]
    rlen = struct.unpack('<h', dbf[10:12])[0]
    champs, off = [], 32
    while dbf[off] != 0x0D:
        champs.append((dbf[off:off + 11].split(b'\0')[0].decode(), dbf[off + 16]))
        off += 32
    attrs = []
    for i in range(nrec):
        pos, ligne = hlen + i * rlen + 1, {}
        for nom, taille in champs:
            ligne[nom] = dbf[pos:pos + taille].decode('utf8', 'replace').strip(' \x00\t')
            pos += taille
        attrs.append(ligne)

    buf = z.read('ne_10m_admin_0_countries.shp')
    img = Image.new('F', (W, H), 0.0)
    dess = ImageDraw.Draw(img)
    iso2_delta = {}
    pos, i = 100, 0
    while pos + 8 <= len(buf):
        _, longueur = struct.unpack('>ii', buf[pos:pos + 8])
        corps = pos + 8
        pos = corps + longueur * 2
        (typ,) = struct.unpack('<i', buf[corps:corps + 4])
        a = attrs[i]; i += 1
        if typ != 5:
            continue
        iso3 = a.get('ISO_A3_EH') or a.get('ISO_A3') or a.get('ADM0_A3')
        if iso3 in ('-99', '', None):
            iso3 = a.get('ADM0_A3')
        pct = delta3.get(iso3)
        iso2 = a.get('ISO_A2_EH') or a.get('ISO_A2')
        if iso2 and iso2 != '-99' and pct is not None:
            iso2_delta[iso2] = pct
        if pct is None or pct >= 0:
            continue                                    # seule la décroissance colore
        val = min(1.0, -pct / 30.0)                     # -30 % et au-delà : saturé
        n_parts, n_pts = struct.unpack('<ii', buf[corps + 36:corps + 44])
        parts = np.frombuffer(buf, '<i4', count=n_parts, offset=corps + 44)
        pts = np.frombuffer(buf, '<f8', count=n_pts * 2,
                            offset=corps + 44 + n_parts * 4).reshape(-1, 2)
        for k in range(n_parts):
            deb = parts[k]
            fin = parts[k + 1] if k + 1 < n_parts else n_pts
            seg = pts[deb:fin]
            if len(seg) < 3:
                continue
            poly = [((x + 180.0) / 360.0 * W, (90.0 - y) / 180.0 * H) for x, y in seg]
            # les anneaux intérieurs (trous, sens horaire inverse) repeignent 0 :
            # approximation honnête à 10' — les enclaves sont plus petites qu'un texel
            dess.polygon(poly, fill=val)
    grille = np.asarray(img, dtype=np.float32)
    return iso2_delta, grille


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
    rgb = np.stack([np.round(np.clip(c * 255.0, 0, 255)).astype(np.uint8) for c in canaux], axis=-1)
    Image.fromarray(rgb, 'RGB').save(chemin, optimize=True)
    print('  ->', chemin.name, chemin.stat().st_size // 1024, 'Ko')


# ---------------------------------------------------------------------------
# Métriques par ville, à résolution NATIVE. Le dossier lit ces valeurs — la
# texture 10' du globe reste un affichage. Un texel de 18 km noyait la bande
# côtière sous le niveau de la mer de Jakarta dans les collines voisines.
RAYON_VILLE_KM = 12.0        # disque autour du point ville
RAYON_MEGAPOLE_KM = 20.0     # au-delà de 5 M hab. : une mégapole s'étend sur 30+ km
SEUIL_MEGAPOLE = 5_000_000
SEUIL_CRUE_M = 0.5           # en dessous : gênant ; au-dessus : dégâts structurels
PROF_REF_M = 3.0             # ~ un étage : les courbes de dégâts s'aplatissent après


def _disque(arr, sh, sw, lat, lon, cell_deg, rayon_km=RAYON_VILLE_KM):
    """Cellules du disque autour du point, grille equirectangulaire de pas
    `cell_deg` (origine 90N/180W). Les colonnes BOUCLENT à l'antiméridien
    (Suva, Funafuti perdaient la moitié de leur fenêtre) ; rayon en ceil et
    centre en round : la troncature rabotait ~8 % de l'aire partout."""
    import math
    y = round((90.0 - lat) / cell_deg)
    x = round((lon + 180.0) / cell_deg)
    km_par_cell = 111.0 * cell_deg
    dy = max(1, math.ceil(rayon_km / km_par_cell))
    dx = max(1, math.ceil(rayon_km / (km_par_cell * max(0.2, np.cos(np.radians(lat))))))
    ys = np.clip(np.arange(y - dy, y + dy + 1), 0, sh - 1)
    xs = np.arange(x - dx, x + dx + 1) % sw
    b = np.asarray(arr[ys][:, xs], dtype=np.float32)
    yy, xx = np.mgrid[0:b.shape[0], 0:b.shape[1]]
    d2 = ((yy - dy) / dy) ** 2 + ((xx - dx) / dx) ** 2
    return b[d2 <= 1.0]


def stats_elevation(elev, eh, ew, lat, lon, rayon_km=RAYON_VILLE_KM, sub50=0.0):
    """ETOPO 60'' -> fractions de terre sous les cotes, sous 5 m, médiane.
    `sub50` = enfoncement du sol d'ici 2050 (m, >= 0, mesures VLM) : il RELÈVE
    la cote de submersion 2050 — c'est le mécanisme réel de Jakarta."""
    b = _disque(elev, eh, ew, lat, lon, 1.0 / 60.0, rayon_km)
    sol = b[b > -0.5] if b.size else b
    if sol.size == 0:
        return dict(f26=0.0, f50=0.0, f5=0.0, med=0.0)
    return dict(
        f26=float((sol <= SLR[2026] + SURCOTE).mean()),
        f50=float((sol <= SLR[2050] + SURCOTE + sub50).mean()),
        f5=float((sol <= 5.0).mean()),
        med=float(np.median(sol)))


def stats_crue(jrc, jh, jw, jpx, jx0, jy0, lat, lon, rayon_km=RAYON_VILLE_KM):
    """Carte JRC rp100 (profondeur m) -> fraction inondée > 0.5 m, d90.

    Le .tfw donne le CENTRE du pixel haut-gauche : +0.5 sinon toute fenêtre
    glisse d'un demi-pixel. Colonnes bouclées à l'antiméridien."""
    import math
    y = int((jy0 - lat) / jpx + 0.5)
    x = int((lon - jx0) / jpx + 0.5)
    km_par_cell = 111.0 * jpx
    d = max(1, math.ceil(rayon_km / km_par_cell))
    ys = np.clip(np.arange(y - d, y + d + 1), 0, jh - 1)
    xs = np.arange(x - d, x + d + 1) % jw
    b = jrc[ys][:, xs]
    b = np.where(np.isfinite(b) & (b > 0), b, 0.0).astype(np.float32)
    if b.size == 0:
        return dict(f=0.0, d90=0.0)
    inonde = b > SEUIL_CRUE_M
    prof = float(np.percentile(b[inonde], 90)) if inonde.any() else 0.0
    return dict(f=float(inonde.mean()), d90=prof)


A_LIGNE, A_DELTA = 0.25, 0.40     # 25 % sous la ligne / 40 % sous 5 m = saturé
W_LIGNE, W_DELTA = 0.40, 0.60


def penalite_mer(st, t):
    """Ancres concaves : 25 % de la ville sous la ligne de submersion ou 40 %
    sous 5 m, c'est déjà une ville inondable — une fraction linéaire dirait
    « moins de la moitié ». La ligne 2050 intègre la subsidence mesurée."""
    ligne = st['f26'] * (1 - t) + st['f50'] * t
    return min(1.0, W_LIGNE * min(ligne / A_LIGNE, 1.0)
                  + W_DELTA * min(st['f5'] / A_DELTA, 1.0))


def penalite_crue(st):
    """0.65 x étendue + 0.35 x profondeur normalisée à un étage, la profondeur
    n'entrant en jeu que si l'étendue est significative (>= 10 % des terres) —
    sinon quelques cellules de gorge profonde fabriquent une crue en plein
    désert. Constante à 2050 : aucune projection fluviale ouverte vérifiée
    n'existe — dit en clair dans l'interface."""
    porte = min(st['f'] / 0.10, 1.0)
    return min(1.0, 0.65 * st['f'] + 0.35 * min(st['d90'] / PROF_REF_M, 1.0) * porte)


def charger_vlm():
    """Vitesses verticales du sol (mm/an) aux côtes peuplées — Oelsmann et
    al. 2025 (Zenodo 19830370), GPS+InSAR+GIA. Négatif = le sol s'enfonce."""
    import h5py
    f = h5py.File(RAW / 'vlm_oelsmann2025.nc', 'r')
    return f['lat'][:], f['lon'][:], f['OE24_GPS_InSAR_GIA'][:]


def subsidence_2050(vlat, vlon, vvlm, lat, lon):
    """Enfoncement cumulé d'ici 2050 (m, >= 0) : pire décile des points VLM
    dans une boîte de 0.6°. Aucun point mesuré -> 0 (et rien d'inventé)."""
    dlon = np.abs(vlon - lon)
    dlon = np.minimum(dlon, 360.0 - dlon)           # bouclage antiméridien
    m = (np.abs(vlat - lat) < 0.6) & (dlon < 0.6) & np.isfinite(vvlm)
    if not m.any():
        return 0.0
    p10 = float(np.percentile(vvlm[m], 10))          # mm/an, négatif = enfoncement
    return max(0.0, -p10) * 24.0 / 1000.0            # 2026 -> 2050


def precompute_villes(couches, terre):
    """Pour chaque ville : pénalités des six critères aux deux horizons, à
    résolution native pour mer/crue, depuis les grilles float pour le climat
    (mêmes valeurs que la calibration — le client ne relit plus les PNG)."""
    src = tifffile.TiffFile(RAW / 'etopo_60s.tif')
    elev = src.pages[0].asarray(out='memmap')
    eh, ew = src.pages[0].shape
    import io
    z = zipfile.ZipFile(RAW / 'jrc_flood_rp100y.zip')
    jrc = tifffile.imread(io.BytesIO(z.read('floodMapGL_rp100y.tif')))
    tfw = z.read('floodMapGL_rp100y.tfw').decode().split()
    jpx, jx0, jy0 = float(tfw[0]), float(tfw[4]), float(tfw[5])

    vlat, vlon, vvlm = charger_vlm()
    vs = villes()
    sortie = []
    for v in vs:
        la, lo = v[2], v[3]
        rayon = RAYON_MEGAPOLE_KM if v[4] >= SEUIL_MEGAPOLE else RAYON_VILLE_KM
        sub = subsidence_2050(vlat, vlon, vvlm, la, lo)
        el = stats_elevation(elev, eh, ew, la, lo, rayon, sub)
        cr = stats_crue(jrc, jrc.shape[0], jrc.shape[1], jpx, jx0, jy0, la, lo, rayon)
        clim = penalites(couches, la, lo, terre)
        pen = {}
        brut_total = 0.0
        for an, t in ((2026, 0.0), (2050, 1.0)):
            brut = {
                'thermique': clim[an]['thermique'],
                'eau': clim[an]['eau'],
                'feux': clim[an]['feux'],
                'mer': penalite_mer(el, t),
                'fleuves': penalite_crue(cr),
                'stabilite': clim[an]['stabilite'],
            }
            brut_total += sum(brut.values())
            # quantifié sur 1/250 DÈS ICI : la calibration et le binaire
            # partagent exactement les mêmes valeurs que le client relira
            pen[an] = {k: round(v * 250) / 250 for k, v in brut.items()}
        sortie.append(dict(
            nodata=bool(brut_total < 1e-9),
            mer=dict(f50=round(el['f50'], 3), f5=round(el['f5'], 3), med=round(el['med'], 1),
                     sub=round(sub, 2)),
            crue=dict(f=round(cr['f'], 3), d90=round(cr['d90'], 2)),
            pen=pen))
    src.close()
    return sortie


_VILLES_CACHE = None_VILLES_CACHE = None


def villes():
    """TOUTES les villes GeoNames de 15 000 habitants et plus (~34 000) — la
    couverture est mondiale, Montauban comme Mandalay. Chaque entrée porte son
    nom français et son nom anglais (alternateNamesV2)."""
    global _VILLES_CACHE
    if _VILLES_CACHE is not None:
        return _VILLES_CACHE
    z = zipfile.ZipFile(RAW / 'cities15000.zip')
    lignes = z.read('cities15000.txt').decode('utf8').splitlines()
    retenues = []
    for ligne in lignes:
        f = ligne.split('\t')
        retenues.append([f[1], f[8], round(float(f[4]), 3), round(float(f[5]), 3),
                         int(f[14] or 0), 1 if f[7] == 'PPLC' else 0, int(f[0])])
    ids = {v[6] for v in retenues}
    noms = noms_localises(ids)
    for v in retenues:
        fr, en = noms.get(v[6], (None, None))
        v[0] = fr or v[0]
        v.append(en or v[0])          # nom anglais, pour le basculement de langue
        v.pop(6)                      # l'identifiant GeoNames ne sert plus
    retenues.sort(key=lambda v: -v[4])
    _VILLES_CACHE = retenues
    return retenues


def noms_localises(ids):
    """(nom_fr, nom_en) par identifiant GeoNames, depuis alternateNamesV2.

    On préfère isPreferredName, puis le premier nom non historique de la langue.
    """
    z = zipfile.ZipFile(RAW / 'alternateNamesV2.zip')
    meilleur = {}
    with z.open('alternateNamesV2.txt') as fh:
        for brut in fh:
            ligne = brut.decode('utf8', 'replace').rstrip('\n')
            f = ligne.split('\t')
            if len(f) < 4:
                continue
            lang = f[2]
            if lang not in ('fr', 'en'):
                continue
            try:
                gid = int(f[1])
            except ValueError:
                continue
            if gid not in ids:
                continue
            if len(f) > 7 and f[7] == '1':        # isHistoric
                continue
            prefere = len(f) > 4 and f[4] == '1'
            cle = (gid, lang)
            rang = 0 if prefere else 1
            if cle not in meilleur or rang < meilleur[cle][0]:
                meilleur[cle] = (rang, f[3])
    sortie = {}
    for (gid, lang), (_, nom) in meilleur.items():
        fr, en = sortie.get(gid, (None, None))
        sortie[gid] = (nom, en) if lang == 'fr' else (fr, nom)
    return sortie


# Poids des six critères d'habitabilité. Doivent rester identiques à CRITERES
# dans index.html : le pipeline calibre les percentiles que le client applique.
POIDS = {'thermique': 0.22, 'eau': 0.18, 'feux': 0.12,
         'mer': 0.20, 'fleuves': 0.16, 'stabilite': 0.12}
LAMBDA_PIRE = 0.50          # 50 % du score est le pire axe : une catastrophe
                            # sur un seul critère ne peut plus se moyenner


def penalites(couches, la, lo, terre):
    """Pénalités 0-1 des six critères, aux deux horizons, pour un point.

    La spirale exige un texel où le CLIMAT est défini (masque WorldClim), pas
    seulement la terre ETOPO : Singapour et Mumbai tombaient sur des texels
    « terre » pour ETOPO mais océan pour WorldClim (NaN -> 0) et sortaient
    avec un confort thermique parfait en pleine chaleur équatoriale."""
    def lit(an, cle):
        g = couches[an][cle]
        y = int(round((90 - la) / 180 * H))
        x = int(round((lo + 180) / 360 * W))
        # r <= 7 (~130 km) : vallées andines et petites îles dont le texel CMIP6
        # est absent ; au-delà, mieux vaut zéro connu qu'un climat d'ailleurs
        for r in range(8):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if r and max(abs(dx), abs(dy)) != r:
                        continue
                    yy, xx = min(H - 1, max(0, y + dy)), (x + dx) % W
                    if terre[yy, xx] < 0.5:
                        continue
                    return float(g[yy, xx])
        return float(g[min(H - 1, max(0, y)), x % W])

    ecart = (abs(lit(2050, 'chaud') - lit(2026, 'chaud')) * 1.0
             + abs(lit(2050, 'sec') - lit(2026, 'sec')) * 0.8
             + abs(lit(2050, 'feux') - lit(2026, 'feux')) * 0.6
             + abs(lit(2050, 'mer') - lit(2026, 'mer')) * 1.2) / 3.6
    out = {}
    for an in (2026, 2050):
        # même accumulation que le client. Le plancher 0.25 en 2026 est un
        # choix assumé : un site qui VA basculer porte déjà un quart de sa
        # pénalité aujourd'hui — l'instabilité se paie avant d'arriver
        t = 0.0 if an == 2026 else 1.0
        out[an] = {
            'thermique': min(1, lit(an, 'chaud') * 1.15 + lit(an, 'froid') * 0.45),
            'eau': lit(an, 'sec'),
            'feux': lit(an, 'feux'),
            'mer': min(1, lit(an, 'mer') * 1.6),
            'fleuves': lit(an, 'fleuves'),
            'stabilite': min(1, ecart * 2.2 * (0.25 + 0.75 * t)),
        }
    return out


_TERRE_CLIMAT = None


def terre_climat():
    """Masque des texels où le climat est défini PARTOUT : l'historique
    WorldClim ET les projections CMIP6, dont le masque côtier est plus étroit
    (Mumbai, Singapour : historique présent, futur NaN -> canaux à zéro)."""
    global _TERRE_CLIMAT
    if _TERRE_CLIMAT is None:
        hist = ~np.isnan(lire_periode('tmax', 'hist')[:, :, 0])
        futur = ~np.isnan(lire_periode('tmax', '2041_2060')[:, :, 0])
        _TERRE_CLIMAT = (hist & futur).astype(np.float32)
    return _TERRE_CLIMAT


def calibrer(couches, terre, n_quantiles=21):
    """Échelle de référence : la distribution des villes AUJOURD'HUI (2026).

    L'indice affiché est un rang parmi les 3579 grandes villes du monde à
    l'horizon 2026. Deux raisons de figer la référence sur le présent :
      - sans normalisation, 80 % des villes se tassent au-dessus de 85 ;
      - en recalibrant à chaque horizon, le réchauffement devient invisible
        (tout le monde se dégrade, donc les rangs ne bougent pas). Sur une
        échelle fixée au présent, une ville qui se réchauffe descend vraiment.
    """
    vs = villes()
    risques = precompute_villes(couches, terre_climat())
    par_critere = {c: [p['pen'][2026][c] for p in risques] for c in POIDS}
    qs = np.linspace(0, 1, n_quantiles)
    quantiles = {c: [round(float(x), 5) for x in np.quantile(par_critere[c], qs)] for c in POIDS}

    # score ABSOLU (formule hybride moyenne + pire axe, la même que le client)
    def score(i):
        pens = {c: par_critere[c][i] for c in POIDS}
        p_moy = sum(pens[c] * POIDS[c] for c in POIDS) / sum(POIDS.values())
        p_max = max(pens.values())
        return 100.0 * (1.0 - ((1 - LAMBDA_PIRE) * p_moy + LAMBDA_PIRE * p_max))

    scores = sorted(score(i) for i in range(len(vs)))
    return {'poids': POIDS, 'lambda': LAMBDA_PIRE, 'quantiles': quantiles,
            'scores': [round(float(x), 2) for x in np.quantile(scores, qs)]}, risques


def main():
    print('· masque terre')
    terre = masque_terre().astype(np.float32)

    print('· climat WorldClim / CMIP6')
    tmax = {cle: lire_periode('tmax', cle) for _, cle in KNOTS}
    tmin = {cle: lire_periode('tmin', cle) for _, cle in KNOTS}
    vapr = lire_periode('vapr', 'hist')                       # humidité observée 1970-2000
    prec = {cle: lire_periode('prec', cle) for _, cle in KNOTS}

    print('· élévation ETOPO')
    cotes = {an: SLR[an] + SURCOTE for an in (2026, 2050)}
    frac_sous, terre_etopo = charger_elevation(sorted(set(cotes.values())))
    terre = np.maximum(terre, terre_etopo > 0.5)

    couches = {}
    for an in (2026, 2050):
        t = interp_annee(tmax, an)
        n = interp_annee(tmin, an)
        p = interp_annee(prec, an)
        deficit = norm(-np.nan_to_num(canal_aridite(t, p), nan=40.0), -40, -5) * terre
        couches[an] = dict(
            chaud=norm(np.nan_to_num(canal_chaleur_humide(t, vapr, tmax['hist'])), 0, 300) * terre,
            froid=norm(np.nan_to_num(canal_froid(n)), 0, 200) * terre,
            sec=deficit,
            feux=canal_feux(t, p, terre, deficit),
            mer=frac_sous[cotes[an]] * terre,
            fleuves=canal_fleuves(p, terre),
        )

    argiles = canal_argiles(terre)

    print('· écriture')
    flou = lambda a: gaussian_filter(a, 0.6)
    for an in (2026, 2050):
        c = couches[an]
        ecrire_png(OUT / f'grille_a_{an}.png', [flou(c['chaud']), flou(c['froid']), flou(c['sec'])])
        ecrire_png(OUT / f'grille_b_{an}.png', [flou(c['feux']), c['mer'], c['fleuves']])
    iso2_delta, grille_declin = declin_population()
    ecrire_png(OUT / 'grille_c.png', [terre_climat(), terre, grille_declin])

    fl = exporter_fleuves()
    (OUT / 'rivers.json').write_text(json.dumps(fl, ensure_ascii=False, separators=(',', ':')))
    print(f'  -> rivers.json {len(fl)} tronçons, {(OUT / "rivers.json").stat().st_size // 1024} Ko')

    print('· calibration des percentiles')
    calib, risques = calibrer(couches, terre)
    (OUT / 'calibration.json').write_text(json.dumps(calib, separators=(',', ':')))
    print('  -> calibration.json')

    v = villes()
    # Noms dans un JSON mince, tout le numérique dans un binaire à pas fixe de
    # 24 octets par ville : ~34 000 villes tiennent dans ~800 Ko au lieu de
    # plusieurs Mo de JSON. Pénalités quantifiées sur 1/250 (le dossier affiche
    # /100) et lat/lon sur 0.01° (~1 km, la précision du vol caméra).
    ORDRE_PEN = ['thermique', 'eau', 'feux', 'mer', 'fleuves', 'stabilite']
    q250 = lambda x: max(0, min(250, round(x * 250)))
    buf = bytearray()
    for ligne, r in zip(v, risques):
        p26, p50 = r['pen'][2026], r['pen'][2050]
        m, c = r['mer'], r['crue']
        rec = bytearray()
        rec += struct.pack('<hh', round(ligne[2] * 100), round(ligne[3] * 100))
        rec += bytes(q250(p26[k]) for k in ORDRE_PEN)
        rec += bytes(q250(p50[k]) for k in ORDRE_PEN)
        rec += bytes([q250(m['f50']), q250(m['f5'])])
        rec += struct.pack('<H', max(0, min(65535, round(m['med'] * 10))))
        rec += bytes([max(0, min(255, round((m.get('sub') or 0) * 100)))])
        pct = iso2_delta.get(ligne[1])
        octet_pop = 128 if pct is None else max(0, min(255, round(pct) + 128))
        rec += bytes([q250(c['f']), max(0, min(255, round(c['d90'] * 10))), octet_pop])
        if r.get('nodata'):
            rec[4] = 255      # sentinelle : première pénalité hors gamme = pas de score
        buf += rec
    assert len(buf) == 24 * len(v)
    (OUT / 'places.bin').write_bytes(buf)
    noms = [[l[0], l[1], l[4], l[5], l[6]] for l in v]
    (OUT / 'places.json').write_text(json.dumps(
        {'schema': ['nom_fr', 'iso2', 'pop', 'capitale', 'nom_en'], 'villes': noms},
        ensure_ascii=False, separators=(',', ':')))
    print(f'  -> places.json {len(v)} villes, {(OUT / "places.json").stat().st_size // 1024} Ko'
          f' + places.bin {(OUT / "places.bin").stat().st_size // 1024} Ko')


if __name__ == '__main__':
    main()

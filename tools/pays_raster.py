"""Grille des pays : quel pays sous chaque texel du globe -> data/pays.png.

    python3 tools/pays_raster.py                # lit raw/ne_50m_admin_0_countries.zip, le telecharge s il manque
    python3 tools/pays_raster.py chemin.zip     # ou un zip Natural Earth admin-0 deja en main
    python3 tools/pays_raster.py --autotest     # prouve que la grille dit vrai sur des points connus

Le survol du globe a besoin de savoir dans quel pays tombe le pointeur. Les
34 099 villes ne suffisent pas : la ville la plus proche d un point du Sahara
ou de la Siberie peut etre de l autre cote d une frontiere. On rasterise donc
les polygones Natural Earth (50 m, frontieres a ~5 km) a la resolution des
autres grilles, 2160 x 1080, soit 10 minutes d arc : un texel = 18 km. C est
la precision honnete d une etiquette au survol, pas d un cadastre.

Sorties :
  data/pays.png          niveaux de gris 2160x1080 : 0 = mer ou sans pays,
                         n = position dans la liste ci-dessous
  data/pays_index.json   {"w", "h", "iso": ["", "FR", ...]} — la valeur n
                         du PNG designe iso[n]

Les pays sont peints du plus etendu au plus petit : une enclave (Lesotho,
Saint-Marin) repeint par-dessus son voisin au lieu de disparaitre sous lui.
Les anneaux interieurs sont peints comme l exterieur, ce que l ordre corrige
pour les enclaves nommees ; un trou sans pays (lac) est plus petit qu un texel.
"""
import json
import struct
import sys
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

RACINE = Path(__file__).resolve().parent.parent
W, H = 2160, 1080
URL = 'https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip'
ZIP = RACINE / 'raw' / 'ne_50m_admin_0_countries.zip'
PNG = RACINE / 'data' / 'pays.png'
INDEX = RACINE / 'data' / 'pays_index.json'


def lire_dbf(dbf):
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
    return attrs


def iso2_de(a):
    # ISO_A2_EH corrige les -99 de la colonne brute (France, Norvege...)
    for cle in ('ISO_A2_EH', 'ISO_A2'):
        v = a.get(cle, '')
        if v and v != '-99' and len(v) == 2:
            return v.upper()
    return None


def formes(zip_path):
    """Rend [(iso2, aire_bbox, [anneaux])] pour chaque enregistrement polygone."""
    z = zipfile.ZipFile(zip_path)
    base = next(n[:-4] for n in z.namelist() if n.endswith('.shp'))
    attrs = lire_dbf(z.read(base + '.dbf'))
    buf = z.read(base + '.shp')
    sortie, pos, i = [], 100, 0
    while pos + 8 <= len(buf):
        _, longueur = struct.unpack('>ii', buf[pos:pos + 8])
        corps = pos + 8
        pos = corps + longueur * 2
        (typ,) = struct.unpack('<i', buf[corps:corps + 4])
        a = attrs[i]; i += 1
        if typ != 5:
            continue
        x0, y0, x1, y1 = struct.unpack('<dddd', buf[corps + 4:corps + 36])
        n_parts, n_pts = struct.unpack('<ii', buf[corps + 36:corps + 44])
        parts = struct.unpack('<%di' % n_parts, buf[corps + 44:corps + 44 + n_parts * 4])
        deb_pts = corps + 44 + n_parts * 4
        pts = struct.unpack('<%dd' % (n_pts * 2), buf[deb_pts:deb_pts + n_pts * 16])
        anneaux = []
        for k in range(n_parts):
            deb, fin = parts[k], parts[k + 1] if k + 1 < n_parts else n_pts
            seg = [(pts[2 * j], pts[2 * j + 1]) for j in range(deb, fin)]
            if len(seg) >= 3:
                anneaux.append(seg)
        sortie.append((iso2_de(a), (x1 - x0) * (y1 - y0), anneaux))
    return sortie


def rasteriser(zip_path):
    isos = ['']
    img = Image.new('L', (W, H), 0)
    dess = ImageDraw.Draw(img)
    # du plus etendu au plus petit : les enclaves repeignent par-dessus
    for iso, aire, anneaux in sorted(formes(zip_path), key=lambda f: -f[1]):
        if not iso:
            continue
        if iso not in isos:
            isos.append(iso)
        n = isos.index(iso)
        if n > 255:
            raise SystemExit('plus de 255 pays : la grille 8 bits ne suffit plus')
        for seg in anneaux:
            poly = [((x + 180.0) / 360.0 * W, (90.0 - y) / 180.0 * H) for x, y in seg]
            dess.polygon(poly, fill=n, outline=n)
    return img, isos


def lire(img, isos, lat, lon):
    x = min(W - 1, max(0, int((lon + 180.0) / 360.0 * W)))
    y = min(H - 1, max(0, int((90.0 - lat) / 180.0 * H)))
    return isos[img.getpixel((x, y))]


# points connus : (lat, lon, iso attendu). Enclaves et cotes compris.
TEMOINS = [(48.85, 2.35, 'FR'), (40.71, -74.0, 'US'), (-29.31, 27.48, 'LS'),
           (1.35, 103.82, 'SG'), (64.18, -51.72, 'GL'), (35.68, 139.69, 'JP'),
           (-33.87, 151.21, 'AU'), (55.75, 37.62, 'RU'), (-23.55, -46.63, 'BR'),
           (30.04, 31.24, 'EG'), (0.0, -160.0, ''), (43.73, 7.42, 'MC')]


def autotest(img, isos):
    rates = [(lat, lon, att, lire(img, isos, lat, lon)) for lat, lon, att in TEMOINS
             if lire(img, isos, lat, lon) != att]
    for lat, lon, att, lu in rates:
        print(f'ECHEC  {lat},{lon} : attendu {att or "mer"}, lu {lu or "mer"}')
    print(f'{len(TEMOINS) - len(rates)} sur {len(TEMOINS)} temoins justes')
    return not rates


def main():
    args = [a for a in sys.argv[1:] if a != '--autotest']
    zip_path = Path(args[0]) if args else ZIP
    if not zip_path.exists():
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        print('telechargement', URL)
        urllib.request.urlretrieve(URL, zip_path)
    img, isos = rasteriser(zip_path)
    if '--autotest' in sys.argv:
        sys.exit(0 if autotest(img, isos) else 1)
    img.save(PNG, optimize=True)
    INDEX.write_text(json.dumps({'w': W, 'h': H, 'iso': isos}, separators=(',', ':')))
    print(f'-> {PNG.relative_to(RACINE)} {PNG.stat().st_size // 1024} Ko, {len(isos) - 1} pays')
    ok = autotest(img, isos)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()

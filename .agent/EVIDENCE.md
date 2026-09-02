Spot-checks grilles (python, data/grille_*): voir sorties dans l'historique de
session du 2026-08-21. Extraits clés :
  chaleur  Niamey 1.00 Delhi .68 Manaus 1.00 | Oslo .00 Iakoutsk .02 Quito .00
  feux     Séville .80 Thessalie .67 Californie .70 Canberra .21 | Sahara .00 Congo .00
  sec      Sahara 1.00 Atacama 1.00 | Singapour .00 Bergen .00
  mer      Khulna .27 Amsterdam 1.00 N-Orléans .97 | Denver .00 Madrid .00
  fleuves  Nil .20 Rhin .66 Mississippi .71 Gange 1.00 | Tibet .00 Alice .00
Distribution instabilité (terre) : p50 .0013 p90 .024 p99 .056 max .353
Console build courant : {"buildNeuf":true,"erreurs":["setPointerCapture… (pointeur synthétique)"]}
Captures : chaleur/feux/sécheresse/fleuves/instabilité vue Le Caire 2050, NZ face nuit.

## Matrice de lancement — 2026-09-02, Playwright (Chromium 1223, WebKit 2272)

Script : scratchpad/launch.mjs. Sortie verbatim :

```
PASS A fiche ouverte 1280x720
PASS A timeline clavier End → 2050 + lien — 2050 #v=Lisbonne&an=2050&cc=PT
PASS A timeline clavier Home → 2026
PASS A layout 1280x720 — {"overflowX":false,"small":["calque","calque","calque","calque","calque","calque","calque","alt","alt","alt"],"off":[],"w":1280,"h":720}
PASS A duel par lien vs/vc — {"hidden":false,"txt":"Lisbon 59vsPorto 77"}
PASS A invitation duel après lien simple — {"hidden":false,"txt":"And your city? Compare.×"}
PASS A duel après choix 2e ville — {"hidden":false,"txt":"Madrid 45vsLisbon 59"}
PASS A spam calques/partage sans erreur
PASS B iPhone paysage chrome dans le viewport — {"overflowX":false,"small":[],"off":[],"w":734,"h":343}
PASS B iPhone paysage fiche ouverte — {"overflowX":false,"small":[],"off":[],"w":734,"h":343}
PASS B iPhone paysage aucun chevauchement
PASS B iPhone paysage bouton story visible
PASS B iPhone paysage erreurs
PASS C iPad fiche — {"overflowX":false,"small":[],"off":[],"w":834,"h":1194}
PASS C iPad erreurs
PASS D reduced-motion chrome visible — ["recherche:0.9906","calques:1","util:1","timeline:1","titre:1"]
PASS D reduced-motion fiche
PASS D reduced-motion erreurs
PASS E panne données : voile prêt
PASS E panne données : recherche ne plante pas — ["No city found"]
PASS E panne données : erreurs = 404 + 1 message — http 404 http://localhost:8080/data/places.json | Failed to load resource: the server responded with a status of 404 (Not Found) | données indisponibles : Error: ./data/places.json 404
    at http://localhost:8080/:3023:72
    at async Promise.all (index 0)
    at async Promise.all (index 6)
PASS F WebGL absent : secours visible, voile retiré — {"sec":{"vis":true,"txt":"WebGL indisponible\n\nCette expérience repose sur un rendu GPU temps réel. Votre n"},"voile":"hidden"}
PASS G son + langue mémorisés après rechargement — {"before":["Son · off","fr"],"after":["Son · off","fr"]}
PASS G triple clic Explorer : une seule boucle audio — howls playing=1
PASS G erreurs
```

Configurations couvertes : Chromium 1280x720 et 1440x900, WebKit iPhone 15 Pro
portrait et paysage, WebKit iPad Pro 11, prefers-reduced-motion, places.json
force en 404, WebGL indisponible (getContext neutralise).

Oeuf de Paques verifie (scratchpad/atl.mjs, sortie verbatim) :

```
atlantide => Atlantis - underwater since 9600 BC. Index 0/100. Try a city still above | vol: true
atlantis => AtlantisSouth Africa | vol: false
xyzzyplop => No city found | vol: false
errs: none
```

Ressources en ligne (fetch sur roluron.github.io, 2026-09-02) :
assets/apple-touch-icon.png 200 image/png | manifest.webmanifest 200
application/manifest+json | assets/icon.svg 200 image/svg+xml

## Relecture independante n°1 — 14 defauts, tous corriges (commit 7fba8a5)

Verification des correctifs, sortie verbatim de scratchpad/fixes.mjs :

```
PASS D1 odometre suit la timeline apres balayage — odometre 2050 / curseur 2050
PASS D1 aucune erreur
PASS D3 Precedent ferme la fiche sans quitter — {"url":"http://localhost:8080/","ouvert":false} apres #v=Paris&an=2026&cc=FR
PASS D3 Suivant rouvre la ville
PASS D2 double-tap laisse le composeur ouvert
PASS D7 carte dans l ecran — {"carte":[14,574],"vh":659,"defile":false,"part":[44,true],"croix":[44,44]}
PASS D4 bouton partager >= 44px — h=44
PASS D7 bouton partager visible sans defiler — {"carte":[14,574],"vh":659,"defile":false,"part":[44,true],"croix":[44,44]}
PASS D6 croix de fermeture 44px — 44x44
PASS D5 options atteignables au clavier — story-fermer > INPUT:planete > INPUT:trajectoire > INPUT:axes > INPUT:population > story-partager > story-fermer
PASS D6 la croix ferme
PASS erreurs iPhone
PASS D9 le voile retient le focus — bouton-entree > body > bouton-entree > bouton-entree > body > bouton-entree
PASS D9 apres l entree le chrome redevient atteignable
```

## Relecture independante n°2, autre modele (Antigravity) — 3 defauts (commit 8b51411)

Sortie verbatim de scratchpad/agyfix.mjs :

```
PASS agy2 oeuf declenche
PASS agy2 classe retiree apres interruption
PASS agy2 oeuf rejouable
PASS agy4 des boucles existent et jouent apres lien profond 2050 — {"n":8,"joue":2}
PASS agy4 aucune erreur
PASS agy5 bureau bas : croix collee a la fiche — {"croix":1380,"dossier":1376,"calques":1,"colonnes":"column nowrap"}
PASS agy5 bureau bas : rail des calques toujours visible — opacity 1
PASS paysage telephone : la regle s applique encore — {"x":460,"bas":337,"h":343}
```

## Barre d action collante, part de la fiche (scratchpad/sticky.mjs)

```
paysage      {"fiche":279,"barre":60,"part":22,"utile":219,"defilable":true}
portrait     {"fiche":409,"barre":70,"part":17,"utile":339,"defilable":true}
SE portrait  {"fiche":414,"barre":70,"part":17,"utile":344,"defilable":true}
```

## Performance (scratchpad/perf.mjs, site public)

```
mobile emule, CPU /4 : pret en 3482 ms | 120.1 fps (7 calques, 2050) | longues taches 0 | heap 121 Mo
desktop              : pret en  972 ms | 120.1 fps (7 calques, 2050) | longues taches 0 | heap 116 Mo
```

## Salle blanche (clone frais du depot)

```
references verifiees : 33
MANQUANTES : aucune
icones manifest manquantes : aucune
fichiers suivis : 60 | poids data : 6.0 Mo
```

## Navigateur integre Instagram, stockage bloque (scratchpad/webview.mjs)

```
voile pret (stockage bloque, UA Instagram): true
fiche ouverte par lien profond: true
composeur story ouvert: true
erreurs: aucune
```


## Relecture independante n°2 — 9 defauts, dont l historique refait (commit f74f3a5)

Sortie verbatim de scratchpad/hist.mjs :

```
PASS A Precedent revient sur Jakarta — {"a1":{"hash":"#v=Jakarta&an=2026&cc=ID","ouvert":true,"len":3},"a2":{"hash":"#v=Miami&an=2044&cc=US","ouvert":true,"len":4},"b1":{"hash":"#v=Jakarta&an=2050&cc=ID","ouvert":true,"len":4}}
PASS A Precedent revient au globe — {"hash":"","ouvert":false,"len":4}
PASS A Suivant rouvre Jakarta — {"hash":"#v=Jakarta&an=2050&cc=ID","ouvert":true,"len":4}
PASS B lien : fiche ouverte — {"hash":"#v=Jakarta&an=2050&cc=ID","ouvert":true,"len":3}
PASS B Precedent ramene au globe, pas dehors — {"hash":"","ouvert":false,"len":3} url http://localhost:8080/
PASS B Suivant rouvre la ville du lien — {"hash":"#v=Jakarta&an=2050&cc=ID","ouvert":true,"len":3}
PASS C la croix nettoie l URL — {"hash":"","ouvert":false,"len":3}
PASS C Precedent reste dans le site — http://localhost:8080/
PASS D la meme ville reannonce apres reouverture — ["Oslo · 2026 · 77/100 · Solid habitability","Oslo · 2045 · 67/100 · Solid habitability"]
PASS D apercu lisible et bouton visible sans defiler — {"apercu":[157,277],"defile":false,"partage":true}
```

Apercu de story a hauteur fluide (scratchpad/apercu.mjs) :

```
iPhone 15 Pro  {"apercu":[157,277],"defile":false,"partageVisible":true,"vh":659}
SE             {"apercu":[158,280],"defile":false,"partageVisible":true,"vh":667}
paysage        {"apercu":[89,158],"defile":false,"partageVisible":true,"vh":343}
```


## Relecture independante n°3 — 7 defauts, dont une regression a moi (commits 728b826, bf2c0dc)

Sortie verbatim de scratchpad/v3fix.mjs :

```
PASS D1 bureau 1440x500 : bouton visible — {"apercu":[174,310],"defile":false,"btn":291,"vh":500,"visible":true}
PASS D1 bureau 1440x900 : bouton visible — {"apercu":[240,427],"defile":false,"btn":686,"vh":900,"visible":true}
PASS D1 bureau 1280x720 : bouton visible — {"apercu":[240,427],"defile":false,"btn":596,"vh":720,"visible":true}
PASS D5 paysage : apercu >= 115 px et bouton visible — {"apercu":[120,213],"defile":false,"visible":true}
PASS D2 le libelle ne revient pas dans l ancienne langue — ["Share to Stories","Share to Stories","Partager en story","Partager en story"]
PASS D3 l URL ne nomme plus la ville fermee — {"hash":"","ouvert":false,"len":3}
PASS D4 apres la croix, Precedent fait quelque chose — {"c":{"hash":"","ouvert":false},"b1":{"hash":"#v=Jakarta&an=2026&cc=ID","ouvert":true}}
PASS D7 trois rechargements n ajoutent pas d entrees — len 3 -> 3
PASS D7 Precedent ramene au globe — {"hash":"","ouvert":false,"len":3}
PASS D6 rangees de resultats >= 44 px — [44,44,44,44,44,44,44]
```

## Chemin critique — cascade mesuree (scratchpad/cascade.mjs, 1,6 Mb/s, 150 ms, CPU /4)

Avant (24,1 s) : l annuaire, les fleuves et les marees passaient AVANT la
texture de la Terre. Apres (9,3 s), il ne reste que l essentiel :

```
bouton Explorer a 9256 ms
   19 Ko  fin    669 ms  terra-menus.css
   29 Ko  fin    727 ms  gsap.min.js
  124 Ko  fin   1858 ms  quatre TWK Lausanne
  163 Ko  fin   2515 ms  three.module.min.js
   73 Ko  fin   5033 ms  grille_c.png
  203 Ko  fin   8844 ms  earth_color_2048.webp
  212 Ko  fin   9081 ms  earth_mask_4320.webp
```

Site public apres deploiement : 4G faible 10,2 s | 4G moyenne 4,6 s | wifi 1,2 s.
Matrice de lancement sur le site public : 25/25.

## Fidelite des textures WebP

```
masque : identique au pixel ? True
couleur 4096 : PSNR 40,3 dB, ecart moyen 1,74 niveau sur 255
```

## Contraste mesure (scratchpad/contraste.mjs)

```
coords           6,32  9px   (etait 4,39 — sous le seuil AA)
sources          6,32  8px   (etait 2,51 — sous le seuil AA)
frappe           4,86  18px
critere valeur   4,86  13px
detail           6,09  11px
```


## Repli des textures WebP (scratchpad/repli.mjs, toutes les requetes .webp avortees)

```
voile pret sans WebP : true
reponses earth : earth_mask_4320.png:200, earth_color_4096.jpg:200
erreurs : aucune
```

Le globe est bien peint : luminosite moyenne du disque mesuree sur la capture.
Attention a la methode : lire le canevas WebGL avec drawImage renvoie du noir
(pas de preserveDrawingBuffer) et fait croire a une panne. Il faut mesurer sur
la capture d ecran.

## Contraste du rail des calques

```
calque eteint, mesure a l ecran : 3,04:1 avant, 6,03:1 apres
```

## Le site public est bit a bit identique au depot

```
index.html               identique en ligne
terra-menus.css          identique en ligne
manifest.webmanifest     identique en ligne
assets/og-globe.jpg      identique en ligne
```

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

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


## iPhone SE (375x667), parcours complet sur le site public (scratchpad/se.mjs)

```
PASS SE globe : rien ne deborde, cibles a 44 px — {"overflowX":false,"small":[],"off":[]}
PASS SE recherche donne des resultats — 2 lignes
PASS SE fiche ouverte
PASS SE fiche : mise en page saine — {"overflowX":false,"small":[],"off":[]}
PASS SE composeur story tient dans l ecran — {"defile":false,"partage":true,"apercu":[158,280]}
PASS SE partage sans erreur — Share link
PASS SE aucune erreur console ni 4xx
```


## Relecture independante n°4 — 6 defauts, dont le pire de tous (commit 68946be)

Le differe de chargement annonce par les deux commits precedents n etait PAS
en vigueur : deux `.then()` ecrits au fil du module appelaient la fonction de
chargement des l analyse du script. Corrige en separant la promesse du
declencheur. Sortie verbatim de scratchpad/v4fix.mjs :

```
PASS V4-1 les grilles de calques ne partent pas avant les textures du globe — avant=[]
PASS V4-2 aucun fichier telecharge deux fois — doublons=[]
PASS V4-3 la liste se remplit seule quand l annuaire arrive
PASS V4-4 grille en echec : le rail reste en attente
PASS V4-5 detail sans grille : message d attente, pas le critere precedent
PASS V4-6 portrait : aucune cible sous 44 px — entree=48 petits=[]
PASS V4-6 paysage : aucune cible sous 44 px — entree=48 petits=[]
PASS V4-6 iPad : aucune cible sous 44 px — entree=48 petits=[]
```

Temps d ouverture, site public, apres correction :

```
700 kb/s (profil du verificateur) : 11,4 s   (53,9 s avant)
4G lente  1,6 Mb/s                :  5,2 s
4G moyenne 4 Mb/s                 :  2,7 s
wifi 30 Mb/s                      :  1,0 s
```

Les sept calques verifies un par un apres le changement de texture
(scratchpad/calques7.mjs) : chaleur sur le sud des Etats-Unis et l Amazonie,
foyers de feu dans l ouest americain et le Cerrado et aucun en mer, secheresse
au Mexique, submersion sur les cotes et les deltas, reseau fluvial complet,
bascule climatique sur l Arctique, declin sur les Caraibes. Zero erreur
console sur les sept.


## Relectures independantes n°5 et n°6 (commits c81f97d, eb92c1e)

Cinquieme passe, 8 defauts. Le plus grave venait de moi : THREE.LoadingManager
compte une image en echec comme terminee, donc le bouton Explorer s ouvrait
sur une planete noire quand le WebP echouait. Le gestionnaire est retire.

```
PASS V5-1 sans WebP : les textures finissent avant le bouton
PASS V5-1 sans WebP : rien d autre ne part avant les textures
PASS V5-2 WebGL absent : secours visible
PASS V5-2 WebGL absent : aucune erreur non capturee
PASS V5-3 grille manquante : calques inertes + message
PASS V5-4 aucun separateur orphelin dans le detail
PASS V5-5 le lien porte l annee affichee
```

Sixieme passe, 6 defauts :

```
PASS N5 lien reordonne : annee et duel respectes — {"an":"2040","duel":"Tokyo 72vsLagos 43"}
PASS N2 grille_c morte : calques inertes et message
PASS N3 grille_c morte : une seule requete — 1 requetes
PASS N2 aucune erreur non capturee
PASS N4 toutes textures mortes : l echec est dit
PASS sain : aucun doublon — []
PASS sain : pas de message d indisponibilite
PASS sain : fiche correcte
```

## Le chiffre de chargement, tranche par la mesure

La sixieme relecture annonçait 17 s la ou j en mesurais 11. Douze tirages,
quatre configurations, navigateur relance a chaque fois :

```
local     cache non touche   11.2 / 11.2 / 11.2 s   |  840 / 840 / 840 Ko
local     cache desactive    11.2 / 11.2 / 11.3 s   |  840 / 840 / 840 Ko
en ligne  cache non touche   11.3 / 11.3 / 11.3 s   |  840 / 840 / 841 Ko
en ligne  cache desactive    11.2 / 11.2 / 11.3 s   |  840 / 841 / 841 Ko
```

Le calcul adverse additionnait les tailles sur disque (2,2 Mo) sans tenir
compte du gzip servi par GitHub Pages. 840 Ko a 87,5 Ko/s font 9,6 s, plus la
latence : la mesure est coherente, le calcul ne l etait pas.


## Liens profonds — 20 formes eprouvees (scratchpad/liens.mjs)

Ordre des parametres quelconque, annee hors bornes, annee illisible, iso2 en
minuscules ou invalide, encodage casse, ville inexistante, balise script,
duel sur soi-meme, parametre inconnu en plus : `TOUS LES LIENS OK`. Une annee
illisible retombe sur le comportement « lien sans annee », une annee hors
bornes est ramenee par le curseur.

## Aller-retour de partage sur des noms qui demandent un encodage

```
PASS Ho Chi Minh        lien=#v=H%C3%B4%20Chi%20Minh%20Ville   rouvert=Ho Chi Minh City
PASS Saint-Denis        lien=#v=Saint-Denis                     rouvert=Saint-Denis
PASS Xi'an              lien=#v=Xi'an                           rouvert=Xi'an
PASS Seville            lien=#v=S%C3%A9ville                    rouvert=Seville
PASS Krakow             lien=#v=Cracovie                        rouvert=Krakow
PASS Nizhny Novgorod    lien=#v=Nijni%20Novgorod                rouvert=Nizhny Novgorod
PASS Al Qahirah         lien=#v=Al%20Q%C4%81hirah%20al%20Jad%C4%ABdah  rouvert=Al Qahirah al Jadidah
PASS Malmo              lien=#v=Malm%C3%B6                      rouvert=Malmo
```

Le lien porte le nom francais, le destinataire voit le nom de sa langue : les
deux graphies sont cherchees a la reouverture.


## Relectures n°7 et n°8 — la huitieme rend READY

Septieme passe : elle a montre que j avais tort sur le chiffre de chargement.
Les 17 s qu elle mesurait n etaient pas une erreur de calcul, c etait le
chemin de BUREAU (texture 4096, 1,41 Mo) la ou j avais mesure le chemin
telephone (2048, 840 Ko). Corrige a la racine : on entre toujours sur la
2048, la 4096 arrive ensuite sur les ecrans qui la meritent.

Huitieme passe, verdict verbatim : **READY**. Ses mesures :

```
desktop-dpr1 11203 / 11182 ms   transfer=840KB
desktop-dpr2 11193 / 11178 ms   transfer=840KB
iphone       11189 / 11196 ms   transfer=840KB
ipad         11194 / 11194 ms   transfer=840KB
```

Preuve en pixels que l affinage a bien lieu : variance du laplacien sur la
meme portion de globe, avant et apres l echange, 10,5 -> 16,0 (x1,53). Aucune
erreur WebGL a l echange, aucun cadre noir, jamais declenche sur telephone,
jamais deux fois, et une 4096 interrompue laisse la 2048 intacte.

Les deux derniers points, traites apres ce verdict : un commentaire qui
gardait l ancienne regle des textures au-dessus de la nouvelle, et un duel
epingle qui survivait au retour arriere et faisait reecrire l entree
d historique restauree.


## Le controle de fidelite des textures, et son propre controle

```
$ python3 tools/verifier_assets.py
OK     earth_mask_4320.webp     sans perte, identique au pixel : True
OK     earth_color_4096.webp    PSNR 40.3 dB (seuil 38)
OK     earth_color_2048.webp    PSNR 39.3 dB (seuil 38)
Toutes les textures sont fidèles.

$ python3 tools/verifier_assets.py --autotest
OK     autotest : une image sans perte est acceptee
OK     autotest : une image lossy est refusee
Le controle est porteur.
```

Preuve que l autotest est porteur, sur une copie sabotee ou la comparaison au
pixel est remplacee par `identique = True` :

```
$ python3 casse.py --autotest
OK     autotest : une image sans perte est acceptee
ECHEC  autotest : une image LOSSY est passee — le controle ne controle rien
Le controle ne prouve rien : A REPARER AVANT DE S EN SERVIR.
code de retour 1
```

L image de controle est du BRUIT, et la raison a ete mesuree (voir le tableau
plus bas) : seule une image uniforme ET sans couleur revient identique au bit
pres apres un encodage lossy. Le piege se deplace d un niveau a chaque fois
qu on ajoute un garde-fou.


## Deux affirmations verifiees plutot que crues

Une session voisine m a corrige sur un point de compression. J ai mesure les
deux affirmations en jeu au lieu de trancher a l intuition.

### 1. Quand le PNG bat-il le WebP sans perte ?

Poids en octets, meme image, PNG optimise contre WebP lossless :

```
contenu      taille     WebP      PNG   qui gagne
plate          8px       38       78   WebP
plate        256px       44      568   WebP
plate       1024px       88     4548   WebP
degrade      256px       90      573   WebP
bruit          8px      320      268   PNG
bruit         16px     1022      852   PNG
bruit         32px     3176     3172   PNG
bruit         64px    12416    12420   WebP
bruit       1024px  3145808  3151227   WebP
```

Ma formulation etait fausse : ce n est pas la platitude, c est le BRUIT en
tres petit format. Sur un aplat, WebP ecrase PNG a toutes les tailles. Le PNG
ne gagne que sur du contenu incompressible sous 32 a 64 px, ou l en-tete
WebP n est pas amorti. Aucune texture ni planche de donnees reelle n est
concernee, mais le controle de taille reste, il ne coute rien.

### 2. Un encodage lossy peut-il revenir identique au bit pres ?

```
contenu                  lossy revient identique ?
aplat gris 128           True
aplat noir               True
aplat bleu 37,90,140     False  (ecart max 2 niveaux)
aplat rouge 200,60,20    False  (ecart max 3 niveaux)
masque terre/mer         False
bruit niveaux de gris    False
tuile du vrai masque     False
tuile 100 % ocean        True
```

Oui, mais seulement si l image est uniforme ET sans couleur : pas de chroma a
sous-echantillonner, pas de detail a quantifier. Une tuile entierement ocean
du vrai masque du projet passe un encodage lossy sans une seule difference.
C est ce qui justifie le bruit comme image de controle de l autotest, et la
justification que j en donnais ne tenait pas debout avant cette mesure.

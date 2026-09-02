# TERRA／2050

Un globe où l'on cherche sa ville et où l'on lit, pour n'importe quelle année entre
2026 et 2050, un **indice d'habitabilité physique de 0 à 100** — bâti uniquement sur
des données scientifiques ouvertes, avec le chiffre, la méthode et la source affichés.

En ligne : **https://roluron.github.io/terra-2050/**

34 099 villes, six critères pondérés (stress thermique, stress hydrique, feux,
submersion marine, inondation fluviale, dérive climatique) plus le déclin de
population. Aucun compte, aucun paywall, FR/EN, partage par lien profond et par
image story.

---

## Lancer le projet

Le site est **entièrement statique** : pas de build, pas de bundler, pas de backend.
Les trois librairies (Three.js r160, GSAP 3, Howler) sont vendorées dans `assets/lib/`.

```bash
npm run dev
```

Puis http://localhost:8080. N'importe quel serveur de fichiers statique fait
l'affaire ; il faut juste un serveur HTTP, car les données sont chargées par `fetch`
(ouvrir `index.html` en `file://` ne marche pas).

Ajouter `?perf` à l'URL affiche le HUD de performance (FPS, DPR, appels de draw,
triangles, longues tâches).

## Déploiement

GitHub Pages sert la branche `main` telle quelle. **Pousser sur `main` publie.**
Une seule valeur est liée au domaine : les balises `og:image` / `og:url` /
`canonical` en tête de `index.html` pointent sur `roluron.github.io` — à changer en
cas de domaine propre, sinon les aperçus de lien cassent.

## Stratégie de chargement

Un lien partagé s'ouvre presque toujours sur un téléphone. Le chemin critique
— ce qu'il faut télécharger avant que le bouton **Explorer** apparaisse — est
donc tenu court, à **839 Ko** : la feuille de style, les trois librairies, les
polices, `grille_c.png` (le masque des terres, que le shader lit à chaque
pixel) et les deux textures de la planète en WebP.

Tout le reste arrive **après** :

| Après | Quoi | Pourquoi |
|---|---|---|
| textures prêtes | l'annuaire des 34 099 villes (1,1 Mo), les marées, la calibration | la recherche affiche « chargement » si on va plus vite qu'elle |
| textures prêtes | les 4 grilles de calques et `grille_d` (3 Mo) | aucun calque n'est allumé à l'arrivée ; un texel noir tient leur place |
| grilles prêtes | `rivers.json` | sert au seul calque des fleuves |
| clic Explorer | les sons, les foyers de feu | rien de tout cela ne sert avant le geste |

Mesures (émulation réseau Chrome, deux tirages par ligne, navigateur relancé
à chaque tirage, délai jusqu'à `#voile.pret`) :

| Réseau | Bouton Explorer |
|---|---|
| 700 kb/s, 200 ms | 11,2 s |
| 4G faible, 1,6 Mb/s, 150 ms | 5,2 s |
| 4G moyenne, 4 Mb/s, 80 ms | 2,7 s |
| Wifi, 30 Mb/s | 1,0 s |

Le chiffre est le même sur téléphone, sur tablette et sur poste de bureau,
Retina ou non : **on entre toujours sur la texture 2048** (202 Ko), et la
4096 (712 Ko) arrive ensuite sur les écrans qui la méritent, en se glissant
à la place de l'autre. Le globe se précise pendant qu'on le regarde.

C'est le correctif d'une erreur qu'il vaut mieux ne pas refaire : la version
précédente choisissait 2048 ou 4096 selon la taille de l'écran, si bien qu'un
poste de bureau attendait 17,3 s pour 1,41 Mo là où un téléphone en attendait
11,2 pour 840 Ko. Les deux mesures étaient justes, mais le document n'en
citait qu'une. Mesurer les deux profils, toujours.

Quatre pièges rencontrés, à ne pas réintroduire :

- **Un `.then()` écrit au fil du module appelle la fonction tout de suite.**
  `chargerGrillesCalques().then(…)` en portée de module lançait les 2,9 Mo de
  grilles dès l'analyse du script, et le différé annoncé n'existait pas. D'où
  la séparation : `calquesPrets` s'attend, `chargerGrillesCalques()` déclenche.
- **`THREE.LoadingManager` compte une image en échec comme terminée.** Le
  bouton Explorer s'ouvrait sur une planète noire quand le WebP échouait. Le
  gestionnaire est retiré : les trois images du chemin critique sont suivies
  une par une dans `IMAGES_CRITIQUES`, et un repli doit aboutir avant que
  l'image compte comme prête.
- **Un filet de sécurité trop court.** `setTimeout(chargerAnnuaire, 6000)`
  lançait l'annuaire avant la fin de la texture et lui prenait la bande
  passante : huit secondes perdues. Il est à 30 s.
- **`preload: false` chez Howler ne suffit pas** : le son ne se charge alors
  jamais et la boucle reste muette. Les boucles sont créées au clic d'entrée.

## Carte du dépôt

| Chemin | Rôle |
|---|---|
| `index.html` | Tout l'applicatif : shaders GLSL, scène Three.js, interface, dictionnaires FR/EN, partage, story. ~3 200 lignes, un seul `<script type="module">`. |
| `terra-menus.css` | Couche de design par-dessus les styles de base inline dans `index.html`. Les règles tardives gagnent : le fichier se lit du haut vers le bas comme une suite de passes. |
| `tools/pipeline.py` | Pipeline hors-ligne : sources climatiques brutes → `data/`. Ne tourne jamais dans le navigateur. |
| `data/` | Sorties du pipeline (voir formats ci-dessous). |
| `assets/` | Librairies vendorées, textures, sons, polices, icônes. |
| `.agent/` | Contrat de complétion : objectif, critères d'acceptation, état, preuves. |
| `PERF-REPORT.md` | Budget de performance mesuré et techniques employées. |

## Formats de données

Le pipeline produit des binaires à pas fixe, lus directement par `DataView`. Ce
format est **porteur** : le modifier sans toucher au lecteur dans `index.html`
corrompt silencieusement toutes les villes.

**`data/places.bin` — 24 octets par ville**, dans l'ordre de `data/places.json` :

| Offset | Type | Contenu |
|---|---|---|
| 0-1, 2-3 | int16 LE | latitude ×100, longitude ×100 |
| 4-9 | uint8 ×6 | pénalités 2026 ÷250 (thermique, eau, feux, mer, fleuves, stabilité) |
| 10-15 | uint8 ×6 | pénalités 2050, même ordre |
| 16, 17 | uint8 | fraction de terres sous la ligne de submersion, puis sous la ligne +1 m (÷250) |
| 18-19 | uint16 LE | altitude médiane en décimètres, décalée de 500 m (permet les altitudes négatives) |
| 20 | uint8 | subsidence ÷100 |
| 21, 22 | uint8 | fraction inondable ÷250, profondeur p90 ÷10 |
| 23 | uint8 | variation de population 2050 en points, décalée de 128 ; 255 = inconnue |

Le premier octet de pénalité à **255** est une sentinelle « données insuffisantes »
(atolls et îles hors des grilles climatiques) : la ville n'affiche aucun score
plutôt qu'un score inventé.

`data/thermo.bin` porte les valeurs thermiques exactes par ville (6 octets), et les
`data/grille_*.png` encodent les grilles de risque en RGB, lues à la fois par les
shaders du globe et par les fiches — même source pour l'image et pour le chiffre.

Régénérer : `python3 tools/pipeline.py` (l'en-tête du fichier liste les sources et
les téléchargements). Compter des dizaines de Go de rasters intermédiaires.

## Limites assumées

Elles sont **volontaires et affichées dans l'interface**, pas des bugs :

- **Les défenses construites ne comptent pas.** Amsterdam ressort submersible parce
  que le relief l'est ; les digues mobiles ne sont pas modélisées. C'est écrit dans
  la fiche.
- **Un seul modèle climatique** : CMIP6 MPI-ESM1-2-HR sous SSP3-7.0 (émissions
  élevées). Pas d'ensemble multi-modèles, donc pas d'incertitude quantifiée.
- **Profondeurs de crue écrêtées à 25,5 m** par l'octet de stockage.
- **L'aridité de De Martonne perd son sens sous −9 °C** ; les villes très froides
  gardent un stress hydrique peu signifiant.
- **La carte d'inondation fluviale JRC est tenue constante jusqu'à 2050** : c'est la
  géographie du risque qui est juste, pas son évolution.

## Licences des données

Toutes les sources sont librement téléchargeables. Une seule contrainte :
**FABDEM est en CC BY-NC-SA** — gratuit tant que le site ne vend rien, à renégocier
avec l'université de Bristol si le projet devient commercial. COAST-RP est en
CC BY 4.0, libre y compris commercialement. WorldClim, CMIP6, GEBCO, JRC, GeoNames,
Natural Earth et l'ONU sont libres sans condition.

## Vérifier les textures avant de déployer

```bash
python3 tools/verifier_assets.py
```

Le site sert des WebP. **WebP est lossy par défaut**, et une image qui porte
une valeur plutôt qu'une couleur, réencodée par distraction en lossy,
s'affiche exactement pareil en décalant ses canaux : le globe reste beau, les
chiffres deviennent faux, et rien ne casse. Le script relit chaque WebP servi
et le compare à son original. Le masque des côtes doit revenir identique au
pixel, les textures de couleur au-dessus de 38 dB de PSNR. Code de retour 1
si une seule échoue, et il a été éprouvé contre un masque volontairement
dégradé pour vérifier qu'il sait dire non.

À lancer après toute régénération d'image dans `assets/textures/`.

Le contrôle a lui-même son contrôle :

```bash
python3 tools/verifier_assets.py --autotest
```

Il fabrique une image de **bruit**, l'encode une fois sans perte et une fois
en lossy, et vérifie que la première passe et que la seconde échoue.

Le bruit n'est pas un détail, et la raison est mesurée : une image uniforme ET sans couleur (R=G=B) revient identique au bit près après un encodage lossy : il n'y a ni chroma à sous-échantillonner ni détail à quantifier. Mesuré sur une tuile 100 % océan du vrai masque : identique. Un aplat coloré, lui, perd 2 à 3 niveaux. Une image de
contrôle uniforme et grise passerait donc l'encodage lossy sans une seule
différence, et le test resterait vert sans avoir rien vérifié.

L'autotest commence d'ailleurs par vérifier que son image témoin est bien
abîmée par le lossy, avant de faire confiance à quoi que ce soit d'autre. Un
témoin remplacé par un aplat gris sort en code 1 avec « l'image témoin survit
au lossy, elle ne peut rien prouver ».

**La comparaison au pixel ne suffit pas**, et c'est le point le moins
intuitif. Elle est aveugle sur une région uniforme et sans couleur : une tuile
100 % océan découpée dans le vrai masque, réencodée en lossy, revient
identique au bit près. Le contrôle des pixels dit oui.

Le mode d'encodage est donc lu dans le fichier lui-même. L'en-tête RIFF d'un
WebP porte le tag du codec aux octets 12 à 16, et `VP8L` est le seul mode sans
perte. Le script exige `VP8L` pour toute image de données et refuse tout le
reste. Refuser tout le reste plutôt que tester `VP8 ` n'est pas de la
prudence gratuite : un WebP lossy **avec canal alpha** se déclare `VP8X`, ce
qui échapperait à un test écrit en binaire lossless-ou-`VP8 `.

Deux pièges mesurés autour du canal alpha, à ne pas réintroduire :

- **`getbbox()` est aveugle sur du RGBA.** Il ignore les différences situées
  sous un pixel totalement transparent. Sur un fichier où 37 450 pixels sur
  262 144 avaient perdu leur RGB, il répondait « identique ». La comparaison
  se fait donc sur les octets, `tobytes()`, qui ne ment pas.
- **WebP sans perte écrase le RGB des pixels dont l'alpha vaut 0.** C'est une
  vraie perte si ce RGB porte de l'information. Aucune de nos textures n'a
  d'alpha aujourd'hui, mais le contrôle le verrait.

Et une non-règle, mesurée elle aussi : **WebP n'a pas de mode niveaux de
gris**. Notre masque est un `L` de 4320 px qui ressort forcément en `RGB`.
Exiger l'égalité des modes refuserait tous les masques du monde ; on compare
donc dans le mode de la source, en exigeant seulement que le fichier livré ne
perde aucun canal.

Le script vérifie enfin deux choses sur lui-même. D'abord sa couverture : il
cherche tous les `.webp` de `assets/` et de `data/`, et refuse celui qui ne
serait pas déclaré. Un contrôle qui ne regarde que là où on lui a dit de
regarder ne protège de rien, et ajouter demain une grille de données en WebP
passerait sinon sous le radar. Ensuite ses déclarations : une image dont le
nom dit qu'elle porte des données, déclarée en tolérance PSNR au lieu de
« exact », est refusée. Le tableau des paires s'édite à la main, c'est la
faute la plus facile à commettre ici.

Chaque garde a été vu refuser avant d'être commité, en le sabotant
volontairement. Un garde-fou qu'on n'a jamais vu refuser ne prouve rien.

## Vérification

```bash
python3 tools/check.py                                            # rapide
URL0=https://roluron.github.io/terra-2050/ python3 tools/check.py --qa   # tout
```

Un seul geste, un seul code de sortie. Le lanceur **découvre** les contrôles
au lieu de les énumérer, `tools/verifier_*.py` et `tools/qa/*.mjs`, pour qu'un
contrôle ajouté demain soit lancé sans que personne pense à l'inscrire. Sans
`--qa` les suites longues sont sautées, et il l'écrit à voix haute : un
contrôle silencieusement absent ressemble trait pour trait à un contrôle qui
passe. Zéro contrôle découvert est traité comme une panne, pas comme un
succès.

### La matrice, en direct

```bash
URL0=https://roluron.github.io/terra-2050/ node tools/qa/matrice.mjs
```

Vingt-cinq contrôles sur sept configurations : desktop 1280×720 et 1440×900,
iPhone portrait et paysage, iPad, `prefers-reduced-motion`, panne de données
et absence de WebGL. Le script a besoin de Playwright et de ses navigateurs
(`QA_CHROMIUM` et `QA_WEBKIT` surchargent les chemins).

**Il sort en code 1 dès qu'un contrôle échoue, et ce code doit être lu sans
tube.** Une suite qui se contente d'imprimer PASS et FAIL se lit au `grep`, et
un `grep` ne distingue pas « tout va bien » de « le script est mort après la
troisième ligne ». Mesuré sur cette matrice même, avec un contrôle
volontairement saboté : sans tube le code vaut 1, derrière `| grep -c '^PASS'`
il vaut 0, celui de `grep`.

```bash
python3 tools/verifier_i18n.py
python3 tools/verifier_assets.py
```

Le premier compare les deux dictionnaires FR/EN : une clé présente d'un côté
et absente de l'autre n'affiche rien du tout, et seul un lecteur de cette
langue-là s'en aperçoit. Il refuse aussi une clé lue dans le code et définie
nulle part, et signale sans échouer les clés définies et jamais lues. Les
conteneurs lus par variable (`t.calque[cle]`) sont exclus du calcul des clés
mortes : leurs sous-clés ne sont pas prouvables statiquement, et un contrôle
qui crie sur des faux positifs coûte plus qu'il ne rapporte.

Il délègue la lecture du dictionnaire à Node. Écrire un parseur JavaScript en
Python était l'erreur : la première version bouclait sans fin sur les chaînes.

Le second vérifie les textures, voir plus haut. Les deux ont un `--autotest`.

Les critères d'acceptation et l'état courant vivent dans `.agent/`, les
preuves brutes dans `.agent/EVIDENCE.md`.

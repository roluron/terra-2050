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

Mesures sur le site en ligne (émulation réseau Chrome, profil iPhone, deux
tirages par ligne) :

| Réseau | Bouton Explorer |
|---|---|
| 700 kb/s, 200 ms | 11,2 à 12,0 s |
| 4G faible, 1,6 Mb/s, 150 ms | 5,2 s |
| 4G moyenne, 4 Mb/s, 80 ms | 2,7 s |
| Wifi, 30 Mb/s | 1,0 s |

La méthode compte : le chiffre est le délai jusqu'à `#voile.pret`, mesuré
depuis `goto` avec `waitUntil: 'commit'`, sur un contexte neuf à chaque
tirage. Une relecture indépendante a mesuré 17 s sur le même profil nominal
avec son propre banc ; l'écart vient du banc, pas du code, mais il vaut mieux
citer la méthode que le seul chiffre.

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

## Vérification

Les critères d'acceptation et l'état courant vivent dans `.agent/`. La matrice de QA
couvre desktop 1280×720 et 1440×900, iPhone portrait et paysage, iPad,
`prefers-reduced-motion`, panne de données et absence de WebGL. Les preuves brutes
sont dans `.agent/EVIDENCE.md`.

# Finitions — plan « chaque détail »

Plan écrit, **rien n'est construit**. Il vient de quatre relectures
indépendantes faites le 2026-09-28 sur `869154f` : curseur et
micro-interactions, transitions et chorégraphie, lumière et mouvement,
mise en page et centrage. Chacune a lancé le site dans Chromium et pris des
captures. Chaque constat donne une référence `fichier:ligne`.

Limite de mesure : le rendu logiciel (SwiftShader) tourne entre 1 et 2
images/s. Les durées et la fluidité n'ont donc **pas** été mesurées ; seuls les
états du DOM, le code et les captures sont fiables. Chaque phase se termine
par une relecture sur un vrai GPU : Mac Retina, iPhone, Android moyen de
gamme.

Ce que le plan ne remet pas en cause :
- le curseur natif dans les `<dialog>` ;
- le CTA sans rectangle magnétique ;
- les filtres en bas à gauche et l'année centrée seule ;
- la lettre paragraphe par paragraphe, sans pointeur pendant la première
  seconde ;
- le compteur d'année qui se pose sans rouler pendant un balayage rapide ;
- les pixels stables des étincelles.

---

## Phase 0 — Fondations (tokens), sans effet visible

Elle vient en premier : toutes les phases suivantes s'appuient dessus.

**Mouvement.** Aujourd'hui, le CSS compte 26 durées, 7 courbes nommées et 55
`ease` implicites. On les remplace par des tokens dans `:root`
(`terra-menus.css:30`), avec leur miroir JS `DUREE` / `EASE` dans
`index.html`.

```css
--ease-out:   cubic-bezier(.165,.84,.44,1);  /* UI courante (= --ease actuel) */
--ease-expo:  cubic-bezier(.16,1,.3,1);      /* panneaux, fiche, jauges */
--ease-exit:  cubic-bezier(.4,0,.2,1);       /* toutes les sorties */
--ease-inout: cubic-bezier(.76,0,.24,1);     /* scènes, caméra */
--dur-press: 80ms;  --dur-hover: 180ms;  --dur-state: 350ms;
--dur-panel: 650ms; --dur-exit: 380ms;   --dur-annee: 600ms;
```

**Espacement.** Le CSS compte 36 valeurs distinctes, ramenées à une échelle de
base 4 et à une gouttière :

```css
--s1:4px --s2:8px --s3:12px --s4:16px --s5:24px --s6:32px --s7:48px --s8:64px
--gutter: clamp(16px, 2.8vw, 40px);
```

**Typographie.** Le CSS compte 36 tailles, dont des demi-pixels, ramenées à
cette échelle :

```
11 / 12 / 13 (UI) / 15 (corps) / 19 / clamp(24,2.2vw,30) / clamp(40,4vw,56)
--t-display: clamp(48px, 7.5vh, 112px)   /* l'année */
```

**Focus.** Huit anneaux différents, remplacés par un seul :
`--focus: 1.5px solid rgb(255 253 226 / .9)`, décalé de 3 px. Le bleu
`#416e9b` sur le verre sombre du dossier (`terra-menus.css:945`) manque de
contraste.

**Horloge.** Tout lissage passe par `1-Math.exp(-dt/τ)` avec un plafond de
`dt` à 50 ms. Trois endroits vont aujourd'hui deux fois plus vite sur un écran
120 Hz :
- `year-ruler.mjs:45` ;
- `controles.update()` sans `dt`, `index.html:3912` ;
- le plafond de 32 ms dans `glass-cursor.mjs`.

---

## Phase 1 — Défauts visibles (P1)

Ce sont eux qu'on remarque en premier : ils cassent l'effet « waouh ».

**État : construite le 2026-09-28.** Le CSS est dans `finitions.css`
(chargée après `premium.css`) ; le JS dans `index.html`, `glass-cursor.mjs`
et `premium.mjs`. Contrôlée par captures Chromium (SwiftShader) à 1280×720,
844×390, 768×1024 et 320×568, et par une sonde des états du curseur. Reste à
faire sur un vrai GPU : sentir le ressort du curseur, la durée des vols et le
reflet de l'océan.

| # | Défaut | Où | Correctif |
|---|---|---|---|
| 1 | **Rectangle sombre à bords nets derrière « 2026 »**, sur toutes les captures | `premium.css:63` (lueur `text-shadow`) coupée par `.odo{overflow-y:clip}` à `terra-menus.css:147` | `overflow-clip-margin:40px`, ou lueur en `radial-gradient` sur `#timeline::before` |
| 2 | **La lumière de pointeur sur le verre n'existe pas** : les variables sont écrites, aucune règle ne les lit | `premium.mjs:19`, aucun lecteur CSS (vérifié par `grep`) | couche `::after` en `radial-gradient(240px circle at var(--light-x) var(--light-y), #fffde20f, transparent 60%)` et liseré de bord masqué |
| 3 | **Caméra qui traverse le globe** sur les longs vols (Paris → Sydney, rayon minimal ≈ 0,58) | `index.html:1958`, `:2668`, interpolation linéaire x/y/z | slerp de direction, rayon `lerp(r0,r1,t)+bosse·sin(πt)`, durée `1.1+0.9·angle/π` s |
| 4 | **Résultats de recherche qui clignotent à chaque frappe** | `index.html:1851` (`innerHTML=''`) relance `fa-apparaitre` | cascade seulement à l'ouverture ; `<li>` réutilisés par clé, seuls les nouveaux s'animent |
| 5 | **Paysage téléphone : « 2026 » (80 px) recouvre le globe** et se décale de 11 px vers la droite | `premium.css:165` écrase `terra-menus.css:787-797` ; `text-align:right` hérité | `@media (max-height:500px)` : année à 40 px, `text-align:center` ; supprimer le bloc mort |
| 6 | **Unité de la carte métrique qui déborde** (« 28.73 De Martonne », 768 px) | cartes `.risque` | `container-type:inline-size`, ligne valeur en `flex-wrap`, `font-size:clamp(28px,6cqi,40px)` |
| 7 | **Ville choisie cachée sous la fiche** (768 à 1024 px de large) | la caméra vise le centre de l'écran (`index.html:1668`) | `camera.setViewOffset` de la moitié du panneau quand la fiche est ouverte |
| 8 | **Résultats collés au bord gauche à 320 px**, par-dessus le wordmark | `premium.css:160` | `left/right: var(--gutter)` |
| 9 | **Pas de caret dans les champs texte** : le point reste un point | `premium.css:226` (`cursor:none!important`) | le point devient une barre de 2×18 px sur `input` et `textarea` |
| 10 | **Contrôles désactivés qui réagissent comme des actifs** | `glass-cursor.mjs:15` | `:not(:disabled,[aria-disabled=true])` et état « éteint » (anneau d'1 px, opacité 0,35) |
| 11 | **Bouton « Got it » en police mono avec un trait parasite** ; même trait sous « Save as JPEG » | `terra-menus.css:523-532` contre `premium.css:101` | Lausanne 13 px, `::after{content:none}` |
| 12 | **Globe éclairé à plat** : face au soleil et face opposée presque identiques, aucun reflet | `index.html:1082` | terminateur doux `smoothstep(-.15,.35,N·L)`, plancher de nuit à 0,28, calques de données gardés lisibles `mix(.6,1,jour)` |

---

## Phase 2 — Transitions : chaque entrée a sa sortie

Règle unique : **ce qui entre en s'animant sort en s'animant.** La sortie
dure `--dur-exit` avec la courbe `--ease-exit`. Il existe déjà un modèle
interne symétrique : `ouvrirPedago` / `fermerPedago` (`index.html:3239`).

1. **Comparateur.** `showModal()` et `close()` sont nus
   (`city-comparison.mjs:104`). Ajouter `@starting-style`, une transition
   `overlay`/`display allow-discrete` et le même traitement sur `::backdrop`.
   La fermeture joue une animation avant `close()`, Échap compris.
2. **Story.** Elle entre en `back.out`, mais `fermerStory` se contente de
   `hidden=true` (`index.html:2949`). Lui donner une sortie comme celle du
   pédago.
3. **Sélecteur d'indicateurs.** `#map-options` bascule en
   `display:none`/`grid` sans transition (`premium.css:172`). Il faut une
   origine en bas à gauche, une échelle de 0,96 à 1, puis une cascade de
   0,03 s sur `.calque`.
4. **Cascade au lancement.** La cascade de `revelerChrome` sur les calques
   (`:3634`) est invisible parce qu'ils sont masqués. La déplacer vers
   l'ouverture du sélecteur (point 3).
5. **Frise des années entre dock et fiche.** Elle est déplacée d'un coup
   (`append`/`after`, `:2609` et `:2641`). La faire glisser avec GSAP Flip, ou
   avec `view-transition-name`.
6. **Fiche, inspecteur, comparateur.** Remplacer les `visibility:hidden` secs
   (`refinement.css:57`, `premium.css:39`) par un fondu avec un léger recul
   (`scale:.98`).
7. **`<details>` (risques, méthode, avis bêta).** Ils s'ouvrent avec une
   animation et se ferment net. Utiliser `::details-content` avec
   `interpolate-size:allow-keywords`.
8. **Langue rouverte depuis les réglages.** Écran noir opaque sans fondu :
   ajouter un fondu de 400 ms et un fond translucide flouté. La cascade `--row`
   est aujourd'hui du code mort (`premium.css:28`) : la supprimer ou la
   réactiver.
9. **Un seul tempo pour l'année.** Aujourd'hui : globe 0,5 s, compteur 0,6 s,
   repère 350 puis 650 ms. Tout passe à `--dur-annee`. Dans le comparateur, les
   valeurs roulent au lieu de sauter (`city-comparison.mjs:67`).
10. **Fiche.** Le fond de la fiche (220 ms) suit la fiche elle-même. La sortie
    de la fiche prend la courbe de sortie, pas `expo.out`.
11. **Invitation.** `cacherAccroche` : fondu de sortie. **Bouton copier.**
    « Lien copié » en fondu enchaîné, largeur figée (`flashBouton`, `:2733`).
12. **Changement de calque.** La légende et `#layer-context` se fondent en
    même temps que le shader (0,6 s) ; l'échelle de couleurs se dévoile de
    gauche à droite.
13. **Mouvement réduit complet.** `revelerChrome` garde des translations
    (`:3622-3640`). Tout ce qui bouge dans l'espace devient un fondu.

---

## Phase 3 — Le curseur, pièce signature

L'objectif : un curseur qui a de la **matière** et qui **répond** à chaque
contexte.

- **Rendu.** `transform: translate3d()` au lieu de `left/top/width/height` à
  chaque image (`glass-cursor.mjs:32`). La croissance part exactement du
  centre et la mise en page n'est plus sollicitée. La boucle `rAF` s'arrête
  quand tout est immobile ; elle tourne aujourd'hui en permanence.
- **Taille en ressort amorti** (raideur ≈ 380, ζ ≈ 0,65) au lieu d'un filtre
  exponentiel. Léger dépassement à l'ouverture de la lentille (50 → 52,5 px
  → 50) et petit écrasement à la pression. Mouvement réduit : instantané.
- **Suivi de la souris.** τ de 12 ms en point, 55 ms en lentille, interpolé
  selon la taille. Le point ne traîne plus derrière la souris ; la lentille
  garde son inertie.
- **Matière liée à la taille.** Opacité et bordure dérivées de `taille` en JS,
  sans transition CSS de 350 ms qui prend du retard sur la taille.
- **Un état par contexte :**

  | Contexte | Forme |
  |---|---|
  | libre | point de 6 px |
  | bouton | 10 px, **7 px à l'appui** puis rebond (aujourd'hui aucun retour) |
  | lien | trait de 14×2 px, en écho au soulignement `.fa-lien` |
  | champ texte | barre de 2×18 px |
  | règle des années | capsule horizontale de 16×6 px ; le pouce grossit aussi à `:active` |
  | désactivé | anneau éteint |
  | chargement (`progress`) | anneau qui tourne |
  | globe | lentille de 50 px, **verrouillée pendant qu'on fait tourner** (aujourd'hui elle s'effondre si on glisse hors du limbe) ; 4 px d'hystérésis au limbe |

- **Nom de ville.** Le point du curseur fusionne avec le point de la ville,
  qui a déjà la même crème, avec un léger aimant (rayon de 24 px).
- **Reflet de lentille.** Un arc spéculaire en haut à gauche, décalé selon la
  vitesse, et une légère dispersion chromatique sur le bord seulement (deux
  lectures de texture de plus, sur 50 px).
- **Appui au doigt.** `:active{scale:.97}` en 80 ms sur tout ce qui se touche.
  Aujourd'hui, seuls quatre panneaux réagissent.
- **Survols.** Un seul langage : fond `#ffffff0e` en 180 ms. Le déplacement de
  -1 px est réservé aux CTA. `#resultats li` est aujourd'hui défini quatre fois
  avec quatre fonds.

---

## Phase 4 — Lumière : une seule source pour tout le site

L'idée qui relie tout : **le soleil du globe, les arêtes du verre, la lentille
et les ombres CSS viennent du même point.** Aujourd'hui, il y a trois
directions différentes :
- le soleil est fixé dans le monde (`index.html:1011`) et tourne avec la
  rotation automatique ;
- le verre WebGL est éclairé par `vec2(-1,1)` (`:1506`) ;
- le CSS est éclairé par le haut (`premium.css:7`).

1. **Soleil lié à la caméra.** `sunView = (-.55,.62,.56)` : le terminateur
   reste un croissant stable en bas à droite, et la face vue ne bascule
   jamais dans la nuit.
2. **`--sun-angle` exposé en CSS.** Les liserés du verre, `otherEdge` et les
   reflets de panneaux en dépendent. Une écriture par geste, pas par image.
3. **Reflet du soleil sur les océans,** crème `#fffde2` : limité à l'océan,
   il ne touche pas aux pixels des données.
4. **Liseré du globe et halo.** Même teinte que le halo : l'anneau bleu dans
   la couronne rouge de 2050 disparaît. Le halo de 2050 devient moins saturé
   `(.62,.20,.08)`, plus fort côté soleil. Les bandes `sin(vP.y*12.)` en
   langues de flamme (`:1227`) sont remplacées par une respiration lente.
5. **Inertie de la caméra.** `dampingFactor` indépendant de la fréquence
   d'affichage, glisse d'environ 600 ms au lieu de 150. La rotation
   automatique reprend sur 2,5 s au lieu de repartir d'un coup (`:1777`).
6. **Étincelles de feu en mode Évolution.** Aujourd'hui elles ne sont jamais
   visibles à l'arrivée (`discard` si `uChange>.5`, `:1329`). Les montrer
   seulement là où le risque s'aggrave, à intensité fixe (pixels stables, QA
   intacte).
7. **Noms de villes.** Rattachés à leur ville (`Map`), avec une opacité
   lissée : plus de texte qui change de bouton pendant la rotation (`:3887`).
8. **Tramage d'un demi-bit** dans le post-traitement, contre les paliers dans
   le halo sombre.
9. **Rendu à la demande.** Ne pas redessiner quand rien ne bouge : gain de
   batterie mobile qui paie les ajouts de la phase 6.

---

## Phase 5 — Mise en page : centré, ou décentré exprès

1. **Gouttière unique** `--gutter`. Aujourd'hui le desktop mélange 40, 24 et
   24 px, et le mobile 20, 12, 13, 19, 8, 12, 19,2 et 0 px.
2. **Globe centré dans l'espace libre,** entre le header et le dock, pas dans
   la fenêtre. Écart actuel : 36 px à 1440×900 et 1024×768.
3. **Safe-area ajoutée à la marge, pas à sa place.**
   `calc(28px + env(safe-area-inset-bottom))` au lieu de `max()`
   (`premium.css:165,184,186`) : sur iPhone, la règle touche aujourd'hui
   l'indicateur Home. Inset gauche/droite en paysage pour l'inspecteur, les
   résultats et la fiche.
4. **Pied de page.** Filtres et année sur une ligne de base partagée
   (`--dock-bottom`).
5. **Fiche en paysage.** « 2026 » à 4 px de la croix : réserver 60 px, ou
   passer l'année sous le titre.
6. **Contours du verre WebGL.** Synchronisés avec le rectangle final du DOM :
   décalage de 8 px sous les réglages, anneau orphelin sous la recherche en
   vue ville.
7. **En-têtes collants du comparateur et de la story** jusqu'aux bords ;
   première colonne avec 14 px de marge intérieure.
8. **Boutons d'action.** `repeat(3,1fr)` et `text-wrap:balance` : fini
   « Compare cities » sur deux lignes à côté de voisins sur une seule.
9. **Plus de monospace système.** Lausanne 500 en capitales avec
   `tabular-nums` pour « YEAR · 2026–2050 », les titres de section et les
   sources. `nowrap` sur les codes (« SSP3-7.0 » se coupe aujourd'hui).
10. **Vietnamien.** Le wordmark, l'année et les chiffres gardent Lausanne
    (`terra-menus.css:1152`).
11. **Pastille des filtres sur mobile** dimensionnée au contenu :
    `min-width:88px` au lieu de `calc(50% - 80px)`.
12. **Très grands écrans (2560 et 3440).** Chrome en `clamp()` : année
    jusqu'à 112 px, UI jusqu'à 15 px.
13. **Détails.** Titre de langue en `text-wrap:balance`. Story desktop :
    bouton « Save as JPEG » aligné sur la preview.
14. **Dette CSS.** 64 `@media` sur 12 seuils ramenés à 3 : ≤720 px, paysage
    bas ≤500 px de haut, ≥1800 px. Supprimer les règles écrasées : le même
    `.an` passe aujourd'hui par 44, 96, 56, 38 puis 80 px.

---

## Phase 6 — Signatures « waouh » (à valider une par une)

Sobres, noir et crème, **sans aucun octet téléchargé en plus**. Chacune est un
ajout, pas une correction : accord explicite avant de la construire.

1. **L'aube à l'entrée.** Le soleil part de derrière la Terre : le liseré
   s'allume en contre-jour, puis le terminateur balaie la face en 2,8 s.
   Réutilise le tween `uEveil` (`:3500`). Coût : uniquement des uniforms.
2. **Les villes la nuit.** Les 34 099 lieux déjà chargés deviennent des
   points crème sur la face nocturne, taille ∝ √pop, éteints par le
   terminateur. 1 appel de rendu, environ 8 k points sur mobile.
3. **Nom de ville qui s'écrit.** `revelerChars` (`:479`) existe mais n'est
   jamais appelée. Le nom s'écrit lettre par lettre sur `#dossier-nom`, calé
   sur l'arrivée de la caméra. Le score roule depuis « 000 » et se pose au
   moment où le repère se referme sur la ville (`:2511`).
4. **Entrée resserrée.** Aujourd'hui l'interface apparaît après environ 9,5 s.
   L'interface se lève pendant que le voile s'efface (`dissolve ≈ 0,7`), au
   lieu d'attendre la fin.
5. **Poussière d'étoiles en parallaxe.** Environ 300 points à 0,25
   d'opacité, 0,1× la rotation. Désactivée en mouvement réduit.

---

## Protocole de relecture — plusieurs passes, pas une

Chaque phase est une branche, puis une PR, relue avant fusion par **quatre
regards distincts** :

| Relecture | Question | Comment |
|---|---|---|
| **Mouvement** | Chaque état change-t-il avec les bons token, courbe et sortie ? | Enregistrement vidéo 60 images/s sur vrai GPU, image par image autour de chaque transition ; les sauts, doubles animations et apparitions sèches sont relevés |
| **Lumière** | Une seule direction de lumière du globe au CSS ? Rien de brûlé, pas de paliers ? | Captures face au soleil, dos au soleil, 2026 et 2050, 7 calques |
| **Mise en page** | Centré ou décentré exprès, partout ? | Matrice 320×568 → 3440×1440 (12 formats) × fr/en/it/vi/ja ; mesures (centre de l'année, gouttières, débordements) scriptées, pas à l'œil seul |
| **Ressenti** | Est-ce qu'on dit « waouh » ? Rien qui distrait des données ? | Parcours complet sur un vrai iPhone et un vrai Mac, par quelqu'un qui n'a pas écrit le code |

Garde-fous à chaque passe :
- chemin critique ≤ 840 Ko ;
- FPS au HUD `?perf` ≥ la référence actuelle ;
- mouvement réduit vérifié ;
- `tools/qa/*` au vert. `tools/qa/premium.mjs:30` doit tester le rendu de la
  lumière, pas seulement l'existence de la variable.

Ordre conseillé : 0 → 1 → 2 → 3 → 5 → 4 → 6. La phase 1 seule suffit
déjà à supprimer tout ce qu'un visiteur attentif remarque aujourd'hui.

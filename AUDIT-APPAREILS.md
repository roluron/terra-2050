# Audit multi-appareils et multi-navigateurs — 24 septembre 2026

Débogage en profondeur et vérification du design de TERRA／2050 sur tablette,
Mac, PC, téléphone, Safari, Chrome et Firefox. Le document dit ce qui a été
mesuré, ce qui est corrigé dans cette branche, ce qui reste à faire, et
propose un plan.

## Comment l'audit a été fait

| Volet | Moyen | Limite |
|---|---|---|
| Parcours complet sur 17 formats | Chromium 141 (Playwright, rendu SwiftShader), émulation tactile et DPR. Parcours : lettre → globe → réglages → filtres → recherche « Paris » → fiche → défilement → comparaison. À chaque étape : débordement horizontal, contrôles hors écran, cibles tactiles < 44 px, champs < 16 px sur tactile, texte < 11 px, chevauchements, erreurs JS, requêtes en échec. Capture d'écran à chaque étape. | Émulation : ce n'est pas un vrai appareil. |
| Firefox | Firefox 146 (Playwright). | Pas de WebGL en headless dans ce conteneur : le chargement des modules est vérifié, le rendu du globe ne l'est pas. |
| Safari / WebKit | Relecture complète du CSS et du JS pour WebKit (préfixes, API, versions). | **WebKit ne tourne pas dans ce conteneur** : il manque des bibliothèques système. La CI (macOS) exécute les scénarios WebKit sur la PR. |
| Relecture statique | Deux relectures indépendantes et complètes : CSS/mise en page d'un côté, JS/HTML/runtime de l'autre. | Les points marqués « non vérifié » viennent seulement de la lecture du code. |

Les 17 formats testés :
- **Téléphones** : iPhone SE 375×667, iPhone 15 Pro 393×852, iPhone paysage 852×393, Pixel 7 412×915.
- **Tablettes** : iPad mini portrait 744×1133 ; iPad Air 820×1180 et 1180×820 ; iPad Pro 12,9″ 1024×1366 et 1366×1024.
- **Mac** : 1280×800 @2x, 1512×982 @2x.
- **PC** : 1366×768 ; 1536×864 (1920 à 125 %) ; 1920×1080 ; 2560×1440 ; 3440×1440 (ultra-large) ; fenêtre basse 1280×620.

Résultat global avant correctifs : aucune erreur JS et aucun débordement
horizontal sur les 17 formats. **Mais** le parcours était bloqué en téléphone
paysage, le globe ne chargeait pas du tout dans Firefox, et plusieurs défauts
ne se voient qu'à l'usage (retour arrière, Échap, écran externe).

---

## Corrigé dans cette branche

| # | Gravité | Problème | Navigateurs / appareils | Correctif | Vérifié |
|---|---|---|---|---|---|
| 1 | **Critique** | L'import map était déclarée **après** le premier script module et après le `modulepreload`. Firefox l'ignore : le module principal ne s'exécute pas, on reste sur la lettre puis « Le globe tarde ». | Firefox (toutes versions), Chrome/Edge < 133, et risque sur Safari | `<script type="importmap">` déplacé juste après `<meta charset>` (`index.html`) | Firefox 146 : l'erreur « bare specifier » a disparu, le module s'exécute jusqu'à la création WebGL |
| 2 | **Critique** | Téléphone en paysage : l'icône loupe captait le toucher, la recherche ne s'ouvrait **jamais**, et donc ni fiche ni comparaison. | iPhone et Android en paysage (hauteur ≤ 500 px) | `#loupe{pointer-events:none}` (`premium.css`) | Parcours complet OK à 852×393 |
| 3 | Majeur | L'invitation « Paris, c'est chez vous ? → comparer » (lien partagé) était invisible et non cliquable : elle vivait dans le dock, masqué dès qu'une fiche s'ouvre. | Tous | Invitation sortie du dock (`index.html`), rendue cliquable et placée au-dessus de la fiche (`premium.css`) | `elementFromPoint` → `#accroche-txt` |
| 4 | Majeur | La bande `#recherche` couvrait toute la largeur de l'en-tête : pas de reflet au survol du mot-symbole, impossible de faire tourner le globe depuis le haut de l'écran. | Tous (bureau surtout) | La bande laisse passer le pointeur, seuls le champ et la liste le reçoivent | `elementFromPoint` sur le logo → le logo |
| 5 | Majeur | Tablette portrait (744–1100 px) et Windows à 150 % : fiche de 340 à 500 px avec deux cartes de risque par ligne. « De Martonne » chevauchait la jauge et « jours/an » sortait de la carte. | iPad mini/Air/Pro portrait, PC à 150 % | Une carte par ligne entre 721 et 1100 px | Capture iPad mini, plus une assertion dans la nouvelle QA |
| 6 | Majeur | Retour arrière (bfcache) : `pagehide` détruisait le moteur WebGL et les sons même quand la page était mise en cache. Au retour, le globe était figé et muet. | Safari iOS/macOS surtout, Firefox, Chrome | `if (e.persisted) return;` | Chromium avec bfcache : le globe s'anime au retour |
| 7 | Majeur | Deux Échap (ou le geste retour Android) fermaient la lettre d'intro et la langue : l'interface restait à moitié vide. Chrome 120+ n'accepte l'annulation de `cancel` qu'une fois. | Chrome/Edge, Chrome Android | `preventDefault()` sur Échap dans `keydown` (`earth-letter.js`, `i18n.mjs`), `.catch` sur l'animation de fermeture | 4 Échap : les dialogues restent ouverts |
| 8 | Majeur | Safari 16–17 : le test `@supports not (backdrop-filter…)` était vrai (seul `-webkit-backdrop-filter` y existe), donc tous les panneaux « verre » devenaient opaques. | Safari macOS/iOS 16–17 | La condition teste aussi la version préfixée (`premium.css`, `refinement.css`) | Relecture |
| 9 | Majeur | Texture 8192 (≈ 128 Mo décodés et ≈ 170 Mo GPU) chargée sur iPad Air/Pro : risque de rechargement de l'onglet par manque de mémoire. | iPad | La 8192 est réservée aux appareils à souris (`pointer: fine`) | Relecture ; la QA bureau `globe-detail` attend toujours la 8192 |
| 10 | Majeur | Rapport de pixels (DPR) figé au chargement : image floue ou 4× trop de pixels quand on passe d'un écran Retina à un écran externe, ou qu'on zoome. | Mac + écran externe, PC multi-écrans | `setPixelRatio` dans le handler `resize` | Relecture |
| 11 | Majeur | Encoche / Dynamic Island : la fiche mobile commençait à 88 px sans compter la zone sûre. L'engrenage recouvrait la croix de fermeture. | iPhone 14 Pro → 16 | `top: calc(88px + env(safe-area-inset-top))` | Relecture (safe-area non émulable ici) |
| 12 | Mineur | Fenêtre basse (≤ 560 px) : le millésime en 80 px recouvrait le globe. | Téléphone paysage, portable Windows 125–150 % | Millésime à 44 px sous 560 px de haut | Captures paysage |
| 13 | Mineur | La liste de résultats n'avait pas de hauteur maximale : lignes inaccessibles en paysage ou clavier ouvert. | Téléphones | `max-height: calc(100dvh - 96px)` | Relecture |

Nouveau scénario QA : **`tools/qa/device-matrix.mjs`**. Il rejoue le parcours
complet sur 5 formats (iPhone SE, iPhone paysage, iPad mini portrait, PC 1366,
portable bas) et vérifie : aucun débordement horizontal, aucune erreur de page,
aucune valeur de risque qui sort de sa carte. `tools/check.py` le trouve seul.

---

## Reste à faire (non corrigé ici)

### Priorité haute

1. **Vérification sur vrais appareils** : Safari iOS 16/17/18, iPad avec et sans trackpad, Safari macOS. L'import map (n° 1) et le verre Safari 16–17 (n° 8) doivent y être confirmés. Ce conteneur ne peut pas lancer WebKit.
2. **`DecompressionStream` sans repli** (`climate-data.mjs:60,79`, `flood-data.mjs:156`) : sur Safari < 16.4, aucun calque et aucun score. Il faut un repli `fflate`, ou servir les `.bin` non compressés.
3. **Perte du contexte WebGL** : aucun écouteur `webglcontextlost`. Sur iOS, quand un onglet en arrière-plan est tué, on revient sur un écran noir sans message. Il faut un voile « Reprise… » puis un rechargement si le contexte ne revient pas.
4. **Pincement au trackpad dans Safari macOS** : Safari envoie `gesturestart/gesturechange`, pas `wheel+ctrlKey`. Résultat : c'est la page qui zoome, pas le globe.
5. **Fiche en téléphone paysage** : la zone lisible fait ~110 px de haut, et l'année « 2026 » touche la croix. Elle mérite une mise en page dédiée (deux colonnes réelles, en-tête compact).
6. **Téléchargements en double** : `flood-river.bin` et `flood-coast.bin` sont téléchargés et décompressés 2 fois (~40 Mo de mémoire chacun), `places.json`/`places.bin` 3 fois. Il suffit de mémoriser les promesses de chargement.

### Priorité moyenne

7. **Mode Contraste élevé de Windows (`forced-colors`)** : aucune prise en charge. Le curseur d'année (pouce en `opacity:0`, graduations en `background`) devient invisible.
8. **Hybrides tactiles Windows (Surface)** : les agrandissements à 44 px dépendent de `pointer:coarse`. Il faut `any-pointer:coarse`.
9. **Accessibilité de la lettre d'intro** : ~55 appuis sur Tab pour atteindre « Voir ton futur ». Il faut un « Tout révéler / Passer ».
10. **Audio** : l'AudioContext est créé avant tout geste (avertissement console), rien n'est fait sur `visibilitychange`, iPhone en mode silencieux reste muet (`navigator.audioSession`), et la préférence `terra-son` est écrite mais jamais relue.
11. **Google Fonts en `@import`** (`earth-letter.css:1`) : feuille bloquante, glyphes cunéiformes en carrés hors ligne, et c'est le seul appel à un domaine tiers. Il faut héberger la police.
12. **Survol collant au toucher** : plusieurs `:hover` ne sont pas protégés par `@media (hover:hover)` (`terra-menus.css:1027, 1102, 532…`).
13. **Code mort dans la cascade CSS** : des passes de `terra-menus.css` sont écrasées par `premium.css` (plus spécifique), si bien que des correctifs mobiles annoncés en commentaire ne s'appliquent pas. Un nettoyage réduirait les surprises.

### Détails

- `year-ruler.mjs` lisse les barres de 22 % **par image**, sans tenir compte du temps écoulé : sur un appareil lent (~1 image/s, vu sur la CI macOS), la règle met 20 s à se mettre en place. Un lissage fondé sur le temps (`1 - exp(-dt/τ)`, comme `glass-cursor.mjs`) le rendrait indépendant de la cadence.
- « ⌘K » s'affiche aussi sur Windows/Linux. Il faudrait « Ctrl K » hors Mac.
- À l'année de base, les fiches affichent « 2026 : 28,73 · 0 De Martonne » et « 0 °C · Évolution depuis 2026 » : autant masquer un écart nul.
- Le champ de recherche de la comparaison n'a pas de placeholder.
- `OrbitControls.js:497` : `devicePixelRatio | 0` vaut 0 sous 100 % de zoom sur un écran 1x, et un cran de molette saute alors au zoom extrême.
- Manifest : icône `any maskable` à séparer, pas d'`id`, `lang: fr` pour un nom en anglais.
- `prefers-reduced-transparency` n'existe que dans Chrome : le réglage macOS/iOS « Réduire la transparence » est ignoré.
- `powerPreference: 'high-performance'` force le GPU dédié sur les MacBook Pro bi-GPU et vide la batterie. `default` suffit.
- Barres de défilement de 17 px sous Windows dans les panneaux arrondis : il manque `::-webkit-scrollbar` / `scrollbar-gutter`.

### Ce qui est déjà bien fait

Aucun débordement horizontal sur 17 formats. Aucune erreur JS. `dvh` utilisé
partout. `viewport-fit=cover`. Champs à 16 px sur tactile. Préfixes
`-webkit-` presque partout. WebP détecté avec repli. `maxTextureSize` vérifié.
`localStorage` protégé. `prefers-reduced-motion` respecté très largement.
Partage natif qui garde l'activation utilisateur. Pile d'Échap et pièges de
focus corrects.

---

## Ce que nous pourrions ajouter

| Idée | Pour qui | Effort |
|---|---|---|
| **Mode hors ligne / PWA complète** : service worker qui garde le chemin critique et les données, installation sur l'écran d'accueil. Le manifest existe déjà. | Mobile, partage par lien | Moyen |
| **Mise en page tablette dédiée** : sur iPad portrait, une fiche en bas d'écran (comme sur téléphone, mais plus large) laisserait le globe visible au-dessus. | iPad | Moyen |
| **Fiche paysage téléphone repensée** : deux colonnes, score et risques côte à côte. | Téléphone paysage | Faible |
| **Gestes Safari** : pincement trackpad, double-tap pour zoomer sur une ville. | Mac, iPad | Faible |
| **Écran « Reprise… » sur perte WebGL** et écran de repli plus riche (liste des villes consultable sans globe). | iOS, vieux PC | Faible |
| **Accessibilité** : bouton « Passer l'intro », mode Contraste élevé Windows, vue tableau des villes pour les lecteurs d'écran. | Clavier, VoiceOver, NVDA | Moyen |
| **Préférences mémorisées** : son, dernier calque, dernière ville. | Tous | Faible |
| **Firefox et WebKit dans une matrice visuelle CI** : captures par format comparées d'une version à l'autre (régression visuelle). | Équipe | Moyen |
| **Qualité adaptative** : réduire le DPR ou la texture si le FPS chute (le HUD `?perf` mesure déjà le FPS). | Vieux Android, PC sans GPU | Moyen |
| **Raccourcis clavier affichés** (touche `?`) : ←/→ année, `/` recherche, `F` filtres. | Bureau | Faible |

---

## Plan proposé

**Phase 1 — Sécuriser (cette PR)**
Les 13 correctifs ci-dessus, plus le scénario `device-matrix`. Laisser la CI
macOS rejouer les scénarios WebKit sur la PR.

**Phase 2 — Vrais appareils (½ journée)**
iPhone (Safari 17 et 18), iPad avec trackpad, Mac Safari, PC Windows Edge à
125 % et 150 %, Android Chrome. Pour chacun, dérouler le parcours de
`device-matrix` à la main, plus : retour arrière, rotation, onglet en
arrière-plan pendant 5 min, mode silencieux, zone sûre, lien partagé
`#v=Paris…` (l'invitation doit s'afficher). Consigner dans `.agent/EVIDENCE.md`.

**Phase 3 — Robustesse (1–2 jours)**
Points 2, 3, 4 et 6 de « Reste à faire » : repli `DecompressionStream`,
perte WebGL, pincement Safari, dédoublonnage des téléchargements.

**Phase 4 — Design des formats intermédiaires (1–2 jours)**
Fiche paysage téléphone, mise en page tablette dédiée, nettoyage de la
cascade CSS (code mort), `any-pointer`, `hover:hover`, barres de défilement.

**Phase 5 — Accessibilité et confort (1–2 jours)**
Contraste élevé Windows, « Passer l'intro », audio (`visibilitychange`, mode
silencieux, préférence relue), police cunéiforme hébergée, Ctrl K.

**Phase 6 — Ajouts produit**
PWA hors ligne, qualité adaptative, préférences mémorisées, matrice visuelle
CI. À prioriser selon l'audience réelle (part mobile, tablette, bureau).

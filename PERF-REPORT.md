# PERF-REPORT.md — TERRA//2050

Date : 2026-08-20 · Mesures : Chrome headless (ANGLE) piloté via CDP, viewport 1280×713, DPR 1 — tous les 7 calques actifs, projection 2050, en régime établi.

## Mesures

| Indicateur | Cible | Mesuré | Verdict |
|---|---|---|---|
| FPS desktop | 60 | **120** (plafond vsync de l'environnement de test) | ✅ |
| Longues tâches (>50 ms) en régime établi | 0 | **0** (3 au démarrage : compilation shaders + décodage textures, puis plus aucune sur 8 s) | ✅ |
| Appels de draw | — | **19** | ✅ |
| Triangles | — | **39k** | ✅ |
| Poids JS total (minifié) | < 900 KB | **843 573 o ≈ 824 KB** (libs 809 KB + code applicatif 35 KB servi, ~25 KB minifié) | ✅ |
| Transitions sur propriétés de layout/paint | 0 | **0** — uniquement `transform` / `opacity` côté CSS, uniforms côté GPU | ✅ |
| Textures | ≤ 2048 | couleur 2048 (téléphone) ou 4096, masque 4320, en WebP avec repli JPEG/PNG + LUT 512² générée en mémoire | ✅ |
| Boucles rAF | 1 | 1 | ✅ |

**Chargement (mesuré le 2026-09-02, émulation réseau Chrome sur le site public).**
Chemin critique 839 Ko : bouton Explorer en 10,2 s sur 4G faible (1,6 Mb/s,
150 ms), 4,6 s sur 4G moyenne, 1,2 s en wifi. Avant la refonte : 6,5 Mo et
28,6 s. Le détail de ce qui charge quand est dans le README, section
« Stratégie de chargement » — et les deux pièges à ne pas réintroduire.

Mobile : non mesuré sur device réel. Les garde-fous sont structurels : DPR plafonné à 2, 39k triangles, un seul passe de post-traitement — le budget fragment est inférieur à celui de la référence qui tournait en DPR non plafonné. À confirmer sur device via le HUD intégré (bouton « Perf »).

## Budget JS (tout est vendoré en local, zéro CDN)

| Fichier | Poids |
|---|---|
| three.module.min.js (r160) | 670 681 o |
| gsap.min.js (3.12.5) | 72 214 o |
| howler.min.js (2.2.4) | 36 173 o |
| OrbitControls.js | 29 868 o |
| code applicatif (inline) | 34 637 o |
| **Total** | **843 573 o** |

Aucune autre dépendance : pas de jQuery, lodash, core-js, ni librairie de cartes (la carte, c'est le globe).

## Repris de l'autopsie (techniques cataloguées)

- **Courbe signature unique** : `expo.out` GSAP (famille easeOutExpo) partout ; `cubic-bezier(0.16,1,0.3,1)` côté CSS.
- **Bande de tempo** : 0.3 s micro-feedback, 0.5–0.6 s calques/timeline, 0.8 s mode, 1.8 s vols caméra, 2 s fondus audio.
- **Passage LUT unique** : 3D LUT 64 niveaux packée 8×8 dans 512×512, appliquée à 0.5 — grade original (S-curve, ombres cyan, hautes lumières chaudes) généré procéduralement.
- **Architecture son** : singleton Howler, boucles d'ambiance à 0.5 avec fondus 2 s annulables, one-shots UI.
- **Amorti caméra 0.25**, rotation auto lente, zoom borné.

## Corrigé par rapport à la référence (les 3 sins)

1. **DPR plafonné à 2**, `antialias:false`, **pas** de `logarithmicDepthBuffer`, **pas** de shadow maps (ombrage simulé dans les matériaux : lambert + fresnel). Ping-pong de render targets pour éviter toute boucle framebuffer/texture.
2. **824 KB de JS total contre 2 741 KB** (2,5 MB vendors + 225 KB app) — soit 3,3× plus léger, avec zéro code mort embarqué.
3. **Zéro transition de layout**, scroll natif non détourné (pas de locomotive), pas de `will-change` superflu, aucune image DOM à charger (2 textures GPU + LUT procédurale), HUD mis à jour 2×/s maximum.
4. **Bugs de la référence corrigés** : anti-rebond 150 ms sur les one-shots (`SoundManager.play`), `setVolume` global fonctionnel (la référence appelait `Holwer.volume`), statistiques renderer exploitables (`info.autoReset=false`).

## Dégradation propre

WebGL indisponible → message élégant plein écran (`#secours`), voile retiré, aucune page cassée. Audio bloqué par la politique d'autoplay → la boucle d'ambiance ne démarre qu'après le geste d'entrée ; le reste fonctionne muet.

## Sons (placeholders à remplacer)

Fichiers générés par synthèse (ffmpeg), nommés par fonction — swap direct dans `assets/sounds/` :
`ambient_loop.mp3` / `crisis_loop.mp3` (boucles 12 s, 0.5, fondu 2 s), `camera_fly.mp3` (whoosh 1.4 s), `layer_on/off.mp3` (chirps 0.28 s), `ui_click.mp3`, `ui_hover.mp3` (anti-rebond 150 ms), `timeline_tick.mp3`.

## Vérifier soi-même

Bouton **Perf** (en haut à droite) : FPS (EMA), DPR effectif, appels de draw, triangles, compteur de longues tâches (`PerformanceObserver longtask`).

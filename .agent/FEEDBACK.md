# Retours Canva — 30 septembre 2026

Source : [TERRA _ TEST, 15 pages](https://canva.link/qdywvym8kmbvrn7).
Demande : corriger tous les problèmes signalés, en conservant la correction
vietnamienne existante. Base du dépôt : `869154f`. Corrections vérifiées
localement ; publication sur GitHub Pages demandée par l’utilisateur via `main`.

| Pages | Traitement |
| --- | --- |
| 2 | Ton, grammaire et ponctuation vietnamiens déjà corrigés par `105c142`, présent dans la base. Le fichier `locales/vi.mjs` est conservé. |
| 3 | Chargement mobile/tablette déjà corrigé par `105c142` : sphère animée, particules blanches, coût de rendu tactile réduit. |
| 6 | Survol continu de la règle ; la graduation 2050 ne s’allume pas avant que le pointeur l’atteigne. |
| 8 | Fondu simultané du titre, des contrôles, des filtres et de l’année ; ouverture douce des filtres. Ajout d’un accès « Trouver votre ville » à la recherche. |
| 9–10 | Année remontée, espacement accru avec la règle, timeline à droite sur téléphone. |
| 11 | Piste et poignée natives invisibles, y compris pendant le clic. La règle reste le contrôle visuel ; le focus clavier reste identifiable. |
| 12 | Explication simple de chaque indicateur, de son sens et de son effet ; méthode complète conservée dans « Sources et limites ». Ligne superflue sous « Got it » retirée. Boucle d’ambiance existante vérifiée : le contrôle son agit bien dessus. |
| 13 | Suppression des bandes opaques. « Level » devient « Estimation en [année] », avec une explication de la différence entre niveau estimé et évolution depuis 2026. |
| 14 | Comparaison sans bande opaque sous les titres. « Swap places » devient une action pour choisir un autre lieu ; la comparaison existante reste intacte jusqu’au choix du remplacement. |
| 15 | Les lentilles de verre suivent la visibilité et l’opacité des contrôles et de leurs parents. Les contrôles masqués ne laissent plus de lentille flottante. Les noms de villes et les contrôles en arrière-plan ne transparaissent plus dans les fenêtres. |

Les nouveaux textes de guidage sont disponibles dans les huit langues. Les
données climatiques, scénarios, textures, polices et sons sont conservés.

## Vérification

- Suite existante `tools/qa/refinement.mjs` : desktop Chromium, rendu logiciel,
  DPR 1, passée. Entrée, lettre, couverture New York, comparaison, année,
  remplacement de ville et audio vérifiés.
- Schémas des huit langues et autotests : passés.
- Vérificateurs des données temporelles et des textures : passés.
- Syntaxe JavaScript et `git diff --check` : passés.
- Suite dédiée `tools/qa/feedback.mjs` : passée sur desktop, téléphone 393 × 659,
  petit écran 320 × 568 et tablette 768 × 1024. Vérifie le fondu simultané,
  la recherche, le tactile et le clavier sur la timeline, les explications,
  les sources, l’ambiance sonore, le remplacement de ville, la comparaison
  sans bandes opaques, la fermeture des fenêtres et les huit langues.
- Test isolé du pointeur : 2050 ne s’allume qu’à l’arrivée sur sa graduation.

Les captures, mesures de fondu et empreintes du code sont dans
`/tmp/terra-feedback/`, `/tmp/terra-feedback-final.log` et
`/tmp/terra-feedback-snapshot.json`. Les profils tactiles utilisent Chromium en
émulation dans cet environnement ; WebKit et Safari sur appareil réel ne sont
pas disponibles ici.

Commandes de reproduction :

```sh
npm run dev
QA_CHROMIUM_PATH=/usr/bin/chromium node tools/qa/feedback.mjs
TARGET=desktop QA_DPR=1 QA_HEADLESS=1 QA_CHROMIUM_PATH=/usr/bin/chromium URL0=http://localhost:8080/ node tools/qa/refinement.mjs
```

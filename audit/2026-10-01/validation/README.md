# Contrôles des corrections — 1 octobre 2026

`results.json` distingue la cohérence des fichiers livrés, les vérifications ciblées de l’application et la comparaison aux sources originales qui reste bloquée. Il contient les empreintes de la version corrigée ; les rapports d’audit thématiques examinent la base `57a0757` et indiquent leurs corrections séparément.

Les journaux conservent les résultats locaux après correction. `scientific-ui.json` enregistre les 58 cas ville/année de la fiche, les valeurs physiques, leurs unités, les états sans données et les limites affichées. Le texte du compteur animé contient ses rouleaux de chiffres : ce champ brut n’est pas le score numérique, contrôlé par les suites de calcul et les attributs des fiches.

Environnement : Linux, Chromium avec rendu logiciel SwiftShader. Les mobiles sont simulés. Le CSS distant de Google Fonts est remplacé par une feuille vide uniquement dans `scientific-ui.mjs` pour isoler une dépendance non scientifique inaccessible via le proxy ; les domaines scientifiques restent bloqués. Aucune revendication de test Safari ou de smartphone physique.

La CI complète de la base était déjà en échec. Les passes de ces tests ciblés ne constituent ni une CI globale verte ni une certification scientifique. Voir [DATA-AUDIT.md](../../../DATA-AUDIT.md) pour les sources, les limites et les étapes restant ouvertes.

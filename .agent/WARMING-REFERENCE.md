# Référence historique du réchauffement local

2026-10-01, base `540bd5885e066ad313fb8c930ee3c11d5e6aecd0`.

Le filtre « Réchauffement local » s’ouvre sur l’anomalie totale estimée par rapport à la moyenne historique 1970–2000, déjà calculée dans les données embarquées. Le chiffre positif est signé, et la référence apparaît dans la fiche au survol/toucher, la légende et l’explication du mode. Huit langues sont couvertes.

« Évolution depuis 2026 » reste disponible. Chaque filtre retient les choix explicites pendant la visite ; changer d’année ou de langue ne change pas le mode choisi. Les autres filtres conservent leur mode initial d’évolution depuis 2026. Aucun filtre n’est activé automatiquement à l’entrée.

La température de chaleur estivale reste une température absolue sans signe positif ajouté. Une anomalie réellement nulle ou négative reste nulle ou négative. Le shader et la fiche utilisent le même mode.

La référence ne signifie ni « depuis l’année 2000 », ni une mesure observée en 2026. Les valeurs climatiques annuelles affichées interpolent les moyennes des périodes du modèle MPI-ESM1-2-HR, scénario SSP3-7.0. Les données, formules et périodes n’ont pas été modifiées pour ce changement d’interface.

## Validation

Les valeurs attendues sont recalculées dans les tests depuis les champs de température du fichier `data/climate-grid.bin`, indépendamment du diagnostic de la carte. Exemple à 25° N, 45° E :

| Année | Anomalie avant arrondi | Affichage anglais |
| --- | --- | --- |
| 2026 | 1.222970920138889 °C | +1.22 °C |
| 2030 | 1.34228515625 °C | +1.34 °C |
| 2050 | 2.2242298126220703 °C | +2.22 °C |

Il s’agit de la maille pointée, pas d’une moyenne de l’Arabie saoudite.

- `tools/qa/data-integrity-ui.mjs` : passé, 420 états numériques et 336 états localisés, sept filtres, deux modes, cinq années, deux points, huit langues, trois formats Chromium (1280×800, 393×852, 320×568). Souris/toucher réels dans le navigateur, absence de données, vrais zéros, petits écarts et limites de fenêtre vérifiés. Aucun programme WebGL en échec.
- `tools/qa/hover-diagnostic.mjs` : passé sur desktop et mobile. Référence historique, champs bruts 2026/2030/2050, choix par filtre, huit langues, carte sans filtre et interactions vérifiés. La traduction ferme déjà la fiche épinglée par conception ; le test contrôle le mode inchangé puis la nouvelle fiche visible. La mise à jour d’année épinglée est testée sans réépinglage.
- Contrôle ciblé `QA_PROFILE=mobile QA_COMPACT_REFERENCE_ONLY=1` : huit références de légende vérifiées dans le menu réellement ouvert à 320×568, sans débordement horizontal. Captures FR/EN/VI du menu et FR/EN desktop/mobile de la fiche inspectées.
- `python3 tools/check.py` : huit contrôles rapides passés ; suites navigateur de cette commande désactivées, exécutées séparément ci-dessus.
- `python3 tools/verifier_i18n.py`, `node --check hover-diagnostic.mjs`, `git diff --check` : passés.

Exécution locale avec `URL0=http://localhost:8080/`, `QA_CHROMIUM_PATH=/usr/bin/chromium`, rendu SwiftShader. Preuves locales : `/tmp/terra-warming-reference/hover-desktop-final/`, `/tmp/terra-warming-reference/hover-mobile-final/`, `/tmp/terra-warming-reference/compact-reference/`, `/tmp/terra-warming-reference/integrity/`. Logs : `/tmp/terra-warming-reference-hover-desktop-final.log`, `/tmp/terra-warming-reference-hover-mobile-final.log`, `/tmp/terra-warming-reference-compact.log`, `/tmp/terra-warming-reference-integrity.log`.

Chromium et émulation mobile uniquement ; Safari sur appareil réel n’est pas vérifié. Cette validation compare l’interface aux données embarquées et ne certifie pas les sources scientifiques originales, dont les limites restent décrites dans `../DATA-AUDIT.md`. La CI globale comportait déjà des échecs avant ce changement ; aucune réussite globale n’est revendiquée ici.

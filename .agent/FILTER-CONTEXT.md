# Valeurs contextualisées par défaut pour les sept filtres

2026-10-01, base `088ec7a2adcf9b7718ef76e92cfc84468c73dc5b`.

L’utilisateur a précisé que la présentation contextualisée devait s’appliquer à tous les filtres. À leur première activation pendant la visite, les sept filtres passent en mode valeur. « Évolution depuis 2026 » reste sélectionnable et chaque filtre retient son choix explicite pendant la visite, y compris après changement d’année ou de langue. Aucun filtre n’est activé automatiquement à l’entrée.

| Filtre | Valeur par défaut | Référence ou définition visible |
| --- | --- | --- |
| Chaleur estivale | Température en °C, sans signe positif ajouté | Maximum diurne moyen du mois le plus chaud |
| Aridité | Niveau de l’indice De Martonne | Plus bas signifie plus sec ; plus haut, plus humide |
| Météo de feu | Jours par an | Dépassement du 95e percentile local de FWI, référence préindustrielle 1850–1899 |
| Inondation côtière | Pourcentage de cellules sources valides concernées | Profondeur supérieure à 0,5 m dans une crue centennale modélisée |
| Inondation fluviale | Pourcentage de cellules sources valides concernées | Profondeur supérieure à 0,5 m dans une crue centennale modélisée |
| Réchauffement local | Anomalie signée en °C | Moyenne historique 1970–2000 |
| Déclin démographique | Évolution signée de la population nationale en % | Projection annuelle ONU, variante moyenne, comparée à 2025 ; effectif national affiché en détail |

La couleur du filtre démographique met en évidence les baisses, conformément au shader existant ; la fiche indique aussi les hausses. La carte des crues mesure des fractions de cellules, sans assimilation à des mètres d’eau, une hausse du niveau marin ou une exposition démographique. Les journées de météo extrême favorable aux feux ne sont pas des incendies prédits ou observés.

`map-value-context.mjs` réutilise les définitions traduites existantes et ajoute les références propres aux feux, crues et populations dans les huit langues. Le contexte apparaît dans la légende et la fiche. L’effectif et la comparaison démographiques sont conservés, avec une note sur leur signification. Le mode sélectionné détermine ensemble le shader, la légende et les chiffres affichés.

Les sources scientifiques, grilles, formules, projections, textures et scores ne changent pas. Les vrais zéros, les valeurs négatives et les données manquantes gardent leur signification. Les années climatiques affichées interpolent les moyennes de périodes, tandis que les projections démographiques sont annuelles. Aucun historique commun « depuis 2000 » n’est inventé.

## Validation

Revue indépendante des sept définitions et des branches du shader : cohérentes avec les champs et métadonnées embarqués.

- `tools/qa/data-integrity-ui.mjs` : passé sur 1280×800, 393×852 et 320×568. 21 premiers affichages par défaut, 420 états numériques (sept filtres, deux modes, cinq années, deux points) et 336 états localisés. Valeurs recalculées depuis les champs bruts embarqués, shader et boutons synchronisés, population comparée à 2025, vrais zéros/données manquantes/petites valeurs, bornes de fenêtre, cache et toucher/pointeur réels vérifiés.
- `tools/qa/hover-diagnostic.mjs` : passé sur desktop et mobile, avec références physiques, huit langues, changements d’année et navigation. Chaleur estivale et réchauffement contrôlés indépendamment depuis les champs de température. Exemple à 25° N, 45° E en 2026 : chaleur estivale 44,5 °C, et réchauffement +1,22 °C ; les deux valeurs ont des définitions distinctes.
- Contrôle ciblé `QA_PROFILE=mobile QA_COMPACT_REFERENCE_ONLY=1` : 56 menus ouverts (sept filtres × huit langues) à 320×568, références visibles et absence de débordement. Choix explicite de comparaison thermique conservé après changement de filtre, année et langue. Captures chaleur FR/EN desktop/mobile et menus compacts FR/EN/VI inspectés.

`python3 tools/check.py` : huit contrôles rapides passés, suites navigateur exécutées séparément. `python3 tools/verifier_i18n.py`, `node --check map-value-context.mjs` et `git diff --check` : passés.

Preuves locales : `/tmp/terra-filter-context/hover/results.json`, `/tmp/terra-filter-context/integrity/data-integrity-ui/results.json`, `/tmp/terra-filter-context/compact/results.json`, captures dans les mêmes répertoires. Logs : `/tmp/terra-filter-context-{hover,integrity,compact}.log`. Chromium avec `QA_CHROMIUM_PATH=/usr/bin/chromium`, SwiftShader et émulation mobile. Safari sur appareil réel n’est pas vérifié. Cette vérification de l’interface et des données embarquées ne remplace pas la reconstruction des sources scientifiques originales ; voir `../DATA-AUDIT.md`. La CI globale comportait déjà des échecs avant cette mise à jour ; aucune réussite globale n’est revendiquée ici.

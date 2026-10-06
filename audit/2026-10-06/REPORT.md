# Audit Terra/2050 du 6 octobre 2026

Les valeurs climatiques et démographiques livrées correspondent exactement aux fichiers scientifiques originaux vérifiés. Les calculs internes passent les contrôles exécutés. Cela ne certifie ni la réalité future ni la précision annuelle ou locale des modèles.

## Sources et fidélité des données

| Données | Preuve observée | Verdict |
|---|---|---|
| Chaleur, aridité, réchauffement | Neuf sources WorldClim originales; 3 110 400 champs de grille, autant de couvertures, 409 188 champs urbains | Reconstruction complète, zéro différence |
| Population | Fichier officiel ONU WPP 2024 et révision du Togo; 237 séries, 6 162 valeurs | Reconstruction complète, zéro différence |
| Géographie nationale | Deux GeoJSON Natural Earth épinglés; 2 332 800 pixels et palette | Reproduction complète, zéro différence |
| Crues | Quatorze TIFF WRI originaux; empreintes complètes, 504 comparaisons de champs | Zéro différence sur les échantillons, reconstruction exhaustive non exécutée |
| Météo de feu | Publication primaire, fichiers livrés, lecteurs et intégrité | Reconstruction originale ouverte; archive ETH inaccessible lors des essais, HTTP 429 |
| Villes et données auxiliaires | Formats, coordonnées et usages examinés | Snapshot GeoNames, masque terrestre ancien et lignes décoratives des fleuves non reproduits depuis leurs sources originales |

Les scripts [climat](upstream-climate.py), [population](upstream-population.py), [crues](upstream-flood-samples.py) et [géographie](upstream-geography.py) reproduisent ces contrôles. Ils utilisent les sources originales en mémoire et vérifient leurs empreintes. Ils ne remplacent aucun fichier servi. La géographie réutilise le rasteriseur du produit; sa reproduction n'est pas un second algorithme indépendant.

## Ce qu’il faut comprendre des chiffres

- **2026 reste une estimation**, interpolée entre des moyennes climatiques de périodes. La phrase au passé est accompagnée de « Selon le modèle pour 2026, par rapport à 1970–2000 ». Les années 2027–2050 gardent le conditionnel.
- La chaleur mesure la moyenne des maxima quotidiens du mois le plus chaud. La synthèse mondiale moyenne les valeurs de mois pouvant différer selon le lieu, sur les terres représentées avec données. Elle ne mesure pas un record quotidien ni la température moyenne globale terrestre et océanique.
- L’aridité est un indice climatique De Martonne, pas une mesure des réserves d’eau ou une probabilité de sécheresse. Le ratio est indéfini à T ≤ −10 °C et sensible près de cette limite. La carte recalcule le ratio depuis température et précipitations, au lieu de moyenner les ratios natifs.
- Les crues montrent un événement centennal modélisé, sans protections. La carte montre une fraction de cellules valides dépassant 0,5 m; les fiches montrent une profondeur à une maille de référence. Une valeur nulle au centre d’une ville ne prouve pas l’absence de risque ailleurs.
- Le feu indique des jours favorables à des conditions extrêmes de météo de feu, pas le nombre d’incendies. Une divergence reste ouverte entre 1850–1900 dans l’article et 1850–1899 dans le manifeste. L’interface emploie désormais « préindustriel » sans affirmer une borne non vérifiée.
- Les couches combinent SSP3-7.0 et RCP8.5. Elles ne constituent pas une projection intégrée sous un scénario commun. Les dispersions de modèles ne sont pas des probabilités ou intervalles de confiance.
- La population est projetée pour les pays et territoires, pas pour chaque ville. Le total mondial est la somme des séries révisées, qui diffère légèrement de la ligne World originale avant révision du Togo.
- **Le score /100 est expérimental.** Ses seuils et poids sont des choix de l’application, sans validation empirique identifiée. Les scores nationaux pondèrent les villes listées, dont les populations peuvent se chevaucher; ils ne représentent pas tout un pays.

Les sept exemples d’effets humains ont un soutien documentaire primaire. Ils décrivent des possibilités générales et ne sont pas des conséquences locales calculées par Terra.

## Vérifications des lecteurs et de la présentation

La passe numérique a contrôlé 5 114 850 lectures: 34 099 villes × 25 années × six axes. Les valeurs disponibles sont finies, les domaines et variations sont cohérents, les données absentes restent distinguées des zéros et les replis régionaux sont comptés. Sur 34 099 villes, 31 202 disposent des six axes, 2 895 sont partielles et deux n’ont aucun axe disponible.

La formule du score et les agrégats nationaux ont été comparés séparément sur les 852 475 cas ville/année: aucune divergence. Les 72 425 scores indisponibles restent absents, y compris dans les chemins de défaillance des agrégats. Le formatage ne transforme aucune variation non nulle en zéro littéral. Ces contrôles vérifient l’implémentation de la formule choisie, pas sa validité empirique.

La synthèse mondiale a été recalculée séparément sur les 25 années: 1 172 contrôles numériques et 1 537 contrôles de texte passent. Les grilles de crues ont été vérifiées intégralement pour leurs empreintes, masques et bornes. Les textures scientifiques, les huit contrôles rapides et les schémas des huit langues passent. Le texte chaleur a été vérifié dans le parcours réel en 2026 et en 2050.

Ces passes ne signifient pas que la CI globale est verte. La CI précédente `37434754755` échoue dans plusieurs suites de parcours ou captures, notamment sur un chemin utilisateur macOS et une référence matchMedia; ses résultats restent distincts des contrôles scientifiques ciblés. Aucun smartphone physique ni matrice complète de navigateurs n’est certifié par cette passe.

Le [rapport détaillé de provenance](PROVENANCE.md) donne les liens primaires, unités, périodes, scénarios, méthodes et limites. Les anciennes preuves du 1 octobre restent conservées séparément.

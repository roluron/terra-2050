# Audit climat — 1 octobre 2026

Périmètre : chaleur estivale, aridité De Martonne, réchauffement annuel local.
État initial étudié : commit `57a0757`. Aucun binaire scientifique modifié.

## Conclusion

Les fichiers livrés sont intègres selon les empreintes du manifeste, les
formats et les calculs physiques sont contrôlés, et les libellés actuels des
trois filtres décrivent leur variable correctement. Cela **ne valide pas
indépendamment les valeurs originales de WorldClim**, ni les modèles en tant
que prévisions locales. Les GeoTIFF originaux ne sont pas présents dans cet
environnement ; leur serveur et les pages méthodologiques WorldClim sont
bloqués par le proxy (HTTP 403 CONNECT, constaté le 1 octobre 2026).

Une incohérence de calcul est corrigée dans le transport de l'aridité pour la
carte : les ingrédients température/pluie peuvent maintenant être interpolés
avant la division, comme dans les fiches. L'intégration du shader et des
infobulles appartient à la tâche principale et doit être vérifiée séparément.

## Findings priorisés

### P1 — Provenance originale et reconstruction non vérifiées ici

Le manifeste conserve neuf URL WorldClim, empreintes SHA256, tailles, dates de
récupération et 33 échantillons dérivés. L'empreinte de
`tools/import_climate.py` correspond au manifeste. Les empreintes des sorties
ne prouvent pas qu'une sortie reproduit son raster d'origine : sans télécharger
les neuf archives originales et reconstruire les résultats, cette preuve
reste manquante. Les dates et les échantillons du manifeste sont des traces
internes, pas une seconde source indépendante.

Les URL cibles sont notamment :

- <https://www.worldclim.org/data/worldclim21.html>
- <https://www.worldclim.org/data/cmip6/cmip6climate.html>
- <https://geodata.ucdavis.edu/cmip6/10m/MPI-ESM1-2-HR/ssp370/wc2.1_10m_tmax_MPI-ESM1-2-HR_ssp370_2041-2060.tif>

Pour fermer ce point : exécuter l'import vérificateur contre les sources
originales dans un environnement qui y accède. Vérifier également la licence
et les exigences d'attribution de chaque source ; ne pas reprendre l'affirmation
du README « libres sans condition » comme une validation juridique.

### P1 — Le survol pays expliquait une autre zone que la carte

La carte représente la maille locale de 0,5°. L'infobulle initiale représente
une moyenne des centres de villes disponibles, pondérée par la population
listée. Une souris dans une zone montagneuse/désertique peut donc afficher une
mesure dominée par les villes d'une autre région du pays. Cela concerne les
trois filtres climatiques, même lorsque leur unité est identique.

Solution proposée à la tâche principale : lire la maille locale au pointeur
pour un filtre actif, afficher clairement sa résolution et le nom du pays,
conserver le résumé des villes dans la fiche du pays. Les centres de villes
natifs ont une résolution 10 minutes d'arc ; un repli vers la maille contenant
le centre de 0,5° est déjà explicite dans les données de provenance.

### P2 — L'aridité était interpolée selon deux méthodes différentes

Fiche/runtime : interpolation de température T et precipitation P, puis
`P/(T+10)`. Carte initiale : interpolation linéaire de trois ratios déjà
calculés. Ces méthodes sont différentes pour une fonction non linéaire.

Scan de toutes les 259 200 cellules, des 25 années 2026–2050 :

- 57 269 cellules ont une aridité de carte disponible aux trois ancrages.
- Erreur absolue au 99e percentile : 10,03 points en 2028 ; 49,64 en 2035 ;
  52,70 en 2040. Les erreurs importantes se trouvent en climat froid.
- Écart maximal : 247 034,42 points en 2027, maille 71,25°N / 93,75°E.
  Ratio exact 6 927,83 ; interpolation des ratios 253 962,25 ; T = −9,94746°C.
- Pour les mailles T > 0°C, erreur absolue maximale sur toutes les années :
  0,22074 point, en 2040.
- Ancrages 2026, 2030, 2050 : les deux méthodes correspondent avant encodage.

Ces nombres ne signifient pas une erreur de cette amplitude dans les couleurs
absolues : les deux indices froids extrêmes sont déjà plafonnés visuellement
à 60. Ils prouvent néanmoins une incohérence mathématique et peuvent modifier
la lecture intermédiaire de la variation.

Correction fournie : `science-textures.mjs` ajoute deux textures Float32
`aridityTemperature` (°C) et `aridityPrecipitation` (mm/an), RGB aux années
2026/2030/2050, alpha de validité appariée. Le shader peut maintenant calculer
`P/(T+10)` après interpolation. Les cinq textures historiques sont conservées
pour compatibilité. Budget mémoire : 12 441 600 → 20 736 000 octets.

Les deux nouvelles textures ne rendent disponible une cellule que si les
trois températures encodées Float32 sont finies et strictement supérieures à
−10°C, et les trois précipitations finies et positives ou nulles. Cela masque
aussi une température qui s'arrondirait exactement à −10 après encodage.
Sur les données livrées : 57 269 cellules valides, aucun changement du masque
par rapport à l'ancienne texture d'aridité.

### P2 — De Martonne près de −10°C n'est pas une réserve d'eau

La formule `P/(T+10)` devient singulière quand T approche −10°C. 1 030 cellules
de la carte en 2026 se trouvent entre −10 et −9°C. Le masque actuel interdit
T ≤ −10, mais ne suffit pas à donner un sens hydrologique à des ratios énormes
juste au-dessus. La définition documentée « pluie relative à température,
pas disponibilité de l'eau » doit rester visible. Éviter une interprétation
« sécheresse réelle », « stress hydrique » ou « accès à l'eau potable ».
La correction d'interpolation n'est pas une validation hydrologique de cet
indice en climat très froid.

### P2 — Le README décrit encore le pipeline historique

La section « Limites assumées » affirme notamment une carte fluviale JRC
constante jusqu'à 2050 et des profondeurs écrêtées à 25,5m, contrairement au
runtime actuel Aqueduct/Float32. Les formats anciens, les fonctions de texte
historiques et les anciens rapports d'interface ne sont pas la preuve des
valeurs actuellement affichées. Actualiser ce document avant de partager une
méthodologie publique.

### P3 — Deux définitions spatiales de l'indice sont stockées/utilisées

Le binaire contient une moyenne des De Martonne des cellules natives valides,
avec son propre masque ; les lecteurs reconstruisent un ratio à partir de la
température et de la pluie moyennes de la maille régionale. La moyenne des
ratios n'est pas le ratio des moyennes. 34 479 mailles ont des comptes de
support T et De Martonne différents ; 1 515 mailles ont un ratio reconstruit
disponible sans moyenne native d'indice disponible, et 131 ont la situation
inverse. Le manifeste décrit correctement la variable stockée, mais une
méthodologie publique doit expliciter la variable réellement affichée.
La correction conserve le choix actuel du ratio des T/P moyens régionaux.

## Contrôles réalisés

`python audit/2026-10-01/climate/audit_climate.py` : 28 contrôles, résultats
complets dans `results.json`. Toutes les cellules du binaire et les 34 099
points ont été scannés pour les valeurs finies, bornes, précipitations
non négatives, ordre des champs, températures et masque de couverture.

- Grille : 89 308 mailles avec chaleur/réchauffement disponibles ; support
  native apparié identique entre les trois périodes.
- Points : 30 192 / 34 099 centres ont une mesure native de climat futur.
- Avec replis régionaux, QA runtime : chaleur/réchauffement 33 338 villes,
  aridité 33 337 villes. Une mesure absente n'est pas remplacée par zéro.
- Aucune maille 2050 de réchauffement annuel négatif par rapport à 1970–2000.
- 262 mailles et 549 points natifs ont le maximum mensuel moyen 2050 inférieur
  à son estimation 2026 ; cette variable peut varier différemment de la moyenne
  annuelle, ce n'est pas à lui seul une erreur de signe.
- Formule De Martonne des points : différence relative maximale due au
  conditionnement Float32 inférieur à 1,72×10⁻⁶.
- Pas de mois artificiels, dénombrement de canicules, observations de records
  ou prévisions quotidiennes dans l'importeur actuel.

QA préexistants exécutés avant correction : `science-textures.mjs` et
`science-metrics.mjs` PASS. Les assertions d'ancien nombre/mémoire des textures
doivent être actualisées par la tâche principale pour les sept textures.

Nouveau QA : `node tools/qa/aridity-transport.mjs` PASS. Vérifie les sept
textures, les valeurs aux ancrages et la validité de toutes les 259 200 mailles,
la formule exacte en 2040, l'ordre nord/sud, les métadonnées, NaN, les zéros,
les précipitations négatives, le domaine près de −10°C et le mode Float32
linéaire. Cas de régression synthétique : ratio après interpolation 6 666,51
contre 7 499,83 pour l'ancienne interpolation des ratios.

## Définition et limites à conserver

Les trois couches climat utilisent, selon leur provenance interne :
WorldClim2.1 historique 1970–2000 ; CMIP6 MPI-ESM1-2-HR, SSP3-7.0, moyennes
2021–2040 / 2041–2060. Les années d'ancrage choisies par l'application sont
1985, 2030 et 2050. L'année 2026 est une interpolation illustrative avec
poids 41/45 entre 1985 et 2030, pas une observation de 2026.

Chaleur = maximum sur les douze moyennes mensuelles des maxima quotidiens.
Réchauffement = moyenne des douze `(tmin+tmax)/2` comparée à 1970–2000,
avec mois équipondérés. Aridité = précipitation annuelle divisée par
température annuelle +10. Ces choix n'estiment ni records, ni jours de
canicule, ni humidité ressentie, ni disponibilité des ressources en eau.

Un seul modèle et scénario ne fournit pas d'incertitude multi-modèle.
L'absence de couleur peut indiquer une absence de donnée ou de changement
affiché ; elle ne prouve pas l'absence de risque. Les deux autres familles
climat/feu SSP3-7.0 et inondations RCP8.5 ne doivent pas être présentées comme
une prévision commune à un scénario unique.

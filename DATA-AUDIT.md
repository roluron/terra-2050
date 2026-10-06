# Audit des données — actualisé le 6 octobre 2026

Les sept filtres ont été contrôlés sur leurs fichiers livrés, leurs lecteurs, leurs transformations et leur présentation. **Le climat et la population ont maintenant été reconstruits depuis les fichiers scientifiques originaux, sans différence avec les données livrées. Les crues ont une vérification originale par échantillons ; la reconstruction originale du feu reste ouverte. Cet audit n’est pas une certification scientifique.**

Base du contrôle du 6 octobre : `d7ac819df02e336ca2557be5f0c17e4097f82abd`. Les corrections de texte ajoutent le passé pour la chaleur en 2026, avec une mention visible du modèle, et conservent le conditionnel pour 2027–2050 dans les huit langues. Les résultats détaillés du 6 octobre et les scripts de reproduction se trouvent dans [le rapport actualisé](audit/2026-10-06/REPORT.md). Les sections historiques ci-dessous décrivent aussi la base du 1 octobre, `57a0757d101a51206ba9758cfb59cbe45e0d35b2`. Aucun binaire de climat, de crue, de feu ou de population n’a été remplacé par ces corrections de texte.

## Vérification originale du 6 octobre

| Famille | Vérification effectuée | Résultat et limite |
|---|---|---|
| Chaleur, aridité, réchauffement | Neuf archives WorldClim officielles, empreintes et reconstruction indépendante | 3 110 400 champs de grille, autant de couvertures et 409 188 champs de points urbains identiques. Un seul modèle et un scénario, pas une observation annuelle de 2026. |
| Population | CSV ONU WPP 2024 et révision officielle du Togo | 6 162 valeurs identiques, 237 séries sur 2025–2050. Le total est la somme révisée des pays/territoires, distincte de la ligne « World » du fichier original non révisé. |
| Crues côtières et fluviales | Quatorze TIFF officiels WRI, empreintes complètes et 504 comparaisons de champs échantillonnés | Aucune différence sur les échantillons. La reconstruction de chaque maille depuis les TIFF n’a pas été exécutée. |
| Géographie des pays | Deux GeoJSON Natural Earth épinglés, reconstruction du raster et de la palette | Les 2 332 800 pixels et la palette correspondent. Les petites îles peuvent rester sans pixel à cette résolution. |
| Météo de feu | Documentation primaire, intégrité et calculs des fichiers livrés | Les archives ETH ont répondu HTTP 429 ; aucune reconstruction originale des 21 modèles dans ce contrôle. La publication indique 1850–1900, le manifeste 1850–1899. La borne exacte reste à vérifier dans les fichiers originaux ; l’interface indique désormais « préindustriel ». |
| Villes et populations urbaines | Intégrité des fichiers et cohérence des coordonnées/lectures | Le dépôt n’épingle pas le fichier GeoNames original par version et empreinte. Une reproduction originale des noms et populations urbaines reste ouverte. |

Les lecteurs physiques ont été parcourus pour 34 099 villes, six axes et les 25 années : 5 114 850 lectures. Les synthèses mondiales ont été recalculées séparément sur les 25 années. Les sommes, domaines, fractions, masques et signes passent les contrôles correspondants. Cela confirme les calculs, sans donner aux interpolations une précision annuelle réelle.

## Ce que les filtres mesurent

| Filtre | Grandeur réellement affichée | Sources et résolution de la carte | Limites essentielles |
|---|---|---|---|
| Chaleur | Maximum des douze moyennes mensuelles des maxima quotidiens, en °C | WorldClim 2.1 ; CMIP6 MPI-ESM1-2-HR, SSP3-7.0 ; maille 0,5° | Ni record, ni température ressentie, ni nombre de jours de canicule. Un seul modèle. |
| Aridité | Indice De Martonne : pluie annuelle / (température annuelle + 10) | Même climat ; ratio des températures et pluies moyennes de la maille 0,5° | Proxy climatique, sans réserve d’eau, irrigation ou accès à l’eau potable. Indéfini à T ≤ −10°C et instable près de cette limite. |
| Météo de feu | Jours/an au-dessus du 95e percentile **local** préindustriel du Fire Weather Index | Jeu CMIP6 de météo de feu, moyenne de 21 modèles, SSP3-7.0 ; maille 2,5° | Ni incendies actifs, ni nombre de feux, ni surface brûlée. Seuil différent selon le lieu ; aucune correction de biais des modèles. |
| Submersion côtière | Fraction des cellules sources valides dont la profondeur dépasse 0,5 m dans un événement centennal | WRI Aqueduct Floods, RCP8.5, projection de niveau marin au percentile 50 ; carte 0,5°, sources 30″ | Ni niveau marin quotidien, ni part de population exposée, ni superficie exacte d’une ville. Sans affaissement ni protections. |
| Inondations fluviales | Même fraction, moyenne de cinq modèles appariés | WRI Aqueduct Floods, RCP8.5, événement centennal ; carte 0,5°, sources 30″ | Ni hauteur habituelle d’un fleuve ni crue prévue à une date donnée. Moyenne des modèles, avec divergences possibles ; sans protections. |
| Réchauffement local | Différence de température annuelle moyenne par rapport à la climatologie 1970–2000, en °C | Même WorldClim / MPI-ESM1-2-HR / SSP3-7.0 ; maille 0,5° | Ni température actuelle ni seuil de basculement. Moyenne annuelle avec mois équipondérés. |
| Population | Population nationale ou territoriale annuelle ; variation depuis 2026 en mode évolution, déclin depuis 2025 en mode niveau | ONU WPP 2024, variante moyenne ; révision officielle Togo de janvier 2026 ; 237 séries | Ni projection de population par ville ni migration attribuée au climat. Carte de déclin plafonnée visuellement à 30 %. |

Les empreintes, les unités, les périodes, les modèles et les URL originales figurent dans [climate-manifest.json](data/climate-manifest.json), [fire-weather.json](data/fire-weather.json), [flood-metadata.json](data/flood-metadata.json) et [population-provenance.json](data/population-provenance.json). La présence de ces métadonnées ne remplace pas la comparaison aux sources originales.

## Années, lieux et incertitude

**Les années climatiques sont des interpolations illustratives de moyennes de périodes.** Pour le climat, les périodes sont 1970–2000, 2021–2040 et 2041–2060 ; l’application leur associe les ancrages 1985, 2030 et 2050. La valeur 2026 interpole les deux premiers ancrages. La météo de feu interpole 2016–2035 vers 2041–2060, associés à 2026 et 2050. Les fleuves utilisent 1960–1999, 2010–2049 et 2030–2069, associés à 1980, 2030 et 2050 ; la côte a un historique 1979–2014, ancré à 1996,5. **2026 n’est donc pas une observation actuelle de ces six filtres.** La population emploie, elle, les projections annuelles officielles.

Une maille de 0,5° mesure environ 56 km nord–sud ; celle du feu, 2,5°, environ 278 km. Les couleurs sont lissées entre mailles. L’infobulle décrit la maille contenant le pointeur : elle n’est pas une lecture exacte de chaque pixel lissé ni une mesure à l’adresse de la souris. Pour les crues, la fraction utilise les cellules sources **valides**, sans pondération par superficie exacte. Une faible couverture peut donner une lecture disponible. Aucune couleur ne signifie à elle seule une absence de risque.

Les fiches de ville emploient un échantillon à la coordonnée stockée du centre, avec repli régional déclaré lorsqu’il manque. **Un centre échantillonné à 0 m ne signifie pas que toute la ville est protégée.** Une estimation à l’échelle urbaine demanderait des périmètres de ville vérifiés et une méthode d’exposition distincte.

Les moyennes multi-modèles n’impliquent pas un consensus. Pour le feu, 1 718 des 2 263 mailles disponibles ont des changements P10–P90 de signes opposés. Pour les fleuves, 9 366 des 21 430 mailles dont la fraction moyenne augmente ont moins de trois modèles sur cinq en hausse. Les percentiles décrivent la dispersion des modèles, pas un intervalle de confiance ou une probabilité de catastrophe. Les couches climat/feu sous SSP3-7.0 et les crues sous RCP8.5 ne constituent pas un scénario commun.

## Erreurs corrigées

- **Support des infobulles :** les six filtres physiques lisent désormais la maille locale. Auparavant, une moyenne de villes du pays pouvait expliquer une couleur située ailleurs. Les crues affichent maintenant des pourcentages ou des points de pourcentage, correspondant à la variable de la carte ; les profondeurs en mètres restent dans les fiches.
- **Aridité :** la carte interpole température et pluie avant de calculer leur ratio, comme les lecteurs. Interpoler directement les ratios donnait une autre valeur, surtout près de −10°C. Les ingrédients sont encodés en Float32 avec un masque commun aux trois ancrages.
- **Petits nombres :** une valeur non nulle qui s’arrondirait à zéro est affichée avec une borne. Un vrai zéro reste zéro. Cela concerne les infobulles, les détails physiques et les valeurs physiques des images story.
- **Population et territoires :** les cartes utilisent désormais les unités Natural Earth qui distinguent notamment Guyane, Guadeloupe, Martinique, Réunion, Mayotte et Pays-Bas caribéens. Guadeloupe et Martinique affichaient auparavant la tendance française, de signe opposé à leurs propres séries ONU. Les polygones et les sorties ont des empreintes enregistrées dans [pays-provenance.json](data/pays-provenance.json).
- **Petites îles :** aucune frontière n’a été agrandie pour fabriquer une couverture. Les 237 codes ONU sont dans la palette, mais 22 territoires n’ont aucun centre de pixel dans cette grille de 10′ (~18 km nord–sud), notamment Gibraltar et Tokelau. Leur présence dans les séries ne garantit pas leur visibilité sur le globe. Une maille géographique non assignée reste inconnue ; une ville voisine ne lui attribue pas un pays.
- **Communication :** la promesse d’évaluer l’habitabilité est remplacée par l’exploration de projections, y compris dans l’image d’aperçu des liens. Les limites sont visibles dans le menu des filtres, sous le lien de contact, et près du score, dans les huit langues. L’attribution de population cite directement l’ONU ; les moyennes par critère décrivent les villes ayant **cet indicateur**, sans promettre un échantillon national représentatif.
- **Score sans mesure :** l’agrégat de pays exclut explicitement un score non fini et son poids ; un score manquant ne devient pas zéro. Les caches sont vidés au chargement de la source scientifique.
- **Commandes sur mobile :** une infobulle épinglée pouvait intercepter les appuis dans le menu des filtres. Les commandes restent accessibles et l’infobulle s’efface pendant l’ouverture du menu, puis revient avec la lecture actualisée.

### Exemple qui avait déclenché l’audit

La moyenne fluviale des 13 villes disponibles de Papouasie-Nouvelle-Guinée passe de 0,029665 m à 0,031485 m, soit +0,001820 m. L’ancien arrondi pouvait afficher `0 m`, et les deux niveaux `0,03 m`. Cette moyenne n’expliquait pas la fraction colorée sous la souris.

À la coordonnée stockée de Hô Chi Minh-Ville (10,82°N, 106,63°E), les profondeurs natives échantillonnées sont nulles, alors que la maille régionale contient des cellules modélisées inondées :

| Fraction des cellules sources >0,5 m | Référence illustrative 2026 | Horizon 2050 |
|---|---:|---:|
| Côte | 8,256 % | 9,975 % |
| Fleuves | 23,077 % | 25,449 % |

Ces chiffres sont cohérents dans les fichiers livrés. Ils ne sont pas des pourcentages de superficie administrative ou d’habitants de Hô Chi Minh-Ville.

## Statut du score

Le score 0–100 reste un **indice expérimental**, avec seuils et poids choisis par l’application. Les poids sont chaleur 22 %, aridité 18 %, feu 12 %, côte 20 %, fleuves 16 %, réchauffement 12 %. Chaque axe est borné à 0–1 ; la pénalité combine pour moitié leur moyenne pondérée et pour moitié le pire axe. Les échelles sont 20–50°C, 0–60 De Martonne, 366 jours, 3 m de profondeur et 5°C de réchauffement. Les six mesures sont requises.

Ces poids, seuils et catégories n’ont pas de validation empirique établie dans le dépôt. Le score ne mesure pas l’habitabilité, le risque probabiliste, la vulnérabilité ou l’adaptation. Les scores de pays sont des agrégats de villes disponibles, pondérés par leurs populations enregistrées. Les périmètres de ces villes peuvent se chevaucher : leurs populations cumulées dépassent même les totaux nationaux dans plusieurs pays. Ce n’est donc pas une mesure représentative de l’ensemble du pays.

## Preuves et reproduction

Les contrôles ont parcouru toutes les valeurs livrées et tous les lieux, en distinguant valeur nulle, donnée absente et repli régional :

- Climat : 259 200 mailles, 34 099 points ; formats, empreintes, masques, domaines, formules et interpolation.
- Crues : deux grilles de 259 200 mailles, 34 099 points ; 34 022 156 comparaisons de lecteurs aux équations évaluées séparément. Deux ambiguïtés de signe à l’échelle des erreurs flottantes sont documentées.
- Feu : 10 368 mailles, 21 modèles appariés ; population : 6 162 valeurs, 237 séries complètes sur 2025–2050.
- Score : 852 475 cas ville/année ; 31 202 villes avec les six axes, 2 897 scores indisponibles. Calculs, bornes et agrégats confrontés à la formule documentée.
- Infobulles locales : toutes les cellules des six filtres physiques à 2050, plus les 25 années des six filtres sur six positions (900 combinaisons) ; masques, références, unités et absence de données.

Rapports et résultats reproductibles : [climat](audit/2026-10-01/climate/REPORT.md), [crues](audit/2026-10-01/floods/REPORT.md), [feu et population](audit/2026-10-01/fire-population/REPORT.md), [score et textes](audit/2026-10-01/claims-score/README.md), [lecteur des infobulles](audit/2026-10-01/map-diagnostic/README.md).

```sh
python3 tools/check.py
python3 tools/pays_raster.py --verify-shipped
node tools/qa/science-textures.mjs
node tools/qa/aridity-transport.mjs
node tools/qa/map-diagnostic.mjs
node tools/qa/country-score.mjs
# Serveur local lancé par npm run dev ; Chromium installé :
QA_CHROMIUM_PATH=/usr/bin/chromium URL0=http://localhost:8080/ node tools/qa/hover-diagnostic.mjs
QA_CHROMIUM_PATH=/usr/bin/chromium URL0=http://localhost:8080/ node tools/qa/data-integrity-ui.mjs
```

Le contrôle rapide n’exécute pas toutes les suites navigateur ; les sorties le précisent. Les tests navigateur ciblés ne remplacent pas Safari ou un smartphone physique.

### Contrôles après correction

Les huit contrôles rapides passent. Les suites ciblées vérifient les sept textures et leur encodage, la formule d’aridité sur tous les pixels, les lectures locales, les scores manquants et le format des petits nombres. Les essais Chromium couvrent les huit langues, les sept filtres, les deux modes de carte, le survol, les appuis tactiles et la navigation au clavier. Les 58 cas ville/année de la fiche scientifique passent sans erreur.

L’intégration des infobulles compare 140 états numériques et 112 états localisés sur ordinateur, mobile 393 px et mobile compact 320 px. Au format compact, ces matrices et le dernier parcours tactile sont conservés séparément : le second a été vérifié dans une région rurale avec un zoom permis par l’application. Un appui proche d’une étiquette de ville pouvait être redirigé vers celle-ci par l’ajustement tactile du navigateur ; ce constat est conservé dans les preuves. Ce parcours de fiche de ville n’indiquait pas une erreur de la lecture scientifique.

Les [résultats après correction](audit/2026-10-01/validation/results.json) enregistrent les empreintes des fichiers corrigés et les journaux correspondants. Les [résultats des fiches](audit/2026-10-01/validation/scientific-ui.json) conservent les valeurs effectivement affichées.

Les tests utilisent Chromium avec rendu logiciel dans cet environnement Linux, avec des dimensions et des événements tactiles mobiles simulés. Pour la suite des fiches uniquement, la réponse CSS de Google Fonts est remplacée par une feuille vide : ce domaine est bloqué par le proxy. Les polices distantes et le rendu sur appareils réels ne sont donc pas validés par cette suite. La matrice complète des navigateurs macOS est exécutée par la CI après publication ; son résultat est distinct de ces contrôles locaux.

La [CI complète de la base auditée](https://github.com/roluron/terra-2050/actions/runs/36827389649) était déjà en échec avant ces corrections : plusieurs suites ciblent notamment l’ancienne recherche, d’anciens contrôles ou un chemin utilisateur macOS. Ces échecs préexistants restent hors des passes ciblées ci-dessus. Ce rapport ne revendique pas une validation complète de l’interface ni une CI globale verte.

## Historique des accès et vérifications encore ouvertes

Le 1 octobre, les fichiers originaux étaient absents et les tentatives d’accès avaient été refusées par le proxy réseau (`CONNECT 403 Forbidden`). Ce blocage ne décrit plus les accès du 6 octobre : WorldClim, WRI, ONU et Natural Earth ont été récupérés pour les contrôles indiqués ci-dessus. Les archives ETH du feu ont répondu HTTP 429. Les téléchargements ont été traités en mémoire, sans remplacement des données servies.

Restent ouvertes la reconstruction exhaustive des crues à partir des TIFF, celle du feu à partir des 21 modèles et du masque de végétation original, et celle du corpus GeoNames. Les anciens générateurs des fichiers visuels auxiliaires ne sont pas tous récupérés. Les empreintes seules ne prouvent pas une transformation correcte ; les vérifications complètes et les échantillons sont donc distingués dans le rapport. Les effets humains sont des exemples généraux documentés, sans résultat causal calculé pour une ville.

Sources primaires à relire : [WorldClim 2.1](https://www.worldclim.org/data/worldclim21.html), [WorldClim CMIP6](https://www.worldclim.org/data/cmip6/cmip6climate.html), [Aqueduct Floods](https://datasets.wri.org/datasets/aqueduct-floods-hazard-maps), [méthodologie WRI](https://files.wri.org/d8/s3fs-public/aqueduct-floods-methodology.pdf), [météo de feu CMIP6 — ESSD](https://essd.copernicus.org/articles/15/2153/2023/), [archive ETH Zurich](https://doi.org/10.3929/ethz-b-000583391), [ONU WPP](https://population.un.org/wpp/).

**Statut défendable : exploration de projections et indice expérimental aux limites publiées. Une affirmation « toutes les données ont été scientifiquement validées », une assurance de sécurité locale ou une recommandation de déménagement ne seraient pas étayées par cet audit.**

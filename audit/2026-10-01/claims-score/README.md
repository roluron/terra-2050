# Audit indépendant de l’indice et de sa communication

Base étudiée : `57a0757d101a51206ba9758cfb59cbe45e0d35b2`, le 1er octobre 2026. Le contrôle numérique décrit cette base ; une correction ultérieure doit être vérifiée séparément. Une passe de correction des textes, décrite à la fin de ce rapport, a ensuite été appliquée aux traductions de production.

## Résultat numérique

`exhaustive.mjs` a contrôlé les 34 099 lieux pour les 25 années 2026–2050, soit **852 475 cas** et **5 114 850 lectures par indicateur**. Les fonctions de score de production ont été évaluées séparément dans un contexte isolé, puis confrontées à la formule documentée calculée depuis les mesures physiques. Les scores nationaux ont été comparés à la moyenne des scores finis des villes, pondérée par les populations stockées.

- **31 202 lieux** disposent des six mesures à chaque année ; **2 897** conservent un score indisponible. La couverture globale est stable entre les années.
- Les scores des villes et des pays correspondent à la formule documentée. Les valeurs restent entre 0 et 100. Aucun score numérique n’est attribué aux villes sans les six mesures dans les données chargées.
- Les mesures disponibles ont des niveaux, références et horizons finis ; la référence 2026 a un delta nul. Les deltas correspondent aux niveaux et à la référence, à la tolérance numérique de `1e-4`.
- L’aridité d’Udachny (RU, source index 33614) est indisponible sur toute la série parce que la référence 2026 n’est pas définie. L’objet API conserve néanmoins un niveau actuel fini pour 2029–2050. **Ce n’est pas une fuite dans l’interface**, qui vérifie `available`, ni un score inventé : son score reste absent. La première version du test imposait à tort `value=null` pour toutes les lectures indisponibles ; ces 22 observations ont été reclassées comme informations API.

Cela vérifie le calcul de l’application à partir de ses fichiers actuels. **Cela ne valide pas scientifiquement les modèles sources, l’habitabilité, la précision locale ou les seuils et poids du score.** Les reproductions depuis les sources originales appartiennent aux autres parties de l’audit.

## Blocages de présentation des filtres

| Filtre | Carte actuelle | Survol de pays actuel | Action nécessaire |
|---|---|---|---|
| Chaleur | Maille climatique régionale ; maximum diurne moyen du mois le plus chaud, °C | Moyenne des cellules des villes disponibles, pondérée par leur population | Afficher la valeur locale de la carte et préciser sa maille ; garder l’agrégat de villes dans la fiche du pays. |
| Aridité | Maille régionale ; indice de De Martonne ; en mode évolution, signe inversé visuellement pour que l’assèchement soit rouge | Moyenne des villes ; delta du De Martonne, valeur négative quand plus sec | Même support local et expliciter « plus sec »/« plus humide ». Ce n’est ni une réserve d’eau ni l’eau potable. |
| Météo de feu | Maille de 2,5° ; jours/an au-dessus du 95e percentile local préindustriel du FWI | Moyenne des villes dans ces grandes mailles | Même support local et unité jours/an. Ce ne sont ni des feux actifs, ni un nombre d’incendies, ni la surface brûlée. |
| Submersion côtière | Fraction des cellules couvertes avec une profondeur >0,5 m lors d’un événement centennal, ou sa variation en points de pourcentage | Profondeur en mètres, moyennée sur les villes | **Changer d’indicateur au survol** : % ou points de pourcentage de la maille locale ; garder les profondeurs dans la fiche. Ce n’est ni le niveau quotidien de la mer ni une probabilité de dommage local. |
| Inondations fluviales | Même fraction et unité de surface, moyenne de cinq modèles du même événement de période de retour 100 ans | Profondeur en mètres, moyennée sur les villes | Même correction. Il peut y avoir baisse, hausse ou peu de changement suivant les lieux ; le filtre ne prédit pas une montée quotidienne de tous les fleuves. |
| Réchauffement local | Maille régionale ; anomalie de température annuelle par rapport à 1970–2000 ; évolution = réchauffement supplémentaire depuis la référence illustrative 2026 | Moyenne des villes | Même support local ; distinguer les deux références. Ce n’est ni une température actuelle ni un seuil de basculement. |
| Population | Pays ; diminution depuis 2025 en mode niveau, variation depuis 2026 en mode évolution | Pays ; même séries annuelles et références, signe numérique croissance/déclin | Compatible à l’échelle du pays. Préciser que la carte de déclin au niveau ne colore que la baisse ; les projections ONU sont annuelles et démographiques, pas des prévisions de chaque ville. |

Le décalage du survol touche le **support spatial des six filtres physiques**. Pour les inondations, il touche également **la grandeur et l’unité**. Une note indiquant cette différence est utile mais n’annule pas la confusion lorsqu’un chiffre se trouve sur une couleur qu’il n’explique pas.

## Arrondis trompeurs

La base arrondit `physicalHover` à deux décimales sans conserver un signe ni une borne lorsqu’une variation est petite. Le nombre de variations non nulles affichées comme zéro sur tous les lieux/années est :

| Indicateur | Cas |
|---|---:|
| Inondations fluviales | 70 002 |
| Aridité | 12 381 |
| Chaleur | 4 944 |
| Réchauffement local | 4 160 |
| Météo de feu | 871 |
| Submersion côtière | 705 |

Il s’agit de **variations non nulles**, pas automatiquement d’effets matériellement significatifs. La précision affichée ne doit pas suggérer que les sources connaissent le millimètre ; afficher une borne telle que `+<0,01 m` ou `−<0,01 m` explique qu’il existe une petite variation sans inventer une précision scientifique.

Pour la Papouasie-Nouvelle-Guinée, les 13 villes disponibles pour l’indicateur fluvial donnent **0,0296652737704 m** en référence 2026 et **0,0314854454138 m** à l’horizon 2050, soit **+0,00182017164337 m**. Seulement 10 villes ont les six mesures. Le poids total de toutes les villes listées est 628 855 habitants, environ 5,74% de la projection nationale ONU 2026 ; ce pourcentage décrit seulement un rapport des chiffres stockés, pas une couverture démographique vérifiée.

Les nombres très petits disparaissent aussi dans les niveaux de cartes, les phrases de détail et les images story qui arrondissent simplement à deux décimales. La comparaison et les deltas de fiche utilisent déjà une borne `<0,01` : harmoniser les formats évite des résultats en apparence contradictoires.

## Texte national incorrect

La clé **`ui.populationweighted_mean_of_listed_cities`** affirme que la moyenne est calculée sur « les villes listées disposant des six mesures ». Cela décrit le score national, mais **pas** `mesuresLieu()` : cette fonction inclut toutes les villes disponibles séparément pour chaque indicateur. La phrase est effectivement affichée dans les cartes de la fiche du pays et les cellules de comparaison de pays.

Réécriture recommandée : « Moyenne des villes listées disposant de cet indicateur, pondérée par leur population. Ces villes et leurs périmètres ne constituent pas un échantillon national représentatif. » Des propositions pour les huit langues sont dans `copy-recommendations.mjs`.

Les populations des villes ne représentent pas des unités géographiques exclusives : la somme des records vaut environ 3,34 fois la population ONU de Hong Kong, 1,97 fois celle de Singapour et 1,15 fois celle du Japon. Le score national doit rester décrit comme **un agrégat de records de villes disponibles**, pas comme une évaluation de l’ensemble du pays ou de tous ses habitants. L’avertissement sur les périmètres chevauchants est déjà présent dans `country_score_populationweighted_mean_of`.

## Indice global : calcul cohérent, validation non établie

Les six transformations et les poids sont des choix de l’application : chaleur 22%, aridité 18%, météo de feu 12%, côte 20%, fleuves 16%, réchauffement 12%. La moitié de la pénalité vient de la moyenne pondérée, l’autre du pire axe. Les seuils sont 20–50°C pour la chaleur, 0–60 De Martonne pour l’aridité, 366 jours pour la météo de feu, 3 m pour les profondeurs et 5°C pour le réchauffement.

Le code correspond à ces déclarations. Il n’existe dans ces fichiers aucune validation empirique des poids, des seuils ou des niveaux « élevé/intermédiaire/bas » de l’indice. Les données n’intègrent pas l’adaptation, les protections, l’exposition détaillée, la vulnérabilité, tous les risques naturels ou les services d’une ville. Le mélange du SSP3-7.0 climatique/feu et du RCP8.5 inondations n’est pas une trajectoire de scénario commun. Le score est donc présentable comme **indice expérimental comparatif**, avec la méthode et les limites ; il ne peut pas être certifié comme mesure d’habitabilité, de risque probabiliste ou conseil de migration.

Cette distinction et les scénarios mixtes sont déjà accessibles dans chaque fiche, sous `details.fiche-methode`, via `panelMethodText`, `panelScenario`, `panelDataLimits`, les formules, les sources et les liens aux métadonnées. **Ils ne sont pas annoncés à l’entrée** : la question `sous2`, le titre de l’onglet et les titres OG/Twitter demandent encore « Votre ville sera-t-elle encore vivable en 2050 ? ». Réduire cette promesse à l’exploration de projections climatiques aligne la première impression avec les capacités vérifiées. Un bref texte proche du score pourrait rendre visible son caractère non validé sans imposer l’ouverture de la méthode.

L’indice de De Martonne est mathématiquement défini ici seulement pour une température annuelle >−10°C. Il peut devenir très grand près de cette limite (maximum disponible 3 783,66). Cette valeur ne démontre pas une grande disponibilité d’eau ; les résultats froids doivent rester interprétés comme un proxy/classification climatique avec sa limite.

## Défense contre une absence de score

Dans les données chargées, toutes les villes marquées comme complètes conservent un score fini sur les 25 années. Néanmoins, `indicePays()` additionne directement `indiceHabitabiliteVille(v, année) * population` après le seul drapeau `v[7]`. Un test isolé où le score d’une ville complète est temporairement `null` retourne **0** pour le pays (`null * population === 0`). Cela contredit le principe « absence ≠ zéro » si l’invariant est rompu par un rechargement, une future modification ou un défaut de données.

Correction défensive recommandée : vérifier `Number.isFinite(score)` avant de compter le score et son poids, retourner `null` sans poids valide, et vider les caches de score lors d’un changement de source. **Cette erreur n’a pas été observée avec les fichiers complets actuels.**

## Autres chaînes actives et héritages

- `infoSource.declin` cite Our World in Data alors que les valeurs numériques actuelles proviennent directement du pipeline ONU WPP 2024 et de la révision Togo. Corriger cette attribution ; Natural Earth ne fournit que la géométrie.
- En français, « variante moyenne » ou « variante centrale » correspond mieux au nom officiel **Medium**, sans impliquer une médiane probabiliste universelle.
- `frappe*`, `det*` et `paliers` contiennent encore de vieux textes sur le heat index, COAST-RP, FABDEM, JRC constant à 2050 ou des basculements climatiques. `motRisque()` n’est plus appelé et ces chaînes ne sont pas invoquées dans les parcours actuels. **Ce sont des héritages à retirer, pas des erreurs actuellement visibles**. Les traiter comme une preuve de données actuelles JRC ou FABDEM serait faux.
- Le récit poétique de la lettre de la Terre est un propos éditorial ; il ne doit pas être présenté comme une conclusion déduite des valeurs du score.

## Fichiers du contrôle

- `results.json` : résultats complets, statistiques par axe et agrégats par pays.
- `exhaustive.mjs` : script reproductible sur les fichiers locaux.
- `active-copy-inventory.json` : chaînes actives exactes dans les huit langues et emplacement de rendu.
- `copy-recommendations.mjs` : reformulations proposées, sans modifier les traductions de production.

Le contrôle informatique établit la traçabilité et la cohérence de certaines transformations. Une expertise scientifique indépendante reste nécessaire pour valider un indice de risque ou une estimation locale destinée à une prise de décision.

## Corrections des textes ensuite appliquées

Dans les huit langues, `sous2` et `ui.terra2050_will_your_city_still` proposent désormais d’explorer des projections climatiques ; `ui.populationweighted_mean_of_listed_cities` décrit les villes disponibles pour l’indicateur ; `infoSource.declin` cite directement l’ONU WPP 2024 et sa révision Togo. Deux chaînes globales `indicatorNotice` et `scoreNotice` donnent les limites essentielles. En français, les textes de population utilisent « variante moyenne », sans modifier les médianes côtières.

Seuls `locales/base.mjs`, `locales/extra.mjs`, `locales/es.mjs`, `locales/it.mjs`, `locales/vi.mjs`, `locales/ja.mjs`, `locales/zh.mjs` et `locales/zh-Hant.mjs` ont été modifiés lors de cette passe. La structure des huit catalogues, les paramètres, les références de l’interface et la syntaxe JavaScript passent les vérifications existantes. La mise en page et le câblage des nouvelles notices restent à vérifier par l’intégration principale.

## Vérification du runtime après correction

Le contrôle complet a été relancé après correction de l’agrégation nationale et des textes numériques : **852 475 cas, aucun écart numérique**, 780 050 cas avec score et 72 425 sans score. La sonde de régression `indicePays()` retourne désormais `null` lorsqu’aucune ville ne possède un score valide. Les fixtures dédiées vérifient aussi les scores nuls au sens numérique (`0`), les poids invalides et le vidage des caches lors d’un changement de source.

Les compteurs d’arrondi du tableau plus haut décrivent la **base historique `57a0757`**, avant le texte borné. Après correction, l’ancien test `startsWith('0 ')` confondait à tort la borne positive `0 < Δ < 0,01` avec un zéro affiché. Ce diagnostic a été remplacé par **`/^0 (?!<)/`** dans `exhaustive.mjs`.

`rounding-statistics.mjs` a recalculé séparément les statistiques de présentation sur les **852 475 lieux/années**, sans refaire les scores. Il parcourt toutes les mesures disponibles et formate les candidats non nuls dont l’arrondi numérique à deux décimales serait nul. **Aucun niveau non nul ni aucune variation non nulle n’est affiché comme zéro littéral.** Les 70 002 petites variations fluviales, 12 381 d’aridité, 4 944 de chaleur, 4 160 de réchauffement, 871 de météo de feu et 705 côtières sont maintenant affichées sous forme de bornes ; elles ne constituent pas des défauts restants.

`results.json` contient les compteurs corrigés, une liste vide de faux zéros, et `formatterAudit` qui identifie la méthode et les empreintes des fichiers du runtime. La preuve de ce recalcul est également enregistrée dans `rounding-statistics.json`. Les chiffres historiques sont conservés ici pour expliquer la correction, sans présenter les anciennes confusions comme des erreurs du site corrigé.

# TERRA/2050 — Benchmark concurrentiel

Produit evalue : **TERRA/2050** — https://roluron.github.io/terra-2050/
Globe 3D, recherche parmi 34 099 villes, indice unique d'habitabilite physique 0-100 pour toute annee 2026-2050. Six criteres ponderes (stress thermique, stress hydrique, feux, submersion cotiere, inondation fluviale, deplacement climatique) plus le declin de population. Donnees ouvertes uniquement : WorldClim 2.1, CMIP6 MPI-ESM1-2-HR SSP3-7.0, FABDEM 30 m sol nu, COAST-RP, JRC crue centennale, VLM, population ONU. Sans compte, sans paiement, instantane, FR/EN, image de partage. Les defenses construites (digues) ne sont explicitement pas comptees.

Recherche menee le **2 septembre 2026**. Toutes les URL ont ete consultees a cette date sauf mention contraire. Tout ce qui n'a pas pu etre verifie est marque **UNKNOWN** — aucun chiffre n'est invente.

---

## 1. Climate Central — Coastal Risk Screening Tool (mondial) et Coastal Risk Finder (US)

Sources : https://coastal.climatecentral.org/ (consulte le 2026-09-02) ; https://coastal.climatecentral.org/map/8/100.6166/13.2746/?theme=sea_level_rise ; https://www.climatecentral.org/resources?tab=tools (consulte le 2026-09-02) ; https://www.climatecentral.org/news/new-coastal-risk-screening-tool-supports-sea-level-rise-and-flood-mapping-by-year-water-level-and-elevation-dataset

**Ce qu'il fait bien.** C'est la reference mondiale de la submersion cotiere grand public. Carte mondiale, gratuite, sans compte, choix de l'annee, du scenario de pollution, du niveau d'eau, du jeu d'elevation (dont CoastalDEM, leur MNT corrige par reseau de neurones). Interface en anglais et espagnol. Cote US, le Coastal Risk Finder (releve du Risk Finder / Surging Seas) ajoute population, logements, terres exposees et solutions d'adaptation locales, avec donnees telechargeables. FloodVision RiskViewer produit des visualisations photorealistes (cotes Est et Golfe des Etats-Unis).

**Ce que l'utilisateur doit encore faire lui-meme.** Lire une carte. L'outil ne rend pas un score : il rend une tache bleue. L'utilisateur doit choisir un scenario, une annee, un percentile, un jeu d'elevation, puis interpreter lui-meme si sa maison est concernee. Aucune synthese multi-aleas : la chaleur, l'eau, les feux, les crues fluviales sont absents de cet outil. Pas de francais. Pas de comparaison ville-a-ville, pas de « ou est-ce mieux a cote ».

**Frictions.** Le choix du scenario d'elevation change radicalement le resultat et l'utilisateur non expert ne sait pas lequel prendre. Les outils sont eclates : la carte mondiale, le Coastal Risk Finder US, Picturing Our Future et les Climate Shift Index sont quatre produits distincts.

**Difference honnete avec TERRA/2050.** Climate Central est **meilleur** sur la submersion cotiere prise seule : CoastalDEM est concu specifiquement pour corriger le biais de canopee/batiments des MNT globaux, leur equipe publie dans Nature Communications, et ils offrent des couches d'exposition (population, logements) que nous n'avons pas. Ils sont aussi meilleurs sur la pedagogie visuelle du littoral. TERRA/2050 differe sur trois points : un score unique au lieu d'une carte a interpreter, six aleas au lieu d'un, et le francais. Comme nous, Climate Central ne compte pas les defenses cotieres dans la carte de base — nous ne sommes donc pas seuls a poser cette limite, et nous ne devons pas la presenter comme une originalite.

---

## 2. Climate Central — Picturing Our Future

Source : https://picturing.climatecentral.org/ (consulte le 2026-09-02) ; page produit sur https://sealevel.climatecentral.org/ (consulte le 2026-09-02).

**Ce qu'il fait bien.** Images photorealistes de centaines de lieux iconiques dans le monde, comparees a 1,5 / 2 / 3 / 4 °C de rechauffement, avec GIF animes et telechargement. Contenu bilingue anglais/espagnol dans les donnees de la page (champs `city_es`, `country_es` observes dans le JSON de la page). C'est de tres loin le meilleur objet de partage social du secteur : une image avant/apres bat n'importe quel score.

**Ce que l'utilisateur doit faire.** Rien — mais il ne peut choisir que dans une liste fermee de lieux iconiques (exemples observes : Charleston International Airport, Dubai, Lalbagh Fort a Dhaka). Sa ville n'y est probablement pas. Pas d'annee, seulement des paliers de rechauffement. Un seul alea.

**Frictions.** Liste fermee, pas de recherche libre, pas de chiffres exploitables.

**Difference honnete.** Picturing Our Future est **meilleur que nous** sur le partage : notre image de story est une carte de score, la leur est une photo de son propre quartier sous l'eau. C'est le concurrent le plus dangereux sur l'axe emotionnel. TERRA/2050 gagne sur la couverture (34 099 villes contre quelques centaines de lieux) et sur le nombre d'aleas.

---

## 3. NASA — Sea Level Change Portal / IPCC AR6 Sea Level Projection Tool

Sources : https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool ; https://podaac.jpl.nasa.gov/announcements/2021-08-09-Sea-level-projections-from-the-IPCC-6th-Assessment-Report ; https://earth.gov/sealevel/resources/ipcc-report/ (recherche du 2026-09-02 ; le domaine n'a pas repondu a la requete directe ce jour-la — ETIMEDOUT sur 198.118.243.62 —, les elements ci-dessous viennent des pages descriptives et de la documentation NASA/PO.DAAC).

**Ce qu'il fait bien.** Autorite maximale : ce sont les projections officielles du 6e rapport du GIEC, de 2020 a 2150, tous scenarios, avec moyennes globales, grille reguliere et projections locales aux maregraphes. Clic n'importe ou en mer pour obtenir la courbe. Donnees telechargeables en plusieurs formats. Gratuit.

**Ce que l'utilisateur doit faire.** Comprendre ce qu'est un scenario SSP, un quantile, une projection « medium confidence » contre « low confidence ». Le resultat est une courbe en centimetres, pas une reponse. Anglais uniquement. Un seul alea, et un alea qui ne dit rien de la submersion reelle du terrain : il faut soi-meme croiser avec un modele d'elevation.

**Frictions.** Outil d'expert deguise en outil public. Aucune traduction du chiffre en consequence locale.

**Difference honnete.** La NASA est **meilleure** sur la rigueur et la profondeur du signal marin : incertitudes explicites, horizon 2150, processus glaciaires low-confidence. TERRA/2050 fait le pas qu'ils ne font pas : croiser l'elevation de la mer avec un MNT sol nu et une maree de tempete pour dire « ta ville, cette annee-la, oui ou non ».

---

## 4. IPCC WGI Interactive Atlas

Source : https://interactive-atlas.ipcc.ch/ (consulte le 2026-09-02 — page a rendu JavaScript, contenu non extractible en texte).

**Ce qu'il fait bien.** Reference scientifique absolue, gratuite, sans compte. Variables CMIP5/CMIP6/CORDEX, scenarios SSP et RCP, agregation par regions de reference du GIEC, export des figures et des donnees.

**Ce que l'utilisateur doit faire.** Choisir un jeu de donnees, une variable, une periode de reference, un niveau de rechauffement ou une periode future, un seuil, un mode d'affichage. C'est un outil concu pour des auteurs de rapport. Anglais et espagnol. Granularite regionale, pas urbaine : on ne cherche pas une ville, on regarde une region.

**Frictions.** Courbe d'apprentissage reelle ; aucun score, aucune interpretation, aucune reponse a « dois-je partir ».

**Difference honnete.** L'Atlas est **meilleur** sur la solidite : multi-modeles, multi-scenarios, incertitude affichee. Nous, un seul modele. Notre difference est le niveau de sortie : ils publient de la donnee climatique, nous publions un jugement d'habitabilite. Nous ne remplacons pas l'Atlas, nous le traduisons.

---

## 5. Copernicus — Climate Data Store et Interactive Climate Atlas

Sources : https://cds.climate.copernicus.eu/ (consulte le 2026-09-02) ; https://atlas.climate.copernicus.eu/ ; https://climate.copernicus.eu/copernicus-interactive-climate-atlas-guide-powerful-new-c3s-tool ; https://www.ecmwf.int/en/newsletter/181/earth-system-science/copernicus-interactive-climate-atlas-tool-explore-regional

**Ce qu'il fait bien.** Le CDS est le catalogue de donnees climatiques le plus complet au monde, avec API. L'Interactive Climate Atlas (C3S Atlas), publie debut 2024 et enrichi en mai 2025, donne acces en quelques clics a CMIP5, CMIP6, CORDEX-CORE et CORDEX-EUR-11, plus ERA5. Au 3e trimestre 2025, des milliers de visiteurs de 157 pays et jusqu'a 3,1 To telecharges (source : climate.copernicus.eu, « The Copernicus Interactive Climate Atlas keeps growing »).

**Ce que l'utilisateur doit faire.** Pour le CDS : creer un compte ECMWF, accepter les licences par jeu de donnees, construire une requete, attendre la file de traitement, telecharger du NetCDF ou du GRIB, puis savoir l'ouvrir. Pour l'Atlas : pas de compte, mais choisir variable, scenario, periode, region. Anglais.

**Frictions.** Compte + file d'attente + format scientifique cote CDS. Cote Atlas, granularite regionale et vocabulaire d'expert.

**Difference honnete.** Copernicus est **meilleur** sur tout ce qui est donnee brute, multi-modeles et tracabilite. C'est aussi une source amont potentielle pour nous. Notre valeur est strictement en aval : nous faisons le travail de requete, d'extraction et d'agregation que l'utilisateur devrait faire lui-meme, et nous le rendons en une seconde sur une ville nommee.

---

## 6. Probable Futures

Sources : https://probablefutures.org/maps/ ; https://probablefutures.org/data-community/faq/ ; https://probablefutures.org/science/climate-models/ ; https://docs.probablefutures.org/ (consultes le 2026-09-02).

**Ce qu'il fait bien.** Le meilleur equilibre actuel entre rigueur et lisibilite grand public. Cartes mondiales gratuites de chaleur, humidite (bulbe humide), precipitations, secheresse, tempetes, jours de danger d'incendie, presentees par **paliers de rechauffement** (0,5 °C a 3 °C) plutot que par annee. Donnees CMIP5 dynamiquement descendues via CORDEX-CORE (REMO2015 et RegCM4), traitees par Woodwell Climate Research Center. Le FAQ indique que cartes et donnees sont « licensed for widespread use including commercial applications ». API permettant de demander des donnees climatiques pour n'importe quel lieu au monde a partir d'une adresse, d'une ville ou de coordonnees. Un « Probable Futures Pro » gratuit existe pour les usages avances.

**Ce que l'utilisateur doit faire.** Lire une carte, choisir un palier de rechauffement, et surtout **agreger mentalement** : Probable Futures refuse par principe de produire un score unique, ce qui est un choix editorial defendable mais laisse tout le travail de synthese a l'utilisateur. Anglais. Le Pro et l'API demandent une inscription. Pas de reponse « en quelle annee », pas de comparaison de villes voisines classees.

**Frictions.** Passer d'une carte a l'autre pour chaque alea ; traduire un palier de rechauffement en annee ; aucune hierarchisation.

**Difference honnete.** C'est notre concurrent le plus proche en intention, et il est **meilleur que nous sur plusieurs points** : donnees descendues dynamiquement (RCM 25 km CORDEX-CORE) plutot qu'une simple descente statistique, plus de variables d'humidite et de bulbe humide, licence claire, API publique, et une pedagogie ecrite (le « climate handbook ») que nous n'avons pas. TERRA/2050 se distingue par : le score unique, l'axe temporel en annees, la submersion cotiere et fluviale integrees au meme score, le francais, et la recherche par ville plutot que par point sur une carte.

---

## 7. First Street (ex-First Street Foundation) et Risk Factor

Sources : https://riskfactor.com/ (consulte le 2026-09-02 : redirection HTTP 302 vers `https://firststreet.org/?from=riskfactor.com`) ; https://firststreet.org/ ; https://www.msci.com/discover-msci/media-room/msci-completes-acquisition-of-first-street ; https://ir.msci.com/news-releases/news-release-details/msci-acquires-first-street-enhance-physical-climate-risk ; https://esgnews.com/msci-to-acquire-first-street-in-120-million-deal-to-expand-physical-climate-risk-analytics/

**Ce qu'il faisait bien.** Risk Factor etait le meilleur outil grand public du monde sur le risque a l'echelle de la parcelle : un score 1-10 par propriete pour l'inondation, le feu, la chaleur, le vent et la qualite de l'air, a 30 ans, gratuit, sans compte, integre dans Realtor.com, Redfin et d'autres portails immobiliers. C'etait le concurrent frontal de notre proposition « un score, une adresse ».

**Ce qui a change — fait le plus important de ce benchmark.** MSCI a annonce l'acquisition de First Street le 24 juin 2026 pour 120 millions de dollars en numeraire et l'a finalisee le 3 aout 2026 (communiques MSCI). Au 2 septembre 2026, `riskfactor.com` ne sert plus l'outil consommateur : la racine renvoie une redirection 302 vers `firststreet.org`, qui s'ouvre sur une acceptation obligatoire des conditions d'utilisation et de la notice de confidentialite MSCI avant tout acces. **La disponibilite d'une recherche gratuite par adresse pour le grand public au 2026-09-02 est UNKNOWN** — la redirection observee et le positionnement « climate risk financial modeling » de la page d'accueil suggerent un repositionnement B2B, mais je n'ai pas pu verifier l'existence d'un formulaire de recherche publique derriere le mur de conditions.

**Frictions.** Etats-Unis uniquement (la couverture « 2,4 milliards de structures dans le monde » annoncee par MSCI est un produit de donnees vendu, pas un outil public). Anglais. Desormais, mur de conditions d'utilisation MSCI.

**Difference honnete.** Sur le territoire americain et a l'echelle du batiment, First Street est **techniquement tres au-dessus** de nous : modelisation physique par propriete, cinq aleas, integration aux portails immobiliers. Nous ne rivalisons pas sur la resolution. Nous rivalisons sur la couverture mondiale, la gratuite reelle, l'absence de mur juridique, et le fait que notre produit reste accessible apres un rachat. Si l'outil grand public disparait effectivement, une fenetre s'ouvre — mais elle est ouverte aux Etats-Unis, ou nous ne sommes pas les mieux places.

---

## 8. ClimateCheck

Source : https://climatecheck.com/ (consulte le 2026-09-02).

**Ce qu'il fait bien.** Score de risque par propriete (« Free Risk Assessment » propose des la page d'accueil), oriente immobilier et prets. Modeles predictifs d'aleas pour les acteurs de l'immobilier ; positionnement « Climate Risk Data, Reporting and Analytics Solutions ».

**Ce que l'utilisateur doit faire.** Saisir une adresse ; le produit reel est vendu aux professionnels de l'immobilier, l'evaluation gratuite servant d'entree de tunnel. Etats-Unis. Anglais.

**Frictions.** Limite geographique, orientation commerciale, methodologie publique moins detaillee que celle de First Street. **Le detail exact du perimetre gratuit au 2026-09-02 est UNKNOWN** (page a rendu partiel).

**Difference honnete.** Meme forme que nous (une adresse, un score), meilleure granularite sur les Etats-Unis, mais aucune couverture mondiale et un modele economique de lead generation. TERRA/2050 est mondial et sans arriere-pensee commerciale.

---

## 9. XDI — Cross Dependency Initiative

Sources : https://xdi.systems/ (consulte le 2026-09-02) ; https://xdi.systems/xdi-benchmark/ (page archivee, consultee le 2026-09-02).

**Ce qu'il fait bien.** Analyse de risque physique a l'echelle de l'actif, dans plus de 175 pays selon leur page d'accueil. Le « XDI Benchmark » / Gross Domestic Climate Risk est une serie publique et gratuite qui classe des territoires (etats, provinces) selon le risque physique projete sur le bati — un objet de presse tres efficace.

**Ce que l'utilisateur doit faire.** Pour l'analyse reelle : contacter un commercial, signer, payer. Le Benchmark public est un classement fige, pas un outil de recherche. Anglais.

**Frictions.** B2B integral hors publications de communication. Pas de recherche libre de ville, pas d'annee au choix, pas de partage personnalise.

**Difference honnete.** XDI est **meilleur** sur l'ingenierie : ils modelisent la reponse du bati (typologie de structure, defaillance), ce que nous ne faisons pas du tout. Ils s'adressent a un autre client. Nous ne sommes pas en concurrence sur le revenu, mais leurs classements publics occupent le meme espace mediatique que notre image de partage.

---

## 10. Jupiter Intelligence

Source : https://www.jupiterintel.com/ (consulte le 2026-09-02).

**Ce qu'il fait bien.** Un des leaders du risque physique climatique pour les institutions financieres, l'assurance et les grands proprietaires d'actifs. Multi-aleas, resolution fine, chaines de modeles documentees, ensembles multi-modeles CMIP6.

**Ce que l'utilisateur doit faire.** Passer par un cycle de vente. Pas d'acces public. Anglais.

**Frictions.** Aucune version consommateur.

**Difference honnete.** Jupiter est **tres au-dessus** de nous scientifiquement (ensembles multi-modeles, calibration, validation). Il n'existe simplement pas pour un particulier. Notre avantage n'est pas technique, il est d'acces.

---

## 11. ClimSystems

Source : https://www.climsystems.com/ (consulte le 2026-09-02).

**Ce qu'il fait bien.** Services et outils de risque climatique (SimCLIM et derives) pour proprietaires d'actifs dans le monde entier ; adaptation, optimisation d'investissement.

**Ce que l'utilisateur doit faire.** Devis, licence logicielle, competence technique. Anglais.

**Difference honnete.** Meme famille que Jupiter et XDI : conseil et logiciel professionnel. Aucun recouvrement avec un usage grand public.

---

## 12. Google — Flood Hub, Flood Forecasting, Environmental Insights Explorer

Sources : https://sites.research.google/gr/floodforecasting/ (consulte le 2026-09-02) ; https://sites.research.google/floods/ ; https://www.nature.com/articles/s41586-024-07145-1 (Nature, 2024).

**Ce qu'il fait bien.** Flood Hub est gratuit, sans compte, mondial, et donne des previsions de crue fluviale a court terme (jusqu'a 7 jours) avec des modeles d'IA publies dans Nature en 2024, y compris dans des bassins non jauges. Environmental Insights Explorer, lui, publie des donnees d'emissions et de potentiel solaire par ville, gratuitement.

**Ce que l'utilisateur doit faire.** Rien, mais l'horizon est le prochain incident, pas 2050. EIE ne parle pas de risque physique du tout : ce sont des emissions, c'est-a-dire la cause et non la consequence.

**Frictions.** Aucune projection long terme ; aucun score d'habitabilite ; anglais dominant.

**Difference honnete.** Google est **meilleur** sur la prevision operationnelle du risque fluvial immediat, avec des moyens que nous n'aurons jamais. C'est un produit orthogonal au notre : eux repondent « faut-il evacuer jeudi », nous « faut-il rester en 2050 ». Aucun des deux ne remplace l'autre. Attention toutefois : si Google decidait d'etendre Flood Hub a des projections 2050, notre couche inondation fluviale serait immediatement surclassee.

---

## 13. Climate Impact Lab — Climate Impact Map

Sources : https://impactlab.org/ ; https://impactlab.org/map/ (consultes le 2026-09-02) ; Carleton et al., *Quarterly Journal of Economics*, 2022, https://doi.org/10.1093/qje/qjac020 ; Rode et al., *Nature*, 2021, https://doi.org/10.1038/s41586-021-03883-8 ; jeu de donnees GDPCIR sur Microsoft Planetary Computer, Gergel et al. 2024.

**Ce qu'il fait bien.** Carte mondiale gratuite, sans compte, qui affiche par region temperatures moyennes saisonnieres, nombre de jours sous 0 °C, nombre de jours au-dessus de 35 °C, **et surtout des consequences monetisees** : couts de mortalite et couts d'energie. Scenarios SSP2-4.5, SSP3-7.0, SSP5-8.5 avec quantiles et evenements 1-sur-20. Le monde est decoupe en 24 378 regions d'environ 300 000 habitants. Les projections reposent sur un ensemble probabiliste CMIP6 descendu (GDPCIR, methode Quantile Delta Mapping) et pondere par la methode SMME de Rasmussen et al. (2016).

**Ce que l'utilisateur doit faire.** Choisir un indicateur, un scenario, un quantile. Anglais. Regions de 300 000 habitants, donc pas de ville precise. Pas de submersion, pas de feux, pas de crue.

**Frictions.** Vocabulaire economique et statistique ; pas de score unique ; pas de recherche de ville.

**Difference honnete.** C'est, avec Probable Futures, le concurrent qui nous **domine scientifiquement** : ensemble probabiliste pondere, quantiles explicites, effets d'adaptation integres dans les fonctions dommage (ce que nous ne faisons pas du tout). Ils font aussi mieux que nous une chose que nous ne faisons pas : traduire le climat en consequence humaine (deces attribuables). Notre difference : la ville nommee, l'annee au choix, les aleas hydrologiques et le feu, un score unique, le francais.

---

## 14. WRI — Aqueduct Water Risk Atlas et Aqueduct Floods

Sources : https://www.wri.org/aqueduct ; https://www.wri.org/applications/aqueduct/water-risk-atlas/ (consultes le 2026-09-02).

**Ce qu'il fait bien.** Reference mondiale du risque hydrique, gratuite, sans compte, avec donnees telechargeables et API. Indicateurs de stress hydrique de base, de variabilite interannuelle, de secheresse et de risque d'inondation par bassin, avec projections a 2030/2050/2080 sous plusieurs scenarios. Aqueduct Floods estime en plus des dommages attendus et le benefice cout-avantage de protections — c'est-a-dire qu'ils **modelisent l'adaptation**, ce que nous refusons de faire.

**Ce que l'utilisateur doit faire.** Choisir un indicateur, comprendre la difference entre stress hydrique et risque hydrique, lire a l'echelle du bassin versant. Anglais.

**Frictions.** Echelle du bassin, pas de la ville ; vocabulaire technique ; un seul domaine.

**Difference honnete.** Aqueduct est **meilleur que nous sur l'eau**, sans discussion, et il est probablement une source amont que nous devrions citer ou utiliser. Aqueduct Floods est aussi meilleur que nous sur les crues, parce qu'il chiffre les dommages et le role des protections. Notre seul avantage sur ce terrain est l'integration : chez nous le stress hydrique est une composante d'un score, chez eux c'est le produit entier.

---

## 15. Climate-ADAPT (Agence europeenne pour l'environnement)

Source : https://climate-adapt.eea.europa.eu/ (consulte le 2026-09-02) ; fiche outil « Sea Level Projection Tool » : https://climate-adapt.eea.europa.eu/en/metadata/tools/sea-level-projection-tool

**Ce qu'il fait bien.** Portail officiel de l'adaptation en Europe : etudes de cas, politiques, indicateurs, et le European Climate Data Explorer qui expose les indicateurs climatiques europeens. Gratuit, sans compte, adosse a la Commission europeenne et a l'AEE.

**Ce que l'utilisateur doit faire.** Naviguer dans un portail documentaire concu pour des collectivites et des services techniques. Anglais principalement. Perimetre europeen.

**Frictions.** C'est une bibliotheque, pas un outil de reponse. Aucun score.

**Difference honnete.** Climate-ADAPT est **meilleur** sur ce qui manque totalement chez nous : que faire ensuite. Ils documentent l'adaptation, les financements, les retours d'experience. Nous disons le probleme, ils disent le remede.

---

## 16. Berkeley Earth

Source : https://berkeleyearth.org/ (consulte le 2026-09-02).

**Ce qu'il fait bien.** Donnees de temperature de reference, independantes, non gouvernementales et open source, avec bilans mensuels et annuels ; « Synthesis by Berkeley Earth » est desormais en ligne. Autorite forte, gratuite, reutilisable.

**Ce que l'utilisateur doit faire.** Tout, sauf constater le rechauffement observe : Berkeley Earth ne projette pas de risque local a 2050 par ville.

**Difference honnete.** Ce n'est pas un concurrent, c'est une source potentielle de calibration historique. A citer plutot qu'a combattre.

---

## 17. Crowther Lab — « Which city will your city feel like in 2050 » (analogues urbains)

Sources : Bastin J.-F. et al., « Understanding climate change from a global analysis of city analogues », *PLOS ONE*, 2019, https://doi.org/10.1371/journal.pone.0217592 ; correction : https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6795430/

**Ce qu'il fait bien.** L'idee de communication la plus efficace jamais produite sur le climat urbain : « en 2050, Londres aura le climat de Barcelone ». Etude sur **520 grandes villes**, avec ce resultat cite partout : sous RCP 4.5, 77 % des villes connaitront en 2050 un climat plus proche de celui d'une autre ville actuelle que du leur, et 22 % un climat qu'aucune grande ville ne connait aujourd'hui. Gratuit, instantane, viral.

**Ce que l'utilisateur doit faire.** Rien — mais sa ville doit faire partie des 520, l'etude date de 2019 (CMIP5, RCP 4.5), il n'y a qu'une seule annee (2050), un seul scenario, et aucun alea hydrologique, cotier ou de feu. Anglais. **La disponibilite actuelle de l'outil interactif original au 2026-09-02 est UNKNOWN** : la publication est pereenne, le site interactif du Crowther Lab ne l'est pas necessairement.

**Difference honnete.** Notre critere « deplacement climatique » est une reimplementation de cette idee. Ils l'ont eue en premier et ils ont la publication revue par les pairs. Nous sommes **meilleurs** sur trois axes verifiables : 34 099 villes contre 520, CMIP6 SSP3-7.0 contre CMIP5 RCP 4.5, toutes les annees 2026-2050 contre une seule. Mais nous devrions citer Bastin et al. explicitement plutot que laisser croire que l'idee est neuve.

---

## 18. Nouveaux entrants 2025-2026 et objets voisins

**WhereNext** — https://getwherenext.com/ , https://getwherenext.com/rankings/best-climate , https://getwherenext.com/pricing (consultes le 2026-09-02). Fonde en 2025. Plateforme de decision de relocalisation couvrant, selon ses propres metadonnees, 95 pays, 380 villes, 410 articles et 4 149 ecoles internationales. Score « climate comfort » composite fonde sur temperature moyenne, ensoleillement, humidite, amplitude saisonniere. Sources revendiquees : World Bank International Comparison Program, PNUD HDI, Global Peace Index, OCDE PISA, EF English Proficiency Index, Eurostat. Rapports personnalises **a partir de 29 $**. C'est le concurrent le plus proche par l'intention utilisateur (« ou dois-je aller vivre »), mais il ne contient **aucune projection climatique** : c'est du confort climatique actuel plus de la fiscalite et des visas. Nous sommes meilleurs sur le fond physique et sur le futur ; ils sont meilleurs sur la decision de vie complete (visa, impots, ecoles) et ils monetisent.

**Germanwatch Climate Risk Index 2026** — https://www.germanwatch.org/en/cri (consulte le 2026-09-02). Classement de 174 pays selon le bilan humain et economique des evenements extremes **passes**. Retrospectif, national, non comparable a notre objet.

**Washington Post, « How climate risky or resilient is your city? »** — https://www.washingtonpost.com/climate-environment/interactive/2024/climate-risk-resilience-factors-us-cities/ (2024). Score de risque combine (inondation cotiere, inondation continentale, feu, chaleur, secheresse, ouragans) modelise pour 2025, villes americaines. Payant (mur d'abonnement), US, anglais, une seule annee.

**Contenus de classement SEO** — plusieurs pages de type « 25 Most Climate Resilient Cities for 2026 » (everycity.guide) ou « Top 100 Cities by Summer Heat Risk 2026 » (statranker.org) sont apparues dans les resultats du 2026-09-02. Elles annoncent des indices 0-100 ou 0-10 par ville, mais **leur methodologie et leurs sources n'ont pas pu etre verifiees** ; elles sont a traiter comme du contenu editorial, non comme des outils. Elles occupent neanmoins la requete « ville la plus resiliente au climat », ce qui est un probleme d'acquisition pour nous.

**Nature Scientific Reports, 2025** — « The world's largest cities under climate change and their adaptive capacity to rising heat », https://www.nature.com/articles/s41598-025-19954-z. Publication academique recente sur les plus grandes villes et leur capacite d'adaptation a la chaleur. Pas un produit, mais la preuve que le champ « habitabilite urbaine chiffree » est actif et que des equipes mieux dotees peuvent en sortir un outil.

**Ce que je n'ai pas trouve.** Au 2026-09-02, je n'ai identifie **aucun produit gratuit, mondial, sans compte, qui rende un indice unique d'habitabilite physique par ville et par annee jusqu'a 2050 en croisant chaleur, eau, feu, submersion cotiere, crue fluviale et deplacement climatique**. Les briques existent toutes separement et sont souvent meilleures que les notres ; l'assemblage, lui, n'a pas d'equivalent public identifie. Aucune application mobile grand public correspondant a cette description n'a ete trouvee non plus. Cette absence est une conclusion negative de recherche, pas une preuve : un outil non reference ou non anglophone a pu m'echapper.

---

# Les huit questions de differenciation

## 1. Que l'incumbent fait-il faire a l'utilisateur ?

Selon l'incumbent considere, mais toujours au moins une de ces charges :

- **Choisir des parametres scientifiques a sa place** : scenario SSP ou RCP, palier de rechauffement, quantile, jeu d'elevation, periode de reference. Climate Central, IPCC Atlas, C3S Atlas, NASA, Climate Impact Lab imposent tous ce choix, et un mauvais choix change le resultat du tout au tout.
- **Interpreter une carte au lieu de lire une reponse.** Climate Central, Probable Futures, Aqueduct, C3S Atlas rendent une couleur, pas un jugement.
- **Agreger soi-meme plusieurs aleas.** Aucun outil grand public mondial ne combine chaleur, eau, feu, mer et fleuve : il faut ouvrir Probable Futures pour la chaleur, Climate Central pour la mer, Aqueduct pour l'eau, Flood Hub ou JRC pour le fleuve, et faire la somme dans sa tete.
- **Creer un compte et telecharger du NetCDF** (Copernicus CDS), ou **passer par un commercial** (XDI, Jupiter, ClimSystems), ou **payer** (WhereNext a partir de 29 $, Washington Post derriere abonnement).
- **Habiter le bon pays.** First Street / Risk Factor, ClimateCheck, Coastal Risk Finder, Washington Post : Etats-Unis. Climate-ADAPT : Europe.
- **Lire l'anglais.** Aucun des outils recenses n'offre le francais. Climate Central et l'IPCC Atlas offrent l'espagnol.

## 2. Qu'est-ce que le notre elimine ?

Le choix de scenario (SSP3-7.0 assume et affiche), le choix de jeu de donnees, l'agregation manuelle entre six aleas, la lecture de carte, le compte, le paiement, le telechargement, l'attente, la limite geographique, et la barriere de langue pour un francophone. L'utilisateur donne un nom de ville et une annee ; il recoit un nombre et sa justification chiffree.

## 3. Combien d'etapes disparaissent ?

Parcours actuel realiste pour repondre a « ma ville sera-t-elle vivable en 2050 », en assemblant les meilleurs outils gratuits existants :

1. Ouvrir Probable Futures, chercher le lieu, choisir un palier de rechauffement, lire la carte chaleur.
2. Y revenir pour la carte bulbe humide, puis pour la carte secheresse, puis pour la carte jours de danger d'incendie (3 allers-retours).
3. Ouvrir Climate Central, chercher le lieu, choisir annee + scenario + niveau d'eau + jeu d'elevation, lire la tache bleue.
4. Ouvrir Aqueduct, chercher le bassin, choisir l'indicateur et l'horizon 2050, lire le niveau de stress hydrique.
5. Ouvrir une source de crue fluviale (JRC ou Flood Hub) et constater qu'aucune ne projette a 2050 pour le grand public.
6. Convertir des paliers de rechauffement en annee, ce qui n'est pas fait par les outils.
7. Ponderer et synthetiser soi-meme.
8. Recommencer l'ensemble pour chaque ville voisine que l'on veut comparer.

Soit **au moins huit etapes reparties sur trois a cinq sites, sans methode de ponderation disponible**, contre **deux actions** chez nous (chercher la ville, deplacer l'annee). La comparaison avec une ville voisine, qui multiplie le parcours ci-dessus par le nombre de villes, devient chez nous un deuxieme clic.

## 4. Quelle expertise disparait ?

Savoir ce qu'est un SSP et pourquoi SSP3-7.0 plutot que SSP2-4.5. Savoir qu'un MNT global standard (SRTM, Copernicus DEM) mesure le sommet de la canopee et des toits et surestime donc l'altitude du sol, et qu'il faut un MNT sol nu comme FABDEM. Savoir ce qu'est une maree de tempete de periode de retour donnee, une crue centennale, un taux de subsidence (VLM). Savoir agreger des aleas heterogenes en une echelle commune. Savoir manipuler du NetCDF. Rien de tout cela n'est demande a l'utilisateur.

## 5. Quelle attente disparait ?

La file de traitement du Copernicus CDS et le telechargement de plusieurs gigaoctets. Le cycle de vente de XDI, Jupiter ou ClimSystems (semaines). Le delai de production d'un rapport paye (WhereNext annonce un livrable personnalise en quelques minutes, mais apres paiement). Chez nous, le calcul est precalcule et servi statiquement : la reponse est immediate et fonctionne sans backend.

## 6. Quelle incertitude disparait ?

Attention, ici il faut etre precis, parce que la reponse honnete est ambivalente.

**Ce qui disparait :** l'incertitude *de procedure*. L'utilisateur ne se demande plus s'il a choisi le bon scenario, la bonne carte, le bon seuil, ni si son assemblage maison de quatre outils a un sens. Le chiffre affiche et la note affichee viennent de la meme mesure, et chaque composante expose sa source.

**Ce qui ne disparait pas, et que nous ajoutons meme :** l'incertitude *scientifique*. En figeant un seul modele (MPI-ESM1-2-HR) et un seul scenario (SSP3-7.0), nous supprimons l'affichage de la dispersion inter-modeles que l'IPCC Atlas, le C3S Atlas et Climate Impact Lab, eux, montrent. Nous rendons l'utilisateur plus confiant sans le rendre mieux informe sur la marge d'erreur. C'est le prix explicite du score unique et il doit etre dit dans le produit.

## 7. Quels outils auparavant separes deviennent un seul flux ?

Chaleur (Probable Futures / C3S Atlas / Climate Impact Lab) + eau (WRI Aqueduct) + feu (Probable Futures, jours de danger d'incendie) + submersion cotiere (Climate Central + NASA AR6) + crue fluviale (JRC / Aqueduct Floods) + analogue climatique (Crowther Lab 2019) + demographie (ONU). Sept familles de sources, cinq a sept interfaces, deviennent une recherche de ville et un curseur d'annee.

## 8. Qu'est-ce qui devient possible et qui ne l'etait pas ?

- **Balayer une trajectoire annee par annee de 2026 a 2050** au lieu de comparer deux ou trois paliers figes. Aucun outil grand public recense ne fait cela sur plusieurs aleas.
- **Classer les villes voisines** et repondre a « ou est-ce mieux a 200 km », question que ni Probable Futures, ni Climate Central, ni Aqueduct ne peuvent traiter puisqu'ils n'ont pas de score comparable.
- **Couvrir 34 099 villes** la ou l'idee la plus virale du domaine (Crowther Lab) en couvrait 520 et Picturing Our Future quelques centaines.
- **Partager un resultat personnel** sans compte et sans paiement, ce que seuls Picturing Our Future (liste fermee) et l'ex-Risk Factor (US, et desormais redirige) permettaient.
- **Poser la question en francais**, ce qu'aucun outil recense ne permet.

---

# VERDICT

Un avantage defendable existe, mais il est etroit et il n'est pas scientifique : c'est **l'assemblage**. Chacune de nos six couches est faite mieux ailleurs — la mer par Climate Central et la NASA, l'eau par WRI Aqueduct, la chaleur par Probable Futures et Climate Impact Lab, l'analogue climatique par Bastin et al. 2019, la parcelle par First Street. Aucun acteur, au 2 septembre 2026, ne rend un indice unique 0-100 par ville, par annee, mondial, gratuit, sans compte, en francais, avec ses sources affichees.

Cet avantage est fragile de trois facons : il est faible en barriere technique (Probable Futures publie deja une API mondiale qui permettrait a un tiers de construire le meme score en quelques jours), il depend d'un vide de marche qui vient de s'ouvrir plutot que d'un actif que nous detenons, et il repose sur un choix — le score unique — que les acteurs les plus serieux du domaine refusent deliberement de faire pour des raisons scientifiques valables.

Le seul fosse durable est donc **produit, pas donnee** : la vitesse de reponse, la comparaison des villes voisines, l'objet de partage et la langue. Si nous nous defendons en invoquant la qualite des donnees, nous perdons contre a peu pres tous les noms de ce document.

---

# WEAKNESSES WE SHOULD ADMIT

1. **Un seul modele climatique.** MPI-ESM1-2-HR seul, sans ensemble ni ponderation. L'IPCC Atlas, le C3S Atlas et Climate Impact Lab (ensemble probabiliste pondere SMME sur CMIP6, methode Rasmussen et al. 2016) exposent tous la dispersion inter-modeles. Nous affichons un chiffre unique la ou la science affiche une fourchette. C'est notre faiblesse la plus grave et la plus facile a attaquer.
2. **Un seul scenario.** SSP3-7.0 uniquement. Aucune comparaison avec SSP1-2.6 ou SSP5-8.5, donc aucune reponse a « et si on reduisait les emissions », qui est precisement le message de Probable Futures et de Picturing Our Future.
3. **Descente d'echelle statistique, pas dynamique.** WorldClim 2.1 est une interpolation ; Probable Futures utilise des modeles regionaux dynamiques (REMO2015, RegCM4 via CORDEX-CORE) et Climate Impact Lab un bias-correction/downscaling documente (GDPCIR, Quantile Delta Mapping). Notre chaine est plus simple et moins validee.
4. **Aucune modelisation de l'adaptation.** Nous ne comptons pas les digues, ce que nous annoncons — mais Climate Central le fait aussi, et WRI Aqueduct Floods va plus loin en chiffrant le benefice cout-avantage des protections, tandis que Climate Impact Lab integre l'adaptation dans ses fonctions dommage. Notre « non-comptage » n'est donc ni une originalite ni un choix superieur : c'est une simplification.
5. **Resolution.** Une ville est un point ou une agglomeration, pas un batiment. First Street modelise la propriete individuelle sur plus de 2,4 milliards de structures (annonce MSCI, juin 2026) ; nous ne pouvons rien dire de la difference entre deux quartiers d'une meme ville, alors que c'est souvent la que se joue le risque d'inondation.
6. **Pas de couche d'exposition ni de vulnerabilite.** Nous mesurons l'alea physique. Nous ne disons pas combien de personnes, de logements ou d'hopitaux sont concernes (Coastal Risk Finder le fait), ni combien de deces ou de couts en decoulent (Climate Impact Lab, Carleton et al. 2022).
7. **Pas de conseil d'action.** Climate-ADAPT et le Coastal Risk Finder proposent des solutions d'adaptation locales. Nous nous arretons au diagnostic.
8. **Pas de validation independante ni de publication.** Nos ponderations entre six criteres sont un choix editorial non revu par les pairs. Bastin et al. 2019, Carleton et al. 2022, Rode et al. 2021 et les travaux de Climate Central sont publies et critiquables. Nous ne le sommes pas.
9. **Aleas manquants.** Vent et cyclones tropicaux, qualite de l'air, salinisation des nappes, glissements de terrain, gel et degel du permafrost. First Street couvre le vent ; Climate Central publie un Tropical Cyclone Climate Shift Index.
10. **Langues.** FR/EN seulement. Climate Central et l'IPCC Atlas couvrent l'espagnol, qui pese plus lourd que le francais sur les littoraux exposes d'Amerique latine.
11. **Absence de mise a jour continue.** Nos donnees sont figees a une version des jeux sources ; Climate Central, Copernicus et Climate Impact Lab republient regulierement. Le jour ou CMIP7 arrive (scenarios deja en preparation, cf. Carbon Brief), notre socle vieillit d'un coup.

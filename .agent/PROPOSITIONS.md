# Deux propositions, écrites et non construites

Rien ici n'est implémenté. Le protocole veut qu'une idée ambitieuse soit
écrite avec ses sept pièces, puis construite seulement après un accord
explicite de Robin. Zéro proposition est une réponse valable : il y en a deux
parce que les deux tiennent, pas pour remplir la case.

---

## 1. RETRAIT — la question inverse en premier écran

Aujourd'hui on cherche une ville et on apprend qu'elle décline. La ligne
« Plus habitable, à proximité » est la seule réponse actionnable du produit,
et elle est en bas de la fiche, après six critères et un paragraphe de
sources. La proposition retire des étapes : poser la question inverse
directement, « où, autour de moi, reste-t-il vivable », sans chercher d'abord
une ville qu'on sait condamnée.

1. **PREUVE** — WhereNext (fondé en 2025, https://getwherenext.com/pricing,
   consulté le 2026-09-02) vend exactement cette intention, « où dois-je aller
   vivre », **à partir de 29 $ par rapport**. Un produit payant sur cette
   question est la meilleure preuve de demande qu'on puisse avoir. Ce que je
   n'ai pas : une plainte d'utilisateur citée mot pour mot. Sur ce point précis,
   AUCUNE PREUVE DIRECTE — l'existence d'un concurrent payant n'est pas la même
   chose qu'une demande observée chez nos visiteurs.
2. **ANTÉRIORITÉ** — WhereNext le fait, et le fait mal pour notre sujet : son
   score de confort climatique n'a **aucune projection** ; c'est le climat
   d'aujourd'hui plus des visas et de la fiscalité. First Street proposait la
   comparaison d'adresses, il est passé derrière le mur MSCI le 3 août 2026.
   Personne ne rend la question inverse gratuite, mondiale et projetée à 2050.
3. **POURQUOI PERSONNE** — parce que cela demande un indice unique par ville,
   et que les acteurs sérieux du domaine refusent délibérément de réduire six
   aléas à un chiffre. Nous l'avons déjà fait et nous l'assumons dans
   l'interface. Le coût d'entrée est donc déjà payé chez nous, pas chez eux.
4. **TEST LE PLUS MINCE** — une seule ligne ajoutée sous le champ de recherche
   au repos : « ou montrez-moi ce qui tient, autour de moi ». Elle utilise la
   géolocalisation déjà en place et le calcul de villes voisines déjà écrit
   (`dossier-ailleurs`). Si personne ne clique, c'est réglé.
5. **RAYON D'ACTION** — `index.html` : le bloc de recherche, la fonction des
   alternatives, deux clés de dictionnaire. `terra-menus.css` : une règle.
   Rien dans `data/`, rien dans le pipeline.
6. **COÛT DE FONCTIONNEMENT** — nul. Tout est déjà calculé et servi
   statiquement, aucune requête supplémentaire, aucun backend.
7. **CRITÈRE D'ABANDON** — moins de 3 % des sessions utilisent l'entrée
   inverse après un mois : on la retire.

---

## 2. Le prix du chiffre, dit à voix haute

L'indice est un chiffre unique là où la science affiche une fourchette. C'est
la faiblesse la plus facile à attaquer (un seul modèle, un seul scénario) et
elle est aujourd'hui reléguée dans la ligne des sources, en 8 px.

1. **PREUVE** — l'IPCC Interactive Atlas, le C3S Atlas et Climate Impact Lab
   exposent tous la dispersion inter-modèles ; c'est un standard du domaine,
   documenté dans `.agent/PRODUCT-BENCHMARK.md`. Ce n'est pas une demande
   d'utilisateur : AUCUNE PREUVE d'une plainte de visiteur. C'est une exigence
   de crédibilité face à quiconque connaît le sujet, et le premier reproche
   qu'un journaliste ou un scientifique nous fera.
2. **ANTÉRIORITÉ** — Probable Futures affiche des fourchettes et le fait bien.
   Ils échouent ailleurs : pas d'indice unique, pas de comparaison de villes
   voisines, pas d'objet de partage.
3. **POURQUOI PERSONNE** — ceux qui affichent la fourchette renoncent au
   chiffre unique, et ceux qui donnent un chiffre unique cachent la fourchette.
   Faire les deux demande d'assumer les deux publics dans la même fiche.
4. **TEST LE PLUS MINCE** — une phrase sous le score : « un modèle, un
   scénario d'émissions élevées ; d'autres modèles donneraient ±N points ».
   Le N demande un second modèle CMIP6 dans le pipeline, donc c'est un travail
   de la session « Terra/2050 », pas du mien. Sans ce chiffre, la phrase peut
   déjà dire la limite sans la quantifier.
5. **RAYON D'ACTION** — `index.html` pour la phrase ; `tools/pipeline.py` et
   `data/` pour le ±N, soit le périmètre de l'autre session.
6. **COÛT DE FONCTIONNEMENT** — nul à l'exécution. Le coût est en calcul
   hors ligne : un second modèle CMIP6, des dizaines de Go à retraiter.
7. **CRITÈRE D'ABANDON** — si la phrase fait fuir plus qu'elle ne rassure,
   c'est-à-dire si le taux de partage baisse après sa mise en ligne.

---

## Ce que je n'ai pas proposé, et pourquoi

Les preuves manquaient. Un mode sombre, une visite guidée, des badges, un
assistant conversationnel : ce sont les idées qu'on propose quand on n'a pas
d'observation. Le produit est déjà sombre, la première minute se comprend
sans explication, et personne n'a demandé à collectionner quoi que ce soit.

Une carte de lien par ville, aussi : elle vendrait mieux chaque partage, mais
un fragment d'URL n'est jamais envoyé au serveur, et 34 099 pages
pré-rendues ne sont pas une réponse. Il faudrait un backend, ce qui détruirait
la propriété la plus solide du produit — il tient sur un hébergement statique
gratuit et répond instantanément.

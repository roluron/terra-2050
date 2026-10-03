# Vérifications navigateur des données

Le script `tools/qa/data-integrity-ui.mjs` compare les infobulles aux champs binaires livrés, décodés et interpolés par un oracle indépendant des lecteurs utilisés par l'interface. Il contrôle les sept filtres, les modes valeur/évolution, les années 2026, 2028, 2030, 2040 et 2050 et deux coordonnées de test (Hô Chi Minh-Ville et Papouasie-Nouvelle-Guinée).

Les preuves proviennent de plusieurs exécutions. Ce dossier ne revendique pas une exécution complète unique de trois profils.

| Profil | États numériques | États localisés | Preuve |
| --- | ---: | ---: | --- |
| Desktop, 1280 × 800 | 140 | 112 | Profil complet réussi : `desktop-pass.log`, `desktop-real-pointer.png`. Le log est l'extrait des lignes PASS de l'exécution initiale. |
| Mobile, 393 × 852 | 140 | 112 | Profil complet réussi : `mobile-pass.log`, `mobile-results.json`, `mobile-real-pointer.png`. |
| Compact, 320 × 568 | 140 | 112 | Matrices/locales réussies : `compact-matrix-pass.log`, `compact-matrix-counts.json`. Interaction native validée ensuite séparément : `compact-pointer-pass.log`, `compact-pointer-results.json`, `compact-real-pointer.png`. Aucun rerun compact complet après correction du point de test n'est revendiqué. |

Total des états distincts vérifiés : **420 numériques et 336 localisés**, dans huit langues. Chaque matrice contrôle aussi la compilation WebGL et les deux textures température/précipitation utilisées pour l'aridité. Les cas couvrent la maille locale, les unités d'inondation en %/points de pourcentage, la référence 2026, l'absence de repli sur un score global sous filtre actif, NoData différent de zéro, les petits changements non arrondis à zéro, l'invalidation du cache entre deux mailles d'un même pays et l'actualisation d'une infobulle épinglée quand l'année change.

Le profil mobile complet enregistre **25 contrôles** du menu ouvert au-dessus d'une infobulle épinglée : infobulle masquée et non interactive pendant le choix, état épinglé préservé, retour après choix de filtre/mode. Les notices d'introduction et de score sont visibles et contenues horizontalement ; les captures compactes montrent leur lecture après défilement. L'introduction n'est donc pas présentée comme entièrement visible sans défilement à 320 px.

L'action native finale à 320 px a d'abord touché une étiquette de ville proche ; ce constat est conservé dans `TOUCH-TARGET.md`. La vérification courte suivante utilise une zone rurale chinoise, à une distance caméra normale de 2,4 (bornes de l'application : 1,45–6,4), éloignée des rectangles cliquables. Les événements natifs ciblent réellement le canvas. La lecture correspond à ses coordonnées raycast : **+0,04 points de pourcentage**, **2026 : 0,47 % → 2050 : 0,51 %**. Aucun chiffre attendu ni comportement produit n'a été modifié pour obtenir cette passe.

La vérification courte arrête uniquement la boucle de rendu/caméra avant cette dernière entrée de coordonnées, afin de garder la cible stable, puis rend explicitement une image et attend le fondu CSS de l'infobulle. Les matrices et contrôles shader précédents utilisent la boucle normale. Le hook est injecté par Playwright dans la réponse HTML ; aucun hook de test n'est livré dans `index.html`.

Commandes reproductibles, avec un serveur statique sur le port 8080 :

```sh
QA_CHROMIUM_PATH=/usr/bin/chromium URL0=http://localhost:8080/ node tools/qa/data-integrity-ui.mjs
QA_CHROMIUM_PATH=/usr/bin/chromium QA_PROFILE=compact QA_POINTER_ONLY=1 URL0=http://localhost:8080/ node tools/qa/data-integrity-ui.mjs
```

`QA_PROFILES=mobile,compact` sélectionne plusieurs profils. `QA_SORTIE` redirige les fichiers dans son sous-dossier `data-integrity-ui`. `QA_POINTER_ONLY=1` vérifie uniquement les interactions natives et notices, et rapporte explicitement zéro état numérique/localisé rejoué.

Limites : Chromium avec émulation mobile et SwiftShader ; aucun iPhone physique ni Safari n'a été testé. Les attentes numériques proviennent des champs livrés, pas d'une nouvelle acquisition des TIFF WRI. Ces contrôles établissent la cohérence entre données et interface, pas la justesse physique de toute projection. La matrice CI héritée complète n'est pas déclarée verte par cette vérification ciblée.

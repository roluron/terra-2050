CURRENT GOAL: lancement sans bug (voir GOAL.md)

WHAT WORKS (verifie 2026-09-02, Playwright, site public inclus)
- Matrice de lancement 25/25 : desktop 1280x720 et 1440x900, iPhone 15 Pro portrait
  et paysage, iPad Pro 11, prefers-reduced-motion, panne de donnees (places.json 404),
  WebGL absent, spam de clics, duel par lien et par choix, clavier sur la timeline,
  son et langue memorises.
- Salle blanche : clone frais du depot, 33 references verifiees, aucune manquante.
- Perf : 120 fps (plafond vsync) avec les 7 calques en 2050, 0 longue tache, y compris
  CPU divise par 4 en emulation telephone. Pret en 3,5 s dans ces conditions.
- Reseau : chemin critique 840 Ko (etait 6,5 Mo). Bouton Explorer en 11,2 s a
  700 kb/s, 5,2 s sur 4G faible, 2,7 s sur 4G moyenne, 1,0 s en wifi — le meme
  chiffre sur telephone, tablette et bureau, Retina ou non. Tout le reste
  (annuaire, grilles de calques, fleuves, sons, texture fine) arrive apres.
- Partage : feuille native, presse-papiers de secours, story preparee avant le clic,
  favicon / apple-touch-icon / manifest / OG / Twitter servis en 200.

WHAT DOES NOT / NON VERIFIE
- La feuille de partage reelle d iOS (Instagram Stories) et l icone sur l ecran
  d accueil : impossibles a tester sans un vrai iPhone.
- Un seul modele climatique et un seul scenario : faiblesse de fond, assumee et
  affichee, pas corrigeable ici (voir PRODUCT-BENCHMARK.md, section WEAKNESSES).

LAST VERIFIED STATE: 0e6ffc4 pousse sur main et deploye
NEXT ACTION: attendre la 8e passe du verificateur independant
RELECTURES: 7 passes d un agent a contexte neuf + 2 passes Antigravity (autre
modele). 14 + 3 + 9 + 7 + 6 + 8 + 6 + 5 defauts trouves, tous traites. Les
deux plus instructifs : un differe de chargement annonce que le code ne
faisait pas (deux `.then()` en portee de module l appelaient a l analyse), et
un chiffre que j ai defendu a tort — 17 s etait le chemin de BUREAU, 11 le
chemin telephone, les deux mesures etaient justes. Les plus graves : odometre
de l annee bloque sur 2026 pendant le balayage, retour arriere qui quittait le
site (deux fois, la seconde parce que mon premier correctif effaçait l entree
au clic dans le champ), double-tap qui refermait le composeur de story.
COORDINATION: la session « Terra/2050 » partage le MEME dossier de travail. Partage
acte : elle = data/ + tools/pipeline.py ; moi = index.html, terra-menus.css, assets/,
.agent/. Commits toujours avec `git commit -- <fichiers>`. La session « Japan map »
travaille dans un depot frere (terra-japan), aucun conflit ; JAPAN-PLAN.md traine
non suivi a la racine, sans effet sur le site.

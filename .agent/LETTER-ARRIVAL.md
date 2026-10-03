# Dévoilement de la lettre — 2026-09-30

Base publiée : 852d273.

Le délai de protection de 1 seconde expirait avant la fin de l'apparition
des lignes (la signature termine à environ 7,2 secondes). Le survol pouvait
alors dévoiler des mots pendant leur arrivée ; toucher et focus contournaient
aussi ce délai.

Le dévoilement attend désormais les animations `earth-arrive` des quatre lignes.
Survol, proximité du pointeur, toucher, focus et clavier passent par le même
verrou. Les mots deviennent accessibles au clavier à la fin de cette attente.
Une souris déjà posée doit bouger de nouveau ; aucune révélation automatique
n'a lieu à l'ouverture du verrou. Les animations annulées d'une ancienne langue
ne peuvent pas ouvrir le verrou d'une nouvelle lettre. Les animations réduites
permettent une activation immédiate, y compris si la préférence change en cours.

Validation Chromium système : `tools/qa/letter-arrival.mjs`, desktop, téléphone
simulé et 320×568 avec animations réduites. Interactions prématurées bloquées,
reconstruction de langue protégée, opacité de toutes les lignes à 1, pointeur
immobile, nouvelle interaction, dévoilement complet et entrée dans le globe
vérifiés. Changement de préférence d'animation vérifié séparément, puis ajouté
à la suite. Log : `/tmp/terra-letter-arrival.log`.

Vérifications syntaxiques et `git diff --check` passées. Les autres helpers QA
attendent maintenant l'ouverture du verrou avant de dévoiler les mots.
Safari matériel non testé.

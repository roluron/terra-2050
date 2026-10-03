# Cible tactile près d'une étiquette — constat conservé

Pendant la reproduction courte à 320 × 568 sous Chromium, le point prévu était **(148, 220)**. Juste avant l'entrée, `document.elementFromPoint` renvoyait `canvas#scene`. Le viewport visuel avait une échelle de 1 et des offsets de 0 ; `scrollY` était 0.

Les événements natifs `pointerdown` et `pointerup` ont pourtant été dirigés vers le bouton `.etiquette` **Shanghai**. Son rectangle mesuré était : gauche **153,578125**, haut **182,10000610351562**, largeur **76,84375**, hauteur **44**. Le point était donc environ **5,58 px** à gauche de ce bouton. Les deux événements étaient séparés d'environ **0,1 ms** : le seuil de durée de 500 ms de l'application n'explique pas ce résultat.

Ces observations sont transcrites du diagnostic court enregistré le 1 octobre 2026. Elles correspondent à l'ajustement tactile du navigateur vers une cible cliquable proche. Le clic ouvre alors légitimement la fiche de la ville ; il ne s'agit pas d'une erreur de valeur d'inondation. Le test précédent attendait une infobulle de pays et n'avait donc pas choisi une zone suffisamment libre pour un doigt.

Le hook de test recherche désormais des coordonnées entières éloignées de 32 px des rectangles cliquables. Pour la dernière lecture native, il rapproche la caméra d'une région rurale chinoise (35°N, 95°E ; distance 2,4, à l'intérieur des bornes normales de l'application). La passe distincte est conservée dans `compact-pointer-results.json` : les deux événements ciblent `scene`, les coordonnées raycast sont celles du point réellement touché et la valeur vérifiée est +0,04 points de pourcentage.

Aucun fichier produit ni règle de hit-test du site n'a été modifié pour ce constat. Il concerne cette émulation Chromium ; ce dossier ne l'extrapole pas à Safari/iOS. Les anciennes captures d'échec sans ce contexte ne sont pas retenues comme preuves finales.

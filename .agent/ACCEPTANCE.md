Chaque case cochée a sa preuve brute dans EVIDENCE.md. Les mesures sont faites
sur le site public autant que possible, pas seulement en local.

[x] Golden path desktop (Chromium 1440×900 et 1280×720) : voile → Explorer → recherche → fiche → 2050 → partage → story → calques → langue → lien profond, zéro erreur console, zéro 404
[x] Golden path iPhone (WebKit iPhone 15 Pro portrait ET paysage) idem, aucune cible tactile < 44 px, aucun débordement horizontal, aucun chevauchement chrome/wordmark
[x] iPad (WebKit) : chrome et fiche lisibles
[x] Duel : lien avec vs/vc ouvre les deux villes ; lien simple → invitation → choisir une 2e ville ouvre le duel
[x] Timeline au clavier (flèches, Home/End) met à jour fiche, année, lien
[x] Réglages : son off mémorisé après rechargement ; langue mémorisée ; tout le chrome traduit (aria inclus)
[x] Reduced-motion : entrée sans animation bloquante, chrome visible
[x] Panne données (places.json 404) : voile s'ouvre, globe utilisable, recherche vide, aucune exception, une erreur console explicite nommant le fichier
[x] WebGL absent : #secours visible, bilingue
[x] Actions rapides répétées (double clic Explorer, spam calques, spam partage, double-tap story) : aucune erreur, aucun état incohérent
[x] Cartes de lien : og/twitter/favicon/apple-touch-icon/manifest servis en 200 sur roluron.github.io
[x] Retour arrière du navigateur ferme la fiche au lieu de quitter le site ; Suivant la rouvre ; un rechargement n'empile pas d'entrées
[x] Composeur de story : croix de fermeture, options au clavier, double-tap sans fermeture, tout visible sans défiler de l'iPhone SE au bureau 1440×500
[x] Voile d'entrée : la tabulation n'atteint pas le chrome derrière
[x] Odomètre de l'année cohérent avec la timeline pendant le balayage automatique
[x] Contraste AA sur les lignes de sources, de coordonnées et sur le rail des calques (mesuré à l'écran)
[x] Textures WebP avec repli JPEG/PNG vérifié : globe peint même sans WebP
[x] Chemin critique tenu : bouton Explorer en moins de 5 s sur 4G moyenne, mesuré sur le site public
[x] Navigateur intégré (Instagram) avec stockage bloqué : rien ne casse
[x] Salle blanche : clone frais, toutes les références présentes
[x] Le dépôt se relit seul : README avec formats de données, limites assumées, stratégie de chargement
[x] Registre ~/.claude/REQUESTS.md à jour (fichier global, hors dépôt), .agent/STATE.md et .agent/EVIDENCE.md à jour
[ ] Vérificateur indépendant : PASS (4e passe en cours ; 33 défauts trouvés et corrigés sur les 3 premières)

NON VÉRIFIABLE ICI, à faire sur un vrai iPhone :
- la feuille de partage iOS vers Instagram Stories
- l'icône et le lancement en mode « écran d'accueil »

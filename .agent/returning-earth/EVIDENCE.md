2026-10-08, MacBook macOS, Node 24.8.0, Playwright 1.58.2. Chromium desktop 1440×900, WebKit iPhone 15 Pro portrait/paysage, Chromium mouvement réduit.

Runtime SHA-256, identiques à la revue indépendante et au checkout propre de publication sur origin/main 909efe3 :
- earth-letter.js : 12755764b6adfc4d6337635e05809f8600158fa1a48156632752dc8cb17aef62
- earth-orb.mjs : 13714eef29d8cf7bf72fbfa5f0178cb8091be055d4f78136518f6fbafffda7a7
- index.html : c3c4b27d4446a0ae6f1f4d2649b0a9ea79933130d61abfcc35f65a64405d4426

Artifacts : ../../../../captures/returning-earth-2026-10-08/.
- before/desktop.json : baseline, 405991 dessins de particules pendant le retour. Captures loading/failure inspectées ; échec du serveur Python par reset réseau distingué du comportement produit.
- final/{desktop,phone,landscape,reduced}.json et globe-2.png : trois visites par format, zéro dessin du canvas de particules, zéro erreur actuelle, readiness et fondu monotone, lien Paris/2050. Captures desktop, portrait et paysage inspectées. Première visite : lettre, transformation et marqueur localStorage conservés.
- review/REVIEW.md et adversarial.json : revue fraîche indépendante PASS, retards earth-letter.js 2400 ms et earth-surface.mjs 2200 ms, redimensionnements portrait/paysage, fermeture unique ; fondu observé 600–609 ms. Aucun flash du boot pixelisé au retour. Revue du même modèle familial : vérification indépendante par agent, pas corroboration entre familles.
- npm ci --ignore-scripts passe dans /tmp/terra-returning-earth-release. Serve lancé avec dépendances propres ; application statique, pas de compilation. Huit contrôles `python3 tools/check.py` passent ; logs /private/var/folders/by/80nlk76x7mq72j31kn6ck9_00000gn/T/terra-check-ym_6ddoj/.
- intro.mjs : harnais réparé (stub matchMedia et injection du probe dans le module principal). L'assertion historique de sept filtres échelonnés échoue avant et après sur le site public antérieur et le checkout corrigé : mêmes sept temps identiques, 11617.9 ms baseline / 11622.2 ms correction. Cette attente historique ne correspond pas au menu de filtres actuel ; aucune assertion affaiblie, comportement de première visite conservé et vérifié séparément.

Routes modèles découvertes à l'exécution : codex, Gemini0.54.4, Claude2.1.280, Kimi0.34.0, Cursor2026.08.04. Claude direct non authentifié. Gemini OAuth configuré, catalogue/entitlement non vérifiés. Cursor authentifié et catalogue exact consulté (OpenAI, Anthropic, Google, xAI) ; coût marginal UNKNOWN, aucune requête payante lancée. Aucune génération d'asset nécessaire.

Navigation arrière testée par revue, globe et année fonctionnent ; pageshow.persisted=false, restauration BFCache non observée. iPhone physique non vérifié. Annulations des fetchs de l'ancien document à un reload immédiat distinguées des erreurs actuelles ; la matrice attend networkidle avant chaque reload sans filtrer les erreurs.

Publication et parcours live : en cours.

2026-10-01: timeline ajustée aux contours du premier et du dernier chiffre de l’année (base ed6dd56), plutôt qu’à son conteneur. Mesure fractionnaire, approches typographiques exclues, zone de glissement et recalage fiche ville synchronisés. Contrôles ciblés passés sur desktop, deux formats mobiles simulés et paysage, avec dix chiffres finaux, clavier/toucher et aller-retour fiche ville. Captures inspectées. Voir DOCK-LAYOUT.md. Publication via main selon la préférence de l’utilisateur.

2026-09-30: pilule filtres ajustée à la largeur du texte et du chevron (base ebc2531), espacement 12px et hauteur 46px, zone tactile 44px. Libellés des huit langues, ouverture/fermeture du menu, sélection et alignement timeline vérifiés sur desktop, deux formats mobiles simulés et paysage. Captures inspectées. Voir DOCK-LAYOUT.md. Publication via main selon la préférence de l’utilisateur.

2026-09-30: effet irisé/déformation du logo supprimé, barre bleue conservée ; timeline desktop placée en bas à droite (base d2c31bd). Largeur, espacement et alignement filtres conservés. Vérifications ciblées passées sur desktop, deux formats mobiles simulés et paysage : logo immobile, géométrie, clavier/toucher et aller-retour fiche ville. Captures inspectées. Voir DOCK-LAYOUT.md. Publication via main selon la préférence de l’utilisateur.

2026-09-30: graduations de la timeline élargies à 100% du bloc année sur le globe (base d60c3cd). Zone de glissement alignée sur toute cette largeur. Géométrie, alignement filtres, espacement, clavier et toucher vérifiés sur desktop et deux formats mobiles simulés ; captures inspectées. Voir DOCK-LAYOUT.md. Publication via main selon la préférence de l’utilisateur.

2026-09-30: dévoilement de la lettre bloqué jusqu'à la fin réelle de toutes les animations d'apparition (base 852d273). Survol, toucher, focus et clavier protégés ; souris immobile inactive jusqu'au prochain mouvement. Suite dédiée passée sur desktop, téléphone simulé et animations réduites, avec reconstruction de langue et entrée au globe ; changement de préférence d'animation vérifié. Voir LETTER-ARRIVAL.md. Publication via main selon la préférence de l’utilisateur.

2026-09-30: pilule mobile affinée et timeline alignée au bas des filtres (base 1c44c0f). Année/graduation rapprochées, zone tactile 44px conservée. Voir DOCK-LAYOUT.md. Suite feedback passée sur desktop, téléphone, compact et tablette simulés ; captures desktop/mobile inspectées. Publication via main selon la préférence de l’utilisateur.

2026-09-30: loupe rétablie sur smartphone dans le contrôle de recherche unique (base 16cce74). Bouton tactile 48px, portrait/paysage, libellé accessible traduit ; texte conservé sur desktop. Suite feedback passée sur desktop, téléphone et compact simulés, avec vérification de l'icône après rotation et des traductions desktop. Voir UNIFIED-SEARCH.md et /tmp/terra-mobile-search-icon-*.log. Publication via main selon la préférence de l’utilisateur.

2026-09-30: recherche placée à gauche de l'engrenage, à 16px et sur la même ligne (base a61f5c8). Ouverture vers la gauche ; formats compacts préservent le logo et les commandes. Suite feedback passée sur desktop, téléphone, compact et tablette simulés ; géométrie des huit traductions vérifiée à 1280/393/320px. Voir UNIFIED-SEARCH.md et /tmp/terra-search-gear-*.log. Publication via main selon la préférence de l’utilisateur.

2026-09-30: le titre et la langue du sélecteur suivent la sélection au clavier avant confirmation (base 2a78404). Navigation des huit langues, quatre flèches, bouclage, Entrée/Espace, clic, réouverture et absence de changement de langue/URL/préférence avant confirmation vérifiés par language-click.mjs sur Chromium desktop et téléphone simulé. Log : /tmp/terra-language-preview.log. Schémas de traduction vérifiés. Publication via main selon la préférence de l’utilisateur ; Safari réel non vérifié.

2026-09-30: recherche unifiée sur la base publiée b9b7589. Voir UNIFIED-SEARCH.md : invitation transformée en barre au même endroit, loupe retirée, ajustement de l'en-tête dans la fiche mobile. Suite feedback passée sur desktop, téléphone, compact et tablette simulés. Publication via main selon la préférence de l’utilisateur.

2026-09-30: suivi souris corrigé sur la base publiée a894bbc. Voir POINTER-PERFORMANCE.md : position immédiate, transform composité, moins de recalculs de mise en page, cache des infobulles. Publication via main selon la préférence de l’utilisateur. Safari sur appareil réel non vérifié.

2026-09-30: retours Canva corrigés et vérifiés localement sur la base 869154f. Voir FEEDBACK.md. Aperçu : port 8080. Suite dédiée passée sur Chromium desktop et trois formats tactiles en émulation ; suite refinement passée sur desktop. Publication GitHub Pages demandée par l’utilisateur via main. Safari sur appareil réel non vérifié.

Current design pass 2026-09-17 COMPLETE locally: PREMIUM.md. Preview8088, baseline6d471a7, final source hashes and observed tests in PREMIUM.md. No publication. Older state below is historical.

Latest follow-up VERIFIED: animated risk overlays, pointer/center label focus and bottom-leftbeta/contactnotice onruntime7b2b494. See motion/EVIDENCE.md. Local8087; data/publicrelease/physicalgatesunchanged.

Latest UI follow-up: VERIFIED dark glass compact panel on runtimed74b298.
See glass/STATE.md and glass/EVIDENCE.md. Local8087; publication and other gates unchanged.

Current climate follow-up: local UI and structural audit VERIFIED on runtime75fc3ec.
See climate/STATE.md and climate/EVIDENCE.md. Scientific accuracy remains UNVERIFIED
because current generators/manifests and per-hazard provenance flags are unavailable.
Local8087 updated; public deployment and physical gates below unchanged.

Current local design follow-up: VERIFIED panel redesign on branch design/place-panel,
runtime9129b5b. See panel/STATE.md and panel/EVIDENCE.md. Local preview8087;
public deployment below remains the earlier release. Physical gates unchanged.

STATUS: ACTIVE — full completion not claimed.

2026-09-07: PR #1 merged as 2058efc; startup preload follow-up deployed as
a9fb348039ce97ea2e398716c9136d5afb384674. Public HTML SHA-256:
363767dd83794f862291da7ebe4ea1ffc0685c3a71289d45526efab5565d27fe.

Implemented and independently reviewed: timeline/globe interaction, country/city
labels, no-data reset, gesture discrimination, mobile spacing, accessible focus,
prepared JPEG sharing and retry, story focus containment, double-click protection,
source contrast, geolocation access and hovered risk detail persistence.
Scientific datasets, pipeline, fonts, audio and vendored runtime are preserved.

Public verification: 15 files return 200 and match local hashes; entry, Paris 2050
diagnosis and ready story visually inspected. Four export/encoding/adapter cases
pass. Cold startup: 2.03s at 4 Mb/s and 9.96s at 700 kb/s, with 150ms and 200ms latency respectively;
critical transfer below 833 KB. Minified JS equivalent: 897,874 bytes (<900,000).
Clean CI passed on final PR, merge and final preload runtime (34107419691), nine checks out of nine.

Physical gate: paired iPhone 15 Pro Max was detected, but iPhone Mirroring returned
device-in-use, transport and timeout errors. Actual iOS→Instagram sharing and
home-screen icon/standalone launch remain required and unverified. Browser WebKit
and a native-share adapter are not substitutes for these physical checks.

Resource policy: at most two concurrent agents, no additional paid API/assets/compute
spend. Independent reviewer used fresh context but the same model family; no
multi-provider corroboration or comparative quality score is claimed.

Next: perform the two actual iPhone checks
when the paired device can connect. Historical files are not current proof.

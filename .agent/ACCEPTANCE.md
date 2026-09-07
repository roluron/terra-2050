# Acceptance — active completion pass, 2026-09-07

A checked item cites current observed evidence in EVIDENCE.md. Pending items stay
required. Historical September 2 assertions are retained in history/ and are not
silently promoted to current passes.

- [x] Fresh checkout installs with documented dependencies; asset and i18n guards and their negative controls pass. Evidence: full-final logs.
- [x] Entry veil loads; Explore works; repeated entry does not duplicate audio. Evidence: matrix A/G.
- [x] Globe, timeline, city labels, country/city diagnosis, compare, closed-panel focus isolation, SE search spacing, and close/back/forward flows work on desktop Chromium and iPhone WebKit. Evidence: interactions and matrix A/B, plus final independent review.
- [x] Drag, returning drag, pinch and cancelled gestures do not become unintended selections. Evidence: gestures 6/6 and browser returning-drag test.
- [x] Seven risk layers and first-use explanation tolerate repeated actions. Evidence: matrix A; performance all-layer screenshots/sample.
- [x] Search: shortcut, recent cities, homonyms, IME, geolocation success and denial; six risk details, population, sources and alternatives. Evidence: surfaces/results.json, Chromium and WebKit.
- [x] Duel works by shared URL and by choosing a second city. Evidence: matrix A and interactions desktop/iphone.
- [x] Keyboard Home/End changes year, city diagnosis and URL. Evidence: matrix A.
- [x] Settings language/sound persist; FR/EN strings and aria keys pass checks. Evidence: matrix G and i18n logs.
- [x] Story preview/export freezes year and outputs an actual 1080×1920 JPEG. Slow encoding cannot share early; null encoding permits retry. Native adapter retains user activation. Evidence: sharing 4/4; actual OS share remains separate below.
- [x] Story keyboard focus stays inside composer, including iPhone SE; every control fits and closing/reopening and double-tap work at SE, landscape and short desktop sizes. Evidence: acceptance-review/composer-recheck.json after focus and double-click fixes.
- [x] Data 404 and absent WebGL produce intentional fallback without uncaught errors; reduced-motion enters correctly. Evidence: matrix D/E/F.
- [x] WebP failure falls back to rendered JPEG/PNG; denied localStorage does not break diagnosis or story. Evidence: resilience probe; native Instagram webview remains outside this simulation.
- [x] Entry Tab isolation and visible year odometer agree with timeline during automatic sweep. Evidence: acceptance-review/results.json; odometer has deliberate ~200ms interpolation at the initial transition.
- [x] iPhone portrait/landscape and iPad primary layout has no horizontal overflow, undersized mobile targets or chrome/wordmark overlap. Evidence: matrix B/C and interactions screenshots; SE composer has its separate gate above.
- [x] Source, coordinate and layer text meets AA contrast; sampled pixels measure minimum5.20:1 sources,5.51:1 coordinates,4.81:1 rail; see contrast-refined-results.json. This does not assert all moving backgrounds.
- [x] Reload does not grow history, and back/forward remains within expected product navigation. Evidence: interactions and acceptance-review/results.json reloadHistory.
- [x] Intentional globe transition, labels and story visuals inspected; 2026→2050 imagery changes visibly. Evidence: performance and full-final screenshots.
- [x] Existing Atlantis/Atlantide delight triggers and can be interrupted. Evidence: surfaces/results.json; choosing location interrupts the flight.
- [x] Desktop all-layer performance meets PERF-REPORT.md target of 60 FPS and zero steady-state >50ms tasks. Observed69.00 FPS and zero, eight seconds on39dfcd6, Chromium1440×900 DPR1.
- [x] Critical-loading budgets pass on public deployment: <833 KB, 9.97–9.98s at 700 kb/s +200ms, 4.53–5.09s at 1.6 Mb/s +150ms, 1.97–1.98s at 4 Mb/s +80ms. Minified JS equivalent is 897,874 bytes (Terser5.51.2), below900,000. Evidence: public-profiles and js-budget. Historical Wi-Fi timing is an observation, not a guaranteed CDN latency ceiling; current samples0.71/1.37s are both reported.
- [x] README, current state and evidence match the final integrated runtime; clean CI34107419691 passes9/9; no pending product fixes; independent final-snapshot review passes. Physical checks remain open below.
- [x] PR #1 integrated; public loading budgets pass; public deployment succeeds; current live assets, OG/Twitter/favicon/apple-touch-icon/manifest return200 and golden path/export work. Evidence: deployment, public-profiles and public-sharing.
- [ ] Actual iPhone Safari native share sheet reaches Instagram Stories with the prepared image. Paired phone must be locked to connect through iPhone Mirroring.
- [ ] Actual iPhone home-screen installation has correct icon and launches in standalone mode.

Applicability: the historical ~/.claude/REQUESTS.md housekeeping item is outside the
explicit writable repository scope and is not a product acceptance condition. No
scientific data expansion or new scenario is implied; published limitations remain.
No overall completion until all applicable unchecked conditions have evidence.

Budget applicability: PERF-REPORT.md datedAugust20 labels texture<=2048 and zero layout transitions as passes while its own later text specifies4320 masks/4096 refinement. Current README and implementation deliberately retain high-resolution refinement and animated search width. These obsolete structural claims are not current resource budgets; FPS, long tasks, minified JS, critical bytes and loading times are measured above.

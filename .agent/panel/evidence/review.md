# Independent panel review

Final tested snapshot: `15a0137e03dc36b238b351bcefca7d1380bebcf2`, detached clean worktree `work/panel-review-frozen`, isolated server 8093. No author source or runtime changes. Browser evidence is independent execution by a fresh-context same-model-family reviewer, not a different-model review.

Verdict: PASS for the bounded reviewed panel behavior; no unresolved reproducible panel defects found. This is not a production or physical-iPhone release verdict.

## Coverage and evidence

| Acceptance criterion | Result in this review |
| --- | --- |
| Name, scope, selected year, verdict at opening | PASS: Paris, France, Funafuti; desktop, SE, landscape screenshots. Longest actual dataset name wraps and retains visible verdict. |
| Score direction, aggregation, scenario limitations | PASS: explicit higher-score meaning; France population-weighted average; native methodology disclosure and SSP3-7.0 text. |
| Six severity-labelled native disclosures, touch/keyboard | PASS: desktop Enter and WebKit touch toggle locally; first auto-opened detail can close, remaining five open. |
| Panel year updates diagnosis, graph, URL, preserves detail state | PASS: 2026 remains at opening; End changes to2050; URL updates after350ms debounce; open state retained. |
| Population, alternatives, compare, share, transitions, history | PASS for rendered population/alternatives and exercised Compare Berlin, story generation, clipboard fallback, France/Funafuti/San Francisco transitions, Back/Forward. Alternative destination click not separately exercised. |
| Layout, scroll body, fixed controls, target size | PASS on1440x900,320x568,734x343: close/range44px; header/footer stay visible during body scroll. Longest name gives102px body onSE,71px landscape, still scrollable. iPhone15/iPad were not separately repeated by reviewer; author suite covers those. |
| FR/EN, reduced motion, focus, startup, regressions | PASS for FR/EN rendering and keyboard/touch actions under reduced-motion context; zero pageerrors in completed runs. Full regression suite intentionally left to author; not redundantly run. |
| Baseline comparison and frozen review | PASS within scope: inspected supplied baseline desktop/mobile screenshots against new solid panel, explicit name/year/verdict and local disclosures. |

`review.json` records full targeted flows on d4184c9; the final15a0137 changes only duel flex/gap. `final.json` records explicit final-snapshot desktop/SE compare, story, close and actual clipboard contents. Native system share completion is outside this simulated browser review; desktop fallback was explicitly selected by disabling navigator.share only in test context and granting clipboard access.

Final source HEAD was verified unchanged and worktree clean after testing.

## Findings resolved during review

- 6ba5db0: Story image raised `stopperBalayage is not defined`; sharing had remaining calls. Fixed in d4184c9 and retested successfully on final15a0137.
- 6ba5db0: SE search result clicks intercepted by compare toast, including ordinary France search. Captured `se-failure.png`; fixed search stacking and retested successfully on final15a0137.
- Comparison names/scores ran together visually; final15a0137 has10px flex gap, inspected `final-desktop-duel.png` and `final-se-duel.png`.
- Earlier no-data timeline concern was withdrawn: it was not reproducible. `nodata-dom.json` and `nodata-direct.png` show correct parent, visible year/slider, normal opacity. It must not be reported as an unresolved defect.

Some `*-failure.png` files document superseded snapshots or harness mistakes (attempting close while settings remained open); consult this report and final.json rather than treating their presence as final failures.

## Final announcement delta — ea48a73ed1f91cd99d652328d7669f0fdb043659

PASS. Confirmed the sole source change from15a0137 replaces the legacy verdict array in annoncer(). Direct Chromium DOM checks in `ax-delta.json` assert that the polite status live region includes the exact visible verdict, selected year, and score for Paris EN2026, EN2050, FR2050; France FR2050, FR2026, EN2026. Zero pageerrors. Examples: `Paris · 2050 · 63/100 · Moderate overall exposure` and `France · 2026 · 72/100 · Lower overall exposure`.

Two initial attempts did not open the deep-link panel after entry; this bounded delta test used normal Paris search as fallback. No pageerror reproduced during the completed run. This does not establish a new regression from the one-identifier delta; broader deep-link regression coverage remains with author. The review browser was closed and isolated8093 server stopped after the delta check.

## iPhone15 settings failure investigation — ea48a73 runtime8087

The unmodified iPhone15 panel test reproduced the reported timeout (`iphone-repro/panel.json`). Instrumenting the identical sequence showed the synthetic mouse action delivered pointerdown/mousedown/pointerup/mouseup on the animated settings SVG path, but no click event, so the application click handler never ran and the menu remained closed. `iphone-instrument/menu-click.json` records this directly.

A real touch-path Playwright locator.tap() at the same button produced touchstart/end followed by click and the expected open mutation (`menu-tap.json`). The remaining FR, story, close, and timeline assertions then passed with zero pageerrors (`iphone-instrument/panel.json`). The observed failure is therefore in the emulated mouse input path, not an application open-then-close transition. A likely mechanism is mouse hit-testing against the rotating SVG; that mechanism was not separately proven. Use tap for hasTouch devices in this test rather than classifying the missing synthetic click as a failed touch interaction. No runtime changes made; browser closed.

## Final mouse/touch fix delta — 9129b5b58e98e9047cd72a339536714f22405a93

PASS. The author fixed the underlying hit target by making the decorative gear SVG ignore pointer events. The original unmodified iPhone15 panel.mjs now passes all assertions, including the previously failing mouse settings/language sequence (`iphone-9129-original/panel.json`). A separate direct event test records mouse down/up/click targeting `bouton-reglages`, followed by three native taps closing, reopening, and closing the menu; all four click events target the stable parent button (`gear-delta.json`). Zero pageerrors. Runtime source HEAD verified unchanged before/after; browser closed. This supersedes the earlier suggestion to change only the test input path: the runtime now supports both mouse and touch correctly in the reproduced case.

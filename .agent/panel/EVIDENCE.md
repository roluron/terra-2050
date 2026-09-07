Panel redesign evidence — 2026-09-07

Runtime snapshot:9129b5b58e98e9047cd72a339536714f22405a93.
Baseline:0d96904. Branch:design/place-panel. Local preview:localhost8087.
Public Pages remains the earlier release; this is a verified local design change.

Evidence composition is explicit rather than claiming one final full run:
- Clean checkout15a0137: npm ci, fresh Python venv/Pillow, installed Playwright
  browsers, static server8089; tools/check.py --qa. Eight of ten top-level checks
  passed. The two failures were retained in evidence/full-15a, then resolved below.
- Matrix expected the timeline outside the panel. Test963f5d8 now checks containment
  and non-overlap with scrolling content/footer. Full matrix rerun25/25 passes;
  evidence/matrix-results.txt. No runtime geometry changed for this correction.
- WebKit iPhone15 synthetic mouse input landed on the rotating gear SVG and emitted
  down/up but no click. Native touch passed. Runtime9129 makes the decorative SVG
  pointer-events:none; original unchanged iPhone panel test then passes.
- Final static asset/i18n checks and their negative controls:4/4, evidence/static-final.
- Final clean9129 panel.mjs:5/5 (desktop,SE,iPhone15,landscape,iPad), zero errors;
  evidence/panel-final.json and snapshot-final.json.
- Final review-gear.json verifies mouse and native touch target the stable button;
  review-iphone-final.json reruns the original iPhone test unchanged and passes.

The changes after15a are one live-region verdict identifier, one decorative SVG
pointer-events declaration, and the corrected containment test. The remaining
regression suites retain their observed coverage; data, scoring, dependencies,
shaders, resource loading and story generation are unchanged by these deltas.

Independent execution: fresh-context same-family OpenAI/gpt-6-astra reviewer.
review.md, review-flows.json and review-final.json cover desktop, SE, landscape,
country/no-data, long names, local details, year, FR/EN, history, comparison,
story generation and actual clipboard fallback. review-announcements.json checks
six Paris/France FR/EN year/score/verdict live-region combinations on ea48a73.
No different-model corroboration is claimed. routes.json records live catalog,
exact discoverable model IDs, UNKNOWN entitlement/cost/quota and zero paid spend.

Budget evidence (same browser environment, no external-service simulation claims):
- budget.json:898818 minified-equivalent JS bytes <900000, Terser5.51.2.
- performance.json:68.43 FPS, zero >50ms tasks; Chromium145,1440x900 DPR1,
  seven layers,2050,5s warmup,8s sample, snapshot15a0137.
- network-exact-700kbps.json:9.753s <11.2s at700kb/s+200ms.
- network-exact-1.6mbps.json:4.339s <5.2s at1.6Mb/s+150ms.
- network-exact-4mbps.json:1.788s <2.7s at4Mb/s+80ms.
  Critical wire bytes828240 <840000. Local clean server, cold browser/cache,
  CDP throttling. These are local measurements, not a new public-CDN claim.
- After the performance snapshot, runtime deltas only change an announcement
  property and gear input targeting; no new assets, animation or loading work.

before-* and after-* PNGs were directly inspected. New design puts place, scope,
year and plain verdict together; score direction and country weighting are explicit;
six severity-labelled details open beside their trigger. Fixed header/footer and
an internal scrolling body replace the former transparent overlay. At the longest
actual city name, landscape content remains scrollable with71px body; ordinary
landscape body136px. Physical iPhone system sharing/home-screen release gates
remain separately blocked and are not claimed by browser emulation.

Surfaces regression explicitly clicked an alternative destination (Marne La Vallée)
on desktop and iPhone. Final source diff-check passes. All applicable panel
criteria have observed evidence; no unresolved reproducible panel defect remains.

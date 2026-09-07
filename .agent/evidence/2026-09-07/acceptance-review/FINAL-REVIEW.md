# Independent acceptance supplement — PASS within reviewed browser scope

Verified snapshot: `39dfcd6f28b289b625c5bc3ecfa39291104a9bd6`.

Product SHA-256 values were identical before and after final verification:

- `index.html`: `c06e0c996c5d918405540f549a450fce25e019d85c2a7e9cd5ca9bb0a534b2b1`
- `terra-menus.css`: `67d53b4c0434d639c50cd6be7c6c5d78bcb72b9dd7003ef3ba3c340fd9dfe711`

The reviewer independently reproduced the WebKit keyboard-focus escape, accidental second-click sharing, and insufficient sources contrast. All three were corrected and reverified. This is a separate agent review within the same model family, not different-model corroboration.

| Current evidence | Result and reproducible probe |
|---|---|
| `composer-recheck.json` | PASS: 1440×500 Chromium and 320×568 WebKit iPhone SE composer fits; options toggle; Tab/Shift+Tab remain inside; close and double-click reopen work. Probe: `composer-recheck.mjs`. |
| `chrome-visibility.json` | PASS: chrome suppressed before entry and restored afterward; Paris dossier opens on desktop and WebKit SE. Probe: `chrome-visibility.mjs`. Settled captures: `desktop-entry.png`, `iphone-se-entry.png`, and matching `*-after-entry.png`. |
| `contrast-refined-results.json` | PASS in the sampled Paris frame: coordinates minimum 5.51:1; sources 5.20:1; rail labels minimum 4.81:1. Probes: `contrast-capture.mjs`, then `contrast-refined.py`. This uses CSS foreground alpha over photographed backgrounds at identified text pixels; it does not prove every moving globe background or every city. |
| `network-exact-local.json` | PASS: cold 700 kb/s, 150 ms latency; Explorer-ready 9,965.5 ms; 831,429 wire bytes, under 840,000 decimal bytes. MutationObserver marks readiness; CDP records compressed transfer sizes. Probe: `network-local-recheck.mjs`. |
| `network-exact-desktop-dpr2.json`, `network-exact-iphone-sized.json`, `network-exact-ipad-sized.json`, `network-exact-desktop-4mbps.json` | PASS: all 831,429 bytes. DPR2 9,966.7 ms; iPhone-sized 9,967.7 ms; iPad-sized 9,965.4 ms at 700 kb/s; desktop 2,225.5 ms at 4 Mb/s. These are Chromium viewport/DPR profiles, not physical-device measurements. Probe: `network-profiles.mjs`. |
| `results.json` → `veil`, `reloadHistory`, `odometer` only | Veil Tab isolation and reload preserving history length/hash passed. Automatic timeline sample had two initial 2027 frames displaying 2026 during deliberate approximately 200 ms interpolation; subsequent rapid updates through 2050 matched. This is not a claim of zero animation lag. Probe: `verify.mjs`. |

`results.json` composer failures, `iphone-se-reopen-failure.*`, original `contrast-results.json`, and older public-baseline network files are diagnostic/history artifacts, not final failures. They are superseded by the explicit current mappings above. `network-exact-public-main.json` measured the previous public deployment and cannot certify this snapshot's deployed performance.

Repository copies use installed `playwright` and accept URL0 (default localhost:8080). Run probes with Node after npm ci and qa:install. They write outputs beside the probe. Contrast calculations require matching screenshots from the task evidence archive and the repository Python environment. Original probes ran from work/evidence/acceptance-review against localhost:8087; only import and URL portability were adjusted in these copies.

Physical iPhone sharing to Instagram and home-screen launch remain unverified. Final release CI and post-deployment confirmation are handled by the parent task. No product files were edited by this reviewer.


Final bounded follow-up verdict, attributed to the same independent reviewer:
PASS on1ab37fe. WebKit proved closed controls cannot be focused, open-city controls
can be focused, Back disables them, Forward restores them, and deep links remain
inert until Explore. SE search and Settings have a stable14px gap; hit-testing and
actual touch focus search. Granted and denied location flows pass (se-final-touch.json).
Independent Chromium additionally verified Paris and France retain the hovered
non-worst risk detail through2027,2028,2029. Final product hashes:
index.html6d29a09a9dfd8fbe15afdc40c3108c64cf8034f0e7b235c2a4c639a0b9a9ff51;
CSSb057ec71d77b084d9dabf3def202105d51178dbc31b132f7a7c884d2f14ebd3b.
Earlier network/contrast/performance probes remain scoped to their recorded snapshots;
post-deployment verification is separate. Physical-device gates remain open.

Final preload follow-up, attributed to the same reviewer, PASS on a9fb348:
`preload-current-webkit.json` records HTML SHA-256
363767dd83794f862291da7ebe4ea1ffc0685c3a71289d45526efab5565d27fe.
Normal WebKit entry → Paris → ready story succeeds, with each critical resource
requested once and no console warnings, JavaScript or import-map errors.
Injected WebP 404s load JPEG/PNG replacements and reach ready story. The failed
WebP requests occur twice in this fallback case, producing expected resource and
unused-preload warnings; there are no JavaScript exceptions. No product changes
were made by the reviewer.

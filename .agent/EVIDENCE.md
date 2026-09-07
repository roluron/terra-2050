# Evidence — 2026-09-07

The full goal remains ACTIVE. Actual iPhone checks below are required, not waived.
Raw records are under `evidence/2026-09-07/`; historical assertions and superseded
failures remain under `history/` or are explicitly identified below.

## Released source and reproducibility

PR [#1](https://github.com/roluron/terra-2050/pull/1) merged as `2058efc`.
The four preload hints were deployed as
`a9fb348039ce97ea2e398716c9136d5afb384674`.
Live HTML SHA-256:
`363767dd83794f862291da7ebe4ea1ffc0685c3a71289d45526efab5565d27fe`.
CSS SHA-256:
`b057ec71d77b084d9dabf3def202105d51178dbc31b132f7a7c884d2f14ebd3b`.

Clean checkout: `npm ci`, Python dependencies from `requirements-qa.txt`,
`npm run qa:install`, `npm run dev`, then `python3 tools/check.py --qa`.
The runner writes its revision, clean working-tree state and source/test SHA-256
hashes into `snapshot.json`, with raw exit-coded logs for nine top-level checks.

Final PR CI [34105682154](https://github.com/roluron/terra-2050/actions/runs/34105682154)
and merged-main CI
[34106640532](https://github.com/roluron/terra-2050/actions/runs/34106640532) passed.
The PR artifact is retained as `ci-final/`; its synthetic merge revision
`1be5fde` has the same source hashes as the final PR head `1ab37fe`.
Final preload CI [34107419691](https://github.com/roluron/terra-2050/actions/runs/34107419691) passed all nine checks. The complete artifact is retained as `ci-release/`; its clean snapshot is exactly a9fb348 and all recorded source/test hashes match the released checkout.

The nine checks cover four asset/i18n checks including negative controls,
six gesture cases, seventeen interaction cases, twenty-five configuration cases,
four sharing cases, and two browser surface cases. They exercise Chromium desktop
and WebKit iPhone/iPad emulation, actual touch input, keyboard focus, navigation,
risk details, geolocation grant/denial, IME, homonyms, recents, source/alternative
navigation, FR/EN, sound persistence, data404, absent WebGL and reduced motion.

## Public release

Pages [34107418646](https://github.com/roluron/terra-2050/actions/runs/34107418646)
succeeded. `deployment/results.json` records fifteen public files returning200
and matching local hashes, including HTML/CSS, manifest, icons, preview image,
runtime libraries, fonts and lookup data. Metadata checks passed.
`deployment/golden-path.json` records CUA visual inspection of public Explore →
Paris →2050 diagnosis →ready story. `public-sharing/sharing.json` passes all four
export/encoding cases against the public URL, including an actual downloaded JPEG.

Public cold Chromium measurements use CDP throughput/latency limits and a
MutationObserver on `#voile.pret`; each sample launches a fresh browser with cache
disabled. `public-profiles/` retains both samples, including the slower ones.

| Network | Explorer ready, two samples | Existing comparison |
|---|---|---|
| 700 kb/s,200ms |9.980s /9.972s |11.2s |
| 1.6 Mb/s,150ms |5.090s /4.529s |5.2s |
| 4 Mb/s,80ms |1.973s /1.982s |2.7s |
| 30 Mb/s,0 added latency |0.711s /1.374s |historical1.0s observation |

The second Wi-Fi sample exceeds the historical observation. Its document alone
completed at601ms versus349ms in the first sample; remote timing varies. No
guaranteed one-second CDN ceiling is claimed. The stated critical-load acceptance
budgets are verified with the constrained network profiles above.
All samples transferred less than833,000 critical wire bytes (budget840,000).
Separate 4Mb/s+150ms and700kb/s+200ms public probes measured2.03s and9.96s.
Older public measurements before the preload change are superseded.

`js-budget/results.json` records897,874 minified equivalent bytes, below900,000.
Terser5.51.2 compress+mangle runs separately for the application and four libraries,
with module mode for application/Three/Orbit. Generated benchmarks are not deployed.

## Independent review and supplemental evidence

One fresh-context reviewer independently reproduced and rechecked defects in modal
focus, accidental double-click sharing, contrast, entry inertness and SE search
spacing. `acceptance-review/FINAL-REVIEW.md` maps results to their exact snapshots.
The final1ab37fe follow-up passes inert entry/deep-link/history behavior, actual
SE touch and location, and city/country hovered risk detail persistence.

The final preload review has HTML hash identical to a9fb348:
`acceptance-review/preload-current-webkit.json`. WebKit entry →Paris →ready story
passes with each critical resource requested once, no warnings or import-map errors.
Injected WebP404s render JPEG/PNG fallback and ready story with no JavaScript
exceptions. Failed WebPs are attempted twice and produce expected404/preload warnings.
The review uses the same model family; no multi-provider corroboration is claimed.

- `performance/sample.json`:69.00FPS,552 frame intervals, zero>50ms long tasks over
  eight seconds after five-second warmup, all seven layers at2050,
  Chromium1440×900 DPR1, revision39dfcd6. Later focus/hover/preload edits do not change
  steady-state globe rendering; the measured snapshot is retained explicitly.
- `acceptance-review/contrast-refined-results.json`: sampled Paris pixels yield
  source5.20:1, coordinate minimum5.51:1, rail minimum4.81:1. This does not prove
  every city or moving background.
- `acceptance-review/composer-recheck.json`: WebKit SE320×568 and short desktop
  composer fit, Tab/Shift+Tab containment, toggles, close and double-click reopen.
- `surfaces/results.json`: final combined source passes Chromium and touch WebKit.
- `links/results.json`: actual clipboard and encoded city/year URL round trip,
  malformed link recovery. `resilience/results.json`: denied storage and WebP
  fallback still allow diagnosis/story; an Instagram webview is not simulated OS proof.
- `acceptance-review/results.json` only for veil, reloadHistory and odometer:
  entry isolation and reload history pass. Odometer has deliberate~200ms interpolation;
  two initial transition frames lag before later rapid year changes agree.
- Supplemental probes are versioned alongside their JSON. Repository copies use
  installed Playwright and URL0; historical contrast probes require the matching
  screenshots in the task evidence archive. See each probe's output behavior.

The evidence archive includes screenshots, exported JPEGs and raw logs. Earlier
`full-final/`8/8 on5c1e31f remains valid historical evidence. The supplemental local
9/9 run had CSS changed during execution and is diagnostic, not a frozen verdict.
Earlier CI failures from fixed-duration readiness assertions and hovered detail
reset are superseded by state-based waits, the product correction and clean CI.

## Physical checks still open

`physical-device.json` records the detected paired iPhone15ProMax and observed
device-in-use, transport and timeout errors from iPhone Mirroring. No actual phone
webpage was reached. The user was asked to lock the paired device; no reply was
received during this pass.

Required: Safari native share sheet →Instagram Stories with the prepared image
(without publishing); home-screen installation with correct icon and standalone
launch. Sharing adapter tests verify a real1080×1920JPEG and browser transient
activation, but do not exercise the native OS or Instagram. No full completion
claim is permitted until both physical checks have observed evidence.

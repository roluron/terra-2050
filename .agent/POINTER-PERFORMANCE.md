# Mouse responsiveness — 2026-09-30

User reported a delayed mouse and sluggish interaction on the published site.
Baseline: a894bbccce7ed1a0f06c292ba954aebee0f25bee.

The custom cursor smoothed x/y with a 55 ms exponential time constant, then
updated left/top/width/height on every animation frame. Its body class was also
rewritten every frame. Hover tooltips rewrote their text and measured their size
at every pointer event, including repeated events over the same place.

The cursor now takes its position directly from the pointer event (capture phase),
using a fixed-size layer and translate3d/scale. Size transitions are retained.
Cursor classes change only when their state changes. Tooltip content/dimensions
are reused for the same place, year, language, scientific source, coverage,
pinned state and viewport. The search caret only rewrites measured text when
the input changes. Scientific calculations and datasets are preserved.

Matched 32-movement Chromium run at 1280×720, DPR 1, Linux/software WebGL:

| Measurement | Before | After |
| --- | --- | --- |
| Mean exported-cursor error at pointer event (CSS px) | 56.9 | 0 |
| Layout count | 38 | 4 |
| Layout duration (ms) | 4.23 | 1.14 |
| Script duration (ms) | 313.7 | 329.9 |

This establishes removal of the artificial position delay and fewer layouts;
it does not establish a hardware frame-rate gain. Country-score cold work and
WebGL rendering remain present. Safari/device performance has not been measured.
Raw measurements: /tmp/terra-pointer-before.json and /tmp/terra-pointer-after.json.
Harness: /tmp/terra-pointer-profile.mjs.

Regression checks: tools/qa/cursor-responsiveness.mjs checks same-event exported
and DOM cursor centering, no cursor-induced relayout during movement, size/press
transitions, native cursor in modals, keyboard/blur cleanup, repeated tooltip
content reuse and year invalidation. tools/qa/feedback.mjs checks the existing
desktop/touch UI and scientific presentation flows.

Verified: cursor-responsiveness passed both motion preferences (0 layouts for
20 settled-cursor moves) and the live-globe tooltip checks. feedback passed on
Chromium desktop, phone, compact and tablet touch emulation plus ruler geometry.
Logs: /tmp/terra-cursor-responsiveness.log and /tmp/terra-feedback-pointer.log.
JavaScript syntax checks and git diff --check passed.

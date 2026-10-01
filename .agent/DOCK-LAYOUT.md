# Filter and timeline alignment — 2026-09-30

2026-10-01 follow-up on ed6dd56: the ruler fits the year glyphs rather than
the wider 200px/112px timeline container. The year block uses max-content;
existing resize/font measurement now preserves fractional pixel widths.
The first/last odometer digit text ranges and canvas ink bounds determine
the ruler's width and left offset, excluding the font's side bearings.
The 44px range input follows the same geometry. Recalibration runs on year
input and city-sheet moves as well as resize/font readiness.

Focused Chromium checks passed on desktop 1280×720, iPhone 15 Pro and 320×568,
with reduced motion, plus phone landscape 852×393. Checked all ten final
digits, keyboard/touch endpoints, the 4px year gap, filter baseline, 44px input
and city round-trip; no runtime errors. For 2026, ruler widths are 174.453px
desktop / 105.063px mobile, compared with 200px / 112px outer containers.
2026/2050 crops visually inspected and bright glyph/tick pixel extents sampled:
/tmp/terra-ink-timeline-{desktop,phone}-{2026,2050}.png. Syntax and diff checks
passed. Updated historical unified-ui check uses the outer timeline's right
inset, since the year itself now fits its content. Actual Safari not verified.

Follow-up on ebc2531: filter pill uses max-content instead of a fixed width,
with 12px between the label and chevron. Desktop vertical padding removed;
both formats retain a 44px button inside a 46px pill. Horizontal padding is
16px desktop / 12px mobile. The expanded options menu remains independently
sized, absolutely positioned above the pill.

Focused Chromium checks passed on desktop 1280×720, iPhone 15 Pro and 320×568
with reduced motion, plus phone landscape 852×393. Initial French pill sizes:
187.6×46px desktop (Choisir un indicateur), 82.5×46px mobile (Filtres).
Checked all eight language labels fit, menu opening does not stretch the pill,
options remain on screen, Escape closes, a selected indicator fits, and ruler
baseline alignment/no overlap are preserved. No runtime errors. Captures
inspected: /tmp/terra-compact-filter-{desktop,phone}.png. git diff --check passed.

Follow-up on d2c31bd: desktop timeline moved from center to bottom-right,
24px from the right edge (mobile keeps its 20px inset). Full-width graduations,
year gap and filter-bottom alignment are preserved. Logo hover distortion,
chromatic shadows and per-letter animation setup were removed; the static
wordmark retains its blue separator.

Focused Chromium verification passed at 1280×720 with normal motion, iPhone
15 Pro and 320×568 with reduced motion, plus phone landscape at 852×393.
Checked logo DOM/styles unchanged under pointer movement, blue separator,
right inset, ruler/year width, filter alignment, no overlap, keyboard/touch
endpoints, city-sheet ownership and return of the timeline to its main dock,
and absence of runtime errors. Desktop and phone screenshots inspected:
/tmp/terra-right-timeline-{desktop,phone}.png. Existing unified-ui expectation
updated from centered year to right inset; its full historical suite was not
run for this change. git diff --check and updated QA script syntax passed.

Follow-up on d60c3cd: the main-globe ruler now spans 100% of the year block,
rather than 72%. Its range input uses the same width and starts at left:0.
Verified on Chromium at 1280×720, iPhone 15 Pro and 320×568 (touch emulation,
reduced motion): year/ruler widths match at 200px desktop and 112px mobile,
range geometry matches, filter bottoms stay aligned, year gap remains 4px,
no mobile overlap, keyboard and touch endpoints remain 2026/2050.
Desktop/mobile crops inspected: /tmp/terra-wide-timeline-{desktop,phone}.png.

Baseline: 1c44c0fda572e2ccfdc1ebca5e4423c10fd76dbe.
User requested a thinner mobile filter pill, a closer year/ruler pairing, and
the ruler baseline aligned with the bottom of the filters on desktop/mobile.

Both controls now share --dock-bottom, including the bottom safe-area inset.
The mobile filter container has no vertical padding; its button retains a 44px
touch target, giving a 46px pill rather than 62px. Main-globe year layout uses
a block line box, followed by a 24px ruler with 4px margin. The range remains
44px tall, positioned independently of the visible ruler, so the hit area does
not create a large visual gap. These ruler rules are scoped to globe-dock;
the city-sheet and comparison timelines retain their existing layout.

Verified with tools/qa/feedback.mjs on Chromium desktop, phone, compact and
tablet profiles. Checks include ruler/filter bottom equality, the 4px year/ruler
layout gap, mobile pill <=48px with a >=44px button, non-overlap, keyboard and
touch endpoint changes, and the existing help/search/comparison flows.
Logs: /tmp/terra-dock-alignment-{profile}.log. Desktop and phone screenshots
visually inspected in /tmp/terra-dock-alignment/. git diff --check passed.
No scientific data/shaders/assets were changed. Actual Safari remains unverified.

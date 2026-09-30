# Filter and timeline alignment — 2026-09-30

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

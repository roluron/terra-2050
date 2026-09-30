# Unified city search — 2026-09-30

User requested merging “Find your city” with search, removing the magnifier,
and transforming that invitation into an elegant search bar.
Baseline: b9b7589fc43627ecbc7b48adc53cb476739ef433.

The invitation button now lives in the search container. Both share the same
center and top position; the container expands from 184px to at most 360px
(viewport minus 40px on mobile). The button fades out as the field fades in.
The magnifier markup/styles are removed. An empty unfocused field returns to
the invitation. A selected city or unfinished query keeps the field available.
Focus and aria-hidden/tabindex follow the visible control. Cmd/Ctrl+K,
suggestions, Escape and city selection keep the existing behavior. Reduced
motion disables the morph duration. The legacy `loupe` class remains solely
as the existing collapsed-state flag.

On phones, an open city sheet places the search in the header row, with room
for settings and the sheet's close button. Focusing that search returns to the
centered globe-search view as before. This avoids covering the close control.

The shared parent owns the entrance fade, avoiding multiplying parent/child
opacity. Comparison/story visibility still applies to the whole search.
No scientific data, shaders, assets or cursor motion were changed.

Validation: extended tools/qa/feedback.mjs checks no separate icon, shared center
and top position before/after expansion, viewport-bounded width, focus/accessibility
state, empty Escape collapse and keyboard expansion, along with the existing
search/selection/comparison/help/timeline/localization flows.
Log: /tmp/terra-unified-search.log. Screenshots: /tmp/terra-feedback/*-search.png.
Desktop and phone screenshots visually inspected. Actual Safari not exercised.

Passed: Chromium desktop, phone, compact and tablet touch emulation, including
no overlap with the city-sheet close control on phones. Final logs:
/tmp/terra-unified-search.log (desktop), /tmp/terra-unified-search-phone.log,
/tmp/terra-unified-search-compact.log and /tmp/terra-unified-search-tablet.log.
JavaScript syntax and git diff --check passed.

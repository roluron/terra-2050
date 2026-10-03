# Unified city search — 2026-09-30

User requested merging “Find your city” with search, removing the magnifier,
and transforming that invitation into an elegant search bar. The latest request
places that control immediately to the left of the settings gear.
The latest mobile request restores a magnifier in that same control.
Mobile-icon baseline: 16cce749a79e1819f64e9afdc58f8bcc230e4168.

The invitation button lives in the search container. Both share the same
right edge and top position, 16px left of the settings gear. The container
expands leftward from 184px on desktop or a 48px magnifier on smartphones to
at most 360px. Mobile widths leave room for the gear and page margins. The
button fades out as the field fades in. The magnifier is an SVG inside the
same button, with its localized accessible name. Desktop retains the text.
The mobile rule covers widths up to 720px and coarse-pointer landscape windows
up to 500px high. An empty unfocused field returns to
the invitation. A selected city or unfinished query keeps the field available.
Focus and aria-hidden/tabindex follow the visible control. Cmd/Ctrl+K,
suggestions, Escape and city selection keep the existing behavior. Reduced
motion disables the morph duration. The legacy `loupe` class remains solely
as the existing collapsed-state flag.

On phones, the search stays in the header row during an open city sheet,
with room for settings and the sheet's close button. The expanded field hides
the wordmark on narrow screens. Resize updates both expanded and collapsed widths.

The shared parent owns the entrance fade, avoiding multiplying parent/child
opacity. Comparison/story visibility still applies to the whole search.
No scientific data, shaders, assets or cursor motion were changed.

Validation: extended tools/qa/feedback.mjs checks no separate icon, shared right edge
and top position before/after expansion, 16px gear spacing, viewport-bounded width, focus/accessibility
state, empty Escape collapse and keyboard expansion, along with the existing
search/selection/comparison/help/timeline/localization flows.
Log: /tmp/terra-unified-search.log. Screenshots: /tmp/terra-feedback/*-search.png.
Desktop and phone screenshots visually inspected. Actual Safari not exercised.

Passed: Chromium desktop, phone, compact and tablet touch emulation, including
no overlap with the city-sheet close control on phones. Final logs:
/tmp/terra-unified-search.log (desktop), /tmp/terra-unified-search-phone.log,
/tmp/terra-unified-search-compact.log and /tmp/terra-unified-search-tablet.log.
JavaScript syntax and git diff --check passed.

Placement update passed the complete feedback suite on desktop, phone, compact
and tablet Chromium profiles. Logs: /tmp/terra-search-gear-{profile}.log;
screenshots: /tmp/terra-search-gear/. Desktop/phone globe screenshots inspected.
The actual CSS/header geometry was additionally checked for all eight labels at
1280/393/320px, including French wrapping, logo clearance and no text clipping,
with /tmp/terra-gear-layout.mjs. No hardware frame-rate or Safari claim is made.

Mobile-icon update passed feedback on Chromium desktop, phone and compact
profiles, including portrait/landscape icon visibility and desktop language
labels. Logs: /tmp/terra-mobile-search-icon-{profile}.log. Phone globe screenshot
visually inspected at /tmp/terra-mobile-search-icon/phone-globe.png. JavaScript
syntax and git diff --check passed. Actual Safari remains unverified.

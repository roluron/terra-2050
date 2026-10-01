# Subtle country borders and bounded captions

2026-10-01, base 1e354fa.

Country-border sampling offsets are halved (half a political-raster texel).
The blend opacity follows 0.1 × (1 − cos(time × π/4)): 0%, 10%, 20%, 10%,
0% over an eight-second cycle. The existing render loop drives it, with no new
timer. Reduced motion keeps borders still at 10%. Active-layer strength still
controls their visibility.

The filter summary sizes itself from the headline, with responsive maximums.
The reference and method paragraphs use inline-size containment, so they wrap
within that width instead of extending it. An unavailable summary retains a
readable fallback width. Temperature and fire-weather comparisons show their
historical average on a distinct reference line; other comparisons show their
source period. Population remains an annual projected level. Historical dates
are removed from the longer method line to avoid repetition. All eight reference
translations preserve the actual periods; no annual 2000 baseline is fabricated.

Verification: temporary Chromium smoke checks exercised live breathing, the five
cycle phases, half-texel sampling and compiled shaders on desktop, 393 px mobile
emulation and reduced motion. The global numeric suite passed 1,040 checks and
153 copy cases. The existing summary browser suite now checks the visible
reference and the caption/reference width relative to the headline. English and
French layout checks and captures run at 1280×800, 393×852 and 320×568.

Evidence: /tmp/terra-subtle-outlines/results.json, numeric-summary.json,
ui-summary.json and screenshots. Physical Safari/iPhone are not verified.
Scientific source files and numerical aggregation methods are unchanged.

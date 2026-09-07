- [x] Place name, country/city scope, selected year and a plain-language verdict are visible at opening.
- [x] Score direction is explained; country aggregation and scenario limitations are accessible.
- [x] Six risks have explicit severity words; each detail opens beside its own trigger by touch and keyboard. No hover-only information or ambiguous risk bars.
- [x] The year control is part of the panel; year changes update diagnosis, graph, URL and open detail. Opening a place does not auto-change the reading year.
- [x] Population, alternatives, compare, sharing, city/country transitions, no-data and Back/Forward work.
- [x] Desktop, iPhone SE/15, landscape and iPad have readable solid surfaces, no clipped controls/overlap, and at least44px interactive targets. Header, scrolling body and footer remain usable.
- [x] FR/EN, reduced motion, keyboard focus and clean startup pass; relevant regression suites pass.
- [x] Baseline/final screenshots are inspected; independent reviewer exercises the frozen final snapshot and returns no unresolved defects.

Experience: opening answers where/when/what first; details are disclosed locally,
and technical methodology is secondary. Compare baseline and final at1440x900,
390x844 and320x568. No taste score is assigned. Existing resource budgets remain;
CSS replaces obsolete panel rules and no runtime dependency is added.

Verification map: evidence/panel-final.json covers1–4,6–7; review.md and
review-flows.json cover5 and8; full-15a/surfaces.mjs.log covers alternative
navigation; matrix-results.txt covers reduced motion and failure states.
EVIDENCE.md records exact snapshot composition and resolved earlier failures.

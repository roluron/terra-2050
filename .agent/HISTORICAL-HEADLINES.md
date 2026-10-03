# Historical comparisons and dynamic filter summaries

2026-10-01. Base: d6188386b2e3c7ea33c42a29daa986749e5612f2.

The user corrected the previous interpretation: summer heat should open as a
historical increase, colours should preserve the countries, and a dynamic global
sentence should sit immediately above the filters and follow the selected year.

## Result

- Heat, aridity, fire weather and both flood layers open on a historical
  comparison. Their explicit absolute-value and change-since-2026 views remain.
  Local warming already represents a historical anomaly; population keeps the
  annual country/area change from 2025. Explicit choices persist per filter.
- Local tooltips subtract the appropriate historical field using the same
  containing model cell and matched-source support as their map indicator.
- Colour strength follows the selected change and preserves the earth texture.
  Country boundaries use the existing political raster. No artificial minimum
  increase or fabricated nonzero reading is introduced.
- A translated headline and source/reference subline appear above the closed
  filters, update on year/language/filter changes, and hide with overlapping
  menus/dialogs. Construction is chunked once; year changes read cached scalars.

## Summary definitions

| Indicator | Headline statistic | Historical reference |
| --- | --- | --- |
| Summer heat | Area-weighted change in hottest-month mean daily maximum temperature over covered modelled land | 1970–2000 |
| Local warming | Area-weighted annual mean temperature anomaly over covered modelled land | 1970–2000 |
| Aridity | Represented land share with a lower derived De Martonne P/(T+10) index, not drought probability | 1970–2000 |
| Fire weather | Area-weighted change in extreme fire-weather days/year over modelled burnable land | 1995–2014; the local FWI threshold is separately referenced to 1850–1899 |
| Coastal floods | Change in mean valid-source-cell fraction deeper than 0.5 m in an unprotected 100-year event, in percentage points | 1979–2014 |
| River floods | Same fraction change, with locally matched river models averaged before domain aggregation | 1960–1999 |
| Population | Sum of 237 annual UN medium country/area projections, excluding aggregate records | Annual selected year |

Climate uses SSP3-7.0, one MPI-ESM1-2-HR model; fire uses its 21-model ensemble;
floods use RCP8.5. Climate periods interpolate at 1985/2030/2050. River history
uses the existing rounded 1980 midpoint and coastal history uses 1996.5.
Climate weights use cosine latitude times matched native coverage. Fire uses
cosine latitude times burnable fraction; floods use cosine latitude times source
coverage. These are represented-domain summaries, not exact geographic flood
areas, exposed population totals or ocean-plus-land global mean temperature.

Climate/heat cover 89,308 model cells, approximately 28.36% of total Earth
surface including oceans. De Martonne uses 55,360 cells where temperature is
above −10 °C and the ingredients are valid at all three periods, approximately
24.36% of total Earth surface. Its headline qualifies the denominator as land
with data; 81.15% becoming drier in 2026 is a share of that represented domain.

Packaged summer heat produces +1.00414 °C in 2026 and +1.87706 °C in 2050;
the headline rounds these to +1 and +1.9 °C. Population sums are 8,299,527,483
and 9,662,753,839 respectively. Zero, negative and unavailable results remain
possible. The data does not establish an observed change since calendar 2000.

## Validation

- New global-summary numeric suite: 1,040 checks and 153 localized copy checks,
  hand-derived partial-coverage fixtures, missing/zero/decreasing inputs, matched
  models, independent packaged-field calculations and all 25 cached years.
- All six physical-filter grids: 1,306,368 available/missing cells checked;
  25 years at selected anchors; units, masks, hashes, poles and dateline passed.
- Flood data suite passed. Scientific texture suite passed including independent
  historical masks, stored values, row orientation and event-loop yielding.
  Texture payload grows from 20,736,000 to 29,030,400 bytes.
- Eight repository asset/data/i18n/temporal checks passed (browser suites run
  separately).
- Browser matrices passed at 1280×800, 393×852 and 320×568: 21 fresh defaults,
  570 numeric states and 456 localized states across eight languages. Historical,
  absolute and since-2026 modes, native mouse/touch, viewport bounds, source-cell
  cache, missing data versus genuine zero and tiny changes were exercised.
- Dedicated headline/layout suite passed: 336 filter/year/language headlines,
  21 fresh defaults, remembered modes, menu/settings/pedagogy/city hiding,
  no per-frame summary scans, one construction per visit, renderer programs
  and responsive bounds. Final drought wording was rechecked in eight desktop
  languages, then both mobile profiles used that final copy.
- Desktop and 393/320 px captures inspected, including the zoomed Europe/Africa
  surface and the historical Saudi Arabian heat reading (+1.27 °C in 2026).

Evidence: /tmp/terra-historical-headlines/.

## Limits

Chromium with touch/mobile emulation does not verify physical Safari/iPhone.
The original scientific TIFF/UN workbooks were not reacquired; prior DATA-AUDIT.md
limitations still apply. This validates calculations and presentation against
packaged data, not a certification of source accuracy or a local disaster
forecast. The population sum is not independently cross-checked against a raw
UN world-aggregate record. Existing composite-score limitations are unchanged.

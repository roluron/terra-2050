# Independent audit: fire weather and national population

Date: 2026-10-01. Audited base: `57a0757d101a51206ba9758cfb59cbe45e0d35b2`.
The original audit reads all delivered values, both importers, runtime readers, texture construction and relevant shader code. The initial findings below describe that base. An authorized geographic correction was subsequently applied and is documented separately below; fire-weather and population source values were not changed.

## Finding 1 — P1: population geography conflates distinct UN areas

The annual file has 237 complete UN country/area series, but eight of those ISO codes are absent from `pays_index.json`: `BQ GF GI GP MQ RE TK YT`. The map identifies sovereign-country polygons, while the population source separately identifies demographic areas. The two geographies are not interchangeable.

Reproducible examples for 2026→2050, sampled directly from `pays.png` using exactly the runtime raster formula:

| Point | Raster series | Change in displayed series | Change in own UN series |
|---|---|---:|---:|
| French Guiana, 4°N 53°W | FR | +2.21% | GF +48.00% |
| Guadeloupe, 16.265°N 61.551°W | FR | +2.21% | GP −12.39% |
| Martinique, 14.64°N 61.024°W | FR | +2.21% | MQ −16.48% |
| Réunion, 21.12°S 55.53°E | FR | +2.21% | RE +6.22% |
| Mayotte, 12.82°S 45.166°E | FR | +2.21% | YT +85.71% |
| Bonaire, 12.19°N 68.28°W | NL | +2.76% | BQ +8.86% |
| Gibraltar, 36.14°N 5.35°W | ES | −6.11% | GI +21.85% |
| Tokelau, 9.20°S 171.8°W | no area | unavailable | TK +41.99% |

Gibraltar is smaller than the ~18 km raster cells, so this case also demonstrates the spatial-resolution limit; it does not justify inventing a geographic boundary. Tokelau is correctly absent at the sampled pixel but illustrates that having all UN series does not mean every area is represented on the globe. France's overseas-area misassignment includes large, readily visible regions and reverses the population trend in Guadeloupe and Martinique.

Recommended correction: use a demographic-area raster matched to UN ISO2 codes for the population filter and population hover, or explicitly withhold unmatched territory statistics. Keep a documented distinction between sovereign-country boundaries and UN demographic areas. Do not silently replace territorial series with sovereign-state series.

## Finding 2 — P1: a country fire number does not describe the colored cell

The globe uses a spatially filtered 2.5° fire-weather grid. Country hover in the audited base uses a population-weighted mean of available listed cities (`mesuresLieu`). Both have the same physical unit but different spatial support. A country mean can hide a local increase or decrease, and cities are not a representative national land sample. A 2.5° cell spans about 278 km north–south. `science-metrics.mjs` correctly records regional spatial support; the country hover must preserve this distinction.

Recommended correction: give a cursor-cell reading for a filtered map; reserve the explicitly labeled listed-city mean for the country sheet. The same spatial-support issue applies to climate filters and is audited by the other audit tracks.

## Finding 3 — P2: most fire model spreads include both directions

Out of 2,263 available cells, the mean future-minus-near change is positive in 2,205 and negative in 58. However, **1,718 cells (75.92%) have P10 < 0 < P90**. The shipped percentiles describe model spread, not a statistical confidence interval or probability of a fire. Mean colors should not be described as a certain increase. A paired-model mean and its sign can disagree with a majority of model signs; the lowest delivered agreement is 8/21.

Examples:

| Containing cell | Near mean days/year | Future mean days/year | Mean change | P10–P90 of paired change | Sign agreement |
|---|---:|---:|---:|---:|---:|
| Paris | 27.77857 | 36.37143 | +8.59286 | −2.45 to +13.10 | 18/21 |
| Ho Chi Minh City | 34.94048 | 39.79762 | +4.85714 | −5.25 to +16.45 | 15/21 |
| Ouagadougou | 23.82381 | 25.32143 | +1.49762 | −4.70 to +8.00 | 12/21 |

Recommended wording: model ensemble mean; range of model changes when available. Avoid presenting P10–P90 as a confidence interval. The current city sheet does already mention model spread.

## Verified numerical contracts — fire weather

- Delivered SHA-256 matches the manifest: `43d964c3c02fcdbdb8073557b68bac02503c7858a8e092fe2e1d2c71f21e1b04`.
- All 10,368 cells checked; 2,263 available and 8,105 masked. Masked measurements remain NaN rather than zero. Burnable coverage remains finite in [0,1]. All level values in [0,366] days/year; paired change quantiles are ordered; agreement lies in [0,1].
- All 21 listed models have paired historical/SSP3-7.0 realizations. The importer chooses one first available single-digit realization per model, equally weights models, computes 20-year means and paired changes, then P10/P90 across model changes. It is a subset defined by the importer's available-member selection, not every CMIP6 realization.
- The maximum delivered difference between `future − near` and `pairedChangeMean` is 0.00000382 days/year, consistent with float32 storage.
- `fireAtYear` checked at every cell and every displayed year: 56,575 available cell-years, 202,625 missing cell-years. Linear levels, paired changes, scaled percentiles and north/west indexing all match the delivered file.
- Source periods and interpolation are disclosed: near 2016–2035, future 2041–2060; year labels 2026 and 2050 are labels for those climatologies. Intermediate years are illustrative linear interpolation, not simulated annual fire forecasts. The historical period is 1995–2014; the threshold reference is the source's local preindustrial 1850–1899 FWI 95th percentile.
- Fire weather is the count of days above that local threshold, not active fires, burned area, ignition probability, daily maximum temperature or physical wildfire damage. Cross-location comparisons inherit locally different thresholds. No climate-model bias correction; static 2016 land-cover mask; model spread only, no scenario uncertainty.
- GPU float16 quantization loses at most 0.04197 days/year of cell-center delta and turns one tiny nonzero cell change into zero; no sign reversal at cell centers. Linear spatial texture filtering intentionally produces blended values between neighboring available cells, so it should not be equated to a nearest-cell city measurement.
- The existing shipped-data verifier and its seven corruption tests pass. These checks do not reconstruct absent raw NetCDF files.

## Verified numerical contracts — national population

- Delivered SHA-256 matches provenance: `98f8d307ab6682d8a840aedda51e1ac824645afb6bbd8b47ee7e86fb01f074b1`.
- All 6,162 delivered values checked: 237 complete 26-year series, positive integer persons, array index `year − 2025`; years 2025–2050.
- The importer reads `TPopulation1July`, both sexes, country/area rows, Medium `VarID 2`; converts source thousands with `Decimal × 1000`, requiring an exact integral result and rejecting incomplete/duplicate series. Only TG is replaced by the separately hashed official Togo update. The provenance identifies that update as January 2026; its publication and values were not freshly verified against the remote source in this environment.
- Runtime map levels encode only decline from **2025**, clipped at 30%; runtime change mode uses **2026**. Population hover retains those two references and correct sign, with exact country totals; all 11,850 country/year/mode formatting cases pass. Negative population change produces positive decline-map severity, consistent with the shader. Growth is visually distinguished in change mode and not painted as decline in estimate mode.
- These are national/demographic-area population projections, not future city populations or climate-caused displacement estimates. Exact integers preserve the source's published numerical precision; they are not exact forecasts or observed future headcounts.
- China: 2026 1,412,914,089 → 2050 1,260,289,093, −10.802% relative to 2026. Vietnam: 102,177,431 → 110,008,908, +7.665%. No invented −30% country decline is used.

## Verification boundary and source access

Three distinct standards must remain separate:

1. **Shipped integrity and runtime consistency:** exhaustively verified here.
2. **Independent reconstruction from raw source:** not performed here. Original WPP CSV/gzip/update and fire NetCDF/mask files are absent. Importers and historical provenance describe the intended reconstruction but do not prove it happened correctly.
3. **Scientific validation of projections and composite-score assumptions:** not established by software checks. Would require domain review and independent raw-source comparison, including scenario choice, model ensemble selection, bias treatment and national aggregation meaning.

Direct unauthenticated access was attempted on ESSD, ETH Zurich Research Collection and UN WPP. Every request returned proxy `CONNECT 403 Forbidden`. Exact attempted URLs and errors are in `results.json`; do not report those sources as freshly read. Official source references retained in the repository are:

- <https://essd.copernicus.org/articles/15/2153/2023/>
- <https://doi.org/10.3929/ethz-b-000583391>
- <https://population.un.org/wpp/>

## Applied geography correction

The source geography was independently retrieved from Natural Earth's official GitHub mirror, pinned to commit `ca96624a56bd078437bca8184e78163e5039ad19`. Its 50m **map units**, rather than sovereign-country polygons, explicitly identify French Guiana, Guadeloupe, Martinique, Réunion, Mayotte and Caribbean Netherlands with distinct `ISO_A2_EH` codes. Gibraltar's polygon comes from the same commit's 10m map units; no geographic box or invented territory was substituted.

`tools/pays_raster.py` now reconstructs the globe's geographic raster from those checked source files. It groups by ISO code, uses north-first/west-first pixel centres, respects polygon holes and retains sentinel 0 for unavailable map units. The resulting palette has 249 entries including 0, within the existing one-byte / 256-column texture contract. Every one of the 237 annual UN series has an ISO entry. Both source SHA-256 values, method, delivered output hashes and limitations are preserved in `data/pays-provenance.json`.

Corrected actual source-contained cells: French Guiana 246, Guadeloupe 8, Martinique 2, Réunion 9, Mayotte 2, Caribbean Netherlands 1. Every one of these cells was separately checked by an independent point-in-polygon implementation using the unchanged official geometry extract. An independent second reconstruction produced byte-identical PNG and index files. Nineteen geographic witnesses and delivered provenance hashes pass.

**Coverage remains incomplete at 1/6° resolution.** Twenty-two UN areas have no containing raster cell centres: AI, AS, AW, BL, BM, CK, GG, GI, KN, MO, MS, NR, PM, SC, SH, SX, TC, TK, TO, TV, VA, WF. Their demographic series still exist. No artificially enlarged pixel was used to pretend that their map footprints are represented. At the sampled Gibraltar point the raster now returns 0 instead of Spain. Coast/border points can also differ from their true coordinate's administrative unit: Maseru's containing cell centre is in South Africa; Nuuk's containing cell centre is in the sea. This is a coarse map-cell label, not a precise pointer-coordinate administrative lookup. Once the raster is available, a zero cell must remain unavailable instead of being filled with the nearest city's national series.

Full official source files total about 16 MB and are not included in the change. The source URLs/hashes permit reconstruction; the 37 KB unchanged eight-territory extract is retained only as an audit test fixture. Local full-source cache during this audit is `/tmp/terra-natural-earth-audit/`.

## Reproduction

```sh
python audit/2026-10-01/fire-population/audit.py
node audit/2026-10-01/fire-population/runtime.mjs
python tools/verifier_fire_weather.py
python tools/verifier_fire_weather.py --autotest
node tools/qa/science.mjs
python tools/pays_raster.py --verify-shipped
python audit/2026-10-01/fire-population/geography.py
node audit/2026-10-01/fire-population/browser.mjs
```

The first command reads the original `57a0757` Git objects, so its before-correction territory findings remain reproducible after the raster correction. Audit commands write evidence only into this audit directory. `results.json` records original delivered hashes, all-cell statistics, sample coordinates and country-series examples; `runtime-results.json` records exhaustive runtime helper checks; `geography-results.json` records corrected-source containment. The browser script additionally checks loaded runtime readers and GPU texture inputs.

To reconstruct from the cached complete official geometry without product writes:

```sh
python tools/pays_raster.py --source-50m /tmp/terra-natural-earth-audit/natural-earth-map-units.geojson --source-10m /tmp/terra-natural-earth-audit/natural-earth-map-units-10m.geojson --autotest
```

Without cached paths, the importer downloads the pinned official sources, verifies their hashes, and fails if either source differs. The only product artifacts edited in this audit track are `data/pays.png`, `data/pays_index.json`, new `data/pays-provenance.json` and `tools/pays_raster.py`.

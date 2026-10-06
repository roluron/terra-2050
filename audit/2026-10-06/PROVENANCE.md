# Terra scientific provenance review, 6 October 2026

Numerical source reviewed: commit `d7ac819df02e336ca2557be5f0c17e4097f82abd`, repository `sources/terra-2050`. Review is read-only for repository data and importers. This is a separate same-family review, not a different-model validation. New evidence below comes from fresh official source downloads and source review; it does not simply revalidate the old audit by reading its conclusions. The numerical sweeps and browser checks are separate evidence.

## Observed reconstruction evidence

All four scripts below were executed successfully from the original workspace captures directory with Python 3.10, NumPy, rasterio and Pillow. Downloads stay in memory; scripts write no repository or raw-data files. Source hashes are checked before transformations. Climate, population and flood scripts implement the checked transformations separately from product importers. Geography deliberately reuses the product rasterizer with fresh upstream geometries, so this is reproduction evidence, not an independent geometry algorithm.

| Evidence script | Fresh official source check | Shipped comparison | Result |
| --- | --- | --- | --- |
| `upstream-climate.py` | 9 complete WorldClim downloads; all SHA256 match manifest | All 3,110,400 coarse fields, 3,110,400 coverage counts, 409,188 city-point fields | Exact, zero differences; saved-script run 33.7 seconds |
| `upstream-population.py` | Complete WPP2024 gzip and official update ZIP; both SHA256 match | All 237 country/area codes and 6,162 annual values, 2025–2050 | Exact, zero differences; update affects TG only |
| `upstream-flood-samples.py` | All 14 complete official WRI TIFFs; all SHA256 match | 504 field comparisons: eight native 60×60 windows and six actual city points per source | Exact, zero differences; 23.4 seconds; sampled transformation check only |
| `upstream-geography.py` | Both pinned official Natural Earth GeoJSON hashes match | All 2,332,800 raster pixels, complete ISO palette, 19 witnesses | Exact, zero differences; 249 palette entries including sentinel |

Scripts bind their manifest and shipped-data paths to this workspace. They assert failures and print compact evidence. They require network access and the listed Python packages; they are evidence tools rather than product tests. Fresh downloads matched complete source hashes, not just HTTP headers. This does not establish the physical accuracy of the originating models. No numerical correction is warranted by these results.

## Heat, annual temperature, aridity and warming

[WorldClim historical documentation](https://www.worldclim.org/data/worldclim21.html) confirms monthly temperature in °C and precipitation in mm for 1970–2000. [CMIP6 documentation](https://www.worldclim.org/data/cmip6/cmip6climate.html) confirms downscaling and bias correction against that baseline and the 2021–2040 and 2041–2060 periods. Terra selects MPI-ESM1-2-HR under SSP3-7.0, rather than a multi-model climate ensemble.

`tools/import_climate.py:117` derives annual temperature as the mean of the 12 monthly `(tmin+tmax)/2` values, annual precipitation as their sum, and hottest-month temperature as the maximum of monthly mean daily maximum temperature. This last metric is not the hottest day, a heatwave count, a heat-stress index or mean annual temperature. De Martonne is `P/(T+10)` with T>-10; native invalid cells remain missing. `tools/import_climate.py:283` aggregates 3×3 native 10-minute cells using the same finite spatial support across all three periods. City fields retain native containing-cell values at rounded stored city coordinates. Every packaged endpoint field and coverage count was reconstructed exactly from fresh originals.

`climate-data.mjs:20` interpolates T and P between the historical midpoint 1985 and the near anchor 2030, then to 2050; it recomputes De Martonne from these ingredients. Stored coarse De Martonne is instead the mean of native indices (`tools/import_climate.py:337`). These two mathematical quantities can differ without corruption. Runtime uses ingredient-derived De Martonne consistently. Dryness is a climatic index, not measured soil moisture, water access or agricultural drought.

`global-summary.mjs:96` averages changes in each location's hottest-month temperature; locations can have different hottest calendar months. It is not one common month or observed global annual warming. `global-summary.mjs:15` uses cosine-of-latitude centre weights multiplied by native coverage, an approximate represented-area average. Annual values are illustrative interpolation of climatologies, not annual observations or weather predictions. Coverage excludes missing locations; it is not the whole land surface.

Root's 2026-only past-tense change in `reading-copy.mjs` and its `global-summary-copy.mjs` caller was inspected. The visible model qualifier and 1970–2000 reference preserve the estimate's meaning; future copy remains conditional. Past tense alone would not establish observed 2026 conditions.

## Extreme fire weather

The [source paper](https://essd.copernicus.org/articles/15/2153/2023/) describes annual days above a local preindustrial FWI 95th-percentile threshold, regridded to 2.5°. This is potential fire weather, not fire occurrence, burned area, smoke concentration or deaths. The product uses the daily mean relative-humidity branch, without bias correction, plus a static ESA 2016 land-cover exclusion for infrequently burning surfaces. That branch differs from daily minimum-humidity FWI.

`tools/import_fire_weather.py:121` averages historical 1995–2014, near 2016–2035 and future 2041–2060, selecting paired realizations and weighting models equally. The 21-model mean, percentiles and sign agreement describe model spread, not calibrated probabilities. `climate-data.mjs:10` interpolates between near and future endpoint estimates for 2026–2050.

**Upstream numerical verification remains incomplete.** The [ETH archive DOI](https://doi.org/10.3929/ethz-b-000583391) and [official bitstream](https://www.research-collection.ethz.ch/server/api/core/bitstreams/21ebf431-5c20-4a85-82c6-bb96df91daaa/content) could not supply original NetCDF data in this session; both content and metadata endpoint attempts returned 429. Source hashes and importer logic therefore do not independently prove these shipped values.

**Concrete unresolved provenance discrepancy:** paper §2.3 says 1850–1900, while `tools/import_fire_weather.py:150` hardcodes 1850–1899 and claims it is recorded in source NetCDF. Importer checks do not establish that attribute. Inclusive years versus an exclusive upper endpoint cannot be resolved without original attributes/threshold code. Public copy now uses “local preindustrial FWI95 threshold” until resolved; the original metadata is retained with this discrepancy recorded rather than inventing a replacement period or altering data.

## Coastal and river floods

[WRI's catalogue](https://datasets.wri.org/datasets/aqueduct-floods-hazard-maps) and [methodology](https://files.wri.org/d8/s3fs-public/aqueduct-floods-methodology.pdf), appendix A.1.1, describe raw unprotected hazard depths in metres. Terra selects a 100-year return period, RCP8.5, five river climate models and coastal median sea-level projection without subsidence. River baseline is 1960–1999, near 2030 represents 2010–2049, and 2050 represents 2030–2069. Coastal historical GTSR is 1979–2014; coastal 2030/2050 are sea-level epochs. They have no common observed 2026 baseline.

`tools/import_floods.py:105` coarse-aggregates 60×60 valid native 30-second cells: mean depth includes valid zeros; flood fraction counts depths strictly greater than 0.5 m over valid cells. City-point depths (`tools/import_floods.py:384`) and coarse fractions are different metrics. Missing is not zero hazard. `flood-data.mjs:23` interpolates with historical period midpoint anchors, illustratively; model depth and fraction averaging does not simulate a single ensemble flood. Empirical percentiles are model spread, not probability bounds. WRI's protection-aware risk module is separate and is not imported. Coastal and river indicators do not model compound flooding.

All upstream file hashes and sampled transformations match. The native arrays, all coarse cells and complete city-point outputs were not exhaustively reconstructed in this independent flood check. Global summaries use latitude and valid-cell coverage weighting, not exact polygon area or population exposure. No property-specific flood risk is established.

## Population

[UN WPP2024](https://www.un.org/development/desa/pd/world-population-prospects-2024) supplies medium annual projections for countries and areas. The [official CSV field notes](https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_Demographic_Indicators_notes.csv) identify `TPopulation1July` in thousands. `tools/import_population.py:20` uses Medium country/area rows, multiplies by 1,000 with Decimal, and requires complete 26-year series; it does not interpolate annual observations. The official update archive replaces Togo (`tools/import_population.py:49`). Fresh base and revision source reconstruction matches every shipped annual value.

`global-summary.mjs:204` totals the revised country/area records. This is correctly described as their sum, not the unmodified original UN World row:

| Year | Original WPP World row | Sum with Togo revision |
| --- | ---: | ---: |
| 2025 | 8,231,613,070 | 8,230,483,094 |
| 2026 | 8,300,678,396 | 8,299,527,483 |
| 2030 | 8,569,124,911 | 8,567,893,067 |
| 2050 | 9,664,378,587 | 9,662,753,839 |

National population change is not a city-specific projection. The medium scenario is not guaranteed. Official country/area classification includes territories separately.

## Geography, city directory, legacy files and score

`tools/pays_raster.py:94` rasterizes pinned Natural Earth map units from [the official repository](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19/geojson). All current pixels and palette reproduce exactly from newly fetched geometries. Cell-centre classification at 1/6° does not enlarge tiny areas; some demographic areas have no sampled map cell. `tools/pays_raster.py:181` records simplified, non-legal geography and the pinned source's disputed-boundary policy.

`tools/pipeline.py:624` identifies GeoNames cities15000 and alternate names as the city directory source. The [official GeoNames readme](https://download.geonames.org/export/dump/readme.txt) describes population>15,000 **or capitals**, so the legacy comment claiming all records meet the population cutoff is too strong. `places.json` has no pinned archive hash/date or retained GeoNames IDs; the old source archive is absent. Independent reconstruction of the original city names, aliases and population snapshot is consequently incomplete. `index.html:3514` decodes stored coordinates at 0.01°. Those are city reference points, not building coordinates. GeoNames population weights are heterogeneous directory figures, separate from UN annual national projections. `index.html:598` and `index.html:704` country measures/scores are population-weighted **listed-city** measures; they do not represent the entire national population or rural surface.

`tools/pipeline.py:25` explicitly refuses regeneration because it cannot reproduce the current legacy schema and omits generators for `thermo.bin`, `maree.bin` and `grille_d.png`. `grille_a_*`, `grille_b_*`, `grille_d`, `thermo`, `maree`, `calibration.json` and legacy `pays.json` lack independently reproducible contemporary source bindings in this review. Current runtime scientific quantities use modern loaders; `index.html:961` keeps former A/B/D textures empty. Active `grille_c.png` green channel remains a land mask (`index.html:1173`), with unrecovered generation/source manifest. `rivers.json` is presented as decorative Natural Earth river lines (`index.html:1436`); no upstream snapshot hash was found, and it is not a river-flow projection. These limitations prevent claiming every auxiliary data byte has independently verified provenance.

`index.html:619` scales heat 20–50°C, De Martonne 0–60, fire 366 days/year, flood 0–3 m and warming 0–5°C. `index.html:650` weights these axes 22%,18%,12%,20%,16%,12%; `index.html:674` combines half weighted mean and half worst axis, requiring all six available. Those are chosen design scales/weights, without empirical validation identified. The experimental score is not a probability, health forecast, relocation recommendation or validated habitability metric. Combining SSP3-7.0 climate/fire and RCP8.5 floods is an explicit mixed-scenario comparison, not a coherent single scenario.

## Seven general human-impact examples

`human-impact-copy.mjs:37` supplies conditional examples. Its scope disclaimer correctly says these are general effects, not calculated local outcomes. Primary sources support the broad pathways:

- Heat: [ILO report and executive summary](https://www.ilo.org/publications/working-warmer-planet-effect-heat-stress-productivity-and-decent-work) support lost outdoor work capacity/hours and economic loss. Individual earnings effects remain conditional on work and pay conditions.
- Fire: [WHO wildfires](https://www.who.int/news-room/fact-sheets/detail/wildfires-and-health) explicitly describes smoke travelling thousands of kilometres and harming air quality/health.
- Dryness: [IPCC Water chapter](https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-4/) discusses drought-related crop and food-production losses. Terra's climatic dryness index itself does not measure those losses or soil moisture.
- Coast: [SROCC §4.3.3.4.1](https://www.ipcc.ch/srocc/chapter/chapter-4-sea-level-rise-and-implications-for-low-lying-islands-coasts-and-communities/7/) supports marine-flood salinization of groundwater and drinking-water availability. It is a possible pathway rather than a wells forecast.
- Rivers: [WHO floods](https://www.who.int/health-topics/floods) supports health-service disruption; [WHO Floods and health](https://iris.who.int/bitstream/handle/10665/375390/WHO-EURO-2014-8519-48291-71705-eng.pdf?sequence=1) additionally identifies blocked transport and flooded ambulance stations.
- Warming: [WHO mosquito advice](https://www.who.int/europe/news-room/questions-and-answers/item/public-health-advice-on-mosquito-borne-diseases) identifies warmer temperatures among multiple spread drivers, including trade/travel. Temperature alone does not determine mosquito establishment or disease transmission.
- Population: [OECD linked report](https://www.oecd.org/en/publications/access-and-cost-of-education-and-health-services_4ab69cf3-en/full-report/component-5.html) discusses school and hospital/service closures as populations shrink, with adaptation choices affecting outcomes. Country shrinkage does not imply every city's services close.

Exact IPCC links returned403 on direct opening; corresponding official indexed chapter text supplied relevant passages. OECD page opening intermittently timed out but official indexed report/chapter passages were accessible. No direct quotations or Terra-derived causal quantification are asserted here. No concrete false consequence claim was established; retain conditional wording and the general-example disclaimer.

## Applied corrections and remaining verification gaps

1. The precise fire-threshold period has been removed from public prose until original attributes resolve 1850–1900 versus 1850–1899. No physical data edit is justified by that unresolved textual difference.
2. `DATA-AUDIT.md` now distinguishes the October1 access failures from the current successful WorldClim/UN/WRI/Natural Earth checks and continuing ETH gap.
3. Do not claim all data are scientifically validated: fire upstream extraction, original GeoNames snapshot, active legacy land-mask generator and decorative river snapshot remain unreproduced; flood transformation checks are sampled. Models, arbitrary score choices and annual interpolation are not validated by numerical exactness.
4. Preserve the distinction between city/native readings, coarse map fractions, represented-area global summaries, listed-city national scores, and UN national demographic projections. Their units/support differ; they cannot be interchanged.

No numerical source corruption was established. The completed source reconstructions support exact packaging fidelity within their stated scope, with the remaining limits explicitly retained.

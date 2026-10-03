# Coastal and river flood audit — 1 October 2026

Audited product revision: `57a0757d101a51206ba9758cfb59cbe45e0d35b2`. This is a read-only audit: no shipped source data, calculation, shader or UI was edited by this task.

This report records the **pre-fix baseline**. The parent task subsequently changed active-filter hover to local model-cell fractions, added explicit experimental-score and source-support copy, included river interpolation in method notes, and preserved small nonzero changes in the formatter. Follow-up browser evidence is documented separately in [ui/README.md](ui/README.md). The original-raster acquisition limit and the scientific/spatial-support limitations below remain relevant; UI fixes do not certify the underlying projections.

## Conclusion

The shipped flood data have real historical, 2030 and 2050 bands. They are **not held constant to 2050**. Full shipped-payload checks and exhaustive runtime comparisons found no material arithmetic, orientation, model-pairing, unit, valid-zero or missing-data defect. This establishes internal fidelity to the packaged inputs, **not independent verification of the original WRI TIFFs or scientific certification of the site**.

The main defects are interpretation and spatial support. A red river-flood pixel represents a change in the fraction of native model cells deeper than 0.5 m inside a coarse regional cell. The current country hover reports a population-weighted average of sampled city-centre depths, with regional-cell depth fallback where native points are unavailable. These are different quantities and different places. They cannot validate one another. In addition, a zero depth at one city-centre cell cannot substantiate an assessment of the safety or habitability of the whole city.

## Prioritized findings

1. **P1 — Flood hover does not describe the coloured map.** `index.html` shader uses coarse-grid fraction above 0.5 m in value mode and its change in percentage points in change mode (`1141–1144`, `1182–1185`). `montrerSurvol` uses `mesuresLieu` plus `physicalHover`, producing country-listed-city mean depth in metres (`3797–3805`). The tooltip admits this difference in small copy but visually presents the depth as the explanation of the red pixel. Recommend displaying the same local regional fraction as the map, clearly identifying its spatial support and comparison reference. Keep point depths in the detailed view.

2. **P1 — City-point zero is not whole-city low risk.** Of 34,099 listed city points, 33,814 have a valid zero coastal depth in 2050; only 243 have positive coastal depth. River points have 27,540 valid zero depths and 4,644 positive depths. These zeros were not manufactured from NoData in the packaged payload. Nevertheless, one cell at a stored coordinate is an unsuitable basis for a statement that all of a large city is safe from flooding. HCMC, Dhaka and Paris have zero sampled native river depth while their containing regional cells include inundated model cells. The experimental score reuses those point depths. Keep it explicitly experimental and avoid using a zero reading as citywide assurance or a certified habitability judgement. A defensible citywide assessment would require matched urban geometry and an exposure/area statistic, plus a documented policy for defences and local processes; that is a new scientific method, not a label change.

3. **P1 — Country statistic mixes spatial supports and is not a national measure.** `mesuresLieu` averages all available city readings using listed-city population. Native cell depths and regional mean depths enter the same statistic. River fallback occurs for 1,793 cities; coastal fallback for 40. These are mathematical summaries of the available list, not national territory, national population exposure, or a representative national flood depth. The tooltip's phrase “available-city mean” is helpful but omits how many city entries use regional fallback. Country uncertainty cannot be obtained by copying the first city's model agreement or averaging independently computed percentile bounds.

4. **P2 — 2026 is an illustrative baseline; the river method note omits its interpolation disclaimer.** There are no annual 2026 WRI observations in these files. River 2026 equals 92% of the interpolation from the historical anchor 1980 to the 2030 epoch; coastal 2026 is 88.0597% of the interpolation from historical midpoint 1996.5 to 2030. The historical periods are different. `index.html:1635` excludes `fleuves` from the visible “interpolated estimates, not annual forecasts” note even though the river implementation interpolates. Include the river filter and state the actual source epochs/periods. Do not describe the illustrated 2026→2050 difference as measured change.

5. **P2 — Mean colour does not imply model consensus.** The river map averages five equally weighted matched models. For inundated fraction there are 21,430 regional cells with a nontrivial mean increase from illustrated 2026 to 2050. In 9,366 of them fewer than three models increase; in 1,866 at least three models decrease while the mean increases. Conversely 1,439 cells have mean decrease although at least three models increase. This is a valid ensemble mean, but a headline predicting a rise everywhere red would exaggerate certainty. Label the mean and acknowledge disagreement. The available 10–90% empirical model spread is descriptive, not a confidence interval or probability.

6. **P2 — Small coverage and smoothing limit exact geographic readings.** A coarse 0.5° cell can be valid with just 1/3,600 native cells available. There are 2,436 river and 4,145 coastal coarse cells with coverage below 10%. The source fraction's denominator is valid native cells, not the full coarse cell or population, and it is unweighted by exact cell area. The shader smooths adjacent scientific texture cells bilinearly; a displayed pixel is not necessarily a raw containing-cell value. Any local tooltip must state the coarse-cell support rather than imply property precision or exact area exposure. Native point coordinates are rounded to 0.01° (~1.1 km north–south), while native source resolution is 30 arcseconds (~0.93 km). “City-centre grid cell” describes the sample, not a surveyed centre or full city.

7. **P2 — Hazard is conditional, not a daily river level or realised flood forecast.** Source contract uses RCP8.5, 100-year return-period floods, river climate periods 1960–1999 / 2010–2049 / 2030–2069, and five river models. Coastal future uses the 50th percentile sea-level scenario and excludes subsidence. Flood defences and compound coastal/river flooding are not modelled. This differs from the site's climate/fire SSP3-7.0 scenario. Never call this a common-scenario forecast, an AR6 coastal forecast, current flooding, or a prediction of ordinary river level in a specific year.

8. **P3 — Sign agreement at exact zero has floating-point sensitivity.** Across the exhaustive runtime audit, two sign-agreement comparisons differed when mathematically zero or negligible paired changes fell on floating-point sign boundaries. All corresponding levels, deltas and quantiles agree within `1e-10`. This does not cause a material colour or depth error, but percentages of model agreement should use a documented negligible-change tolerance if they are displayed as evidence of certainty.

## Reproduced examples

Papua New Guinea country-listed-city river mean:

- 13 cities, 4 regional fallbacks, total listed population 628,855.
- Illustrated 2026: **0.029665273770440957 m**.
- 2050: **0.031485445413815885 m**.
- Difference: **+0.0018201716433749286 m** (about +1.82 mm).
- The delta rounds to `0 m` at two decimal places. The two endpoint depths round to `0.03 m`. Neither rounded result demonstrates no local flood change.

HCMC stored point (10.82°N, 106.63°E):

| Metric | Illustrated 2026 | 2050 |
| --- | ---: | ---: |
| Native city-point coastal depth | 0 m | 0 m |
| Native city-point river depth | 0 m | 0 m |
| Containing regional coastal fraction >0.5 m | 8.256% | 9.975% |
| Containing regional river fraction >0.5 m | 23.077% | 25.449% |

These are all internally consistent packaged readings. The regional fractions cannot be interpreted as percentages of HCMC population or HCMC administrative area.

## Validation completed

`python audit/2026-10-01/floods/check_payloads.py` independently decodes both full global grids (720×360 each) and all 34,099 city records with NumPy. It checks compressed/decompressed lengths and SHA-256, coordinates/place order, source descriptor consistency across grid/city packages, every coverage field, every nonnegative depth, fractions/agreements in [0,1], all missing-cell masks, valid-zero preservation, native-cell count denominator, the physical lower bound mean depth ≥ 0.5×fraction, all-cell stored river model quantiles and historical-relative sign agreements. It independently reconstructs regional fallback, country weighting, temporal references and the examples above.

`node audit/2026-10-01/floods/check_runtime.mjs` compares the production reader to independently evaluated equations for every native city row at all 25 annual timeline years, the historical anchor, and 2038.25; every global cell at 2026, 2030, 2038.25 and 2050. Result: **34,022,156 assertions passed**, with **2 explicitly counted floating-point-scale sign-agreement ambiguities**. Per hazard it exercises 920,673 native-city outputs and 1,036,800 containing-grid-cell outputs. Missing values remain unavailable; valid zeros remain available. It checks paired-model means, quantiles, signs, physical units, source scenario and RP100 metadata.

`node tools/qa/flood-data.mjs` passed the existing Dhaka/grid/matched-model/hash regression suite. Running `tools/import_floods.py` is blocked locally by missing Rasterio; source acquisition is independently blocked by network policy.

## Verification limit and primary-source links

An HTTPS range request to the original WRI raster URL failed on 1 October with `Tunnel connection failed: 403 Forbidden` from the environment proxy. No local original TIFF or methodology PDF cache was available. **The original 30-arcsecond raster sampling and full 60×60 reduction could not be freshly reconstructed in this audit.** Existing provenance hashes and previous repository audit reports are evidence of prior work, not an independent current reread of WRI files. No fresh external scientific review or scientific certification is established by these software checks.

Primary-source links recorded in the package (not newly read in this restricted environment):

- [WRI Aqueduct Floods catalog](https://datasets.wri.org/datasets/aqueduct-floods-hazard-maps)
- [WRI methodology PDF](https://files.wri.org/d8/s3fs-public/aqueduct-floods-methodology.pdf)
- [Original historical river TIFF](https://aqueduct.wridata.org/AqueductFloods20/inunriver_historical_000000000WATCH_1980_rp00100.tif)
- All fourteen specific TIFF URLs and their recorded SHA-256 are retained in `data/flood-metadata.json`.

Machine evidence: `payload-results.json`, `runtime-results.json`. Do not present these integrity and arithmetic checks as proof that every flood projection is physically correct.

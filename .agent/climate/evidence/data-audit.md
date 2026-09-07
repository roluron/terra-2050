# Terra 2050 data audit — 2026-09-07

Read-only audit of delivered data and scoring. `audit.py` reproduces decoded record checks and the HCMC/Paris arithmetic; `data-audit.json` includes evidence. `city-model-scores.csv` contains the complete endpoint audit. No data was regenerated or scientifically validated against local observations.

## Observed all-record checks

34,099 city records; 34,082 scored and 17 explicit no-data sentinels. All decoded coordinates and scored penalties are in range. Binary lengths match 24-byte city, 6-byte thermal and 2-byte tide records. Calibration weights equal runtime weights and sum to one; all 21-entry quantile arrays and score quantiles are monotonic. All-record invariant success proves structural consistency, not real-world accuracy.

2026 and 2050 penalties are identical for 34,082 river, 28,836 coastal, 15,928 drought, 7,712 fire, 1,815 thermal and 72 climate-shift records. Fixed river values are deliberate current-hazard data. Other unchanged values can be zero, saturated or rounded, and should never be animated into fabricated numerical change.

## Why Ho Chi Minh is lower

Current score = round(100 × (1 − 0.5 × weighted mean penalty − 0.5 × worst penalty)). Weights: thermal .22, aridity .18, fire .12, coastal .20, river .16, climate shift .12. These are application choices, not a scientifically validated universal city rating.

HCMC 37 (2026),23 (2050); Paris 66,63. HCMC 2050 penalties: .820,0,.456,.944,.732,.404. Paris: .104,.356,.328,0,.476,.448. HCMC weighted mean .58952 and worst .944 create score23; Paris .25624/.476 create63. At2050 the worst-axis term alone costs47.2 points for HCMC and23.8 forParis. HCMC's coastal exposure, river exposure and humid heat explain the algorithmic gap. This is not a quality-of-life comparison.

Delivered supporting HCMC snapshots: coastal flooded fraction2050 .216; connected land below floodline+1m .548; median terrain3m; subsidence .17m; 100-year stormtide1.94m; river hazard fraction .588; river depth p90 4.1m. Paris: coastal0; median87.6m; river fraction .192; riverp90 9.2m. These are decoded model outputs, not independently measured facts. HCMC population14,002,598 yields20km assessment radius; Paris2,138,551 yields12km. Inputs use differing urban boundaries; the comparison is not administrative-area matched.

## Findings at audit baseline

The UI now labels coastal details as a fixed 2050 snapshot, distinguishes annual interpolation and fixed river references, qualifies aridity/fire/heat/climate-shift proxies, exposes country sample and provenance limitations, and labels capped thermal estimates. The generator, missingness, fallback and independent validation limitations remain unresolved. Data values and scoring weights were not altered.

### Original findings

1. **Generator is not reproducible for current outputs.** `tools/pipeline.py:527-544` implements old fixed2m/ETOPO coastal logic; current UI describes FABDEM30m plusCOAST-RP connectivity. Lines842-843 store old f5 and no altitude+5000 offset, whereas client3387-3410 decodes new semantics. Pipeline does not generate thermo.bin, maree.bin or grille_d.png. Canonical original repository tools directory also contains no newer generator. Do not run it over delivered data.
2. **Coastal detail is a2050 snapshot at every selected year.** `CRITERES mer.detail` ignores t; binary has f50 and f(line+1m), not f26. Current-year flooded fraction cannot be reconstructed exactly from capped nonlinear penalties. Label2050 snapshot explicitly, while current index and delta may interpolate.
3. **False scientific precision in wording.** Drought proxy is annual precipitation divided by proxy mean temperature (tmax−5); it cannot establish water-reserve depletion or drinking-water supply. Fire is a custom warm/dry-month/precipitation-fuel heuristic, not observed wildfire probability. Climate shift blends temperature and precipitation but labels result°C; exact current formula missing. Call it a model indicator, avoid presenting it as pure measured temperature until provenance recovered.
4. **Timeline is interpolation, not annual climate observations.** WorldClim monthly values are20-year period averages; pipeline interpolates historical1970–2000 midpoint1985 and2030/2050 endpoints. Population is stored2025/2050 but old panel heading says2026→2050. Use correct baseline and explicitly describe intermediate values as interpolation.
5. **Missingness is not preserved per hazard.** Whole-city sentinel exists, but river sampling converts nonfinite/missing raster pixels tozero (`pipeline.py:516`) and clamps outside rows. A city can therefore be assigned low river exposure when coverage is unavailable. Published JRC coverage excludes some small basins/islands. Coastal VLM absence also becomeszero; tide fallback has no stored flag. Do not claim zero means proven absence.
6. **COAST-RP fallback attribution.** Historical commit6c54653 states9,345 cities used station within150km and141 used globalmedian; maree.bin does not retain source/fallback flags. UI should not call every tide value a verified local observation.
7. **Country rating is urban sample aggregation.** Runtime averages city scores by GeoNames population, not national territory/population risk; no deduplication or consistent city-boundary coverage guarantee. FR sample33.09m vs national66.65m, VN68.78m vs101.60m. Explicit city-sample wording needed.
8. **Thermal day counts are derived and capped.** HCMC heat32 endpoint both300 because storage/model cap, while heat40 rises76.08→120. Inputs are monthlymean climate converted with assumed daily distribution and fixedrelativehumidity; no raw daily observation validation. Old pipeline Rothfusz lacks NOAA adjustments and differs from latest thermal formula, reinforcing regeneration blocker.

## Historical provenance (verified git records, not independent reproduction)

- 34e6798dfd9c19ebfbc4a1a17edc7d46d86046ac: negative-altitude offset and connectivity update.
- 11ba5d4110e6cc7f53c7fb16400d3dea7e323ea8: new climate-shift grid from raw WorldClim/CMIP6.
- d155f2de48145bc272dd085818450ef0964ce1e7: thermal second-threshold formula.
- 49be27779d582bd6c7e85ad1231035934a2d7b8b: FABDEM30m + connectivity,2,474 tiles/47.5GB claimed, no script committed.
- 6c54653f9fc1248358a4531cac892b24205dcf92: COAST-RP station/fallback updates, no script committed.

## Primary documentation checked

- WorldClim https://www.worldclim.org/data/cmip6/cmip6climate.html : downscaled, bias-corrected CMIP6;20-year monthly means; multiple models/scenarios. Supports source type, not these delivered city outputs.
- JRC https://data.jrc.ec.europa.eu/dataset/jrc-floods-floodmapgl_rp50y-tif : global hazard depth grids, return periods, coverage exclusions, explicitly not official local hazard map. This is dataset-family documentation; local binary is rp100.
- COAST-RP https://figshare.com/articles/dataset/COAST-RP_A_global_COastal_dAtaset_of_Storm_Tide_Return_Periods/13392314 : current-climate stormtides, ERA5/STORM,100-year level available. It is not itself a2050 storm projection.
- NOAA https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml : Rothfusz domain and humidity adjustments.
- UN https://population.un.org/wpp :2024 official projections and uncertain medium variant; annual local interpolation here is application-derived.
- IPCC https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/ : global sea-level projections use1995–2014 reference; local pipeline0.15m relative2020 cannot be verified from its Table9.9 comment alone.
- Zenodo19830370 direct request returned429. Dataset identity/date therefore not independently confirmed here; UI2025 vs indexed2026 publication requires follow-up.

Recommended completion claim: all city records structurally audited and score arithmetic checked, UI assumptions exposed; scientific accuracy of every city remains UNVERIFIED pending reproducible current generator, source manifests and independent geographic validation.

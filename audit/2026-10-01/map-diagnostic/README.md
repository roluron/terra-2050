# Map diagnostic consistency audit — 2026-10-01

`map-diagnostic.mjs` reads the containing physical-data cell. It deliberately
does not substitute a city value or a population-weighted country mean for the
map reading. National population stays in the existing annual population reader.

The test `node tools/qa/map-diagnostic.mjs` passed on the shipped payloads:

| Filter | Cells checked | Available | Missing |
| --- | ---: | ---: | ---: |
| Heat | 259,200 | 89,308 | 169,892 |
| De Martonne index | 259,200 | 57,269 | 201,931 |
| Mean temperature anomaly | 259,200 | 89,308 | 169,892 |
| Fire weather | 10,368 | 2,263 | 8,105 |
| Coastal flooding | 259,200 | 69,991 | 189,209 |
| River flooding | 259,200 | 64,525 | 194,675 |

In total, 1,306,368 filter-cell combinations were checked at 2050. These are
global grids, so missing cells include oceans and explicitly unsupported land
cells. They are not coverage percentages for the world's population or cities.
All 25 timeline years were also checked at Dhaka, Paris, HCMC, Port Moresby,
Beijing and a Pacific ocean location (900 filter/location/year combinations).
Expected values are independently calculated from binary fields rather than
calling the production climate, fire or flood interpolation functions. The test
also checks payload hashes, valid zero values versus missing data, matched river
model subsets, fractional flood spread and sign agreement, units, 2026/2050
bounds, latitude bounds, poles, dateline wrapping and population separation.
Full numerical examples and count summaries are in `results.json`.

## Indicator meanings and limits

- Heat is the hottest month's mean daily maximum temperature, not a forecast of
  daily extremes or hot-day counts. Climate uses one model, MPI-ESM1-2-HR under
  SSP3-7.0; the source historical climatology is 1970–2000.
- The displayed De Martonne index is `P / (T + 10)` calculated after interpolating
  the containing cell's temperature and precipitation ingredients. It is not
  the mean of the stored native De Martonne indices, water supply, or a count of
  drought events. All 2026/2030/2050 encoded ingredients must be available, with
  temperature strictly above −10°C and nonnegative precipitation.
- The warming value is the cell's annual mean temperature anomaly relative to
  the historical climatology. Its timeline change subtracts the derived 2026
  anomaly, not the historical baseline again.
- Fire weather is days per year above the local preindustrial FWI 95th percentile,
  on the coarse 2.5° model grid. It is neither active fires nor burned area. Its
  2026 baseline represents the 2016–2035 model period; 2050 represents 2041–2060.
  Spread describes paired model changes, not confidence intervals.
- Flood map readings are percentages of valid native source cells deeper than
  0.5 m during a modelled 100-year event, summarized within a 0.5° cell. They do
  not report depth, river water level, daily sea level, population exposure or
  exact area fraction. Changes use percentage points. River models are matched
  across historical, 2030 and 2050 before levels, spread and agreement are
  calculated. Floods use RCP8.5 and therefore do not share a common scenario with
  climate and fire. The modelled event excludes flood protection; the coastal
  source also excludes subsidence.
- Annual slider values are illustrative interpolation of climatologies or model
  epochs. They are not observed 2026 values or annual forecasts. The actual
  source periods and spatial resolution accompany each available reading.

These checks verify the implementation against the project's payloads and
definitions. They do not independently validate the underlying scientific
models, observations, provider rasters or future outcomes.

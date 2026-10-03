#!/usr/bin/env python3
"""Read-only climate payload audit, independent from the product's JS reader.

Requires numpy. Run from any directory; results stay beside this script.
This cannot verify a delivered raster against its absent WorldClim originals.
"""
from pathlib import Path
import gzip
import hashlib
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "data/climate-manifest.json").read_text())
checks = []


def check(name, condition):
    assert bool(condition), name
    checks.append(name)


def sha256(blob):
    return hashlib.sha256(blob).hexdigest()


arrays = {}
for key in ("grid", "coverage", "points"):
    record = manifest[key]
    compressed = (ROOT / "data" / record["file"]).read_bytes()
    check(key + " compressed bytes/hash", len(compressed) == record["bytes"] and sha256(compressed) == record["sha256"])
    raw = gzip.decompress(compressed)
    check(key + " decoded bytes/hash", len(raw) == record["uncompressed_bytes"] and sha256(raw) == record["uncompressed_sha256"])
    arrays[key] = np.frombuffer(raw, dtype="u1" if key == "coverage" else "<f4").reshape(record["shape"])
for key in ("json", "coordinates"):
    record = manifest["places"][key]
    check("places " + key + " bytes/hash", sha256((ROOT / "data" / record["file"]).read_bytes()) == record["sha256"])
check("importer matches recorded hash", sha256((ROOT / "tools/import_climate.py").read_bytes()) == manifest["importer_sha256"])
g, c, p = (arrays[k] for k in ("grid", "coverage", "points"))
check("exact grid/point shape", g.shape == (360, 720, 12) and p.shape == (34099, 12))
check("coverage range 0..9", (c <= 9).all())
check("grid nodata exactly matches zero support", np.array_equal(np.isnan(g), c == 0))
check("no infinite payload values", not np.isinf(g).any() and not np.isinf(p).any())
check("matched spatial support in all three periods", np.array_equal(c[..., :4], c[..., 4:8]) and np.array_equal(c[..., 4:8], c[..., 8:12]))
for a in (g, p):
    check("nonnegative precipitation", np.all(a[..., [1, 5, 9]][np.isfinite(a[..., [1, 5, 9]])] >= 0))
    for period in range(3):
        t, rain, hottest, dm = (a[..., 4 * period + k] for k in range(4))
        good = np.isfinite(t) & np.isfinite(hottest)
        check("annual mean no greater than hottest-month maximum", (t[good] <= hottest[good]).all())
        dm_good = np.isfinite(dm)
        check("stored De Martonne is nonnegative", (dm[dm_good] >= 0).all())


def summary(a):
    result = []
    for k, field in enumerate(manifest["fields"]):
        values = a[..., k]
        good = values[np.isfinite(values)]
        result.append({"period": field["period"], "id": field["id"], "finite": int(good.size),
                       "min": float(good.min()), "max": float(good.max()),
                       "quantiles_p001_p01_p50_p99_p999": np.quantile(good, [.001, .01, .5, .99, .999]).tolist()})
    return result


def physical(a, year):
    # Derive from delivered temperature and precipitation, not stored indices.
    b, d, f = (0, 4, (year - 1985) / 45) if year < 2030 else (4, 8, (year - 2030) / 20)
    temperature = a[..., b] + (a[..., d] - a[..., b]) * f
    rain = a[..., b + 1] + (a[..., d + 1] - a[..., b + 1]) * f
    heat = a[..., b + 2] + (a[..., d + 2] - a[..., b + 2]) * f
    with np.errstate(divide="ignore", invalid="ignore"):
        dm = np.where(temperature > -10, rain / (temperature + 10), np.nan)
    return temperature, heat, dm, temperature - a[..., 0]


a26 = physical(g.astype("float64"), 2026)
a30 = physical(g.astype("float64"), 2030)
a50 = physical(g.astype("float64"), 2050)
dm_available = np.logical_and.reduce([np.isfinite(x[2]) for x in (a26, a30, a50)])
dm_interpolation = []
max_witness = None
native_ratio_errors = []
for period in range(3):
    t, rain, dm = p[:, period * 4], p[:, period * 4 + 1], p[:, period * 4 + 3]
    good = np.isfinite(dm)
    expected = rain[good].astype('float64') / (t[good].astype('float64') + 10)
    error = np.abs(dm[good] - expected)
    native_ratio_errors.append({'period': manifest['periods'][period]['id'],
                                'max_absolute_error_after_float32_packing': float(error.max()),
                                'p99_absolute_error_after_float32_packing': float(np.quantile(error, .99)),
                                'max_relative_error_after_float32_packing': float(np.max(error / np.maximum(1e-8, dm[good])))})
for year in range(2026, 2051):
    exact = physical(g.astype("float64"), year)[2]
    start, end, fraction = (a26[2], a30[2], (year - 2026) / 4) if year < 2030 else (a30[2], a50[2], (year - 2030) / 20)
    approx = start + (end - start) * fraction
    good = dm_available & np.isfinite(exact)
    absolute = np.where(good, np.abs(approx - exact), np.nan)
    maximum = float(np.nanmax(absolute))
    index = np.unravel_index(np.nanargmax(absolute), absolute.shape)
    tropical_temperate = good & (physical(g.astype("float64"), year)[0] > 0)
    dm_interpolation.append({"year": year, "max_absolute_index_error": maximum,
                             "p99_absolute_index_error": float(np.quantile(absolute[good], .99)),
                             "max_error_temperature_above_0C": float(np.max(absolute[tropical_temperate]))})
    if max_witness is None or maximum > max_witness["error"]:
        r, col = index
        max_witness = {"year": year, "row": int(r), "column": int(col), "latitude": 90 - (r + .5) / 2,
                       "longitude": -180 + (col + .5) / 2, "exact_ratio": float(exact[index]),
                       "texture_interpolated_index": float(approx[index]), "error": maximum,
                       "temperature": float(physical(g.astype("float64"), year)[0][index])}

places = json.loads((ROOT / "data/places.json").read_text())["villes"]
rawcoords = (ROOT / "data/places.bin").read_bytes()
coords = np.ndarray((len(places), 2), dtype="<i2", buffer=rawcoords, strides=(24, 2)).astype("float64") / 100
city_examples = []
for english in ("Paris", "Dhaka", "Phoenix", "Singapore", "Sydney", "Yakutsk", "Ho Chi Minh City", "Shanghai", "Ulaanbaatar"):
    matches = [i for i, x in enumerate(places) if x[4] == english]
    if not matches:
        continue
    i = matches[0]
    lat, lon = coords[i]
    regional = g[min(359, int((90 - lat) * 2)), min(719, int((lon + 180) * 2))]
    entry = {"name": english, "index": i, "iso": places[i][1], "latitude": float(lat), "longitude": float(lon), "years": []}
    for year in (2026, 2030, 2050):
        native = physical(p[i].astype("float64"), year)
        region = physical(regional.astype("float64"), year)
        entry["years"].append({"year": year, "native_temperature_heat_dm_warming": [float(v) if np.isfinite(v) else None for v in native],
                               "regional_temperature_heat_dm_warming": [float(v) if np.isfinite(v) else None for v in region]})
    city_examples.append(entry)

result = {"basis_commit": "57a0757", "checks_passed": checks,
          "independent_original_source_reconstruction": False,
          "original_source_limitation": "WorldClim originals absent; proxy blocks www.worldclim.org and geodata.ucdavis.edu with HTTP403 CONNECT.",
          "grid_fields": summary(g), "point_fields": summary(p),
          "grid_heat_warming_matched_valid_cells": int(np.isfinite(g[..., 0]).sum()),
          "native_cities_future_valid": int(np.isfinite(p[..., 8]).sum()),
          "dm_map_valid_cells": int(dm_available.sum()),
          "dm2026_cells_temperature_minus10_to_minus9": int((dm_available & (a26[0] < -9)).sum()),
          "dm2026_cells_above_half_float_limit": int((dm_available & (a26[2] > 65504)).sum()),
          "native_de_martonne_formula_errors": native_ratio_errors,
          "stored_mean_native_dm_and_runtime_ratio_support_differ": {
              "ratio_available_but_stored_native_mean_absent": int((dm_available & np.isnan(g[..., 3])).sum()),
              "stored_native_mean_available_but_ratio_absent": int((~dm_available & np.isfinite(g[..., 3])).sum()),
              "temperature_and_dm_coverage_counts_differ": int((c[..., 0] != c[..., 3]).sum()),
              "meaning": "Stored metric is mean of native ratios with its own support. Runtime computes ratio of mean temperature/precipitation using their common support; these are different spatial definitions."},
          "heat2050_below2026_grid_count": int((a50[1] < a26[1]).sum()),
          "warming2050_negative_grid_count": int((a50[3] < 0).sum()),
          "dm_interpolation_errors": dm_interpolation, "largest_dm_interpolation_error": max_witness,
          "city_examples": city_examples}
(OUT / "results.json").write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
print(json.dumps({"checks": len(checks), "grid_valid": result["grid_heat_warming_matched_valid_cells"],
                  "native_cities": result["native_cities_future_valid"], "dm_map_valid": result["dm_map_valid_cells"],
                  "dm_cold": result["dm2026_cells_temperature_minus10_to_minus9"], "worst_dm_interpolation": max_witness}, indent=2))

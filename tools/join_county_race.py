#!/usr/bin/env python3
"""
Join CDC/ATSDR SVI 2022 county-level race & ethnicity percentages into
Atlas_FEMA_V2.geojson so the "Communities of Color" lens + county popup /
hover can read them without dropping to the tract tileset.

Source : data/SVI_2022_US_county.csv  (CDC SVI 2022, US counties)
         https://svi.cdc.gov/Documents/Data/2022/csv/states_counties/SVI_2022_US_county.csv
Join key: CDC `FIPS` (5-digit, zero-padded) == Atlas feature `GEOID`

Adds these properties to every county feature (null where CDC has no data,
e.g. Puerto Rico / territories, or where CDC stored the -999 sentinel):
    COUNTY_PCT_MINORITY   (EP_MINRTY)  — % residents who are people of color
    COUNTY_PCT_AFAM       (EP_AFAM)
    COUNTY_PCT_HISP       (EP_HISP)
    COUNTY_PCT_ASIAN      (EP_ASIAN)
    COUNTY_PCT_AIAN       (EP_AIAN)
    COUNTY_PCT_NHPI       (EP_NHPI)
    COUNTY_PCT_TWOMORE    (EP_TWOMORE)
    COUNTY_PCT_OTHERRACE  (EP_OTHERRACE)

Field names mirror the tract popup's EP_* rows so the UI can share formatting.
Re-runnable: overwrites the geojson in place. Keep Atlas_FEMA_V2.geojson.bak.
"""
import csv, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV_PATH = os.path.join(ROOT, "data", "SVI_2022_US_county.csv")
GEOJSON_PATH = os.path.join(ROOT, "data", "Atlas_FEMA_V2.geojson")

# CDC EP_ column -> our county property name
FIELD_MAP = {
    "EP_MINRTY":    "COUNTY_PCT_MINORITY",
    "EP_AFAM":      "COUNTY_PCT_AFAM",
    "EP_HISP":      "COUNTY_PCT_HISP",
    "EP_ASIAN":     "COUNTY_PCT_ASIAN",
    "EP_AIAN":      "COUNTY_PCT_AIAN",
    "EP_NHPI":      "COUNTY_PCT_NHPI",
    "EP_TWOMORE":   "COUNTY_PCT_TWOMORE",
    "EP_OTHERRACE": "COUNTY_PCT_OTHERRACE",
}


def to_pct(raw):
    """CDC stores missing values as -999. Return float, or None if missing."""
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return None
    return None if v <= -999 else v


def main():
    # Build FIPS -> {prop: value} lookup from the CDC CSV.
    by_fips = {}
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            fips = (row.get("FIPS") or "").strip().zfill(5)
            if not fips:
                continue
            by_fips[fips] = {prop: to_pct(row.get(col)) for col, prop in FIELD_MAP.items()}

    with open(GEOJSON_PATH) as f:
        gj = json.load(f)

    matched = missing = 0
    for feat in gj["features"]:
        geoid = str(feat["properties"].get("GEOID", "")).zfill(5)
        race = by_fips.get(geoid)
        if race is None:
            # No CDC row (territories) — write nulls so the key always exists.
            race = {prop: None for prop in FIELD_MAP.values()}
            missing += 1
        else:
            matched += 1
        feat["properties"].update(race)

    with open(GEOJSON_PATH, "w") as f:
        json.dump(gj, f)

    print(f"counties matched: {matched}")
    print(f"counties without CDC race data (null): {missing}")
    print(f"added fields: {', '.join(FIELD_MAP.values())}")


if __name__ == "__main__":
    sys.exit(main())

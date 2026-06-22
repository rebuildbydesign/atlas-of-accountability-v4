---
name: wv-counter-mapping-project
description: Goal + verified GIS data sources for the WV flood-trust-fund counter-mapping workshop layers
metadata:
  type: project
---

The WV-focused build of the Atlas of Accountability is being extended into a **counter-mapping** tool for a West Virginia workshop: visualizing how the **Flood Resiliency Trust Fund** should be spent and scaled for **2027 onward**.

**The hook (drives the whole argument):** WV's Flood Resiliency Trust Fund (SB 677, 2023) statute *mandates* that **≥50% of disbursements implement nature-based solutions** and **≥50% benefit low-income areas**. The map's job is to argue WHERE (need + equity + NBS opportunity overlap) and whether spending followed. Funding reality: $10M authorized, Gov requested $50M, Legislature largely hasn't appropriated (still contested as of early 2026); user mentioned "$5M" — exact current appropriation unverified.

**Verified layerable endpoints** (WV GIS Technical Center: `services.wvgis.wvu.edu/arcgis/rest/services`, all Query-enabled unless noted):
- Easy (small vector → GeoJSON like the floodplain): `Hazards/floodTool_RepetitiveLossArea` (polygon, ~57), `Hazards/floodTool_preservedOpenSpaces` (mitigated/buyout parcels, public land, TNC preserves — mixed pts/polys), `Inland_Waters/HUC_8_watershedBoundaries` (polygon, 33).
- Medium: `Inland_Waters/Riparian_Areas_WVDNR` (polygon but 268,037 features — needs the fetch→simplify→dissolve→clip pipeline), `Hazards/Depth_01PCT_HECRAS_Statewide_1m_UTM83` (ImageServer, F32 depth, UTM 17N/26917 — needs color renderingRule).
- Skip: `floodTool_Social_Vulnerability_Index` — redundant, map already has CDC SVI lens.
- Not yet verified: USFWS National Wetlands Inventory, NLCD land cover/impervious.

**BUILT (June 2026):** the trilogy is live as toggles in the "West Virginia Layers" panel, alongside the floodplain. scripts.js now uses a generic `WV_OVERLAYS` registry (in the map `load` handler) — each entry = {key, url, layers[]}; sources/layers are created hidden up front and the GeoJSON is lazy-loaded on first toggle. Layer ids: `wv-<key>-<suffix>`; checkbox ids `wv-<key>-toggle`; legend ids `wv-<key>-legend`. Adding a layer = drop a WV-clipped GeoJSON in data/ + a registry entry + a checkbox/legend in index.html.

Hosted data files (all clipped to WV outline via mapshaper):
- `data/wv_floodplain.geojson` (~2.4MB, blue fill+line)
- `data/wv_repetitive_loss.geojson` (55 polys, purple) — RepetitiveLossArea layer 2
- `data/wv_buyouts.geojson` (2862 pts, green dots) — preservedOpenSpaces "Mitigated Flood Parcel" layer 2
- `data/wv_watersheds.geojson` (33 polys, dashed teal lines) — HUC8 layer 1

**Added FEMA NRI (June 2026):** colleague dropped raw NRI in data/NRI_Counties_WV.geojson (7.8MB, 467 fields) and data/NRI_CensusTract_WV.geojson (47MB) — both LARGE and not directly loaded by the app. Built `data/wv_nri_flood.geojson` (396KB, 55 counties, trimmed fields county/frisk/frate/feal/sovi/cres) = Inland Flooding Risk Index choropleth, added as WV overlay key `nriflood` (first in registry so it's the bottom choropleth; YlOrRd 5-class, WV-relative quintile breaks 54.1/64.9/76.5/85.0; pair with Hide base data layer). National NRI ratings barely vary within WV — use continuous score. NRI SoVI ≈ existing CDC SVI (skipped). Community Resilience = good optional next add (new dimension). restackWVTop now hoists county-borders above overlays too.

**Next:** Community Resilience (NRI) layer; Riparian (NBS capstone, 268k features — needs heavy dissolve); optionally HEC-RAS depth raster, USFWS wetlands. Consider git-ignoring or removing the two raw NRI files (~55MB) if repo size matters for GitHub Pages. Then the workshop narrative scaffolding (2027 scale-up argument). Pipeline = fetch/extract → mapshaper simplify/clip to wv_outline → data/.

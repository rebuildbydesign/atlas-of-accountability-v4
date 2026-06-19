# Atlas of Accountability

An interactive map from [Rebuild by Design](https://rebuildbydesign.org) that visualizes the impact of federally declared climate disasters across U.S. counties and congressional districts from **2011–2024** — pairing FEMA recovery data with social vulnerability, energy reliability, and demographic context to surface where climate risk and federal response intersect.

The Atlas is built to support resilience planning, public-interest research, and partnership between funders, government, and community organizations.

## Who this tool is for

- **Foundations and funders** evaluating where climate-resilience investment will have the highest impact.
- **City, county, and state planners** building hazard mitigation and capital plans grounded in federal data.
- **NGOs and advocacy organizations** working to hold representatives accountable for climate and infrastructure policy.
- **Researchers and journalists** investigating disaster patterns, recovery funding, and inequity.

## What you can do

- **Explore six data lenses** over every U.S. county: FEMA Disaster Declarations, FEMA Obligations, CDC Social Vulnerability Index, Energy Reliability (SAIDI), Urban Counties, Rural Counties, and Older Adults 60+.
- **Click any county** to view disaster counts, federal share, per-capita figures, and the corresponding congressional and state representatives.
- **Search any address** to jump to the county-level context for a specific community.
- **Share findings** with funders, policymakers, and partners via direct links and the project report.

## Partner with us

If your foundation, agency, or organization wants to use this data to inform funding, policy, or resilience strategy, contact **[info@rebuildbydesign.org](mailto:info@rebuildbydesign.org?subject=Partner%20with%20Rebuild%20by%20Design%20%E2%80%94%20Atlas%20of%20Accountability)**. Rebuild by Design collaborates with funders, governments, and NGOs on tailored analyses, briefings, and resilience-strategy work.

## Live tool & methodology

- **Live tool:** [rebuildbydesign.org/atlas-of-disaster](https://rebuildbydesign.org/atlas-of-disaster)
- **Methodology & data sources:** [rebuildbydesign.org/atlas-of-disaster#methodology](https://rebuildbydesign.org/atlas-of-disaster#methodology)
- **Source code:** this repository.

## Data sources

| Layer | Source | Vintage |
| --- | --- | --- |
| FEMA Disaster Declarations (climate events) | iParametric | 2011–2024 |
| FEMA Obligations (Federal Share) | iParametric / FEMA OpenFEMA | 2011–2024 |
| CDC Social Vulnerability Index | CDC/ATSDR | 2022 |
| Energy Reliability (SAIDI hours) | U.S. Energy Information Administration | 2023 |
| Older adults (age 60+) | U.S. Census Bureau ACS | latest release |
| County boundaries | ESRI | 2020 |
| Congressional district boundaries | USDOT Bureau of Transportation Statistics | 2025 |
| Current legislative members | U.S. Government (github.com/unitedstates) | rolling |

## Tech stack

- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) for the interactive map.
- Vanilla HTML, CSS, and JavaScript — no build step required. Open `index.html` to run locally.

## Credits

Built by [Judy Huynh](https://github.com/judy-huynh) for [Rebuild by Design](https://rebuildbydesign.org).

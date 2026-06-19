mapboxgl.accessToken = 'pk.eyJ1IjoiajAwYnkiLCJhIjoiY2x1bHUzbXZnMGhuczJxcG83YXY4czJ3ayJ9.S5PZpU9VDwLMjoX_0x5FDQ';

// ZOOM LEVELS FOR STARTING DEPENDENT ON VIEWPORT SIZE
const initialZoom = window.innerWidth < 768 ? 2.5 : 3.5;  // Zoom level 3 for mobile, 4 for desktop

// CLIP TO NORTH AMERICA ONLY
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/j00by/clvx7jcp006zv01ph3miketyz',
    center: [-96.68288, 39.32267],
    zoom: initialZoom,
    maxBounds: [
        [-220.0, -20.0],  // Southwest coordinates (including US Territories)
        [-50.0, 74.0]    // Northeast coordinates (including Puerto Rico)
    ],
    projection: {
        name: 'mercator'
    },
    pitchWithRotate: false,   // Disable tilting with right-click drag
    dragRotate: false,        // Disable rotating the map with the mouse
    maxPitch: 0               // Ensure no tilt at all
});


// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'top-right');


// Disable scroll zoom initially
map.scrollZoom.disable();
map.on('click', () => map.scrollZoom.enable());

// LOAD MAPBOX
map.on('load', function () {
    // Custom code to fade text opacity for countries and states outside the US
    const updateTextOpacity = (layerId, opacity) => {
        if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'text-opacity', [
                'case',
                // Check if the feature is a US state or the United States
                ['any',
                    ['==', ['get', 'name_en'], 'United States'],
                    ['==', ['get', 'iso_3166_1'], 'US']
                ],
                1,
                // Default opacity for all other countries and states
                opacity
            ]);
        }
    };

    // Scroll-zoom is enabled by the top-level `map.on('click', …)` handler
    // at the top of this file — no duplicate handler needed inside `load`.

    const layersToUpdate = [
        'country-label-sm',
        'country-label-md',
        'country-label-lg',
        'country-lavel',
        'state-label' // Include state labels as well
    ];

    map.on('styledata', function () {
        layersToUpdate.forEach(layerId => {
            updateTextOpacity(layerId, 0.2);
        });
    });



    // Display the info panel on startup (desktop only; mobile starts hidden to reduce clutter)
    var infoPanel = document.getElementById('info-panel');
    var isMobile = function () { return window.innerWidth <= 768; };
    infoPanel.style.display = isMobile() ? 'none' : 'block';

    // Helper: after a popup opens, keep it inside the viewport by measuring its actual
    // rendered height and panning the map so the whole popup fits, and wire up the
    // mobile tab switcher. Also toggles a body class to let CSS hide the legend/info
    // panel while the bottom-sheet popup is open on mobile.
    function finalizePopup(lngLat) {
        document.body.classList.add('popup-open');

        // Wait one frame so the popup DOM exists and has measurable dimensions.
        requestAnimationFrame(function () {
            var popupEl = document.querySelector('.mapboxgl-popup');
            var popupContainer = popupEl ? popupEl.querySelector('.popup-container') : null;

            // --- Mobile: bottom-sheet popup covers the lower half of the map.
            // Zoom in on the clicked county AND position it in the visible
            // map area above the sheet (roughly centered in that top band). ---
            if (isMobile() && popupEl) {
                var mapRectM = map.getContainer().getBoundingClientRect();
                var popupRectM = popupEl.getBoundingClientRect();

                // Visible map band = from mapRectM.top to popupRectM.top.
                // Target Y inside the map container (map-relative coords).
                var visibleTopRel = 20;
                var visibleBottomRel = popupRectM.top - mapRectM.top - 20;
                var targetYRel = (visibleTopRel + visibleBottomRel) / 2;

                // easeTo's offset is measured from the map container center;
                // positive y = below center on screen.
                var offsetY = targetYRel - (mapRectM.height / 2);

                // Zoom in for county-level context, but don't zoom OUT if the
                // user is already further in. 5.5 shows a county clearly on
                // a phone without being too aggressive.
                var targetZoom = Math.max(map.getZoom(), 5.5);

                map.easeTo({
                    center: lngLat,
                    zoom: targetZoom,
                    offset: [0, offsetY],
                    duration: 500
                });
            }

            // --- Desktop: pan the map so the popup is fully in view ---
            if (!isMobile() && popupEl) {
                var mapRect = map.getContainer().getBoundingClientRect();
                var popupRect = popupEl.getBoundingClientRect();
                var MARGIN = 16;

                // Figure out where we want the popup's top-left to end up on screen.
                // Rules:
                //   - if popup is taller/wider than viewport (minus margins), align to
                //     the top/left so the county name + data are visible first.
                //   - else if overflowing one side, pull that side in by the overflow.
                //   - else leave it where it is.
                var targetTop;
                if (popupRect.height + 2 * MARGIN >= mapRect.height) {
                    targetTop = mapRect.top + MARGIN;
                } else if (popupRect.top < mapRect.top + MARGIN) {
                    targetTop = mapRect.top + MARGIN;
                } else if (popupRect.bottom > mapRect.bottom - MARGIN) {
                    targetTop = mapRect.bottom - MARGIN - popupRect.height;
                } else {
                    targetTop = popupRect.top;
                }

                var targetLeft;
                if (popupRect.width + 2 * MARGIN >= mapRect.width) {
                    targetLeft = mapRect.left + MARGIN;
                } else if (popupRect.left < mapRect.left + MARGIN) {
                    targetLeft = mapRect.left + MARGIN;
                } else if (popupRect.right > mapRect.right - MARGIN) {
                    targetLeft = mapRect.right - MARGIN - popupRect.width;
                } else {
                    targetLeft = popupRect.left;
                }

                // How far we want the popup to shift on screen.
                var pdx = targetLeft - popupRect.left;
                var pdy = targetTop  - popupRect.top;

                // Panning the MAP by [a, b] shifts world content (and the popup with it)
                // by [-a, -b] on screen, so to shift the popup by [pdx, pdy] we pan
                // the map by [-pdx, -pdy].
                if (pdx !== 0 || pdy !== 0) {
                    map.panBy([-pdx, -pdy], { duration: 350 });
                }
            }

            // --- Tab switcher (only visible on mobile but harmless to attach always) ---
            if (!popupContainer) return;
            var tabs = popupContainer.querySelectorAll('.popup-tab');
            var cols = popupContainer.querySelectorAll('.popup-column');
            tabs.forEach(function (tab) {
                tab.addEventListener('click', function () {
                    tabs.forEach(function (t) { t.classList.remove('active'); });
                    cols.forEach(function (c) { c.classList.remove('active'); });
                    this.classList.add('active');
                    var targetEl = popupContainer.querySelector('.popup-col-' + this.dataset.target);
                    if (targetEl) targetEl.classList.add('active');
                });
            });
        });
    }

    // Ensure that the info-icon event listener is added after the map has fully loaded
    document.getElementById('info-icon').addEventListener('click', function () {
        if (infoPanel.style.display === 'none' || infoPanel.style.display === '') {
            infoPanel.style.display = 'block';  // Show the panel
        } else {
            infoPanel.style.display = 'none';  // Hide the panel
        }
    });


    // Add event listener for the close button
    document.getElementById('close-info-panel').addEventListener('click', function () {
        infoPanel.style.display = 'none';
    });





    // Load the GeoJSON file for Atlas_FEMA
    map.addSource('atlas-fema', {
        type: 'geojson',
        data: 'data/Atlas_FEMA_V2.geojson'
    });

    // Quick polygon centroid by vertex averaging — fine for placing one
    // dot per county. Picks the largest ring in a MultiPolygon so we
    // anchor on the main landmass instead of an offshore island.
    function featureCentroid(feature) {
        const geom = feature.geometry;
        if (!geom) return null;
        let coords = null;
        if (geom.type === 'Polygon') {
            coords = geom.coordinates[0];
        } else if (geom.type === 'MultiPolygon') {
            let best = geom.coordinates[0];
            for (const poly of geom.coordinates) {
                if (poly[0].length > best[0].length) best = poly;
            }
            coords = best[0];
        }
        if (!coords || !coords.length) return null;
        let sx = 0, sy = 0;
        for (const [x, y] of coords) { sx += x; sy += y; }
        return [sx / coords.length, sy / coords.length];
    }

    // Shared paint expression: red disaster-count ramp keyed off
    // COUNTY_DISASTER_COUNT. Used by both the Disaster lens (as the
    // primary choropleth) and the Older Adults > "Where older adults
    // live" sub-mode (as the background behind the proportional dots),
    // so the two views read the same disaster intensity at a glance.
    const DISASTER_RAMP = [
        'step',
        ['to-number', ['coalesce', ['get', 'COUNTY_DISASTER_COUNT'], 0]],
        '#ffffff',         //  0
        1,  '#fee5d9',     //  1–2
        3,  '#fcae91',     //  3–4
        5,  '#fb6a4a',     //  5–6
        7,  '#de2d26',     //  7–9
        10, '#a50f15',     //  10–11
        12, '#710005'      //  12+
    ];


    // -------------------------------------------------------------
    // DATA LENS CONFIG — paint expressions + legend HTML per lens.
    // Each lens drives the choropleth color of `atlas-fema-layer`.
    // The Older Adults > "concentration" sub-mode is special: it uses
    // a `renderMode: 'dots'` flag that swaps a proportional-circle
    // overlay (`atlas-fema-dots-layer`) in for the choropleth.
    // Adding a new lens? Add an entry here and a radio button in
    // index.html with matching value attribute.
    // -------------------------------------------------------------
    const lensConfig = {
        // Default lens — # of Major Disaster Declarations (existing red ramp)
        disaster: {
            label: '# of Major Disaster Declarations',
            paintExpression: DISASTER_RAMP,
            legendHTML: `
                <div class="legend-title"><b>FEMA Disaster Declarations</b><br><span class="legend-mode-name">Number of disaster declarations</span></div>
                <div class="color-bar lens-disaster">
                    <div class="color-description">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                        <span>8</span>
                        <span>10</span>
                        <span>12+</span>
                    </div>
                </div>
                <div class="legend-units">Federally declared major disasters for extreme weather events, 2011–2024. Excludes heat.</div>
            `
        },

        // FEMA Disaster Funding — total federal dollars FEMA committed to
        // each county (Public Assistance + Hazard Mitigation Assistance).
        // Plain language replaces the prior "Obligations / Federal Share"
        // labeling, which read as gov-accounting jargon to non-specialists.
        // Scope is clarified in the legend caption.
        fema: {
            label: 'FEMA Disaster Funding',
            paintExpression: [
                'step',
                ['to-number', ['coalesce', ['get', 'COUNTY_TOTAL_FEMA'], 0]],
                '#FDE0C8',                //  $0 – $100K
                100000,    '#F9BE88',     //  $100K – $1M
                1000000,   '#F59A45',     //  $1M – $10M
                10000000,  '#ED7A1F',     //  $10M – $50M
                50000000,  '#C96305',     //  $50M – $100M
                100000000, '#9A4B02'      //  $100M+
            ],
            legendHTML: `
                <div class="legend-title"><b>FEMA Disaster Funding</b><br><span class="legend-mode-name">Total federal funding</span></div>
                <div class="color-bar lens-fema">
                    <div class="color-description">
                        <span>$0</span>
                        <span>100K</span>
                        <span>1M</span>
                        <span>10M</span>
                        <span>50M</span>
                        <span>100M+</span>
                    </div>
                </div>
                <div class="legend-units">Federal grants for rebuilding public infrastructure and reducing future risk, 2011–2024. Excludes direct aid to individuals.</div>
            `
        },

        // Social Vulnerability Index (CDC, 2022) — 0.0–1.0 normalized rank.
        // Null values (Puerto Rico, DC, territories — 92 features) render gray.
        svi: {
            label: 'Social Vulnerability (2022)',
            paintExpression: [
                'case',
                ['==', ['typeof', ['get', 'CDC SVI (2022)']], 'number'],
                [
                    'step',
                    ['get', 'CDC SVI (2022)'],
                    '#C6F2ED',           //  0.0 – 0.2
                    0.2, '#79D9CF',      //  0.2 – 0.4
                    0.4, '#00B7A6',      //  0.4 – 0.6
                    0.6, '#009887',      //  0.6 – 0.8
                    0.8, '#007462'       //  0.8 – 1.0
                ],
                '#C9C9C9'  // No SVI value available
            ],
            legendHTML: `
                <div class="legend-title"><b>Social Vulnerability</b><br><span class="legend-mode-name">Vulnerability score</span></div>
                <div class="color-bar lens-svi">
                    <div class="color-description">
                        <span>0.0</span>
                        <span>0.2</span>
                        <span>0.4</span>
                        <span>0.6</span>
                        <span>0.8</span>
                        <span>1.0</span>
                    </div>
                </div>
                <div class="legend-units">How vulnerable a community is to disaster impacts, scored 0 to 1. Higher means more vulnerable. CDC SVI, 2022.</div>
                <div class="legend-no-data">
                    <span class="no-data-swatch"></span>
                    <span>No data</span>
                </div>
            `
        },

        // Energy Reliability — SAIDI (System Average Interruption Duration
        // Index, EIA 2023). Higher = longer customer outages. Raw data is
        // stored in MINUTES on the feature (SAIDI_MIN_AVG / SAIDI_MIN_MAX),
        // so paint thresholds stay in minutes; legend labels are converted
        // to HOURS for readability (1 hr = 60 min).
        // This lens has TWO sub-modes:
        //   • avg → SAIDI_MIN_AVG (mean across utilities) — typical experience
        //   • max → SAIDI_MIN_MAX (worst utility per county) — plan-for-worst
        // Bins (60/120/240/456 min = 1/2/4/7.6 hrs) and colors are shared
        // so the visual jump between modes encodes the disparity directly.
        energy: {
            label: 'Energy Reliability (2022)',
            defaultSubMode: 'avg',
            subModes: {
                avg: {
                    subLabel: 'Average outage',
                    paintExpression: [
                        'case',
                        ['==', ['typeof', ['get', 'SAIDI_MIN_AVG']], 'number'],
                        [
                            'step',
                            ['get', 'SAIDI_MIN_AVG'],
                            '#F9ECDC',           //   0 –  60 min
                            60,  '#F4C69A',      //  60 – 120 min
                            120, '#F07F2E',      // 120 – 240 min
                            240, '#C24400',      // 240 – 456 min
                            456, '#6E2800'       // 456+ min (max ~5,941)
                        ],
                        '#C8CBD1'  // No utility data
                    ],
                    legendHTML: `
                        <div class="legend-title"><b>Energy Reliability</b><br><span class="legend-mode-name">Average outage</span></div>
                        <div class="color-bar lens-energy">
                            <div class="color-description">
                                <span>0</span>
                                <span>1</span>
                                <span>2</span>
                                <span>4</span>
                                <span>7.6</span>
                                <span>7.6+ hrs</span>
                            </div>
                        </div>
                        <div class="legend-units">Average annual hours a customer is without power, across utilities serving the county. SAIDI, U.S. EIA, 2023.</div>
                        <div class="legend-no-data">
                            <span class="no-data-swatch energy"></span>
                            <span>No utility data</span>
                        </div>
                    `
                },
                max: {
                    subLabel: 'Worst-case outage',
                    // MAX uses wider bin thresholds than AVG because MAX
                    // values range up to 10,820 min (vs ~5,941 for AVG).
                    // The 240 threshold is shared with AVG so readers
                    // can compare "240+ on AVG" vs "1,500+ on MAX" for
                    // the same county and see the worst-case shift.
                    paintExpression: [
                        'case',
                        ['==', ['typeof', ['get', 'SAIDI_MIN_MAX']], 'number'],
                        [
                            'step',
                            ['get', 'SAIDI_MIN_MAX'],
                            '#F9ECDC',           //    0 –   240 min
                            240,  '#F4C69A',     //  240 –   600 min
                            600,  '#F07F2E',     //  600 – 1,500 min
                            1500, '#C24400',     // 1,500 – 4,000 min
                            4000, '#6E2800'      // 4,000 – 10,820 min
                        ],
                        '#C8CBD1'  // No utility data
                    ],
                    legendHTML: `
                        <div class="legend-title"><b>Energy Reliability</b><br><span class="legend-mode-name">Worst-case outage</span></div>
                        <div class="color-bar lens-energy">
                            <div class="color-description">
                                <span>0</span>
                                <span>4</span>
                                <span>10</span>
                                <span>25</span>
                                <span>67</span>
                                <span>180 hrs</span>
                            </div>
                        </div>
                        <div class="legend-units">Annual hours a customer is without power, from the worst-performing utility serving the county. SAIDI, U.S. EIA, 2023.</div>
                        <div class="legend-no-data">
                            <span class="no-data-swatch energy"></span>
                            <span>No utility data</span>
                        </div>
                    `
                }
            }
        },

        // Older Adults — two sub-modes (federal Older Americans Act term;
        // "older adult" = age 60+):
        //   • concentration   → Proportional dots map. The choropleth uses
        //                       the shared DISASTER_RAMP underneath so the
        //                       red shading shows disaster intensity while
        //                       forest-green dots overlay the older-adult
        //                       population. True bivariate read at a glance.
        //   • disastersFaced  → Filtered graded choropleth. Only counties
        //                       with 25%+ adults 60+ are colored; the color
        //                       encodes disaster-declaration tiers on the
        //                       same 7-bin scheme as the FEMA Disaster
        //                       Declarations lens (0/2/4/6/8/10/12+),
        //                       rendered in a green palette so the lens
        //                       stays in the older-adults visual family.
        older: {
            label: 'Older Adults 60+',
            // Default lands directly on the disaster-overlay view so the
            // Older Adults lens behaves as a single-action button. The
            // 'concentration' (proportional dots) sub-mode is still defined
            // below — its UI toggle is just hidden in index.html for now.
            defaultSubMode: 'disastersFaced',
            subModes: {
                concentration: {
                    subLabel: 'Where older adults live',
                    renderMode: 'dots',
                    choroplethPaint: DISASTER_RAMP,
                    legendHTML: `
                        <div class="legend-title"><b>Older Adults 60+</b><br><span class="legend-mode-name">Where older adults live</span></div>
                        <div class="legend-units">Dots show where older adults live; background shading shows disaster declarations. 60+ is the federal Older Americans Act threshold (1965).</div>
                        <div class="dot-scale-legend">
                            <div class="dot-group"><span class="legend-dot" style="width:4px;height:4px"></span><span class="dot-label">10K</span></div>
                            <div class="dot-group"><span class="legend-dot" style="width:11px;height:11px"></span><span class="dot-label">100K</span></div>
                            <div class="dot-group"><span class="legend-dot" style="width:22px;height:22px"></span><span class="dot-label">500K</span></div>
                            <div class="dot-group"><span class="legend-dot" style="width:32px;height:32px"></span><span class="dot-label">1M+</span></div>
                        </div>
                        <div style="margin-top:10px;font-size:11px;color:#555;">Disaster declarations (2011–2024):</div>
                        <div class="color-bar lens-disaster">
                            <div class="color-description">
                                <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span><span>12+</span>
                            </div>
                        </div>
                    `
                },
                disastersFaced: {
                    subLabel: 'Older adults & disaster declarations',
                    // Filter to 25%+ age 60+, then step on COUNTY_DISASTER_COUNT
                    // through the same 7-bin scheme as the FEMA Disaster
                    // Declarations lens (bins at 0/1/3/5/7/10/12) — green
                    // palette so it stays in the older-adults visual family
                    // but reads as the same spectrum as the disaster lens.
                    paintExpression: [
                        'case',
                        ['>=', ['to-number', ['coalesce', ['get', 'county-level-older-adults_PCT POP 60+'], 0]], 25],
                        [
                            'step',
                            ['to-number', ['coalesce', ['get', 'COUNTY_DISASTER_COUNT'], 0]],
                            '#edf8fb',          //  0
                            1,  '#ccece6',      //  1–2
                            3,  '#99d8c9',      //  3–4
                            5,  '#66c2a4',      //  5–6
                            7,  '#41ae76',      //  7–9
                            10, '#238b45',      //  10–11
                            12, '#005824'       //  12+
                        ],
                        '#ECECEC'   // counties with <25% age 60+ (or null)
                    ],
                    legendHTML: `
                        <div class="legend-title"><b>Older Adults 60+</b><br><span class="legend-mode-name">Number of disaster declarations</span></div>
                        <div class="color-bar lens-older-disasters">
                            <div class="color-description">
                                <span>0</span>
                                <span>2</span>
                                <span>4</span>
                                <span>6</span>
                                <span>8</span>
                                <span>10</span>
                                <span>12+</span>
                            </div>
                        </div>
                        <div class="legend-units">Federal disaster declarations in counties where at least 25% of residents are age 60 or older, 2011–2024. Age threshold from the federal Older Americans Act.</div>
                        <div class="legend-no-data">
                            <span class="no-data-swatch" style="background:#ECECEC"></span>
                            <span>Counties with &lt;25% age 60+</span>
                        </div>
                    `
                }
            }
        },

        // Urban Counties — disaster-overlay lens with no sub-modes.
        // Same 7-bin scheme as the FEMA Disaster Declarations lens
        // (0/1/3/5/7/10/12) applied across all OMB-classified Urban
        // counties. Palette: purples — civic/government coding, no
        // party association.
        urban: {
            label: 'Urban Counties',
            paintExpression: [
                'case',
                ['==', ['get', 'OMB_CLASS'], 'Urban'],
                [
                    'step',
                    ['to-number', ['coalesce', ['get', 'COUNTY_DISASTER_COUNT'], 0]],
                    '#efedf5',         //  0
                    1,  '#dadaeb',     //  1–2
                    3,  '#bcbddc',     //  3–4
                    5,  '#9e9ac8',     //  5–6
                    7,  '#807dba',     //  7–9
                    10, '#6a51a3',     //  10–11
                    12, '#4a1486'      //  12+
                ],
                '#ECECEC'   // Rural counties (or unclassified)
            ],
            legendHTML: `
                <div class="legend-title"><b>Urban Counties</b><br><span class="legend-mode-name">Number of disaster declarations</span></div>
                <div class="color-bar lens-urban">
                    <div class="color-description">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                        <span>8</span>
                        <span>10</span>
                        <span>12+</span>
                    </div>
                </div>
                <div class="legend-units">Federal disaster declarations in urban counties (population 50,000 or more), 2011–2024.</div>
                <div class="legend-no-data">
                    <span class="no-data-swatch" style="background:#ECECEC"></span>
                    <span>Rural counties</span>
                </div>
            `
        },

        // Rural Counties — parallel to the Urban lens. Palette: blue ramp.
        // Blue chosen for visual contrast against the purple Urban palette
        // and to avoid the warm yellow/amber that read as unpleasant in the
        // previous draft. Distinct from Social Vulnerability (which leans
        // teal/green-blue) — this is a cleaner navy-blue progression.
        rural: {
            label: 'Rural Counties',
            paintExpression: [
                'case',
                ['==', ['get', 'OMB_CLASS'], 'Rural'],
                [
                    'step',
                    ['to-number', ['coalesce', ['get', 'COUNTY_DISASTER_COUNT'], 0]],
                    '#eff3ff',         //  0
                    1,  '#c6dbef',     //  1–2
                    3,  '#9ecae1',     //  3–4
                    5,  '#6baed6',     //  5–6
                    7,  '#4292c6',     //  7–9
                    10, '#2171b5',     //  10–11
                    12, '#084594'      //  12+
                ],
                '#ECECEC'   // Urban counties (or unclassified)
            ],
            legendHTML: `
                <div class="legend-title"><b>Rural Counties</b><br><span class="legend-mode-name">Number of disaster declarations</span></div>
                <div class="color-bar lens-rural">
                    <div class="color-description">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                        <span>8</span>
                        <span>10</span>
                        <span>12+</span>
                    </div>
                </div>
                <div class="legend-units">Federal disaster declarations in rural counties (population under 50,000), 2011–2024.</div>
                <div class="legend-no-data">
                    <span class="no-data-swatch" style="background:#ECECEC"></span>
                    <span>Urban counties</span>
                </div>
            `
        }
    };


    // Add a layer for the Atlas_FEMA data — initialized with default lens.
    map.addLayer({
        'id': 'atlas-fema-layer',
        'type': 'fill',
        'source': 'atlas-fema',
        'paint': {
            'fill-color': lensConfig.disaster.paintExpression,
            'fill-opacity': 1
        }
    }, 'state-label');

    // Proportional-dots overlay for the Older Adults > "Where older adults
    // live" sub-mode. We fetch the geojson again (the browser caches the
    // first one Mapbox loaded) to compute centroids client-side, then add
    // a Point source and a circle layer sized by sqrt(60+ POP) so circle
    // AREA — not radius — scales linearly with population (the
    // perceptually honest mapping for proportional symbols). Hidden by
    // default; toggled by `applyActiveStyling` when the dots sub-mode is
    // active. Added without a beforeId so it sits on top of all other
    // atlas layers including county borders.
    fetch('data/Atlas_FEMA_V2.geojson').then(function (r) { return r.json(); }).then(function (data) {
        const pointFeatures = [];
        for (const f of data.features) {
            const c = featureCentroid(f);
            if (!c) continue;
            pointFeatures.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: c },
                properties: f.properties
            });
        }
        map.addSource('atlas-fema-points', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: pointFeatures }
        });
        map.addLayer({
            id: 'atlas-fema-dots-layer',
            type: 'circle',
            source: 'atlas-fema-points',
            layout: { visibility: 'none' },
            paint: {
                // sqrt(2,000,000) ≈ 1414 → 22px radius caps the largest
                // counties (LA, Cook, Maricopa). 0 pop → 0px.
                'circle-radius': [
                    'interpolate', ['linear'],
                    ['sqrt', ['to-number', ['coalesce', ['get', 'county-level-older-adults_60+ POP'], 0]]],
                    0,    0,
                    1414, 22
                ],
                // Dot color = darkest tone in the Older Adults palette
                // (same #006d2c that anchors the "Older adults & disaster
                // declarations" gradient). Keeps both sub-modes visually
                // consistent within the lens. Don't drift this without
                // updating the Disasters sub-mode ramp too.
                'circle-color': '#006d2c',
                'circle-opacity': 0.6,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 0.6
            }
        });
        // If the user's already on the dots sub-mode (e.g. via deep-link or
        // by selecting it before the fetch resolved), re-run styling so
        // the layer becomes visible immediately.
        applyActiveStyling();
    });


    // -------------------------------------------------------------
    // LENS TOGGLE — swaps the choropleth fill expression and legend
    // body. Some lenses (e.g. energy) have sub-modes (AVG vs MAX);
    // setLens picks the active sub-mode if present.
    //
    // The Urban/Rural filter (set via setOMBFilter) wraps the active
    // lens's paint expression so non-matching counties render gray
    // without losing the underlying lens choice.
    // -------------------------------------------------------------
    let activeLens = 'disaster';
    let activeOMBFilter = 'all';   // 'all' | 'rural' | 'urban'

    // Light wash applied to counties hidden by the urban/rural filter.
    // Intentionally pale so it reads as "deselected" rather than "another
    // data category" — the active class's lens colors should dominate.
    const FILTER_MASK_COLOR = '#ECECEC';

    // Remember each lens's current sub-mode across switches.
    const activeSubModes = {};
    Object.keys(lensConfig).forEach(function (k) {
        if (lensConfig[k].defaultSubMode) {
            activeSubModes[k] = lensConfig[k].defaultSubMode;
        }
    });

    // Resolve { paintExpression, legendHTML } for a given lens, drilling
    // into the active sub-mode if the lens defines one.
    function resolveLensSpec(lensKey) {
        const cfg = lensConfig[lensKey];
        if (!cfg) return null;
        if (cfg.subModes) {
            const subKey = activeSubModes[lensKey] || cfg.defaultSubMode;
            const sub = cfg.subModes[subKey];
            if (sub) return sub;
        }
        return cfg;
    }

    // Wrap a lens's paint expression with the Urban/Rural filter.
    // When filter is 'all' the lens expression is returned unchanged.
    // When filter is 'rural' or 'urban', counties not matching the
    // selected class (including the 92 territory features without
    // OMB_CLASS) render in FILTER_MASK_COLOR.
    function applyOMBFilter(lensExpression, filter) {
        if (filter === 'all') return lensExpression;
        const target = filter === 'rural' ? 'Rural' : 'Urban';
        return [
            'case',
            ['==', ['get', 'OMB_CLASS'], target], lensExpression,
            FILTER_MASK_COLOR
        ];
    }

    // Auto-hide the "How to use this map" help panel whenever the
    // user interacts with the data — they've moved past needing the
    // intro and the panel was eating valuable screen real estate.
    // No-op if it's already hidden. User can re-open via the info icon.
    function autoHideHelpPanel() {
        var helpPanel = document.getElementById('info-panel');
        if (helpPanel && helpPanel.style.display !== 'none') {
            helpPanel.style.display = 'none';
        }
    }

    // Apply the current lens + filter combo to the map and update the
    // legend. Called by both setLens and setOMBFilter so any change
    // re-renders consistently. Two render paths:
    //   - 'choropleth' (default): paint atlas-fema-layer with the lens
    //     expression, hide the dots layer.
    //   - 'dots' (Older Adults > Where older adults live): paint
    //     atlas-fema-layer a uniform muted color so the underlying dot
    //     overlay reads cleanly; show the dots layer.
    // Also refreshes the click popup's Indicators block (if open) so
    // the active-row highlight follows the lens change in real time.
    function applyActiveStyling() {
        const spec = resolveLensSpec(activeLens);
        if (!spec) return;

        const isDots = spec.renderMode === 'dots';

        if (isDots) {
            // The dots sub-mode paints the choropleth too — either a
            // single color (legacy) or a full expression (e.g. the shared
            // DISASTER_RAMP underneath the older-adults dots). Wrap in the
            // urban/rural filter so a "Rural only" selection still mutes
            // urban counties under the dots.
            const base = spec.choroplethPaint || spec.choroplethColor || '#F4F1EA';
            map.setPaintProperty('atlas-fema-layer', 'fill-color', applyOMBFilter(base, activeOMBFilter));
            if (map.getLayer('atlas-fema-dots-layer')) {
                map.setLayoutProperty('atlas-fema-dots-layer', 'visibility', 'visible');
                applyDotsFilter(activeOMBFilter);
            }
        } else {
            const expr = applyOMBFilter(spec.paintExpression, activeOMBFilter);
            map.setPaintProperty('atlas-fema-layer', 'fill-color', expr);
            if (map.getLayer('atlas-fema-dots-layer')) {
                map.setLayoutProperty('atlas-fema-dots-layer', 'visibility', 'none');
            }
        }

        const legendBody = document.getElementById('legend-body');
        if (legendBody) legendBody.innerHTML = spec.legendHTML;
        updateFilterBadgeInLegend();
        refreshIndicatorsIfPopupOpen();
    }

    // Mirror the urban/rural filter into the dot layer so a "Rural only"
    // selection actually drops urban dots (otherwise the muted choropleth
    // says one thing but the dots keep showing every county).
    function applyDotsFilter(filter) {
        if (!map.getLayer('atlas-fema-dots-layer')) return;
        if (filter === 'all') {
            map.setFilter('atlas-fema-dots-layer', null);
            return;
        }
        const target = filter === 'rural' ? 'Rural' : 'Urban';
        map.setFilter('atlas-fema-dots-layer', ['==', ['get', 'OMB_CLASS'], target]);
    }

    // The disaster-count headline doubles as the active "row" for any
    // lens whose color ramp is driven by COUNTY_DISASTER_COUNT — Disaster,
    // Older Adults > "Disasters faced", and the Urban/Rural Counties &
    // Disaster Declarations lenses. Each gets its own headline tint via a
    // matching CSS class. Returns the key, or null if no lens claims it.
    function headlineLensKey() {
        if (activeLens === 'disaster') return 'disaster';
        if (activeLens === 'older' && activeSubModes.older === 'disastersFaced') return 'older';
        if (activeLens === 'urban') return 'urban';
        if (activeLens === 'rural') return 'rural';
        return null;
    }

    // Re-render the Indicators table inside the open popup so the
    // active-lens highlight tracks lens / sub-mode changes. Also
    // toggles the lens-active class on the disaster-count headline
    // (which serves as the "row" for any disaster-count-driven lens).
    // No-op if no popup is open or the user clicked an area without
    // FEMA data.
    function refreshIndicatorsIfPopupOpen() {
        if (typeof popup === 'undefined' || !popup.isOpen()) return;
        if (!lastClickedFemaProps) return;
        const block = document.getElementById('indicators-block');
        if (block) block.innerHTML = buildIndicatorsTable(lastClickedFemaProps);

        // Sync the headline tint with whichever lens is driving it.
        const headline = document.getElementById('disaster-count-block');
        if (headline) {
            const key = headlineLensKey();
            headline.classList.toggle('lens-active', !!key);
            headline.classList.toggle('lens-disaster', key === 'disaster');
            headline.classList.toggle('lens-older', key === 'older');
        }
    }

    // Track the most recently clicked county so we can rebuild the
    // indicators table on lens change without re-querying Mapbox.
    var lastClickedFemaProps = null;

    // Append a small badge to the legend if a filter is active so the
    // user always sees what they're looking at. Inserted as a sibling
    // of the lens body (above the no-data swatch when present).
    function updateFilterBadgeInLegend() {
        const legendBody = document.getElementById('legend-body');
        if (!legendBody) return;
        // Remove any old badge first.
        const old = legendBody.querySelector('.legend-filter-badge');
        if (old) old.remove();
        if (activeOMBFilter === 'all') return;
        const badge = document.createElement('div');
        badge.className = 'legend-filter-badge filter-' + activeOMBFilter;
        badge.textContent = activeOMBFilter === 'rural'
            ? 'Showing rural counties only'
            : 'Showing urban counties only';
        legendBody.appendChild(badge);
    }

    function setLens(lensKey) {
        if (!lensConfig[lensKey]) return;
        activeLens = lensKey;
        applyActiveStyling();
        updateSubControlVisibility();
    }

    function setSubMode(lensKey, subKey) {
        const cfg = lensConfig[lensKey];
        if (!cfg || !cfg.subModes || !cfg.subModes[subKey]) return;
        activeSubModes[lensKey] = subKey;
        if (activeLens === lensKey) applyActiveStyling();
    }

    function setOMBFilter(filter) {
        if (!['all', 'rural', 'urban'].includes(filter)) return;
        activeOMBFilter = filter;
        applyActiveStyling();
    }

    // Show/hide sub-control groups based on the active lens.
    function updateSubControlVisibility() {
        document.querySelectorAll('.control-suboptions').forEach(function (el) {
            el.style.display = (el.dataset.lens === activeLens) ? '' : 'none';
        });
    }

    // Wire up main lens radios. Auto-hide the help panel so a first-time
    // user reading the intro doesn't lose screen space the moment they
    // start exploring.
    document.querySelectorAll('input[name="lens"]').forEach(function (input) {
        input.addEventListener('change', function (e) {
            if (e.target.checked) { setLens(e.target.value); autoHideHelpPanel(); }
        });
    });

    // Wire up sub-mode radios. Each group's name is "{lens}-mode".
    document.querySelectorAll('.control-suboptions').forEach(function (group) {
        const lensKey = group.dataset.lens;
        group.querySelectorAll('input[type="radio"]').forEach(function (input) {
            input.addEventListener('change', function (e) {
                if (e.target.checked) { setSubMode(lensKey, e.target.value); autoHideHelpPanel(); }
            });
        });
    });

    // Wire up Urban/Rural filter radios.
    document.querySelectorAll('input[name="omb-filter"]').forEach(function (input) {
        input.addEventListener('change', function (e) {
            if (e.target.checked) { setOMBFilter(e.target.value); autoHideHelpPanel(); }
        });
    });

    // Render the initial legend body for the default lens.
    setLens('disaster');


    // -------------------------------------------------------------
    // SHARED FORMATTERS — used by both the hover tooltip and the
    // click popup so values render identically across the two.
    // -------------------------------------------------------------
    function fmtUSD(v) {
        var n = Number(v);
        if (!isFinite(n)) return '—';
        return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    function fmtUSDCompact(v) {
        var n = Number(v);
        if (!isFinite(n)) return '—';
        if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
        return '$' + n.toFixed(0);
    }
    function fmtSVI(v) {
        if (typeof v !== 'number') return 'No data';
        return v.toFixed(2);
    }
    // Same as fmtSVI but appends the CDC vulnerability category so a
    // bare 0.34 means something to non-specialists. CDC defines the
    // four bins as Low / Low-medium / Medium-high / High at 0.25 cuts.
    function fmtSVIWithCategory(v) {
        if (typeof v !== 'number') return 'No data';
        var cat;
        if      (v < 0.25) cat = 'Low';
        else if (v < 0.50) cat = 'Low-medium';
        else if (v < 0.75) cat = 'Medium-high';
        else               cat = 'High';
        return v.toFixed(2) + ' — ' + cat;
    }
    function fmtSAIDI(v) {
        if (typeof v !== 'number') return 'No data';
        var hrs = v / 60;
        if (hrs < 10) return hrs.toFixed(1) + ' hrs';
        return Math.round(hrs).toLocaleString('en-US') + ' hrs';
    }
    function fmtClass(v) {
        return (v === 'Urban' || v === 'Rural') ? v : '—';
    }
    // Format a count value (drops decimals, comma-separates thousands).
    function fmtCount(v) {
        if (typeof v !== 'number') return '—';
        return Math.round(v).toLocaleString('en-US');
    }
    // Format a percent stored as a 0-100 number (e.g. 22.2 → "22.2%").
    function fmtPctNum(v) {
        if (typeof v !== 'number') return 'No data';
        return v.toFixed(1) + '%';
    }
    // Older-adults popup: combine 60+ count + % of total on one line.
    // e.g. "8,234 (50.1%)". The Census AGE CLASS label ("Super-Aged" etc.)
    // is intentionally NOT shown — it's not defined anywhere in the tool
    // or on the Rebuild by Design website, so surfacing it would read as
    // alarmist jargon to funders. The 25%+ threshold used by the Older
    // Adults lens serves as the working definition of an "older-adults
    // concentrated" county.
    function fmtOlderPop(p) {
        var pop = p['county-level-older-adults_60+ POP'];
        var pct = p['county-level-older-adults_PCT POP 60+'];
        if (typeof pop !== 'number') return '—';
        var s = Math.round(pop).toLocaleString('en-US');
        if (typeof pct === 'number') s += ' (' + pct.toFixed(1) + '%)';
        return s;
    }
    // Returns the active lens's headline value as a short string for
    // the hover tooltip (e.g. "SVI: 0.34", "Energy outage (typical): 9.5 hrs").
    function activeLensSummary(props) {
        if (activeLens === 'disaster') {
            var d = props.COUNTY_DISASTER_COUNT;
            return (d == null ? '—' : d) + ' disasters';
        }
        if (activeLens === 'fema') {
            return 'FEMA: ' + fmtUSDCompact(props.COUNTY_TOTAL_FEMA);
        }
        if (activeLens === 'svi') {
            return 'SVI: ' + fmtSVI(props['CDC SVI (2022)']);
        }
        if (activeLens === 'energy') {
            var sub = activeSubModes.energy || 'avg';
            var key = sub === 'max' ? 'SAIDI_MIN_MAX' : 'SAIDI_MIN_AVG';
            // Hover is the first interaction — keep SAIDI in the legend
            // caption, not in the user-facing tooltip.
            var label = sub === 'max' ? 'Energy outage (worst)' : 'Energy outage (typical)';
            return label + ': ' + fmtSAIDI(props[key]) + '/yr';
        }
        if (activeLens === 'older') {
            var sub = activeSubModes.older || 'concentration';
            var older = Number(props['county-level-older-adults_60+ POP']);
            var pctO = Number(props['county-level-older-adults_PCT POP 60+']);
            var dis = Number(props.COUNTY_DISASTER_COUNT) || 0;
            var olderTxt = isFinite(older) ? Math.round(older).toLocaleString('en-US') : '—';
            var pctTxt = isFinite(pctO) ? pctO.toFixed(1) + '%' : '—';
            if (sub === 'concentration') {
                return olderTxt + ' adults 60+' + (isFinite(pctO) ? ' (' + pctTxt + ' of county)' : '')
                     + ' · ' + dis + ' disasters';
            }
            // disastersFaced — flag whether this county is in the
            // filtered set (25%+ age 60+) and show both criteria.
            if (!isFinite(pctO) || pctO < 25) {
                return pctTxt + ' age 60+ · not in filter';
            }
            return dis + ' disasters · ' + pctTxt + ' age 60+ · ' + olderTxt + ' older adults';
        }
        if (activeLens === 'urban' || activeLens === 'rural') {
            var cls = props.OMB_CLASS || '—';
            var target = activeLens === 'urban' ? 'Urban' : 'Rural';
            var d2 = Number(props.COUNTY_DISASTER_COUNT) || 0;
            if (cls !== target) return cls + ' county · not in this lens';
            return d2 + ' disasters · ' + cls + ' county';
        }
        return '';
    }


    // -------------------------------------------------------------
    // HOVER TOOLTIP — lightweight popup that follows the cursor and
    // shows the county name + active lens value. Separate Mapbox
    // popup instance from the click popup so they don't conflict.
    // Hidden whenever the click popup opens.
    // -------------------------------------------------------------
    var hoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        className: 'aoa-hover-popup',
        maxWidth: '260px'
    });

    map.on('mousemove', 'atlas-fema-layer', function (e) {
        // Don't show hover info while the click popup is open — avoids
        // a popup-on-popup mess.
        if (popup.isOpen()) {
            hoverPopup.remove();
            return;
        }
        if (!e.features || !e.features.length) return;
        var p = e.features[0].properties;
        var county = p.NAMELSAD || 'Unknown county';
        var state  = p.STATE_NAME || '';
        var omb    = fmtClass(p.OMB_CLASS);
        var summary = activeLensSummary(p);
        var html = ''
            + '<div class="hover-county">' + county + (state ? ', ' + state : '') + '</div>'
            + '<div class="hover-summary">' + summary + '</div>'
            + (omb !== '—' ? '<div class="hover-class">' + omb + '</div>' : '');
        hoverPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    map.on('mouseleave', 'atlas-fema-layer', function () {
        hoverPopup.remove();
    });

    // Also hide on map drag/zoom — the tooltip can stick mid-pan.
    map.on('dragstart', function () { hoverPopup.remove(); });
    map.on('zoomstart', function () { hoverPopup.remove(); });


    // -------------------------------------------------------------
    // POPUP CONTENT — shared builder used by both the click handler
    // and the geocoder result handler. The Indicators table is
    // wrapped in #indicators-block so we can refresh just that piece
    // when the user changes lens with the popup open.
    // -------------------------------------------------------------

    // Format the county per-capita FEMA (preserves the "Under Review"
    // carve-out for NYC GEOID 36039 that the original code shipped).
    function formatCountyPerCapita(p) {
        if (p.GEOID === '36039' || (typeof p.COUNTY_PER_CAPITA !== 'string' && Number.isNaN(Number(p.COUNTY_PER_CAPITA)))) {
            return '$11,487 *Under Review';
        }
        return '$' + Number(String(p.COUNTY_PER_CAPITA).replace(/\D/g, '')).toLocaleString('en-US');
    }

    // Inner indicators table HTML (without wrapping div) — re-rendered
    // independently when the active lens changes. The 'disaster' lens
    // is intentionally NOT in this table — the big disaster-count
    // headline above the table doubles as that lens's display.
    //
    // Three sections, each with its own subheader naming the source:
    //   - Atlas of Accountability (FEMA county + state totals)
    //   - CDC Social Vulnerability Index
    //   - U.S. Energy Reliability (SAIDI)
    // Rows without a `key` are non-highlightable context (state stats).
    function buildIndicatorsTable(p) {
        // Combined federal assistance (FEMA + HUD CDBG-DR) at the state
        // level — surfaces the single number a funder is most likely to
        // quote. Falls back to 0 for either side if missing so a partial
        // value still renders rather than collapsing to "—".
        var stateFema = Number(p.STATE_FEMA_TOTAL);
        var stateCdbg = Number(p.STATE_CDBG_TOTAL);
        var stateCombinedFederal = (!isFinite(stateFema) && !isFinite(stateCdbg))
            ? '—'
            : fmtUSD((isFinite(stateFema) ? stateFema : 0) + (isFinite(stateCdbg) ? stateCdbg : 0));

        var rows = [
            { subheader: 'Federal Disaster Funding (2011–2024)' },
            // All six rows carry key='fema' so the entire Federal Disaster
            // Funding block lights up when the FEMA lens is active. Reads
            // as a single navigable unit for funders, rather than letting
            // the county rows "float" above un-highlighted state context.
            { key: 'fema', label: 'County FEMA Total (PA+HM)',          value: fmtUSD(p.COUNTY_TOTAL_FEMA) },
            { key: 'fema', label: 'Per Capita',                         value: formatCountyPerCapita(p) },
            { key: 'fema', label: 'State FEMA Total (PA+HM)',           value: fmtUSD(p.STATE_FEMA_TOTAL) },
            { key: 'fema', label: 'State CDBG Disaster Recovery',       value: fmtUSD(p.STATE_CDBG_TOTAL) },
            { key: 'fema', label: 'State Total Federal Assistance (FEMA + HUD)', value: stateCombinedFederal },
            { key: 'fema', label: 'State Per Capita',                   value: fmtUSD(p.STATE_PER_CAPITA) },

            { subheader: 'CDC Social Vulnerability Index (2022)' },
            { key: 'svi',  label: 'Vulnerability score', value: fmtSVIWithCategory(p['CDC SVI (2022)']) },

            { subheader: 'U.S. Energy Reliability (2022)' },
            { key: 'energy', label: 'Average outage',     value: fmtSAIDI(p.SAIDI_MIN_AVG) },
            { key: 'energy', label: 'Worst-case outage',  value: fmtSAIDI(p.SAIDI_MIN_MAX) },

            { subheader: 'Older Adults 60+' },
            { key: 'older', label: 'Older adults (60+)',
              value: fmtOlderPop(p) }
        ];
        var html = '<table class="indicators-table">';
        // Collect any footnote entries; rendered below the table so they
        // act as a methodology caveat block rather than table rows.
        var footnotes = [];
        rows.forEach(function (r) {
            if (r.subheader) {
                html += '<tr class="indicator-subheader"><td colspan="2">' + r.subheader + '</td></tr>';
                return;
            }
            if (r.caption) {
                // Small italic methodology / explainer text. Sits under
                // a subheader to define a term or scope before the rows.
                html += '<tr class="indicator-caption"><td colspan="2">' + r.caption + '</td></tr>';
                return;
            }
            if (r.footnote) {
                footnotes.push(r.footnote);
                return;
            }
            // A row is active when its lens key matches activeLens AND
            // (if it specifies a subKey) that subKey matches the lens's
            // active sub-mode. This keeps Energy AVG/MAX rows from both
            // lighting up on Energy lens, and lets Older Adults toggle
            // its Population vs Compound row independently.
            var isActive = false;
            if (r.key && r.key === activeLens) {
                if (r.subKey) {
                    isActive = (activeSubModes[activeLens] === r.subKey);
                } else {
                    isActive = true;
                }
            }
            var cls = isActive ? 'indicator-active lens-' + activeLens : '';
            html += '<tr class="' + cls + '">'
                  + '<td class="indicator-label">' + r.label + '</td>'
                  + '<td class="indicator-value">' + r.value + '</td>'
                  + '</tr>';
        });
        html += '</table>';
        // Render footnotes (if any) below the table — small italic
        // caveat block, one line per footnote.
        if (footnotes.length) {
            html += '<div class="indicators-footnotes">'
                  + footnotes.map(function (f) { return '<div>' + f + '</div>'; }).join('')
                  + '</div>';
        }
        return html;
    }

    function buildPopupContent(femaFeature, congressFeature) {
        var p = femaFeature;
        var c = congressFeature;
        var stateName = p.STATE_NAME;
        var countyName = p.NAMELSAD;
        var disasterCount = p.COUNTY_DISASTER_COUNT;
        var omb = fmtClass(p.OMB_CLASS);
        var ombSlug = (omb === 'Rural' || omb === 'Urban') ? omb.toLowerCase() : '';
        var representativeName = c.FIRSTNAME + ' ' + c.LASTNAME;

        var hasGovernor = c.GOVERNOR && c.GOVERNOR !== 'N/A' && c.GOVERNOR.trim() !== '';
        var governorBlock = hasGovernor ? (''
            + '<h3>State Governor</h3>'
            + '<div class="senator-info"><div class="senator-row">'
            +   '<img src="' + c.GOVERNOR_PIC + '" alt="Governor" class="senator-image">'
            +   '<div><a href="' + c.GOVERNOR_URL + '" target="_blank">' + c.GOVERNOR + ' (' + c.GOVERNOR_PARTY + ')</a></div>'
            + '</div></div>'
        ) : '';

        var classificationBadge = ombSlug
            ? '<span class="classification-badge classification-' + ombSlug + '">' + omb + '</span>'
            : '';

        // Format county population (skip if missing).
        var popNum = Number(p.COUNTY_POPULATION);
        var popText = isFinite(popNum) && popNum > 0
            ? 'Population ' + popNum.toLocaleString('en-US')
            : '';

        // Build the sub-line: classification tag first, then population.
        // Classification is the visual anchor (solid rectangle), population
        // is the supporting context (regular text).
        var subParts = [];
        if (classificationBadge) subParts.push(classificationBadge);
        if (popText) subParts.push('<span class="popup-pop">' + popText + '</span>');
        var subLine = subParts.length
            ? '<div class="popup-county-sub">' + subParts.join('') + '</div>'
            : '';

        return ''
            + '<div class="popup-container">'
            +   '<div class="popup-tabs">'
            +     '<button class="popup-tab active" type="button" data-target="disaster">County Data</button>'
            +     '<button class="popup-tab" type="button" data-target="rep">Representatives</button>'
            +   '</div>'

            // ===== COUNTY DATA COLUMN =====
            +   '<div class="popup-column popup-col-disaster active">'
            +     '<div class="popup-county-header">'
            +       '<h3>' + countyName + ', ' + stateName + '</h3>'
            +       subLine
            +     '</div>'
            +     '<div id="disaster-count-block" class="disaster-count' + (function () { var k = headlineLensKey(); return k ? ' lens-active lens-' + k : ''; })() + '">'
            +       '<div class="count">' + disasterCount + '</div>'
            +       '<div class="count-description">Federally Declared Extreme Weather Disasters (2011–2024)</div>'
            +     '</div>'
            +     '<div id="indicators-block" class="indicators-block">'
            +       buildIndicatorsTable(p)
            +     '</div>'
            +   '</div>'

            // ===== REPRESENTATIVES COLUMN =====
            +   '<div class="popup-column popup-col-rep">'
            +     '<p class="namelsad">' + c.NAMELSAD20 + '</p>'
            +     '<h3>Congress Representative</h3>'
            +     '<p><a href="' + c.WEBSITEURL + '" target="_blank">' + representativeName + ' (' + c.PARTY + ')</a></p>'
            +     '<div class="rep-info">'
            +       '<img src="' + c.PHOTOURL + '" alt="Profile Picture" class="rep-image">'
            +       '<div class="social-links">'
            +         '<a href="' + c.WEBSITEURL + '" target="_blank"><img src="img/id-card.svg" alt="Website"></a>'
            +         '<a href="' + c.FACE_BOOK_ + '" target="_blank"><img src="img/facebook.svg" alt="Facebook"></a>'
            +         '<a href="' + c.TWITTER_UR + '" target="_blank"><img src="img/twitter.svg" alt="Twitter"></a>'
            +         '<a href="' + c.INSTAGRAM_ + '" target="_blank"><img src="img/instagram.svg" alt="Instagram"></a>'
            +       '</div>'
            +     '</div>'
            +     '<h3>US Senators</h3>'
            +     '<div class="senator-info">'
            +       '<div class="senator-row">'
            +         '<img src="' + c.SENATE1_PIC + '" alt="Senator 1" class="senator-image">'
            +         '<div><a href="' + c.SENATOR1_URL + '" target="_blank">' + c.SENATOR1 + ' (' + c.SENATOR1_PARTY + ')</a></div>'
            +       '</div>'
            +       '<div class="senator-row">'
            +         '<img src="' + c.SENATOR2_PIC + '" alt="Senator 2" class="senator-image">'
            +         '<div><a href="' + c.SENATOR2_URL + '" target="_blank">' + c.SENATOR2 + ' (' + c.SENATOR2_PARTY + ')</a></div>'
            +       '</div>'
            +     '</div>'
            +     governorBlock
            +     '<p class="atlas-report-lead">For more info, read the Atlas report:</p>'
            +     '<a href="' + c.ATLAS_URL + '" target="_blank" rel="noopener" class="atlas-report-button">'
            +       '<span class="atlas-report-cta">Atlas of Disaster (2011–2024):</span>'
            +       '<span class="atlas-report-state">' + stateName + '</span>'
            +     '</a>'
            +   '</div>'
            + '</div>';
    }


    // Collapse / expand the control panel (helpful on mobile).
    // Auto-collapse on first load on small screens; user can re-open.
    // We mirror the collapsed state on BOTH the body (display:none) and
    // the panel container (so CSS can shrink the panel to an icon pill
    // on mobile via #control-panel.is-collapsed).
    var controlPanel = document.getElementById('control-panel');
    var controlBody = document.getElementById('control-panel-body');
    var controlToggleBtn = document.getElementById('control-collapse-toggle');

    function setControlCollapsed(collapsed) {
        if (collapsed) {
            controlBody.classList.add('collapsed');
            controlPanel.classList.add('is-collapsed');
        } else {
            controlBody.classList.remove('collapsed');
            controlPanel.classList.remove('is-collapsed');
        }
        controlToggleBtn.setAttribute('aria-expanded', String(!collapsed));
        var iconEl = controlToggleBtn.querySelector('.control-collapse-icon');
        if (iconEl) iconEl.textContent = collapsed ? '+' : '−';
    }

    if (controlToggleBtn && controlBody && controlPanel) {
        if (isMobile()) setControlCollapsed(true);
        controlToggleBtn.addEventListener('click', function () {
            var nowCollapsed = !controlBody.classList.contains('collapsed');
            setControlCollapsed(nowCollapsed);
        });
    }

    // Load the GeoJSON file for congressional districts with representative names
    map.addSource('congress', {
        type: 'geojson',
        data: 'data/US_Congress_V2.geojson'
    });

    // Add a layer for districts
    map.addLayer({
        'id': 'congress-layer',
        'type': 'fill',
        'source': 'congress',
        'paint': {
            'fill-color': 'transparent', // No fill color
            'fill-outline-color': '#000' // Black border color
        }
    });

    // Line layer specifically for district borders
    map.addLayer({
        'id': 'congress-border',
        'type': 'line',
        'source': 'congress',
        'layout': {},
        'paint': {
            'line-color': '#000', // Black border color
            'line-width': 0.5
        }
    });


    // Initialize the popup globally if it needs to be accessed by different layers.
    // maxWidth caps the popup wrapper at ~540px on desktop. The inner
    // .popup-container splits this 60% (left, county data) / 40% (right,
    // representatives) — see styles.css. Mobile CSS overrides this with
    // a bottom-sheet treatment.
    var popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "540px"
    });
    // When the popup closes (via X button, click-outside, or programmatic close),
    // drop the body flag so the legend reappears on mobile, and clear
    // the cached feature so live lens-refresh stops trying to update it.
    popup.on('close', function () {
        document.body.classList.remove('popup-open');
        lastClickedFemaProps = null;
    });

    // When a user clicks on the map, show a popup with information.
    // The HTML is built by buildPopupContent() so the click and geocoder
    // paths share one source of truth.
    map.on('click', function (e) {
        var femaFeatures = map.queryRenderedFeatures(e.point, { layers: ['atlas-fema-layer'] });
        var congressFeatures = map.queryRenderedFeatures(e.point, { layers: ['congress-layer'] });

        if (!femaFeatures.length || !congressFeatures.length) {
            return;
        }

        // Hide hover tooltip while click popup is open, and tuck away
        // the intro help panel — the user is now actively exploring data.
        hoverPopup.remove();
        autoHideHelpPanel();

        var femaFeature = femaFeatures[0].properties;
        var congressFeature = congressFeatures[0].properties;
        lastClickedFemaProps = femaFeature;  // for live indicator refresh
        var popupContent = buildPopupContent(femaFeature, congressFeature);
        popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        finalizePopup(e.lngLat);
    });





    // Update mouse settings to change on enter and leave of the interactive layer
    map.on('mouseenter', 'atlas-fema-layer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'atlas-fema-layer', function () {
        map.getCanvas().style.cursor = '';
    });



    // Initialize the geocoder
    var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Search An Address',
        flyTo: {
            zoom: 6.5, // Ensures the map zooms to level 6.5
            bearing: 0,
            speed: 1.2,
            curve: 1,
            easing: function (t) { return t; }
        }
    });


    // Add the geocoder to the map
    map.addControl(geocoder, 'top-right');

    // Get the geocoder container element
    var geocoderContainer = document.querySelector('.mapboxgl-ctrl-geocoder');

    // Add the nudge animation after 5 seconds of inactivity
    var nudgeTimeout = setTimeout(function () {
        geocoderContainer.classList.add('nudge');
    }, 5000);

    // Remove the nudge animation on user interaction
    function removeNudgeOnInteraction() {
        clearTimeout(nudgeTimeout);
        geocoderContainer.classList.remove('nudge');
        map.off('mousemove', removeNudgeOnInteraction); // Remove the event listener after the first interaction
    }

    map.on('mousemove', removeNudgeOnInteraction);

    // Non-blocking replacement for alert() on a failed geocoder lookup.
    // Anchored under the geocoder control so the message lands next to
    // the input that triggered it. Auto-dismisses after 4.5s.
    var geocoderToastTimer = null;
    function showGeocoderToast(message) {
        var existing = document.getElementById('aoa-geocoder-toast');
        if (existing) existing.remove();
        if (geocoderToastTimer) { clearTimeout(geocoderToastTimer); geocoderToastTimer = null; }

        var toast = document.createElement('div');
        toast.id = 'aoa-geocoder-toast';
        toast.className = 'aoa-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = message;
        document.body.appendChild(toast);

        geocoderToastTimer = setTimeout(function () {
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            geocoderToastTimer = null;
        }, 4500);
    }


    // Handle the result event from the geocoder
    geocoder.on('result', function (e) {
        var lngLat = e.result.geometry.coordinates;

        // Wait for the map to be idle before processing the result
        map.once('idle', function () {
            if (popup.isOpen()) {
                popup.remove();
            }

            // Query features at the geographical coordinates
            var femaFeatures = map.queryRenderedFeatures(map.project(lngLat), { layers: ['atlas-fema-layer'] });
            var congressFeatures = map.queryRenderedFeatures(map.project(lngLat), { layers: ['congress-layer'] });

            // Check for general location match and handle appropriately.
            // Native alert() reads as amateurish to foundation-facing users;
            // we surface the message as a non-blocking toast under the
            // geocoder instead.
            if (femaFeatures.length === 0) {
                showGeocoderToast('No detailed match found. Try a more specific address.');
                return;
            }

            var femaFeature = femaFeatures[0].properties;
            var congressFeature = congressFeatures[0].properties;
            lastClickedFemaProps = femaFeature;  // for live indicator refresh
            var popupContent = buildPopupContent(femaFeature, congressFeature);

            // Set new content and open the popup at the searched location
            popup.setLngLat(lngLat)
                .setHTML(popupContent)
                .addTo(map);
            finalizePopup(lngLat);

        });
    });

    // Optional Share / Download buttons — only wire up if present in the DOM.
    // (These IDs aren't currently in index.html; guard so the rest of the
    // script keeps running.)
    var shareBtn = document.getElementById('shareReportButton');
    if (shareBtn) {
        shareBtn.addEventListener('click', function () {
            const subject = encodeURIComponent('Atlas of Accountability by Rebuild by Design');
            const body = encodeURIComponent(
                'Hello,\n\nI believe you will be interested in this.\n\nCheck out Rebuild by Design\'s Atlas of Accountability, a web tool that allows users to identify past federal disaster declarations and recovery funding for climate-driven events county-by-county, and congressional representatives district-by-district. The interactive map is designed to help communities and policymakers understand their localized exposure to extreme weather disasters and the benefits of investments in resilient infrastructure that can make communities safer.\n\nThe analysis finds that for 2011-2023:\n- 91% of congressional districts include a county that has received a federal disaster declaration for an extreme weather event.\n- 72% of states have had more than 10 disaster declarations\n- In 24 states (48%), every county has had a disaster declaration.\n- Of the 23 congressional districts that have experienced 10 or more disasters, over two-thirds are represented by Republicans while nearly one-third are represented by Democrats.\n\nYou can check it out here: https://rebuildbydesign.org/atlas-of-disaster\n\nThis map highlights the urgency of bipartisan cooperation and the need to unite across the urban-rural divide, it also outlines strategies for shifting from post-disaster funding to pre-disaster preparedness.\n\nPlease share this with your network to help spread awareness and advocate for stronger, resilient infrastructure.'
            );
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        });
    }

    var downloadBtn = document.getElementById('downloadReportButton');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function () {
            window.location.href = 'https://rebuildbydesign.org/wp-content/uploads/Atlas-of-Accountability-Full-Report.pdf';
        });
    }


});

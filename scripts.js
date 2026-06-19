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
    // Desktop: pan the map so the whole popup sits within the viewport
    // (with a margin). If the popup is taller/wider than the viewport it
    // aligns to the top/left so the county name reads first; the popup's
    // own max-height + overflow-y:auto then provides an internal scrollbar.
    // Re-runnable — called on open AND after a collapsible section expands,
    // so the user never has to pan the map by hand to chase a grown popup.
    function fitPopupDesktopIntoView() {
        if (isMobile()) return;
        var popupEl = document.querySelector('.mapboxgl-popup');
        if (!popupEl) return;
        var mapRect = map.getContainer().getBoundingClientRect();
        var popupRect = popupEl.getBoundingClientRect();
        var MARGIN = 16;

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

        // Panning the MAP by [a, b] shifts the popup by [-a, -b] on screen,
        // so to shift the popup by [pdx, pdy] we pan the map by [-pdx, -pdy].
        var pdx = targetLeft - popupRect.left;
        var pdy = targetTop  - popupRect.top;
        if (pdx !== 0 || pdy !== 0) {
            map.panBy([-pdx, -pdy], { duration: 350 });
        }
    }

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
                fitPopupDesktopIntoView();
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

            // --- Collapsible indicator sections (e.g. tract themes / race) ---
            // Delegated on popupContainer because the indicators table is
            // re-rendered in place on lens switch (refreshIndicatorsIfPopupOpen),
            // which would drop listeners attached to the rows themselves.
            popupContainer.addEventListener('click', function (ev) {
                // "Zoom in for census-tract detail" nudge → fly to tract zoom,
                // centered on the popup's location, for users who clicked a
                // county under the SVI lens at low zoom.
                var zoomHint = ev.target.closest('.svi-zoom-hint');
                if (zoomHint && popupContainer.contains(zoomHint)) {
                    var ll = popup.getLngLat();
                    if (ll) map.flyTo({ center: ll, zoom: Math.max(map.getZoom(), 6.5) });
                    return;
                }
                var header = ev.target.closest('.indicator-collapsible');
                if (!header || !popupContainer.contains(header)) return;
                var group = header.getAttribute('data-group');
                var nowOpen = header.getAttribute('aria-expanded') !== 'true';
                header.setAttribute('aria-expanded', String(nowOpen));
                popupContainer.querySelectorAll('.group-' + group).forEach(function (row) {
                    row.classList.toggle('is-open', nowOpen);
                });
                // Expanding/collapsing changes the popup height — re-fit so a
                // grown popup is brought back into view (and scrolls inside)
                // instead of forcing the user to pan the map.
                requestAnimationFrame(fitPopupDesktopIntoView);
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
                <div class="svi-scope-line" id="svi-scope-line"></div>
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
                <div class="svi-scope-hint" id="svi-scope-hint"></div>
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
        },

        // Communities of Color — same "Who's Affected" pattern as Older
        // Adults: filter to majority-minority counties (50%+ people of
        // color), then step on COUNTY_DISASTER_COUNT through the shared
        // 7-bin scheme (0/1/3/5/7/10/12). Palette: magenta/pink — distinct
        // from urban (purple), rural (blue), older (green), and not a
        // party color. % minority comes from CDC SVI 2022 county data
        // joined into Atlas_FEMA (COUNTY_PCT_MINORITY); the county popup +
        // hover surface the full race breakdown so users don't need the
        // tract layer.
        minority: {
            label: 'Communities of Color',
            paintExpression: [
                'case',
                ['>=', ['to-number', ['coalesce', ['get', 'COUNTY_PCT_MINORITY'], -1]], 50],
                [
                    'step',
                    ['to-number', ['coalesce', ['get', 'COUNTY_DISASTER_COUNT'], 0]],
                    '#fde0dd',         //  0
                    1,  '#fcc5c0',     //  1–2
                    3,  '#fa9fb5',     //  3–4
                    5,  '#f768a1',     //  5–6
                    7,  '#dd3497',     //  7–9
                    10, '#ae017e',     //  10–11
                    12, '#7a0177'      //  12+
                ],
                '#ECECEC'   // counties under 50% people of color (or no data)
            ],
            legendHTML: `
                <div class="legend-title"><b>Communities of Color</b><br><span class="legend-mode-name">Number of disaster declarations</span></div>
                <div class="color-bar lens-minority">
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
                <div class="legend-units">Federal disaster declarations in majority-minority counties — where at least 50% of residents are people of color. CDC SVI, 2022.</div>
                <div class="legend-no-data">
                    <span class="no-data-swatch" style="background:#ECECEC"></span>
                    <span>Counties under 50% people of color</span>
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

    // -------------------------------------------------------------
    // SVI CENSUS-TRACT LAYER — high-resolution overlay for the SVI lens.
    // Vector tileset hosted on Mapbox (mapbox://j00by.83jd1t0zvuxe),
    // built from CDC/ATSDR 2022 SVI joined to 2022 Census tract
    // cartographic boundaries (cb_2022_us_tract_500k). 85,185 tracts
    // nationwide, ~21 attributes per tract (overall + 4-theme SVI
    // percentiles, total pop, % minority, % per racial/ethnic group).
    //
    // Hidden by default. When the user selects the SVI lens,
    // applyActiveStyling() hides the county fill and shows these
    // tract layers so vulnerability reads at neighborhood resolution.
    // Tract clicks reuse the existing popup builder via the click
    // handler below, with the parent county's FEMA + Congress data
    // pulled in for comparison.
    // -------------------------------------------------------------
    const SVI_TRACT_RAMP = [
        'case',
        ['==', ['typeof', ['get', 'RPL_THEMES']], 'number'],
        [
            'step',
            ['get', 'RPL_THEMES'],
            '#C6F2ED',           //  0.0 – 0.2
            0.2, '#79D9CF',      //  0.2 – 0.4
            0.4, '#00B7A6',      //  0.4 – 0.6
            0.6, '#009887',      //  0.6 – 0.8
            0.8, '#007462'       //  0.8 – 1.0
        ],
        '#C9C9C9'  // No SVI value available (e.g. PR, low-pop tracts)
    ];

    map.addSource('svi-tracts', {
        type: 'vector',
        url: 'mapbox://j00by.83jd1t0zvuxe',
        promoteId: 'GEOID'
    });

    // Zoom-interpolated crossfade between county SVI (low zoom) and tract
    // SVI (high zoom). The tract tileset's published minzoom is 4 — tracts
    // physically don't exist below that. We fade tracts IN from z4→5 and
    // fade the county fill OUT across the same range (see applyActiveStyling).
    // Net effect: SVI is visible at every zoom, with county-level overview
    // when zoomed out and tract-level detail when zoomed in.
    const TRACT_OPACITY_BY_ZOOM = [
        'interpolate', ['linear'], ['zoom'],
        4, 0,
        5, 1
    ];
    const COUNTY_OPACITY_BY_ZOOM_SVI = [
        'interpolate', ['linear'], ['zoom'],
        4, 1,
        5, 0
    ];
    // Zoom at which the legend flips its scope line from "County average"
    // to "Census tracts". Sits inside the z4→z5 crossfade above, biased
    // toward the point where tracts are the dominant (>50%) layer.
    const SVI_TRACT_ZOOM_THRESHOLD = 4.6;

    map.addLayer({
        'id': 'svi-tracts-layer',
        'type': 'fill',
        'source': 'svi-tracts',
        'source-layer': '0c0bc69de35e43c6b7cf',
        'layout': { 'visibility': 'none' },
        'paint': {
            'fill-color': SVI_TRACT_RAMP,
            'fill-opacity': TRACT_OPACITY_BY_ZOOM
        }
    }, 'state-label');

    // White tract outlines, fading in at zoom 7+ so the choropleth
    // reads as a single sheet at national zoom but tract definition
    // appears as the user drills into a metro or neighborhood.
    map.addLayer({
        'id': 'svi-tracts-outline',
        'type': 'line',
        'source': 'svi-tracts',
        'source-layer': '0c0bc69de35e43c6b7cf',
        'layout': { 'visibility': 'none' },
        'paint': {
            'line-color': '#ffffff',
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 0.4, 14, 0.7],
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 0.2, 14, 0.6]
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
    // Lookup: county GEOID (5-digit FIPS) → full Atlas_FEMA county
    // properties. Populated below from the same fetch the dots layer
    // uses (browser caches the response, so this is free). Used by
    // the SVI tract click path to hydrate the parent county's row
    // (FEMA totals, county SVI for comparison, OMB class, population,
    // and so on) without an extra round-trip.
    var countyByGeoid = new Map();

    fetch('data/Atlas_FEMA_V2.geojson').then(function (r) { return r.json(); }).then(function (data) {
        const pointFeatures = [];
        for (const f of data.features) {
            // Index every county once so the tract-click path can
            // look up its parent by the first 5 chars of the tract
            // GEOID (e.g. tract 06077005127 → county 06077).
            if (f.properties && f.properties.GEOID) {
                countyByGeoid.set(f.properties.GEOID, f.properties);
            }
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
        const isTracts = activeLens === 'svi';  // SVI lens swaps to tract-level rendering

        if (isDots) {
            // The dots sub-mode paints the choropleth too — either a
            // single color (legacy) or a full expression (e.g. the shared
            // DISASTER_RAMP underneath the older-adults dots). Wrap in the
            // urban/rural filter so a "Rural only" selection still mutes
            // urban counties under the dots.
            const base = spec.choroplethPaint || spec.choroplethColor || '#F4F1EA';
            map.setPaintProperty('atlas-fema-layer', 'fill-color', applyOMBFilter(base, activeOMBFilter));
            map.setPaintProperty('atlas-fema-layer', 'fill-opacity', 1);
            if (map.getLayer('atlas-fema-dots-layer')) {
                map.setLayoutProperty('atlas-fema-dots-layer', 'visibility', 'visible');
                applyDotsFilter(activeOMBFilter);
            }
        } else {
            const expr = applyOMBFilter(spec.paintExpression, activeOMBFilter);
            map.setPaintProperty('atlas-fema-layer', 'fill-color', expr);
            // Under SVI lens: county fills the screen at z≤4 (where the
            // tract tileset has no tiles), then fades out across z4→5
            // as the tract layer fades in. Under every other lens the
            // county fill stays fully opaque.
            map.setPaintProperty('atlas-fema-layer', 'fill-opacity', isTracts ? COUNTY_OPACITY_BY_ZOOM_SVI : 1);
            if (map.getLayer('atlas-fema-dots-layer')) {
                map.setLayoutProperty('atlas-fema-dots-layer', 'visibility', 'none');
            }
        }

        // Toggle the tract layers in lockstep with the SVI lens.
        // We keep atlas-fema-layer present (fill-opacity 0 above)
        // rather than hiding it so the tract-click path can still
        // queryRenderedFeatures the parent county for OMB class,
        // FEMA dollars, etc.
        if (map.getLayer('svi-tracts-layer')) {
            map.setLayoutProperty('svi-tracts-layer', 'visibility', isTracts ? 'visible' : 'none');
        }
        if (map.getLayer('svi-tracts-outline')) {
            map.setLayoutProperty('svi-tracts-outline', 'visibility', isTracts ? 'visible' : 'none');
        }

        const legendBody = document.getElementById('legend-body');
        if (legendBody) legendBody.innerHTML = spec.legendHTML;
        updateFilterBadgeInLegend();
        renderSviScope();
        refreshIndicatorsIfPopupOpen();
    }

    // Under the SVI lens the visible choropleth silently switches from a
    // county average (zoom < threshold) to census tracts (zoom ≥ threshold).
    // This fills the legend's scope line + zoom nudge so the user always
    // knows which resolution they're reading. No-op under other lenses
    // (their legendHTML has no #svi-scope-line element).
    function renderSviScope() {
        const lineEl = document.getElementById('svi-scope-line');
        if (!lineEl) return;  // not the SVI legend
        const hintEl = document.getElementById('svi-scope-hint');
        const isTractView = map.getZoom() >= SVI_TRACT_ZOOM_THRESHOLD;
        if (isTractView) {
            lineEl.innerHTML = '<span class="res-dot"></span>Viewing: Census tracts';
            if (hintEl) { hintEl.innerHTML = ''; hintEl.style.display = 'none'; }
        } else {
            lineEl.innerHTML = '<span class="res-dot"></span>Viewing: County average';
            if (hintEl) {
                hintEl.innerHTML = '<span class="svi-scope-hint-icon">&#128269;</span>'
                    + 'Zoom in for census-tract detail';
                hintEl.style.display = '';
            }
        }
    }

    // Keep the SVI scope line in sync as the user zooms across the
    // county↔tract threshold. renderSviScope() no-ops under other lenses.
    map.on('zoom', renderSviScope);

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
        if (activeLens === 'minority') return 'minority';
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
        if (block) block.innerHTML = buildIndicatorsTable(lastClickedFemaProps, lastClickedTractProps);

        // Sync the headline tint with whichever lens is driving it. Toggle
        // EVERY lens class (not just disaster/older) so a stale tint from the
        // lens the popup was opened under — e.g. the magenta Communities of
        // Color tint — is cleared when the user switches layers.
        const headline = document.getElementById('disaster-count-block');
        if (headline) {
            const key = headlineLensKey();
            headline.classList.toggle('lens-active', !!key);
            ['disaster', 'older', 'urban', 'rural', 'minority'].forEach(function (k) {
                headline.classList.toggle('lens-' + k, key === k);
            });
        }
    }

    // Track the most recently clicked county so we can rebuild the
    // indicators table on lens change without re-querying Mapbox.
    // lastClickedTractProps is set only when the click landed on the
    // tract layer (SVI lens active); otherwise null.
    var lastClickedFemaProps = null;
    var lastClickedTractProps = null;

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
    // County race/ethnicity breakdown for the Communities of Color lens.
    // Reads the COUNTY_PCT_* fields joined from CDC SVI 2022 county data
    // (see tools/join_county_race.py) and returns the present groups,
    // sorted high→low, so both the hover tooltip and the popup can render
    // the full breakdown without dropping to the tract layer. Labels match
    // the tract popup's race rows for consistency.
    var COUNTY_RACE_FIELDS = [
        ['COUNTY_PCT_AFAM',      'Black or African American'],
        ['COUNTY_PCT_HISP',      'Hispanic or Latino'],
        ['COUNTY_PCT_ASIAN',     'Asian'],
        ['COUNTY_PCT_AIAN',      'American Indian / Alaska Native'],
        ['COUNTY_PCT_NHPI',      'Native Hawaiian / Pacific Islander'],
        ['COUNTY_PCT_TWOMORE',   'Two or more races'],
        ['COUNTY_PCT_OTHERRACE', 'Other race']
    ];
    function countyRaceList(props) {
        var out = [];
        COUNTY_RACE_FIELDS.forEach(function (f) {
            var v = Number(props[f[0]]);
            if (isFinite(v) && v > 0) out.push({ label: f[1], pct: v });
        });
        out.sort(function (a, b) { return b.pct - a.pct; });
        return out;
    }

    // Plain-English disaster-declaration count, properly singular/plural
    // ("1 disaster declaration" / "7 disaster declarations"). Wording
    // matches the legend caption so the tooltip and legend speak the same
    // language.
    function fmtDisasterDeclarations(v) {
        var n = Number(v) || 0;
        return n.toLocaleString('en-US') + ' disaster declaration' + (n === 1 ? '' : 's');
    }
    // Total county population, comma-grouped. Stored as a string on the
    // feature; returns null when missing so callers can omit the line.
    function fmtPopulation(v) {
        var n = Number(v);
        if (!isFinite(n) || n <= 0) return null;
        return n.toLocaleString('en-US');
    }

    // Build the hover tooltip's data for the ACTIVE lens. Returns
    //   { lens, headline, sub }
    // where `lens` is the palette class for the headline color, `headline`
    // is the county's real value for the active layer in plain language,
    // and `sub` is an optional muted context line (or null).
    //
    // Design rules (agreed in QA):
    //   • The tooltip shows the county's actual data for the active layer —
    //     no "not in filter / not in this lens" editorializing. Whether a
    //     county is in the highlighted set is conveyed by its color + the
    //     legend, not by a scolding note.
    //   • Urban/Rural classification appears ONLY on the Urban/Rural lenses
    //     (where it's the subject) — never as a tag on every tooltip.
    //   • Population appears ONLY on Urban/Rural, where the 50,000-resident
    //     threshold is what defines the layer.
    function buildLensSummary(props) {
        var dis = Number(props.COUNTY_DISASTER_COUNT) || 0;

        if (activeLens === 'disaster') {
            return { lens: 'disaster', headline: fmtDisasterDeclarations(dis), sub: null };
        }
        if (activeLens === 'fema') {
            return { lens: 'fema', headline: fmtUSDCompact(props.COUNTY_TOTAL_FEMA) + ' in FEMA funding', sub: null };
        }
        if (activeLens === 'svi') {
            return { lens: 'svi', headline: 'Vulnerability: ' + fmtSVIWithCategory(props['CDC SVI (2022)']), sub: null };
        }
        if (activeLens === 'energy') {
            var sub = activeSubModes.energy || 'avg';
            var key = sub === 'max' ? 'SAIDI_MIN_MAX' : 'SAIDI_MIN_AVG';
            var label = sub === 'max' ? 'Worst-case outage' : 'Typical outage';
            var saidi = props[key];
            var headline = (typeof saidi === 'number')
                ? label + ': ' + fmtSAIDI(saidi) + '/year'
                : label + ': no utility data';
            return { lens: 'energy', headline: headline, sub: null };
        }
        if (activeLens === 'older') {
            var pctO = Number(props['county-level-older-adults_PCT POP 60+']);
            var subMode = activeSubModes.older || 'disastersFaced';
            if (subMode === 'concentration') {
                var older = Number(props['county-level-older-adults_60+ POP']);
                var olderTxt = isFinite(older) ? Math.round(older).toLocaleString('en-US') : '—';
                return {
                    lens: 'older',
                    headline: olderTxt + ' adults 60+' + (isFinite(pctO) ? ' (' + pctO.toFixed(1) + '%)' : ''),
                    sub: fmtDisasterDeclarations(dis)
                };
            }
            // Default sub-mode: disaster declarations, with the 60+ share as
            // context. Shown for every county — gray just means below 25%.
            return {
                lens: 'older',
                headline: fmtDisasterDeclarations(dis),
                sub: isFinite(pctO) ? pctO.toFixed(1) + '% are 60 or older' : null
            };
        }
        if (activeLens === 'urban' || activeLens === 'rural') {
            var cls = (props.OMB_CLASS === 'Urban' || props.OMB_CLASS === 'Rural') ? props.OMB_CLASS : null;
            var pop = fmtPopulation(props.COUNTY_POPULATION);
            var parts = [];
            if (cls) parts.push(cls + ' county');
            if (pop) parts.push('pop. ' + pop);
            return {
                lens: activeLens,
                headline: fmtDisasterDeclarations(dis),
                sub: parts.length ? parts.join(' · ') : null
            };
        }
        if (activeLens === 'minority') {
            var minPct = Number(props.COUNTY_PCT_MINORITY);
            return {
                lens: 'minority',
                headline: fmtDisasterDeclarations(dis),
                sub: isFinite(minPct) ? minPct.toFixed(1) + '% people of color' : null
            };
        }
        return { lens: activeLens, headline: '', sub: null };
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
        var info   = buildLensSummary(p);

        var html = ''
            + '<div class="hover-county">' + county + (state ? ', ' + state : '') + '</div>'
            + '<div class="hover-summary lens-' + info.lens + '">' + info.headline + '</div>'
            + (info.sub ? '<div class="hover-sub">' + info.sub + '</div>' : '');

        // Communities of Color lens: append the full race breakdown beneath
        // the headline so users get the detail without dropping to the
        // tract layer. (The race-row values are styled magenta in CSS.)
        if (activeLens === 'minority') {
            var races = countyRaceList(p);
            if (races.length) {
                html += '<div class="hover-race">' + races.map(function (r) {
                    return '<div class="hover-race-row"><span>' + r.label + '</span>'
                         + '<span>' + r.pct.toFixed(1) + '%</span></div>';
                }).join('') + '</div>';
            }
        }
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
    function buildIndicatorsTable(p, tractProps) {
        // Combined federal assistance (FEMA + HUD CDBG-DR) at the state
        // level — surfaces the single number a funder is most likely to
        // quote. Falls back to 0 for either side if missing so a partial
        // value still renders rather than collapsing to "—".
        var stateFema = Number(p.STATE_FEMA_TOTAL);
        var stateCdbg = Number(p.STATE_CDBG_TOTAL);
        var stateCombinedFederal = (!isFinite(stateFema) && !isFinite(stateCdbg))
            ? '—'
            : fmtUSD((isFinite(stateFema) ? stateFema : 0) + (isFinite(stateCdbg) ? stateCdbg : 0));

        // SVI subsection: county-only by default. When tractProps is
        // passed (tract click under SVI lens) we replace the single
        // county row with a tract-level breakdown — overall score,
        // four theme percentiles, % minority + racial breakdown —
        // and add a county-average comparison row at the bottom.
        var sviRows;
        if (tractProps) {
            // Tract popups carry a lot of rows. Keep the headline (overall
            // vulnerability) visible, but tuck the 4-theme breakdown and the
            // 7-row race/ethnicity block behind click-to-expand headers so
            // the popup reads at a glance. Rows tagged `group:'<id>'` are
            // hidden until their matching `collapsible` header is clicked
            // (toggled in finalizePopup via event delegation).
            var pocSummary = tractProps.EP_MINRTY >= 50
                ? 'Majority-minority — ' + fmtPctNum(tractProps.EP_MINRTY) + ' POC'
                : fmtPctNum(tractProps.EP_MINRTY) + ' POC';
            // Lead with a county→tract comparison pair so the user reads
            // broad context first, then this specific tract against it —
            // instead of the county number floating in a separate "For
            // comparison" block at the bottom. The two rows share the SVI
            // teal palette: county is the lighter context tint, the clicked
            // tract is the stronger focus tint. Theme + race detail then
            // collapses beneath.
            sviRows = [
                { subheader: 'Social Vulnerability (2022)' },
                { compare: 'county', label: (p.NAMELSAD || 'County'),               value: fmtSVIWithCategory(p['CDC SVI (2022)']) },
                { compare: 'tract',  label: (tractProps.NAMELSAD || 'Census tract'), value: fmtSVIWithCategory(tractProps.RPL_THEMES) },
                { collapsible: 'themes', label: 'Theme breakdown', count: 4 },
                { group: 'themes', label: 'Socioeconomic theme',            value: fmtSVI(tractProps.RPL_THEME1) },
                { group: 'themes', label: 'Household composition theme',    value: fmtSVI(tractProps.RPL_THEME2) },
                { group: 'themes', label: 'Minority status theme',          value: fmtSVI(tractProps.RPL_THEME3) },
                { group: 'themes', label: 'Housing & transportation theme', value: fmtSVI(tractProps.RPL_THEME4) },
                { collapsible: 'race', label: 'Race & ethnicity', value: pocSummary },
                { group: 'race', caption: tractProps.EP_MINRTY >= 50
                    ? 'Majority-minority tract — ' + fmtPctNum(tractProps.EP_MINRTY) + ' people of color'
                    : fmtPctNum(tractProps.EP_MINRTY) + ' people of color' },
                { group: 'race', label: 'Black or African American',       value: fmtPctNum(tractProps.EP_AFAM) },
                { group: 'race', label: 'Hispanic or Latino',              value: fmtPctNum(tractProps.EP_HISP) },
                { group: 'race', label: 'Asian',                           value: fmtPctNum(tractProps.EP_ASIAN) },
                { group: 'race', label: 'American Indian / Alaska Native', value: fmtPctNum(tractProps.EP_AIAN) },
                { group: 'race', label: 'Native Hawaiian / Pacific Islander', value: fmtPctNum(tractProps.EP_NHPI) },
                { group: 'race', label: 'Two or more races',               value: fmtPctNum(tractProps.EP_TWOMORE) },
                { group: 'race', label: 'Other race',                      value: fmtPctNum(tractProps.EP_OTHERRACE) }
            ];
        } else {
            sviRows = [
                { subheader: 'Social Vulnerability (2022)' },
                { key: 'svi',  label: 'Score (CDC index, 0–1)', value: fmtSVIWithCategory(p['CDC SVI (2022)']) }
            ];
            // County popup under the SVI lens: this score is a county-wide
            // average, and tract-level detail is one zoom away. Surface the
            // same nudge the legend shows, in case the user missed it — and
            // make it actionable (click flies the map to tract zoom). Only
            // under the SVI lens, since tracts don't render in other lenses.
            if (activeLens === 'svi') {
                sviRows.push({ zoomHint: true });
            }
        }

        // Communities of Color — appended last so it sits at the very bottom
        // of EVERY county popup, regardless of the active lens. The % POC
        // headline stays visible; the 7-row breakdown collapses under a
        // click-to-expand header. The headline row carries key='minority' so
        // it only lights up when the Communities of Color lens is active.
        // Skipped for the tract popup (which has its own race section) and for
        // counties with no CDC race data (territories).
        var raceRows = [];
        if (!tractProps) {
            var countyMinPct = Number(p.COUNTY_PCT_MINORITY);
            if (isFinite(countyMinPct)) {
                raceRows.push({ subheader: 'Communities of Color (2022)' });
                raceRows.push({
                    key: 'minority',
                    label: countyMinPct >= 50 ? 'People of color (majority-minority)' : 'People of color',
                    value: fmtPctNum(countyMinPct)
                });
                raceRows.push({ collapsible: 'countyrace', accent: 'coc', label: 'Race & ethnicity breakdown' });
                countyRaceList(p).forEach(function (r) {
                    raceRows.push({ group: 'countyrace', label: r.label, value: fmtPctNum(r.pct) });
                });
            }
        }

        // Compact statewide total for the collapsible's teaser value.
        var stateTotalNum = (isFinite(stateFema) ? stateFema : 0) + (isFinite(stateCdbg) ? stateCdbg : 0);
        var stateTotalCompact = (!isFinite(stateFema) && !isFinite(stateCdbg)) ? '' : fmtUSDCompact(stateTotalNum);

        var rows = [
            { subheader: 'Federal disaster aid (2011–2024)' },
            // County hero: the headline number people came for, shown
            // abbreviated. Lights up (orange) under the FEMA Disaster Funding
            // lens via the table's lens-fema class.
            { heroFema: { amount: fmtUSDCompact(p.COUNTY_TOTAL_FEMA), per: formatCountyPerCapita(p) } },
            // Statewide context collapses behind a toggle so the default view
            // stays short; exact figures live inside. Rows keep key='fema' so
            // they highlight when expanded under the FEMA lens.
            { collapsible: 'statefunding', accent: 'fema', label: 'Statewide (' + (p.STATE_NAME || 'state') + ')', value: stateTotalCompact },
            { group: 'statefunding', key: 'fema', label: 'FEMA — rebuilding & prevention', value: fmtUSD(p.STATE_FEMA_TOTAL) },
            { group: 'statefunding', key: 'fema', label: 'HUD — long-term recovery',       value: fmtUSD(p.STATE_CDBG_TOTAL) },
            { group: 'statefunding', key: 'fema', label: 'Total federal aid',              value: stateCombinedFederal },
            { group: 'statefunding', key: 'fema', label: 'Per person',                     value: fmtUSD(p.STATE_PER_CAPITA) }
        ].concat(sviRows).concat([
            { subheader: 'Energy Reliability (2022)' },
            { caption: 'Power outage hours per year, by utility.' },
            { key: 'energy', label: 'Average across utilities', value: fmtSAIDI(p.SAIDI_MIN_AVG) },
            { key: 'energy', label: 'Worst utility',            value: fmtSAIDI(p.SAIDI_MIN_MAX) },

            { subheader: 'Older Adults 60+ (2020)' },
            { key: 'older', label: 'Residents 60 or older', value: fmtOlderPop(p) }
        ]).concat(raceRows);
        // Tag the table with the active lens so section accents (e.g. the
        // Communities of Color block) can light up only when their lens is
        // selected, and sit neutral otherwise.
        var html = '<table class="indicators-table lens-' + activeLens + '">';
        // Collect any footnote entries; rendered below the table so they
        // act as a methodology caveat block rather than table rows.
        var footnotes = [];
        rows.forEach(function (r) {
            if (r.subheader) {
                html += '<tr class="indicator-subheader"><td colspan="2">' + r.subheader + '</td></tr>';
                return;
            }
            if (r.heroFema) {
                // County FEMA total as a hero block — abbreviated headline
                // number + per-person line. Spans both columns. Tints orange
                // under the FEMA lens via the table's lens-fema class.
                html += '<tr class="fema-hero-row"><td colspan="2">'
                      + '<div class="fema-hero">'
                      +   '<div class="hero-amount">' + r.heroFema.amount + '</div>'
                      +   '<div class="hero-sub">FEMA aid to this county · ' + r.heroFema.per + ' per person</div>'
                      + '</div></td></tr>';
                return;
            }
            if (r.zoomHint) {
                // Actionable "zoom to tract detail" nudge — mirrors the
                // legend's orange hint. Clicking it flies the map in (wired
                // in finalizePopup). Spans both columns.
                html += '<tr class="svi-zoom-hint-row"><td colspan="2">'
                      + '<button type="button" class="svi-zoom-hint">'
                      +   '<span class="svi-zoom-hint-icon">&#128269;</span>'
                      +   '<span>Zoom in for census-tract detail</span>'
                      +   '<span class="svi-zoom-hint-arrow">&rarr;</span>'
                      + '</button></td></tr>';
                return;
            }
            if (r.compare) {
                // County-vs-tract comparison row. Always carries the SVI
                // teal identity (independent of the active-lens highlight):
                // compare-county = light context tint, compare-tract =
                // stronger focus tint with the accent stripe.
                html += '<tr class="indicator-compare compare-' + r.compare + '">'
                      + '<td class="indicator-label">' + r.label + '</td>'
                      + '<td class="indicator-value">' + r.value + '</td>'
                      + '</tr>';
                return;
            }
            if (r.collapsible) {
                // Clickable header that shows/hides every row tagged
                // group:'<id>'. Starts collapsed; finalizePopup wires the
                // toggle. Optional `count` badge or teaser `value` gives a
                // hint of what's inside without expanding.
                var teaser = r.count ? '<span class="collapsible-count">(' + r.count + ')</span>'
                    : (r.value ? '<span class="collapsible-teaser">' + r.value + '</span>' : '');
                var accentCls = r.accent ? ' collapsible-' + r.accent : '';
                html += '<tr class="indicator-collapsible' + accentCls + '" data-group="' + r.collapsible + '" aria-expanded="false">'
                      + '<td class="indicator-label"><span class="caret">&#9656;</span>' + r.label + '</td>'
                      + '<td class="indicator-value">' + teaser + '</td>'
                      + '</tr>';
                return;
            }
            if (r.caption) {
                // Small italic methodology / explainer text. Sits under
                // a subheader to define a term or scope before the rows.
                var capGroupCls = r.group ? ' indicator-grouped group-' + r.group : '';
                html += '<tr class="indicator-caption' + capGroupCls + '"><td colspan="2">' + r.caption + '</td></tr>';
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
            if (r.group) cls += (cls ? ' ' : '') + 'indicator-grouped group-' + r.group;
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

    function buildPopupContent(femaFeature, congressFeature, tractFeature) {
        var p = femaFeature;
        var c = congressFeature;
        var t = tractFeature || null;
        var stateName = p.STATE_NAME;
        // When a tract was clicked under the SVI lens, lead the popup
        // header with the tract name and show "in {County}" underneath
        // so the user knows which county's FEMA/Energy/Older-Adults
        // context they're reading.
        var headerTitle = t ? (t.NAMELSAD + ', ' + (t.NAMELSADCO || p.NAMELSAD)) : (p.NAMELSAD + ', ' + stateName);
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
            +       '<h3>' + headerTitle + (t ? '' : '') + '</h3>'
            +       (t ? '<div class="popup-tract-state">' + stateName + '</div>' : '')
            +       subLine
            +     '</div>'
            +     '<div id="disaster-count-block" class="disaster-count' + (function () { var k = headlineLensKey(); return k ? ' lens-active lens-' + k : ''; })() + '">'
            +       '<div class="count">' + disasterCount + '</div>'
            +       '<div class="count-description">Major weather disasters declared by FEMA (2011–2024)</div>'
            +     '</div>'
            +     '<div id="indicators-block" class="indicators-block">'
            +       buildIndicatorsTable(p, t)
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
        lastClickedTractProps = null;
    });

    // When a user clicks on the map, show a popup with information.
    // The HTML is built by buildPopupContent() so the click and geocoder
    // paths share one source of truth.
    //
    // Under the SVI lens the visible choropleth is the tract layer, so
    // we query it first and look up the parent county from countyByGeoid
    // (built from Atlas_FEMA_V2 on load). Under every other lens we keep
    // the original county-click path.
    map.on('click', function (e) {
        var congressFeatures = map.queryRenderedFeatures(e.point, { layers: ['congress-layer'] });

        var femaFeature = null;
        var tractFeature = null;

        if (activeLens === 'svi') {
            var tractFeatures = map.queryRenderedFeatures(e.point, { layers: ['svi-tracts-layer'] });
            if (tractFeatures.length) {
                tractFeature = tractFeatures[0].properties;
                // Parent county = first 5 chars of the 11-char tract GEOID.
                var countyGeoid = (tractFeature.GEOID || '').slice(0, 5);
                femaFeature = countyByGeoid.get(countyGeoid) || null;
            }
        }

        // Fallback to the county layer if we're not on SVI, the tract
        // click missed, or the parent county lookup failed (e.g. tract
        // outside the FEMA coverage set).
        if (!femaFeature) {
            var femaFeatures = map.queryRenderedFeatures(e.point, { layers: ['atlas-fema-layer'] });
            if (femaFeatures.length) {
                femaFeature = femaFeatures[0].properties;
            }
        }

        if (!femaFeature || !congressFeatures.length) {
            return;
        }

        // Hide hover tooltip while click popup is open, and tuck away
        // the intro help panel — the user is now actively exploring data.
        hoverPopup.remove();
        autoHideHelpPanel();

        var congressFeature = congressFeatures[0].properties;
        lastClickedFemaProps = femaFeature;     // for live indicator refresh
        lastClickedTractProps = tractFeature;   // null on non-SVI clicks
        var popupContent = buildPopupContent(femaFeature, congressFeature, tractFeature);
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

    // Mirror the cursor + hover affordances on the tract layer so SVI
    // lens interactions feel identical to county-layer interactions.
    map.on('mouseenter', 'svi-tracts-layer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'svi-tracts-layer', function () {
        map.getCanvas().style.cursor = '';
    });

    // Hover tooltip on tracts — shows tract name, parent county, and
    // overall SVI score. Mirrors the county hoverPopup but is only
    // active under the SVI lens (the tract layer is hidden otherwise).
    map.on('mousemove', 'svi-tracts-layer', function (e) {
        if (popup.isOpen()) {
            hoverPopup.remove();
            return;
        }
        if (!e.features || !e.features.length) return;
        var t = e.features[0].properties;
        var tractName = t.NAMELSAD || 'Census tract';
        var countyName = t.NAMELSADCO || '';
        var stateName  = t.STATE_NAME || '';
        var sub = countyName + (stateName ? ', ' + stateName : '');
        var sviHeadline = (typeof t.RPL_THEMES === 'number')
            ? 'Vulnerability: ' + fmtSVIWithCategory(t.RPL_THEMES)
            : 'Vulnerability: No data';
        var minorityNote = (typeof t.EP_MINRTY === 'number' && t.EP_MINRTY >= 50)
            ? '<div class="hover-sub">Majority people of color · ' + t.EP_MINRTY.toFixed(1) + '%</div>'
            : '';
        var html = ''
            + '<div class="hover-county">' + tractName + '</div>'
            + (sub ? '<div class="hover-sub">' + sub + '</div>' : '')
            + '<div class="hover-summary lens-svi">' + sviHeadline + '</div>'
            + minorityNote;
        hoverPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    map.on('mouseleave', 'svi-tracts-layer', function () {
        hoverPopup.remove();
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

            // Query features at the geographical coordinates.
            // Same tract-first / county-fallback ordering as the click
            // handler so an address search under the SVI lens lands the
            // user in the tract popup rather than the parent county.
            var congressFeatures = map.queryRenderedFeatures(map.project(lngLat), { layers: ['congress-layer'] });

            var femaFeature = null;
            var tractFeature = null;

            if (activeLens === 'svi') {
                var tractFeatures = map.queryRenderedFeatures(map.project(lngLat), { layers: ['svi-tracts-layer'] });
                if (tractFeatures.length) {
                    tractFeature = tractFeatures[0].properties;
                    var countyGeoid = (tractFeature.GEOID || '').slice(0, 5);
                    femaFeature = countyByGeoid.get(countyGeoid) || null;
                }
            }
            if (!femaFeature) {
                var femaFeatures = map.queryRenderedFeatures(map.project(lngLat), { layers: ['atlas-fema-layer'] });
                if (femaFeatures.length) {
                    femaFeature = femaFeatures[0].properties;
                }
            }

            // Check for general location match and handle appropriately.
            // Native alert() reads as amateurish to foundation-facing users;
            // we surface the message as a non-blocking toast under the
            // geocoder instead.
            if (!femaFeature) {
                showGeocoderToast('No detailed match found. Try a more specific address.');
                return;
            }

            var congressFeature = congressFeatures[0].properties;
            lastClickedFemaProps = femaFeature;     // for live indicator refresh
            lastClickedTractProps = tractFeature;   // null on non-SVI lookups
            var popupContent = buildPopupContent(femaFeature, congressFeature, tractFeature);

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

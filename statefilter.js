// =============================================================================
// STATE FILTER + FACT SHEET  (add-on; loaded AFTER scripts.js)
// -----------------------------------------------------------------------------
// Lets a user focus the Atlas on a single state and auto-generates a workshop
// fact sheet — state headline stats plus top-10 county rankings across every
// data lens — with an optional side-by-side comparison to a neighboring state.
//
// Design notes:
//   * Reuses the existing global `map` (declared top-level in scripts.js, so it
//     is visible to this later classic script) and the existing data layers.
//     Nothing in scripts.js is modified.
//   * Filtering is pure Mapbox `setFilter` on STATE_NAME / STATEFP — no data is
//     copied or rewritten. Every state's fact sheet is computed live from
//     Atlas_FEMA_V2.geojson at runtime, so updating that one file updates every
//     state automatically.
// =============================================================================
(function () {
  'use strict';

  // ----- Layers we focus when a state is chosen -----------------------------
  // county choropleth + proportional dots key off STATE_NAME; congress keys off
  // the 2-digit state FIPS (STATEFP20); SVI tracts key off the GEOID prefix.
  var COUNTY_FILL = 'atlas-fema-layer';
  var COUNTY_DOTS = 'atlas-fema-dots-layer';
  var COUNTY_BORDERS = 'county-borders';
  var CONGRESS_FILL = 'congress-layer';
  var CONGRESS_LINE = 'congress-border';
  var SVI_TRACTS = 'svi-tracts-layer';
  var SVI_TRACTS_OUTLINE = 'svi-tracts-outline';

  // ----- The seven fact-sheet categories ------------------------------------
  // Each pulls a per-county field, sorts descending, and formats for display.
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? null : n; };
  // Full currency — used for per-capita figures, which are small.
  var money = function (v) { var n = num(v); return n === null ? '—' : '$' + Math.round(n).toLocaleString(); };
  // Abbreviated currency — used for large totals, e.g. $950.8M, $1.5B.
  var moneyAbbr = function (v) {
    var n = num(v);
    if (n === null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  };
  var pct = function (v) { var n = num(v); return n === null ? '—' : n + '%'; };
  var dec = function (v) { var n = num(v); return n === null ? '—' : n.toFixed(2); };
  var mins = function (v) { var n = num(v); return n === null ? '—' : Math.round(n).toLocaleString() + ' min'; };
  var intf = function (v) { var n = num(v); return n === null ? '—' : String(Math.round(n)); };

  // CDC SVI severity band (quartile convention) — returns a colored pill so
  // the 0–1 score reads at a glance: Low / Moderate / High / Very High.
  var sviBand = function (v) {
    var n = num(v);
    if (n === null) return '';
    var label, cls;
    if (n >= 0.75) { label = 'Very High'; cls = 'vhigh'; }
    else if (n >= 0.50) { label = 'High'; cls = 'high'; }
    else if (n >= 0.25) { label = 'Moderate'; cls = 'mod'; }
    else { label = 'Low'; cls = 'low'; }
    return ' <span class="sf-band sf-band-' + cls + '">' + label + '</span>';
  };
  // SVI value + band together, e.g. "0.87 [Very High]".
  var sviFmt = function (v) { var n = num(v); return n === null ? '—' : n.toFixed(2) + sviBand(v); };

  var CATEGORIES = [
    { key: 'COUNTY_DISASTER_COUNT', label: 'Most FEMA Disaster Declarations', unit: 'declarations', fmt: intf,
      why: 'How many times a county has been hit by a federally declared disaster. Repeated declarations flag places under chronic, escalating climate stress.' },
    { key: 'COUNTY_TOTAL_FEMA', label: 'Most FEMA Funding Obligated', unit: 'total federal share', fmt: moneyAbbr,
      why: 'Total federal dollars committed to recovery. Large sums show where damage was greatest — but this money arrives after disasters, not before them.' },
    { key: 'COUNTY_PER_CAPITA', label: 'Highest FEMA Funding Per Capita', unit: 'federal $ per resident', fmt: money,
      why: 'Recovery dollars per resident. High figures in small counties reveal communities absorbing outsized damage relative to their size.' },
    { key: 'CDC SVI (2022)', label: 'Highest Social Vulnerability (SVI)', unit: 'CDC index, 0–1', fmt: sviFmt,
      why: 'The CDC’s measure of how hard it is for a community to prepare for and bounce back from a disaster (poverty, age, disability, housing, and more). Higher means less able to recover on its own.' },
    { key: 'SAIDI_MIN_AVG', label: 'Worst Energy Reliability (avg. outage)', unit: 'minutes without power / yr', fmt: mins,
      why: 'Average minutes per year residents spend without power. Long outages during storms and heat are a life-safety risk, especially for older and medically dependent people.' },
    { key: 'county-level-older-adults_PCT POP 60+', label: 'Oldest Population (60+)', unit: '% age 60+', fmt: pct,
      why: 'Share of residents 60 and older. Older adults face higher risk during disasters and outages and often need targeted evacuation and recovery support.' },
    { key: 'COUNTY_PCT_MINORITY', label: 'Most People of Color', unit: '% people of color', fmt: pct,
      why: 'Share of residents who are people of color. Surfaces where equity must guide funding, since communities of color have historically received less recovery investment.' }
  ];

  // Plain-language sources + methodology, shown at the foot of every sheet.
  var METHODOLOGY = [
    ['FEMA disaster declarations &amp; funding', 'iParametric / FEMA OpenFEMA, 2011–2024. Counts federally declared major disasters for extreme-weather events (excludes heat); funding is the federal share obligated for recovery.'],
    ['CDBG-DR recovery funding', 'HUD Community Development Block Grant – Disaster Recovery. Long-term federal rebuilding dollars, included in the total federal figure.'],
    ['Social Vulnerability Index (SVI)', 'CDC/ATSDR, 2022. A 0–1 score combining poverty, age, disability, language, housing and transportation barriers.'],
    ['Energy reliability (SAIDI)', 'U.S. Energy Information Administration, 2023. Average annual minutes of electric service interruption per customer.'],
    ['Older adults &amp; race/ethnicity', 'U.S. Census Bureau, American Community Survey (latest release). Population 60+ and share identifying as people of color.']
  ];

  // ----- State-level data, built once from the geojson ----------------------
  var STATES = {};      // STATE_NAME -> { fp, counties:[props], headline:{...} }
  var STATE_NAMES = []; // sorted list for the dropdowns
  var NATIONAL = {};    // U.S. benchmarks for the comparable rate metrics
  var DATA_READY = false;

  function median(arr) {
    var a = arr.filter(function (x) { return x !== null; }).sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function buildStateIndex(features) {
    features.forEach(function (f) {
      var p = f.properties;
      var name = p.STATE_NAME;
      if (!name) return;
      if (!STATES[name]) {
        STATES[name] = { fp: p.STATEFP, counties: [], geoms: [] };
      }
      STATES[name].counties.push(p);
      STATES[name].geoms.push(f.geometry);
    });

    Object.keys(STATES).forEach(function (name) {
      var s = STATES[name];
      var p0 = s.counties[0];
      var svis = s.counties.map(function (p) { return num(p['CDC SVI (2022)']); });
      var saidi = s.counties.map(function (p) { return num(p.SAIDI_MIN_AVG); });
      s.headline = {
        counties: s.counties.length,
        disasters: num(p0.STATE_DISASTER_COUNT),
        fema: num(p0.STATE_FEMA_TOTAL),
        cdbg: num(p0.STATE_CDBG_TOTAL),
        federal: num(p0.STATE_TOTAL_FEDERAL_FUNDS),
        population: num(p0.STATE_POPULATION),
        perCapita: num(p0.STATE_PER_CAPITA),
        medSVI: median(svis),
        medSAIDI: median(saidi)
      };
    });

    STATE_NAMES = Object.keys(STATES).sort();

    // ---- U.S. benchmarks (computed across every county) ------------------
    // Only meaningful for *rates*, not sums: median county SVI and outage
    // (typical county), and federal $ per capita (national total ÷ national
    // population). Sums like "total recovery $" have no "average" — they're
    // intentionally left without a benchmark.
    var allSVI = features.map(function (f) { return num(f.properties['CDC SVI (2022)']); });
    var allSAIDI = features.map(function (f) { return num(f.properties.SAIDI_MIN_AVG); });
    var totFed = 0, totPop = 0;
    Object.keys(STATES).forEach(function (n) {
      var h = STATES[n].headline;
      if (h.federal) totFed += h.federal;
      if (h.population) totPop += h.population;
    });
    NATIONAL = {
      medSVI: median(allSVI),
      medSAIDI: median(allSAIDI),
      perCapita: totPop ? Math.round(totFed / totPop) : null
    };
    DATA_READY = true;
  }

  // Bounding box for a state by walking its counties' polygon coordinates.
  // Avoids a turf.js dependency; runs once per selection, plenty fast.
  function stateBounds(name) {
    var minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    function eat(coords) {
      // coords is an arbitrarily nested array ending in [lng,lat] pairs
      if (typeof coords[0] === 'number') {
        var lng = coords[0], lat = coords[1];
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
        return;
      }
      for (var i = 0; i < coords.length; i++) eat(coords[i]);
    }
    STATES[name].geoms.forEach(function (g) { if (g && g.coordinates) eat(g.coordinates); });
    return [[minLng, minLat], [maxLng, maxLat]];
  }

  // ----- Map focus -----------------------------------------------------------
  function safeSetFilter(layerId, filter) {
    if (map.getLayer(layerId)) map.setFilter(layerId, filter);
  }

  function focusState(name) {
    // Let scripts.js reveal/hide any state-specific layers (e.g. the WV
    // workshop overlays) for the newly selected state.
    if (window.AtlasWV) window.AtlasWV.onStateChange(name);
    if (name === '') {
      // Back to the full national view.
      safeSetFilter(COUNTY_FILL, null);
      safeSetFilter(COUNTY_DOTS, null);
      safeSetFilter(COUNTY_BORDERS, null);
      safeSetFilter(CONGRESS_FILL, null);
      safeSetFilter(CONGRESS_LINE, null);
      safeSetFilter(SVI_TRACTS, null);
      safeSetFilter(SVI_TRACTS_OUTLINE, null);
      map.flyTo({ center: [-96.68288, 39.32267], zoom: window.innerWidth < 768 ? 2.5 : 3.5 });
      return;
    }
    var fp = STATES[name].fp;
    safeSetFilter(COUNTY_FILL, ['==', ['get', 'STATE_NAME'], name]);
    safeSetFilter(COUNTY_DOTS, ['==', ['get', 'STATE_NAME'], name]);
    safeSetFilter(COUNTY_BORDERS, ['==', ['get', 'STATE_NAME'], name]);
    var congressFilter = ['==', ['to-string', ['get', 'STATEFP20']], String(fp)];
    safeSetFilter(CONGRESS_FILL, congressFilter);
    safeSetFilter(CONGRESS_LINE, congressFilter);
    // SVI tracts: filter by the first two GEOID digits (= state FIPS).
    var tractFilter = ['==', ['slice', ['to-string', ['get', 'GEOID']], 0, 2], String(fp)];
    safeSetFilter(SVI_TRACTS, tractFilter);
    safeSetFilter(SVI_TRACTS_OUTLINE, tractFilter);
    map.fitBounds(stateBounds(name), { padding: 60, duration: 800 });
  }

  // ----- Fact-sheet rendering ------------------------------------------------
  function topN(name, cat, n) {
    var rows = STATES[name].counties.slice().sort(function (a, b) {
      var av = num(a[cat.key]), bv = num(b[cat.key]);
      return (bv === null ? -1 : bv) - (av === null ? -1 : av);
    });
    return rows.slice(0, n);
  }

  function headlineRows(name, compare) {
    var s = STATES[name].headline;
    var c = compare && STATES[compare] ? STATES[compare].headline : null;
    // Each row: [label, stateVal, compareVal, formatter, nationalBenchmarkHTML]
    // The 5th item (optional) renders as a muted "U.S." sub-line under the
    // metric name — only for rate metrics where a national average is honest.
    var metrics = [
      ['Counties', s.counties, c && c.counties, intf, null],
      ['Disaster declarations (2011–24)', s.disasters, c && c.disasters, intf, null],
      ['Total federal recovery $', s.federal, c && c.federal, moneyAbbr, null],
      ['— FEMA share', s.fema, c && c.fema, moneyAbbr, null],
      ['— CDBG-DR share', s.cdbg, c && c.cdbg, moneyAbbr, null],
      ['Federal $ per capita', s.perCapita, c && c.perCapita, money, 'U.S. avg ' + money(NATIONAL.perCapita)],
      ['Population', s.population, c && c.population, intf, null],
      ['Median county SVI', s.medSVI, c && c.medSVI, sviFmt, 'U.S. median ' + dec(NATIONAL.medSVI)],
      ['Median outage (SAIDI)', s.medSAIDI, c && c.medSAIDI, mins, 'U.S. median ' + mins(NATIONAL.medSAIDI)]
    ];
    var html = '<table class="sf-headline"><thead><tr><th>Metric</th><th>' + name + '</th>';
    if (c) html += '<th>' + compare + '</th>';
    html += '</tr></thead><tbody>';
    metrics.forEach(function (m) {
      var labelCell = m[0] + (m[4] ? '<span class="sf-natl">' + m[4] + '</span>' : '');
      html += '<tr><td>' + labelCell + '</td><td>' + m[3](m[1]) + '</td>';
      if (c) html += '<td>' + m[3](m[2]) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function categoryTables(name) {
    var html = '';
    CATEGORIES.forEach(function (cat) {
      var rows = topN(name, cat, 10);
      html += '<div class="sf-cat"><h4>' + cat.label + ' <span class="sf-unit">(' + cat.unit + ')</span></h4>';
      html += '<p class="sf-why">' + cat.why + '</p><ol>';
      rows.forEach(function (p) {
        html += '<li><span class="sf-county">' + (p.NAMELSAD || '—') + '</span>'
              + '<span class="sf-val">' + cat.fmt(p[cat.key]) + '</span></li>';
      });
      html += '</ol></div>';
    });
    return html;
  }

  function methodologyBlock() {
    var html = '<h3 class="sf-section">About this data &amp; why it matters</h3>';
    html += '<p class="sf-method-intro">This sheet pairs federal disaster response with who is most exposed, so funders and policymakers can see where climate risk and recovery dollars line up — and where they don’t. Rankings cover only the counties within the selected state.</p>';
    html += '<dl class="sf-method">';
    METHODOLOGY.forEach(function (m) {
      html += '<dt>' + m[0] + '</dt><dd>' + m[1] + '</dd>';
    });
    html += '</dl>';
    html += '<p class="sf-method-foot">Rebuild by Design · Atlas of Accountability · rebuildbydesign.org/atlas-of-disaster</p>';
    return html;
  }

  function renderFactsheet(name, compare) {
    var body = document.getElementById('sf-body');
    if (name === '') {
      body.innerHTML = '<p class="sf-empty">Select a state above to generate its fact sheet.</p>';
      return;
    }
    var html = '';
    html += '<div class="sf-state-title">' + name + (compare ? ' <span class="sf-vs">vs. ' + compare + '</span>' : '') + '</div>';
    html += '<p class="sf-source">Rebuild by Design · Atlas of Accountability · FEMA disaster data 2011–2024</p>';
    html += '<h3 class="sf-section">State at a glance</h3>';
    html += headlineRows(name, compare);
    html += '<h3 class="sf-section">Top 10 counties by category</h3>';
    html += '<div class="sf-cats">' + categoryTables(name) + '</div>';
    html += methodologyBlock();
    body.innerHTML = html;
  }

  // ----- UI wiring -----------------------------------------------------------
  function populateDropdowns() {
    var stateSel = document.getElementById('sf-state');
    var compareSel = document.getElementById('sf-compare');
    var opts = '<option value="">All states (national view)</option>';
    STATE_NAMES.forEach(function (n) { opts += '<option value="' + n + '">' + n + '</option>'; });
    stateSel.innerHTML = opts;
    var copts = '<option value="">No comparison</option>';
    STATE_NAMES.forEach(function (n) { copts += '<option value="' + n + '">' + n + '</option>'; });
    compareSel.innerHTML = copts;
  }

  function currentCompare() {
    return document.getElementById('sf-compare').value;
  }

  function onStateChange() {
    var name = document.getElementById('sf-state').value;
    // Picking (or changing) the primary state clears any comparison — a second
    // state is only added when the user explicitly chooses one in "Compare".
    document.getElementById('sf-compare').value = '';
    focusState(name);
    renderFactsheet(name, '');
    var panel = document.getElementById('sf-panel');
    if (name) panel.classList.add('open');
  }

  function onCompareChange() {
    var name = document.getElementById('sf-state').value;
    if (currentCompare() === name) document.getElementById('sf-compare').value = '';
    renderFactsheet(name, currentCompare());
  }

  function wireUI() {
    document.getElementById('sf-state').addEventListener('change', onStateChange);
    document.getElementById('sf-compare').addEventListener('change', onCompareChange);
    document.getElementById('sf-toggle').addEventListener('click', function () {
      document.getElementById('sf-panel').classList.toggle('open');
    });
    document.getElementById('sf-close').addEventListener('click', function () {
      document.getElementById('sf-panel').classList.remove('open');
    });
    document.getElementById('sf-print').addEventListener('click', function () {
      window.print();
    });
    // Hide the filter bar down to a small reopener, and back.
    document.getElementById('sf-hide').addEventListener('click', function () {
      document.getElementById('sf-controls').classList.add('sf-collapsed');
      document.getElementById('sf-reopen').classList.add('show');
    });
    document.getElementById('sf-reopen').addEventListener('click', function () {
      document.getElementById('sf-controls').classList.remove('sf-collapsed');
      document.getElementById('sf-reopen').classList.remove('show');
    });
  }

  // ----- Initial view: deep-link to a state, or minimal homepage ------------
  // Shareable per-state URL, e.g. ?state=West%20Virginia (case-insensitive,
  // any state name). It focuses that state with the WV layers ready, but
  // leaves the fact sheet CLOSED until the user clicks "Fact sheet" — handy
  // for sending workshop attendees straight to the WV map. With no ?state,
  // the homepage loads minimally with the filter bar collapsed to its
  // reopener button.
  function readStateParam() {
    var m = /[?&]state=([^&]+)/i.exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() : '';
  }
  function resolveStateName(raw) {
    if (!raw) return '';
    var lc = raw.toLowerCase();
    for (var i = 0; i < STATE_NAMES.length; i++) {
      if (STATE_NAMES[i].toLowerCase() === lc) return STATE_NAMES[i];
    }
    return '';
  }
  function applyInitialState() {
    var name = resolveStateName(readStateParam());
    if (!name) {
      // Minimal homepage: collapse the filter bar to its reopener.
      document.getElementById('sf-controls').classList.add('sf-collapsed');
      document.getElementById('sf-reopen').classList.add('show');
      return;
    }
    // Focus the linked state once the map's data layers exist (the filters
    // are no-ops before scripts.js adds them on map load).
    function focusDeepLink() {
      document.getElementById('sf-state').value = name;
      document.getElementById('sf-compare').value = '';
      focusState(name);
      renderFactsheet(name, '');
      // Intentionally do NOT open #sf-panel — the fact sheet stays closed
      // until the user clicks "Fact sheet". The filter bar stays visible so
      // that button is reachable.
    }
    if (map.getLayer('atlas-fema-layer')) focusDeepLink();
    else map.on('load', focusDeepLink);
  }

  // ----- Boot ----------------------------------------------------------------
  // Build the state index from the same geojson Mapbox loads (browser caches
  // it, so this fetch is effectively free), then wire the UI.
  fetch('data/Atlas_FEMA_V2.geojson')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      buildStateIndex(data.features);
      populateDropdowns();
      wireUI();
      renderFactsheet('', '');
      applyInitialState();
    })
    .catch(function (e) {
      console.error('[statefilter] failed to load data', e);
    });
})();

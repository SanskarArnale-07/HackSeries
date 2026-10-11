const pages = {
  overview: {
    label: 'OVERVIEW',
    title: 'Overview',
    description: 'Mission information will appear here when the backend is connected.',
    content: `<div class="metric-grid">
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">◉</span><span>TRACKED OBJECTS</span></div><b>—</b><small>Awaiting catalog data</small></article>
      <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>CONJUNCTIONS</span></div><b>—</b><small>Awaiting screening results</small></article>
      <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">☼</span><span>DATA FEEDS</span></div><b>—</b><small>Awaiting service status</small></article>
      <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">⌘</span><span>MODEL STATUS</span></div><b>—</b><small>Awaiting model service</small></article>
    </div>
    <section class="panel tactical-globe-panel">
      <div class="panel-head">
        <div>
          <h2>Tactical Orbital View</h2>
          <p>Interactive orthographic 3D projection with 3 active orbital trajectories</p>
        </div>
        <div class="globe-actions">
          <button class="globe-ctrl-btn active" id="btn-toggle-spin" type="button"><span>↻</span> SPIN: AUTO</button>
          <button class="globe-ctrl-btn" id="btn-reset-view" type="button"><span>⌖</span> RESET VIEW</button>
          <span class="status-pill live-pill">LIVE 3D</span>
        </div>
      </div>
      <div class="globe-viewport-container" id="tactical-globe-container"></div>
      <div class="globe-legend-bar">
        <div class="legend-item"><span class="legend-dot" style="background:var(--accent);"></span><b>OBJECT A (ISS)</b> <small>420 km · PRIMARY</small></div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--cta);"></span><b>OBJECT B (CZ-4B)</b> <small>428 km · ENCOUNTER</small></div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--success);"></span><b>TRACKED OBJECT (SENTINEL-1A)</b> <small>693 km · SSO</small></div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--info-purple);"></span><b>TRACKED OBJECT (STARLINK)</b> <small>550 km · LEO</small></div>
        <div class="legend-item"><span class="legend-dot" style="background:var(--danger);"></span><b>CLOSEST APPROACH</b> <small>TCA VECTOR</small></div>
      </div>
    </section>
    <section class="panel feed-panel"><div class="panel-head"><div><h2>System connections</h2><p>Service status reported by the project backend</p></div></div><div class="connection-list"><div><span class="connection-symbol">◉</span><span><b>Orbital data service</b><small>Waiting for backend connection</small></span><em>NOT CONNECTED</em></div><div><span class="connection-symbol">☼</span><span><b>Space weather service</b><small>Waiting for backend connection</small></span><em>NOT CONNECTED</em></div><div><span class="connection-symbol">⌘</span><span><b>Risk model service</b><small>Waiting for backend connection</small></span><em>NOT CONNECTED</em></div></div></section>`,
  },
  conjunctions: {
    label: 'CONJUNCTIONS', title: 'Conjunctions',
    description: 'Close-approach results supplied by the project backend.',
    content: `<div class="metric-grid">
      <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>CRITICAL (&lt; 5 KM)</span></div><b>0</b><small>Immediate collision alert</small></article>
      <article class="metric metric-warning"><div class="metric-top"><span class="metric-icon">⚠</span><span>WARNING (5–15 KM)</span></div><b>0</b><small>Close approach watch</small></article>
      <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">◉</span><span>WATCH (15–50 KM)</span></div><b>0</b><small>Candidate intersection</small></article>
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">ℹ</span><span>TOTAL SCREENED</span></div><b>0</b><small>Active conjunction pairs</small></article>
    </div>
    <section class="panel table-panel"><div class="panel-head"><div><h2>Screening results</h2><p>Event records will be listed when available.</p></div><span class="status-pill">NO DATA</span></div><div class="table-scroll"><table><thead><tr><th>STATUS</th><th>OBJECT PAIR</th><th>TIME OF CLOSE APPROACH</th><th>MISS DISTANCE</th><th>SCREENING TIER</th></tr></thead><tbody><tr><td colspan="5"><div class="table-empty"><b>No conjunctions available</b><span>The backend has not supplied any screening results.</span></div></td></tr></tbody></table></div></section>`,
  },
  catalog: {
    label: 'OBJECT CATALOG', title: 'Object catalog',
    description: 'Tracked orbital objects supplied by the project backend.',
    content: `<div class="metric-grid">
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">◉</span><span>TOTAL TRACKED</span></div><b>100</b><small>Catalog objects</small></article>
      <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>ACTIVE PAYLOADS</span></div><b>—</b><small>Operational satellites</small></article>
      <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>DEBRIS OBJECTS</span></div><b>—</b><small>Rocket bodies & fragments</small></article>
      <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>ORBIT REGIME</span></div><b>LEO</b><small>200–2,000 km altitude</small></article>
    </div>
    <section class="panel table-panel"><div class="panel-head"><div><h2>Tracked objects</h2><p>Catalog records will be listed when available.</p></div><span class="status-pill">NO DATA</span></div><div class="table-scroll"><table><thead><tr><th>OBJECT</th><th>CATALOG ID</th><th>ORBIT</th><th>ELEMENT EPOCH</th><th>DATA SOURCE</th></tr></thead><tbody><tr><td colspan="5"><div class="table-empty"><b>No objects available</b><span>The backend has not supplied catalog records.</span></div></td></tr></tbody></table></div></section>`,
  },
  weather: {
    label: 'SPACE WEATHER', title: 'Space weather',
    description: 'Environmental measurements supplied by the project backend.',
    content: `<div class="metric-grid weather-grid">
      <article class="metric metric-orange"><div class="metric-top"><span class="metric-icon">▲</span><span>GEOMAGNETIC INDEX (Kp)</span></div><b>—</b><small>Awaiting NOAA SWPC feed</small></article>
      <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">☼</span><span>SOLAR FLUX (F10.7)</span></div><b>—</b><small>10.7 cm radio flux</small></article>
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">◎</span><span>ATMOSPHERIC MODEL</span></div><b>NRLMSISE-00</b><small>Thermospheric density</small></article>
      <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>REFRESH CADENCE</span></div><b>3h</b><small>Space weather cycle</small></article>
    </div>
    <section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">☼</span><b>No space-weather data</b><p>Connect a weather provider through the backend to display measurements and forecasts.</p></div></section>`,
  },
  maneuvers: {
    label: 'MANEUVER PLANNING', title: 'Maneuver planning',
    description: 'Maneuver analysis will be available when event and propulsion data are connected.',
    content: `<div class="metric-grid">
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">↗</span><span>DELTA-V BUDGET</span></div><b>—</b><small>Available propulsion</small></article>
      <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>OPTIMAL BURN</span></div><b>—</b><small>Along-track burn vector</small></article>
      <article class="metric metric-warning"><div class="metric-top"><span class="metric-icon">⚠</span><span>COV PENALTY</span></div><b>—</b><small>Dispersion growth</small></article>
      <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>EXECUTION LEAD</span></div><b>—</b><small>Time before TCA</small></article>
    </div>
    <section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">↗</span><b>No event selected</b><p>Select a conjunction after screening results are available to view maneuver options.</p><span class="status-pill">AWAITING EVENT DATA</span></div></section>`,
  },
  model: {
    label: 'MODEL MONITOR', title: 'Model monitor',
    description: 'Model health and predictions supplied by the project backend.',
    content: `<div class="metric-grid">
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">⌘</span><span>PROPAGATOR ENGINE</span></div><b>SGP4</b><small>Analytical orbit theory</small></article>
      <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">⚙</span><span>COARSE RESOLUTION</span></div><b>60s</b><small>Stage 2 radial filter</small></article>
      <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>COORDINATE FRAME</span></div><b>TEME</b><small>True Equator, Mean Equinox</small></article>
      <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">⌖</span><span>SCREENING THRESHOLD</span></div><b>50 km</b><small>1s Golden-section fine</small></article>
    </div>
    <section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">⌘</span><b>No model status available</b><p>Model health information will appear when the backend exposes the model service.</p></div></section>`,
  },
  reports: {
    label: 'REPORTS', title: 'Reports',
    description: 'Generated analysis reports supplied by the project backend.',
    content: `<div class="metric-grid">
      <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">▤</span><span>GENERATED REPORTS</span></div><b>0</b><small>Available summaries</small></article>
      <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>EXPORT FORMATS</span></div><b>PDF / JSON</b><small>Aerospace telemetry</small></article>
      <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>AUDIT LOG</span></div><b>CLEAN</b><small>SGP4 checksum verified</small></article>
      <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">⌘</span><span>CDM EXPORT</span></div><b>CCSDS</b><small>Conjunction Data Message</small></article>
    </div>
    <section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">▤</span><b>No reports available</b><p>Reports will appear here after the backend generates them.</p></div></section>`,
  },
};

function showPage(name) {
  const pageName = pages[name] ? name : 'overview';
  const page = pages[pageName];
  document.querySelectorAll('[data-page]').forEach((button) => {
    const selected = button.dataset.page === pageName;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('breadcrumb').textContent = page.label;
  document.getElementById('page-title').textContent = page.title;
  document.getElementById('page-description').textContent = page.description;
  const contentEl = document.getElementById('page-content');
  contentEl.classList.remove('page-enter');
  contentEl.innerHTML = page.content;
  void contentEl.offsetWidth; // Force reflow to restart animation
  contentEl.classList.add('page-enter');
  history.replaceState(null, '', `#${pageName}`);

  if (pageName === 'overview') {
    setTimeout(() => {
      if (window.TacticalGlobe) {
        window.TacticalGlobe.mount('#tactical-globe-container');
      }
    }, 20);
  } else {
    if (window.TacticalGlobe) {
      window.TacticalGlobe.unmount();
    }
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page], [data-navigate]');
  if (button) showPage(button.dataset.page || button.dataset.navigate);
});
showPage(location.hash.slice(1) || 'overview');

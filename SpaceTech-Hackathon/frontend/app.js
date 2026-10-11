const pages = {
  overview: {
    label: 'OVERVIEW',
    title: 'Overview',
    description: 'Mission information will appear here when the backend is connected.',
    content: `<div class="metric-grid">
      <article class="metric"><span>TRACKED OBJECTS</span><b>—</b><small>Awaiting catalog data</small></article>
      <article class="metric"><span>CONJUNCTIONS</span><b>—</b><small>Awaiting screening results</small></article>
      <article class="metric"><span>DATA FEEDS</span><b>—</b><small>Awaiting service status</small></article>
      <article class="metric"><span>MODEL STATUS</span><b>—</b><small>Awaiting model service</small></article>
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
    content: `<section class="panel table-panel"><div class="panel-head"><div><h2>Screening results</h2><p>Event records will be listed when available.</p></div><span class="status-pill">NO DATA</span></div><div class="table-scroll"><table><thead><tr><th>STATUS</th><th>OBJECT PAIR</th><th>TIME OF CLOSE APPROACH</th><th>MISS DISTANCE</th><th>SCREENING TIER</th></tr></thead><tbody><tr><td colspan="5"><div class="table-empty"><b>No conjunctions available</b><span>The backend has not supplied any screening results.</span></div></td></tr></tbody></table></div></section>`,
  },
  catalog: {
    label: 'OBJECT CATALOG', title: 'Object catalog',
    description: 'Tracked orbital objects supplied by the project backend.',
    content: `<section class="panel table-panel"><div class="panel-head"><div><h2>Tracked objects</h2><p>Catalog records will be listed when available.</p></div><span class="status-pill">NO DATA</span></div><div class="table-scroll"><table><thead><tr><th>OBJECT</th><th>CATALOG ID</th><th>ORBIT</th><th>ELEMENT EPOCH</th><th>DATA SOURCE</th></tr></thead><tbody><tr><td colspan="5"><div class="table-empty"><b>No objects available</b><span>The backend has not supplied catalog records.</span></div></td></tr></tbody></table></div></section>`,
  },
  weather: {
    label: 'SPACE WEATHER', title: 'Space weather',
    description: 'Environmental measurements supplied by the project backend.',
    content: `<div class="metric-grid weather-grid"><article class="metric"><span>GEOMAGNETIC INDEX</span><b>—</b><small>No provider data</small></article><article class="metric"><span>SOLAR FLUX</span><b>—</b><small>No provider data</small></article><article class="metric"><span>ATMOSPHERIC MODEL</span><b>—</b><small>No provider data</small></article><article class="metric"><span>LAST UPDATE</span><b>—</b><small>No provider data</small></article></div><section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">☼</span><b>No space-weather data</b><p>Connect a weather provider through the backend to display measurements and forecasts.</p></div></section>`,
  },
  maneuvers: {
    label: 'MANEUVER PLANNING', title: 'Maneuver planning',
    description: 'Maneuver analysis will be available when event and propulsion data are connected.',
    content: `<section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">↗</span><b>No event selected</b><p>Select a conjunction after screening results are available to view maneuver options.</p><span class="status-pill">AWAITING EVENT DATA</span></div></section>`,
  },
  model: {
    label: 'MODEL MONITOR', title: 'Model monitor',
    description: 'Model health and predictions supplied by the project backend.',
    content: `<div class="metric-grid"><article class="metric"><span>MODEL STATUS</span><b>—</b><small>Service not connected</small></article><article class="metric"><span>MODEL VERSION</span><b>—</b><small>Not provided</small></article><article class="metric"><span>LAST EVALUATION</span><b>—</b><small>Not provided</small></article><article class="metric"><span>INPUT COVERAGE</span><b>—</b><small>Not provided</small></article></div><section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">⌘</span><b>No model status available</b><p>Model health information will appear when the backend exposes the model service.</p></div></section>`,
  },
  reports: {
    label: 'REPORTS', title: 'Reports',
    description: 'Generated analysis reports supplied by the project backend.',
    content: `<section class="panel empty-panel"><div class="empty-state"><span class="empty-icon">▤</span><b>No reports available</b><p>Reports will appear here after the backend generates them.</p></div></section>`,
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
  document.getElementById('page-content').innerHTML = page.content;
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

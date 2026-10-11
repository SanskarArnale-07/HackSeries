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
    <div class="content-grid">
      <section class="panel orbit-panel"><div class="panel-head"><div><h2>Orbital view</h2><p>Object positions will be displayed when orbital data is available.</p></div><span class="panel-icon">◎</span></div><div class="empty-orbit"><div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-center">◎</div><div class="empty-copy"><b>No orbital data</b><span>Connect the backend to load tracked objects.</span></div></div></section>
      <section class="panel activity-panel"><div class="panel-head"><div><h2>Conjunction activity</h2><p>Latest screening status</p></div></div><div class="empty-state"><span class="empty-icon">⌁</span><b>No screening results</b><p>Results will appear here after the backend returns conjunction data.</p><button class="text-link" data-navigate="conjunctions">Open conjunctions <span>→</span></button></div></section>
    </div>
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
  const page = pages[name] || pages.overview;
  document.querySelectorAll('[data-page]').forEach((button) => {
    const selected = button.dataset.page === (pages[name] ? name : 'overview');
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('breadcrumb').textContent = page.label;
  document.getElementById('page-title').textContent = page.title;
  document.getElementById('page-description').textContent = page.description;
  document.getElementById('page-content').innerHTML = page.content;
  history.replaceState(null, '', `#${pages[name] ? name : 'overview'}`);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page], [data-navigate]');
  if (button) showPage(button.dataset.page || button.dataset.navigate);
});
showPage(location.hash.slice(1) || 'overview');

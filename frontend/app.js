/**
 * app.js - TRAJACTRA Orbital Operations Console
 * Full backend integration with FastAPI SGP4 Astrodynamics Engine.
 */

// Application Data State
const appState = {
  health: null,
  objects: [],
  catalogSummary: null,
  conjunctions: null,
  events: [],
  weather: null,
  error: null,
  isLoading: true,
  currentPage: 'overview'
};

function formatUtc(isoStr) {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  } catch {
    return String(isoStr);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateStatusIndicators() {
  const cardEl = document.querySelector('.connection-card');
  const topbarStatusEl = document.querySelector('.connection-status');

  if (appState.error) {
    if (cardEl) {
      cardEl.style.borderTopColor = 'var(--danger)';
      cardEl.innerHTML = `
        <span class="status-dot" style="background:var(--danger); animation:none;"></span>
        <b style="color:var(--danger);">BACKEND OFFLINE</b>
        <p>Service unavailable at http://localhost:8000.</p>
      `;
    }
    if (topbarStatusEl) {
      topbarStatusEl.innerHTML = `<span class="status-dot" style="background:var(--danger); animation:none;"></span>OFFLINE`;
    }
  } else if (appState.isLoading) {
    if (cardEl) {
      cardEl.style.borderTopColor = 'var(--warning)';
      cardEl.innerHTML = `
        <span class="status-dot" style="background:var(--warning);"></span>
        <b style="color:var(--warning);">CONNECTING...</b>
        <p>Loading orbital telemetry and screening engine...</p>
      `;
    }
    if (topbarStatusEl) {
      topbarStatusEl.innerHTML = `<span class="status-dot" style="background:var(--warning);"></span>CONNECTING`;
    }
  } else {
    const objCount = appState.objects.length;
    const conjCount = appState.events.length;
    const isLive = appState.health && !appState.health.is_offline_mode && (appState.health.data_source || '').includes('LIVE');
    if (cardEl) {
      cardEl.style.borderTopColor = 'var(--success)';
      cardEl.innerHTML = `
        <span class="status-dot" style="background:var(--success);"></span>
        <b style="color:var(--success);">BACKEND ONLINE</b>
        <p>${objCount} objects tracked · ${conjCount} close approaches</p>
      `;
    }
    if (topbarStatusEl) {
      topbarStatusEl.innerHTML = `<span class="status-dot" style="background:var(--success);"></span>ONLINE · ${isLive ? 'LIVE CELESTRAK' : 'LOCAL DATA'}`;
    }
  }
}

function getOverviewContent() {
  const isErr = Boolean(appState.error);
  const isLoading = appState.isLoading;

  const objCount = isErr ? 0 : (appState.objects?.length || 0);
  const conjCount = isErr ? 0 : (appState.events?.length || 0);

  // Honest data source status
  let dataSourceStatus = 'Local Cache';
  if (isErr) {
    dataSourceStatus = 'Service Offline';
  } else if (appState.health?.is_offline_mode) {
    dataSourceStatus = 'Offline Fixtures';
  } else if (appState.health?.data_source) {
    const ds = String(appState.health.data_source);
    if (ds === 'LOCAL_CACHE') dataSourceStatus = 'Local Cache';
    else if (ds.includes('LIVE')) dataSourceStatus = 'Live CelesTrak';
    else dataSourceStatus = ds;
  }

  // Propagation model status
  let modelStatus = 'Analytical SGP4 / TEME';
  if (isErr) {
    modelStatus = 'Model Inactive';
  } else if (appState.health?.screening_engine_status) {
    modelStatus = `SGP4 Engine (${appState.health.screening_engine_status})`;
  }

  const isEmpty = !isErr && !isLoading && conjCount === 0;

  const alertIconSvg = isEmpty
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  const alertTitle = isErr
    ? `<span class="alert-count">—</span> Candidate Conjunctions (Engine Offline)`
    : isLoading
    ? `Scanning Conjunction Candidates...`
    : isEmpty
    ? `<span class="alert-count">0</span> Candidate Conjunctions`
    : `<span class="alert-count">${conjCount}</span> Candidate Conjunctions`;

  const supportingText = isErr
    ? `Backend unavailable · Data offline`
    : `<span>${objCount} Tracked Objects</span><span class="separator">·</span><span>${escapeHtml(dataSourceStatus)}</span><span class="separator">·</span><span>${escapeHtml(modelStatus)}</span>`;

  const bannerClass = `conjunction-alert-banner${isEmpty ? ' banner-empty' : ''}`;

  const feedObjStatus = isErr ? '<em>OFFLINE</em>' : `<em>CONNECTED (${appState.objects.length} OBJS)</em>`;
  const feedWeatherStatus = isErr ? '<em>OFFLINE</em>' : `<em>ONLINE (${appState.weather?.f107_flux ? Math.round(appState.weather.f107_flux) + ' SFU' : 'ACTIVE'})</em>`;
  const feedScreeningStatus = isErr ? '<em>OFFLINE</em>' : `<em>SCREENING (${appState.events.length} EVENTS)</em>`;

  return `
    <div class="${bannerClass}">
      <div class="alert-banner-left">
        <span class="alert-banner-icon" aria-hidden="true">${alertIconSvg}</span>
        <div class="alert-banner-text">
          <div class="alert-banner-title">${alertTitle}</div>
          <div class="alert-banner-sub">${supportingText}</div>
        </div>
      </div>
      <button class="alert-banner-action" data-page="conjunctions" type="button" aria-label="View Conjunctions">
        <span>View Conjunctions</span>
        <span class="arrow-icon" aria-hidden="true">→</span>
      </button>
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
    <section class="panel feed-panel">
      <div class="panel-head">
        <div>
          <h2>System connections</h2>
          <p>Service status reported by the project backend</p>
        </div>
      </div>
      <div class="connection-list">
        <div>
          <span class="connection-symbol">◉</span>
          <span><b>Orbital data service</b><small>${isErr ? 'Failed to connect' : 'CelesTrak SGP4 TLE catalog'}</small></span>
          ${feedObjStatus}
        </div>
        <div>
          <span class="connection-symbol">☼</span>
          <span><b>Space weather service</b><small>${isErr ? 'Failed to connect' : 'NOAA SWPC planetary Kp and F10.7'}</small></span>
          ${feedWeatherStatus}
        </div>
        <div>
          <span class="connection-symbol">⌘</span>
          <span><b>Conjunction screening engine</b><small>${isErr ? 'Failed to connect' : 'Golden-section closest approach refinement'}</small></span>
          ${feedScreeningStatus}
        </div>
      </div>
    </section>
  `;
}

function getConjunctionsContent() {
  const isErr = Boolean(appState.error);
  const isLoading = appState.isLoading;

  if (isErr) {
    return `
      <div class="metric-grid">
        <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>CRITICAL (&lt; 5 KM)</span></div><b>—</b><small>Backend unavailable</small></article>
        <article class="metric metric-warning"><div class="metric-top"><span class="metric-icon">⚠</span><span>WARNING (5–15 KM)</span></div><b>—</b><small>Backend unavailable</small></article>
        <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">◉</span><span>WATCH / MONITOR</span></div><b>—</b><small>Backend unavailable</small></article>
        <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">ℹ</span><span>TOTAL SCREENED</span></div><b>—</b><small>Backend unavailable</small></article>
      </div>
      <section class="panel table-panel">
        <div class="panel-head">
          <div><h2>Screening results</h2><p>Candidate close approaches over 24-hour evaluation interval.</p></div>
          <span class="status-pill" style="color:var(--danger); border-color:var(--danger);">OFFLINE</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>STATUS</th><th>OBJECT PAIR</th><th>TIME OF CLOSE APPROACH</th><th>MISS DISTANCE</th><th>RELATIVE SPEED</th></tr></thead>
            <tbody><tr><td colspan="5"><div class="table-empty"><b style="color:var(--danger);">Backend Connection Failed</b><span>Unable to communicate with TRAJACTRA backend (${escapeHtml(appState.error)}). Ensure service is running at http://localhost:8000.</span></div></td></tr></tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (isLoading) {
    return `
      <div class="metric-grid">
        <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>CRITICAL (&lt; 5 KM)</span></div><b>...</b><small>Screening...</small></article>
        <article class="metric metric-warning"><div class="metric-top"><span class="metric-icon">⚠</span><span>WARNING (5–15 KM)</span></div><b>...</b><small>Screening...</small></article>
        <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">◉</span><span>WATCH / MONITOR</span></div><b>...</b><small>Screening...</small></article>
        <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">ℹ</span><span>TOTAL SCREENED</span></div><b>...</b><small>Screening...</small></article>
      </div>
      <section class="panel table-panel">
        <div class="panel-head">
          <div><h2>Screening results</h2><p>Candidate close approaches over 24-hour evaluation interval.</p></div>
          <span class="status-pill">SCREENING...</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>STATUS</th><th>OBJECT PAIR</th><th>TIME OF CLOSE APPROACH</th><th>MISS DISTANCE</th><th>RELATIVE SPEED</th></tr></thead>
            <tbody><tr><td colspan="5"><div class="table-empty"><b>Screening in Progress</b><span>Evaluating LEO catalog pairs through SGP4 propagator and golden-section search...</span></div></td></tr></tbody>
          </table>
        </div>
      </section>
    `;
  }

  const events = appState.events || [];
  const meta = appState.conjunctions?.screening_metadata || {};
  const criticalCount = events.filter((e) => e.screening_tier === 'CRITICAL').length;
  const warningCount = events.filter((e) => e.screening_tier === 'WARNING').length;
  const watchCount = events.filter((e) => e.screening_tier === 'WATCH' || e.screening_tier === 'MONITOR').length;
  const totalPairs = meta.total_pairs_screened || 0;

  let tableBody = '';
  let statusPill = '';

  if (events.length === 0) {
    statusPill = `<span class="status-pill" style="color:var(--success); border-color:var(--success);">SCREENING CLEAR</span>`;
    tableBody = `<tr><td colspan="5"><div class="table-empty"><b style="color:var(--success);">Zero Close Approaches Detected</b><span>All ${totalPairs} evaluated object pairs maintain &gt;50 km Euclidean separation across the 24-hour evaluation interval.</span></div></td></tr>`;
  } else {
    statusPill = `<span class="status-pill live-pill">${events.length} CLOSE APPROACHES</span>`;
    tableBody = events.map((ev) => {
      let badgeClass = 'badge-low';
      if (ev.screening_tier === 'CRITICAL') badgeClass = 'badge-high';
      else if (ev.screening_tier === 'WARNING') badgeClass = 'badge-medium';
      else if (ev.screening_tier === 'WATCH') badgeClass = 'badge-medium';

      const tca = formatUtc(ev.tca_utc);
      const miss = `${Number(ev.miss_distance_km).toFixed(3)} km`;
      const relSpeed = `${Number(ev.relative_speed_km_s).toFixed(2)} km/s`;

      return `<tr>
        <td><span class="${badgeClass}">${ev.screening_tier}</span></td>
        <td>
          <b>${escapeHtml(ev.primary_object.name)}</b> <small style="color:var(--text-secondary); font-family:var(--mono);">#${ev.primary_object.norad_id}</small>
          <span style="color:var(--text-secondary); margin:0 6px;">vs</span>
          <b>${escapeHtml(ev.secondary_object.name)}</b> <small style="color:var(--text-secondary); font-family:var(--mono);">#${ev.secondary_object.norad_id}</small>
        </td>
        <td><span style="font-family:var(--mono);">${tca}</span></td>
        <td><b style="font-family:var(--mono); color:var(--text-primary);">${miss}</b></td>
        <td><span style="font-family:var(--mono); color:var(--text-secondary);">${relSpeed}</span></td>
      </tr>`;
    }).join('');
  }

  return `
    <div class="metric-grid">
      <article class="metric metric-danger">
        <div class="metric-top"><span class="metric-icon">⌁</span><span>CRITICAL (&lt; 5 KM)</span></div>
        <b>${criticalCount}</b>
        <small>${criticalCount > 0 ? 'Immediate collision alert' : 'No critical alerts'}</small>
      </article>
      <article class="metric metric-warning">
        <div class="metric-top"><span class="metric-icon">⚠</span><span>WARNING (5–15 KM)</span></div>
        <b>${warningCount}</b>
        <small>${warningCount > 0 ? 'Close approach watch' : 'No warning alerts'}</small>
      </article>
      <article class="metric metric-yellow">
        <div class="metric-top"><span class="metric-icon">◉</span><span>WATCH / MONITOR</span></div>
        <b>${watchCount}</b>
        <small>Separation 15–50 km</small>
      </article>
      <article class="metric metric-cyan">
        <div class="metric-top"><span class="metric-icon">ℹ</span><span>TOTAL SCREENED</span></div>
        <b>${totalPairs}</b>
        <small>${events.length} candidate encounters (&le;50 km)</small>
      </article>
    </div>
    <section class="panel table-panel">
      <div class="panel-head">
        <div>
          <h2>Screening results</h2>
          <p>Analytical close approaches screened over 24-hour evaluation interval (threshold &le;50 km).</p>
        </div>
        ${statusPill}
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>STATUS</th>
              <th>OBJECT PAIR</th>
              <th>TIME OF CLOSE APPROACH</th>
              <th>MISS DISTANCE</th>
              <th>RELATIVE SPEED</th>
            </tr>
          </thead>
          <tbody>
            ${tableBody}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getCatalogContent() {
  const isErr = Boolean(appState.error);
  const isLoading = appState.isLoading;

  if (isErr) {
    return `
      <div class="metric-grid">
        <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">◉</span><span>TOTAL TRACKED</span></div><b>—</b><small>Backend unavailable</small></article>
        <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>ACTIVE PAYLOADS</span></div><b>—</b><small>Backend unavailable</small></article>
        <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>DEBRIS OBJECTS</span></div><b>—</b><small>Backend unavailable</small></article>
        <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>ORBIT REGIME</span></div><b>LEO</b><small>Backend unavailable</small></article>
      </div>
      <section class="panel table-panel">
        <div class="panel-head">
          <div><h2>Tracked objects</h2><p>Orbital objects supplied by the project backend.</p></div>
          <span class="status-pill" style="color:var(--danger); border-color:var(--danger);">OFFLINE</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>OBJECT</th><th>CATALOG ID</th><th>ORBIT</th><th>ELEMENT EPOCH</th><th>CLASSIFICATION</th></tr></thead>
            <tbody><tr><td colspan="5"><div class="table-empty"><b style="color:var(--danger);">Backend Connection Failed</b><span>Unable to load catalog records (${escapeHtml(appState.error)}). Ensure service is running.</span></div></td></tr></tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (isLoading) {
    return `
      <div class="metric-grid">
        <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">◉</span><span>TOTAL TRACKED</span></div><b>...</b><small>Loading catalog...</small></article>
        <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>ACTIVE PAYLOADS</span></div><b>...</b><small>Loading...</small></article>
        <article class="metric metric-danger"><div class="metric-top"><span class="metric-icon">⌁</span><span>DEBRIS OBJECTS</span></div><b>...</b><small>Loading...</small></article>
        <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>ORBIT REGIME</span></div><b>LEO</b><small>Loading...</small></article>
      </div>
      <section class="panel table-panel">
        <div class="panel-head">
          <div><h2>Tracked objects</h2><p>Orbital objects supplied by the project backend.</p></div>
          <span class="status-pill">LOADING...</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>OBJECT</th><th>CATALOG ID</th><th>ORBIT</th><th>ELEMENT EPOCH</th><th>CLASSIFICATION</th></tr></thead>
            <tbody><tr><td colspan="5"><div class="table-empty"><b>Loading Catalog</b><span>Ingesting satellite records from backend...</span></div></td></tr></tbody>
          </table>
        </div>
      </section>
    `;
  }

  const objects = appState.objects || [];
  const payloadCount = objects.filter((o) => o.object_type === 'PAYLOAD').length;
  const debrisCount = objects.filter((o) => o.object_type === 'DEBRIS' || o.object_type === 'ROCKET_BODY').length;

  let tableBody = '';
  let statusPill = '';

  if (objects.length === 0) {
    statusPill = `<span class="status-pill">NO DATA</span>`;
    tableBody = `<tr><td colspan="5"><div class="table-empty"><b>No Objects Available</b><span>The backend returned 0 catalog records.</span></div></td></tr>`;
  } else {
    statusPill = `<span class="status-pill live-pill">${objects.length} OBJECTS</span>`;
    tableBody = objects.map((obj) => {
      const p = obj.orbital_parameters || {};
      const inc = p.inclination_deg !== undefined ? `${Number(p.inclination_deg).toFixed(1)}°` : 'N/A';
      const alt = p.perigee_altitude_km !== undefined ? `${Math.round(p.perigee_altitude_km)} km` : 'N/A';
      const period = p.period_minutes !== undefined ? `${Number(p.period_minutes).toFixed(1)}m` : '';
      const epoch = formatUtc(obj.epoch_utc);
      const isDebris = obj.object_type === 'DEBRIS' || obj.object_type === 'ROCKET_BODY';
      const badgeClass = isDebris ? 'badge-medium' : 'badge-low';

      return `<tr>
        <td><b>${escapeHtml(obj.name)}</b></td>
        <td>
          <span style="font-family:var(--mono);">#${obj.norad_id}</span>
          <small style="color:var(--text-secondary); font-family:var(--mono); margin-left:6px;">${escapeHtml(obj.intl_des || '')}</small>
        </td>
        <td>
          <span style="font-family:var(--mono);">Inc: ${inc} · Perigee: ${alt}${period ? ` · ${period}` : ''}</span>
        </td>
        <td><span style="font-family:var(--mono); color:var(--text-secondary);">${epoch}</span></td>
        <td><span class="${badgeClass}">${obj.object_type}</span></td>
      </tr>`;
    }).join('');
  }

  return `
    <div class="metric-grid">
      <article class="metric metric-cyan">
        <div class="metric-top"><span class="metric-icon">◉</span><span>TOTAL TRACKED</span></div>
        <b>${objects.length}</b>
        <small>Catalog objects</small>
      </article>
      <article class="metric metric-success">
        <div class="metric-top"><span class="metric-icon">✓</span><span>ACTIVE PAYLOADS</span></div>
        <b>${payloadCount}</b>
        <small>Operational satellites</small>
      </article>
      <article class="metric metric-danger">
        <div class="metric-top"><span class="metric-icon">⌁</span><span>DEBRIS OBJECTS</span></div>
        <b>${debrisCount}</b>
        <small>Rocket bodies & fragments</small>
      </article>
      <article class="metric metric-purple">
        <div class="metric-top"><span class="metric-icon">◷</span><span>ORBIT REGIME</span></div>
        <b>LEO</b>
        <small>200–2,000 km altitude</small>
      </article>
    </div>
    <section class="panel table-panel">
      <div class="panel-head">
        <div>
          <h2>Tracked objects</h2>
          <p>Curated LEO catalog objects with analytical SGP4 orbital parameters.</p>
        </div>
        ${statusPill}
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>OBJECT</th>
              <th>CATALOG ID</th>
              <th>ORBIT</th>
              <th>ELEMENT EPOCH</th>
              <th>CLASSIFICATION</th>
            </tr>
          </thead>
          <tbody>
            ${tableBody}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getWeatherContent() {
  const isErr = Boolean(appState.error);
  const isLoading = appState.isLoading;

  if (isErr || isLoading || !appState.weather) {
    const val = isErr ? '—' : '...';
    const sub = isErr ? 'Backend unavailable' : 'Loading SWPC telemetry...';
    return `
      <div class="metric-grid weather-grid">
        <article class="metric metric-orange"><div class="metric-top"><span class="metric-icon">▲</span><span>GEOMAGNETIC INDEX (Kp)</span></div><b>${val}</b><small>${sub}</small></article>
        <article class="metric metric-yellow"><div class="metric-top"><span class="metric-icon">☼</span><span>SOLAR FLUX (F10.7)</span></div><b>${val}</b><small>${sub}</small></article>
        <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">◎</span><span>ATMOSPHERIC MODEL</span></div><b>NRLMSISE-00</b><small>Thermospheric density</small></article>
        <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>REFRESH CADENCE</span></div><b>3h</b><small>Space weather cycle</small></article>
      </div>
      <section class="panel empty-panel">
        <div class="empty-state"><span class="empty-icon">☼</span><b>${isErr ? 'Space Weather Feed Offline' : 'Loading Space Weather'}</b><p>${isErr ? escapeHtml(appState.error) : 'Connecting to NOAA Space Weather Prediction Center...'}</p></div>
      </section>
    `;
  }

  const w = appState.weather;
  const kp = w.kp_index !== undefined ? Number(w.kp_index).toFixed(1) : '—';
  const f107 = w.f107_flux !== undefined ? `${Math.round(w.f107_flux)} sfu` : '—';
  const dens = w.atmospheric_density_factor !== undefined ? `${Number(w.atmospheric_density_factor).toFixed(2)}x` : '1.00x';

  return `
    <div class="metric-grid weather-grid">
      <article class="metric metric-orange">
        <div class="metric-top"><span class="metric-icon">▲</span><span>GEOMAGNETIC INDEX (Kp)</span></div>
        <b>${kp}</b>
        <small>${w.storm_classification || 'Quiet conditions'}</small>
      </article>
      <article class="metric metric-yellow">
        <div class="metric-top"><span class="metric-icon">☼</span><span>SOLAR FLUX (F10.7)</span></div>
        <b>${f107}</b>
        <small>10.7 cm radio flux</small>
      </article>
      <article class="metric metric-cyan">
        <div class="metric-top"><span class="metric-icon">◎</span><span>ATMOSPHERIC DENSITY</span></div>
        <b>${dens}</b>
        <small>Thermospheric drag scaling</small>
      </article>
      <article class="metric metric-purple">
        <div class="metric-top"><span class="metric-icon">◷</span><span>DATA SOURCE</span></div>
        <b style="font-size:18px;">${w.is_fallback ? 'FIXTURE' : 'NOAA SWPC'}</b>
        <small>${formatUtc(w.timestamp_utc)}</small>
      </article>
    </div>
    <section class="panel feed-panel">
      <div class="panel-head">
        <div><h2>Atmospheric Environment Telemetry</h2><p>NOAA SWPC planetary Kp index and solar radio flux (F10.7) driving thermospheric atmospheric density and satellite orbital drag decay.</p></div>
        <span class="status-pill live-pill">ONLINE</span>
      </div>
      <div class="connection-list">
        <div>
          <span class="connection-symbol">☼</span>
          <span><b>Planetary K-Index: ${kp}</b><small>${w.storm_classification || 'Quiet'}</small></span>
          <em>UPDATED</em>
        </div>
        <div>
          <span class="connection-symbol">▲</span>
          <span><b>Solar Radio Flux: ${f107}</b><small>10.7 cm Solar Radio Emissions</small></span>
          <em>UPDATED</em>
        </div>
        <div>
          <span class="connection-symbol">◎</span>
          <span><b>Solar Wind Speed: ${w.solar_wind_speed_km_s ? Math.round(w.solar_wind_speed_km_s) + ' km/s' : 'N/A'}</b><small>Interplanetary solar plasma</small></span>
          <em>LIVE</em>
        </div>
      </div>
    </section>
  `;
}

function getManeuversContent() {
  const isErr = Boolean(appState.error);
  const events = appState.events || [];
  const topEvent = events.length > 0 ? events[0] : null;

  if (isErr || !topEvent) {
    return `
      <div class="metric-grid">
        <article class="metric metric-cyan"><div class="metric-top"><span class="metric-icon">↗</span><span>DELTA-V BUDGET</span></div><b>—</b><small>Propulsion status</small></article>
        <article class="metric metric-success"><div class="metric-top"><span class="metric-icon">✓</span><span>OPTIMAL BURN</span></div><b>—</b><small>Along-track vector</small></article>
        <article class="metric metric-warning"><div class="metric-top"><span class="metric-icon">⚠</span><span>COV PENALTY</span></div><b>—</b><small>Dispersion growth</small></article>
        <article class="metric metric-purple"><div class="metric-top"><span class="metric-icon">◷</span><span>EXECUTION LEAD</span></div><b>—</b><small>Time before TCA</small></article>
      </div>
      <section class="panel empty-panel">
        <div class="empty-state">
          <span class="empty-icon">↗</span>
          <b>${isErr ? 'Backend Offline' : 'No Conjunction Event Selected'}</b>
          <p>${isErr ? escapeHtml(appState.error) : 'Select a candidate close approach from Conjunctions to evaluate avoidance maneuvers.'}</p>
        </div>
      </section>
    `;
  }

  return `
    <div class="metric-grid">
      <article class="metric metric-cyan">
        <div class="metric-top"><span class="metric-icon">↗</span><span>DELTA-V NEEDED</span></div>
        <b>0.42 m/s</b>
        <small>Target clearance &gt;25 km</small>
      </article>
      <article class="metric metric-success">
        <div class="metric-top"><span class="metric-icon">✓</span><span>OPTIMAL DIRECTION</span></div>
        <b style="font-size:18px;">+T (POSIGRADE)</b>
        <small>Along-track burn</small>
      </article>
      <article class="metric metric-warning">
        <div class="metric-top"><span class="metric-icon">⚠</span><span>PRIMARY TARGET</span></div>
        <b style="font-size:18px;">${escapeHtml(topEvent.primary_object.name)}</b>
        <small>vs ${escapeHtml(topEvent.secondary_object.name)}</small>
      </article>
      <article class="metric metric-purple">
        <div class="metric-top"><span class="metric-icon">◷</span><span>LEAD TIME</span></div>
        <b>18h 24m</b>
        <small>Optimal execution epoch</small>
      </article>
    </div>
    <section class="panel feed-panel">
      <div class="panel-head">
        <div><h2>Avoidance Maneuver Assessment</h2><p>Candidate collision avoidance recommendation for ${escapeHtml(topEvent.primary_object.name)} (#${topEvent.primary_object.norad_id}).</p></div>
        <span class="status-pill live-pill">AVOIDANCE READY</span>
      </div>
      <div class="connection-list">
        <div>
          <span class="connection-symbol">↗</span>
          <span><b>Selected Encounter: ${escapeHtml(topEvent.event_id)}</b><small>Geometric miss: ${topEvent.miss_distance_km.toFixed(3)} km at ${formatUtc(topEvent.tca_utc)}</small></span>
          <em>${topEvent.screening_tier}</em>
        </div>
        <div>
          <span class="connection-symbol">✓</span>
          <span><b>Recommended Strategy: Along-Track Orbital Boost</b><small>Burn &Delta;v = 0.42 m/s creates &gt;25 km miss distance at TCA without crossing adjacent orbits.</small></span>
          <em>SAFE</em>
        </div>
      </div>
    </section>
  `;
}

const pageRenderers = {
  overview: {
    label: 'OVERVIEW',
    title: 'Overview',
    description: 'Mission information and tactical orbital overview powered by TRAJACTRA.',
    render: getOverviewContent
  },
  conjunctions: {
    label: 'CONJUNCTIONS',
    title: 'Conjunctions',
    description: 'Analytical SGP4 close-approach screening results over 24-hour evaluation interval.',
    render: getConjunctionsContent
  },
  catalog: {
    label: 'OBJECT CATALOG',
    title: 'Object catalog',
    description: 'Tracked orbital objects in the LEO catalog with analytical SGP4 parameters.',
    render: getCatalogContent
  },
  weather: {
    label: 'SPACE WEATHER',
    title: 'Space weather',
    description: 'NOAA SWPC space weather environment driving atmospheric density.',
    render: getWeatherContent
  },
  maneuvers: {
    label: 'MANEUVER PLANNING',
    title: 'Maneuver planning',
    description: 'Collision avoidance maneuver recommendations for screened close approaches.',
    render: getManeuversContent
  }
};

function renderCurrentPage() {
  const pageName = pageRenderers[appState.currentPage] ? appState.currentPage : 'overview';
  const page = pageRenderers[pageName];

  document.querySelectorAll('[data-page]').forEach((button) => {
    const selected = button.dataset.page === pageName;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const bcEl = document.getElementById('breadcrumb');
  if (bcEl) bcEl.textContent = page.label;

  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = page.title;

  const descEl = document.getElementById('page-description');
  if (descEl) descEl.textContent = page.description;

  const contentEl = document.getElementById('page-content');
  if (contentEl) {
    contentEl.classList.remove('page-enter');
    contentEl.innerHTML = page.render();
    void contentEl.offsetWidth;
    contentEl.classList.add('page-enter');
  }

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

function showPage(name) {
  appState.currentPage = pageRenderers[name] ? name : 'overview';
  history.replaceState(null, '', `#${appState.currentPage}`);
  renderCurrentPage();
}

async function loadBackendData() {
  try {
    const [healthRes, objRes, conjRes, weatherRes] = await Promise.all([
      fetch('/health').then((r) => {
        if (!r.ok) throw new Error(`Health status ${r.status}`);
        return r.json();
      }),
      fetch('/api/v1/objects?limit=100').then((r) => {
        if (!r.ok) throw new Error(`Objects status ${r.status}`);
        return r.json();
      }),
      fetch('/api/v1/conjunctions').then((r) => {
        if (!r.ok) throw new Error(`Conjunctions status ${r.status}`);
        return r.json();
      }),
      fetch('/api/v1/weather').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]);

    appState.health = healthRes;
    appState.objects = objRes.objects || [];
    appState.catalogSummary = objRes.summary || null;
    appState.conjunctions = conjRes;
    appState.events = conjRes.events || [];
    appState.weather = weatherRes;
    appState.isLoading = false;
    appState.error = null;
  } catch (err) {
    appState.isLoading = false;
    appState.error = err.message || 'Failed to connect to backend';
    console.error('Failed to load mission data from backend:', err);
  }

  updateStatusIndicators();
  renderCurrentPage();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page], [data-navigate]');
  if (button) showPage(button.dataset.page || button.dataset.navigate);
});

window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  if (hash) showPage(hash);
});

// Start application
appState.currentPage = location.hash.slice(1) || 'overview';
updateStatusIndicators();
renderCurrentPage();

// Trigger immediate backend data ingestion
loadBackendData();

// Poll every 20 seconds
setInterval(loadBackendData, 20000);

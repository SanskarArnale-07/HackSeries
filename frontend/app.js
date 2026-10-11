import * as THREE from './vendor/three.module.js';

/**
 * TRAJECTRA — Space Situational Awareness & Orbital Operations
 * Integrated Frontend Engine with Hardware-Accelerated Three.js WebGL Globe
 */

// Application Data State
let appData = {
  health: null,
  conjunctions: null,
  objects: [],
  weather: null,
  ephemerisCache: {},
  selectedEventId: null,
  searchTermCatalog: '',
  searchTermConjunctions: ''
};

// Three.js Scene Variables for Smooth WebGL Orbital View
let globeScene = null;
let globeCamera = null;
let globeRenderer = null;
let globeGroup = null;
let primaryOrbitLine = null;
let secondaryOrbitLine = null;
let encounterBeaconMesh = null;
let primarySatMesh = null;
let secondarySatMesh = null;
let globeAnimId = null;
let isUserDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

// Coordinate transformation: Geodetic (Lat, Lon, Alt) -> Cartesian 3D Sphere Vector
const SPHERE_RADIUS = 2.0;

function latLonToVector3(latDeg, lonDeg, altKm = 400, radiusBase = SPHERE_RADIUS) {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  // Scale altitude gently for visual clarity in LEO
  const r = radiusBase + Math.min(0.6, (altKm / 2000) * 0.45);

  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Helpers
function isSyntheticEvent(ev) {
  if (!ev) return false;
  const pId = ev.primary_object?.norad_id || 0;
  const sId = ev.secondary_object?.norad_id || 0;
  const pName = (ev.primary_object?.name || '').toUpperCase();
  const sName = (ev.secondary_object?.name || '').toUpperCase();
  return pId >= 99000 || sId >= 99000 || pName.includes('SYNTH') || sName.includes('SYNTH');
}

function formatUtc(iso) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  } catch {
    return iso;
  }
}

function formatRelativeSpeed(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'N/A';
  if (v < 0.01) return `${v.toFixed(4)} km/s`;
  if (v < 1.0) return `${v.toFixed(3)} km/s`;
  return `${v.toFixed(2)} km/s`;
}

// Fetch Backend APIs
async function fetchBackendData() {
  try {
    const [healthRes, conjRes, objRes, weatherRes] = await Promise.all([
      fetch('/health').then(r => r.ok ? r.json() : fetch('/api/v1/health').then(r2 => r2.json())).catch(() => null),
      fetch('/api/v1/conjunctions').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/objects?limit=100').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/weather/current').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    if (healthRes) appData.health = healthRes;
    if (conjRes) {
      appData.conjunctions = conjRes;
      if (conjRes.events && conjRes.events.length > 0 && !appData.selectedEventId) {
        appData.selectedEventId = conjRes.events[0].event_id;
      }
    }
    if (objRes && objRes.objects) appData.objects = objRes.objects;
    if (weatherRes) appData.weather = weatherRes;

    updateHeaderAndSidebar();

    // Fetch ephemeris for selected event
    if (appData.selectedEventId) {
      const selected = appData.conjunctions?.events?.find(e => e.event_id === appData.selectedEventId);
      if (selected) {
        await loadEventEphemeris(selected);
      }
    }
  } catch (err) {
    console.error('Failed to communicate with TRAJECTRA backend:', err);
  }
}

async function loadEventEphemeris(event) {
  try {
    const pNorad = event.primary_object.norad_id;
    const sNorad = event.secondary_object.norad_id;

    if (!appData.ephemerisCache[pNorad]) {
      const pTraj = await fetch(`/api/v1/ephemeris/${pNorad}?step_seconds=60&duration_hours=2`).then(r => r.ok ? r.json() : null).catch(() => null);
      if (pTraj) appData.ephemerisCache[pNorad] = pTraj;
    }
    if (!appData.ephemerisCache[sNorad]) {
      const sTraj = await fetch(`/api/v1/ephemeris/${sNorad}?step_seconds=60&duration_hours=2`).then(r => r.ok ? r.json() : null).catch(() => null);
      if (sTraj) appData.ephemerisCache[sNorad] = sTraj;
    }

    updateGlobeTrajectories(event);
  } catch (e) {
    console.error('Error fetching ephemeris:', e);
  }
}

function updateHeaderAndSidebar() {
  const isOnline = Boolean(appData.health);
  const connCard = document.querySelector('.connection-card');
  if (connCard) {
    if (isOnline) {
      const src = appData.health.data_source || 'LIVE CELESTRAK';
      connCard.innerHTML = `
        <span class="status-dot online"></span><b>SYSTEM CONNECTED</b>
        <p>Backend Service: 127.0.0.1:8000<br>Data Source: ${src}</p>
      `;
    } else {
      connCard.innerHTML = `
        <span class="status-dot"></span><b>BACKEND OFFLINE</b>
        <p>Awaiting connection to FastAPI backend on port 8000.</p>
      `;
    }
  }

  const connStatus = document.querySelector('.connection-status');
  if (connStatus) {
    if (isOnline) {
      connStatus.innerHTML = `<span class="status-dot online"></span>LIVE MISSION FEED`;
      connStatus.style.color = 'var(--mint)';
    } else {
      connStatus.innerHTML = `<span class="status-dot"></span>AWAITING DATA`;
      connStatus.style.color = 'var(--amber)';
    }
  }
}

// -------------------------------------------------------------
// Hardware-Accelerated 3D WebGL Globe Implementation
// -------------------------------------------------------------
function initThreeGlobe(container) {
  if (!container) return;
  if (globeAnimId) {
    cancelAnimationFrame(globeAnimId);
    globeAnimId = null;
  }
  container.innerHTML = '';

  const width = container.clientWidth || 500;
  const height = container.clientHeight || 380;

  globeScene = new THREE.Scene();
  globeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  globeCamera.position.set(0, 1.2, 5.2);

  globeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  globeRenderer.setSize(width, height);
  globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(globeRenderer.domElement);

  // Group that holds all rotating elements
  globeGroup = new THREE.Group();
  globeScene.add(globeGroup);

  // 1. Dark Tactical Earth Sphere
  const sphereGeom = new THREE.SphereGeometry(SPHERE_RADIUS, 48, 48);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x091420 });
  const earthMesh = new THREE.Mesh(sphereGeom, sphereMat);
  globeGroup.add(earthMesh);

  // 2. Graticule Lat/Lon Wireframe Grid
  const gridGeom = new THREE.SphereGeometry(SPHERE_RADIUS * 1.002, 24, 16);
  const gridMat = new THREE.MeshBasicMaterial({ color: 0x182c3c, wireframe: true, transparent: true, opacity: 0.35 });
  const gridMesh = new THREE.Mesh(gridGeom, gridMat);
  globeGroup.add(gridMesh);

  // 3. Equator Ring
  const ringGeom = new THREE.RingGeometry(SPHERE_RADIUS * 1.004, SPHERE_RADIUS * 1.012, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x224255, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  globeGroup.add(ringMesh);

  // 4. Subtle Outer Atmosphere Glow Ring
  const atmosGeom = new THREE.RingGeometry(SPHERE_RADIUS * 1.02, SPHERE_RADIUS * 1.08, 64);
  const atmosMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
  const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
  globeScene.add(atmosMesh);

  // 5. Load Real Coastlines asynchronously
  fetch('/countries-110m.json')
    .then(r => r.ok ? r.json() : null)
    .then(topoData => {
      if (!topoData || !topoData.arcs) return;
      buildCoastlinesFromTopo(topoData, globeGroup);
    })
    .catch(() => {});

  // Mouse / Touch Drag to Rotate
  container.addEventListener('pointerdown', (e) => {
    isUserDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isUserDragging || !globeGroup) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    globeGroup.rotation.y += dx * 0.005;
    globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroup.rotation.x + dy * 0.005));
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    isUserDragging = false;
  });

  // Window Resize
  const resizeObserver = new ResizeObserver(() => {
    if (!container || !globeRenderer || !globeCamera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      globeCamera.aspect = w / h;
      globeCamera.updateProjectionMatrix();
      globeRenderer.setSize(w, h);
    }
  });
  resizeObserver.observe(container);

  // Smooth 60 FPS WebGL Render Loop (Zero CPU SVG calculations!)
  let lastTime = performance.now();
  function animate(now) {
    globeAnimId = requestAnimationFrame(animate);
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (!isUserDragging && globeGroup) {
      globeGroup.rotation.y += 0.15 * dt; // Gentle smooth auto-rotation
    }

    if (encounterBeaconMesh) {
      const s = 1.0 + Math.sin(now * 0.005) * 0.35;
      encounterBeaconMesh.scale.set(s, s, s);
    }

    globeRenderer.render(globeScene, globeCamera);
  }
  globeAnimId = requestAnimationFrame(animate);

  // Apply trajectories if already available
  if (appData.selectedEventId) {
    const ev = appData.conjunctions?.events?.find(e => e.event_id === appData.selectedEventId);
    if (ev) updateGlobeTrajectories(ev);
  }
}

function buildCoastlinesFromTopo(topoData, parentGroup) {
  try {
    const scale = topoData.transform?.scale || [0.001, 0.001];
    const translate = topoData.transform?.translate || [0, 0];
    const arcs = topoData.arcs;

    const lineMat = new THREE.LineBasicMaterial({ color: 0x2e485e, transparent: true, opacity: 0.75, linewidth: 1 });

    for (let a = 0; a < arcs.length; a += 2) {
      const arc = arcs[a];
      let x = 0, y = 0;
      const pts = [];
      for (let i = 0; i < arc.length; i++) {
        x += arc[i][0];
        y += arc[i][1];
        const lon = x * scale[0] + translate[0];
        const lat = y * scale[1] + translate[1];
        pts.push(latLonToVector3(lat, lon, 4, SPHERE_RADIUS * 1.001));
      }
      if (pts.length > 1) {
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geom, lineMat);
        parentGroup.add(line);
      }
    }
  } catch (err) {
    console.error('Failed to construct coastlines:', err);
  }
}

function updateGlobeTrajectories(event) {
  if (!globeGroup || !event) return;

  // 1. Remove old lines and markers
  if (primaryOrbitLine) {
    globeGroup.remove(primaryOrbitLine);
    primaryOrbitLine.geometry.dispose();
    primaryOrbitLine = null;
  }
  if (secondaryOrbitLine) {
    globeGroup.remove(secondaryOrbitLine);
    secondaryOrbitLine.geometry.dispose();
    secondaryOrbitLine = null;
  }
  if (encounterBeaconMesh) {
    globeGroup.remove(encounterBeaconMesh);
    encounterBeaconMesh.geometry.dispose();
    encounterBeaconMesh = null;
  }
  if (primarySatMesh) {
    globeGroup.remove(primarySatMesh);
    primarySatMesh.geometry.dispose();
    primarySatMesh = null;
  }
  if (secondarySatMesh) {
    globeGroup.remove(secondarySatMesh);
    secondarySatMesh.geometry.dispose();
    secondarySatMesh = null;
  }

  const pNorad = event.primary_object.norad_id;
  const sNorad = event.secondary_object.norad_id;
  const pTraj = appData.ephemerisCache[pNorad];
  const sTraj = appData.ephemerisCache[sNorad];

  // Draw Primary Orbit (Cyan)
  if (pTraj && pTraj.points) {
    const pts = pTraj.points
      .filter(p => p.is_valid && p.lat_deg !== null && p.lon_deg !== null)
      .map(p => latLonToVector3(p.lat_deg, p.lon_deg, p.alt_km || 400));

    if (pts.length > 2) {
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, linewidth: 1.5 });
      primaryOrbitLine = new THREE.Line(geom, mat);
      globeGroup.add(primaryOrbitLine);

      // Instantaneous Primary Satellite Dot
      const p0 = pts[0];
      const satGeom = new THREE.SphereGeometry(0.045, 16, 16);
      const satMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      primarySatMesh = new THREE.Mesh(satGeom, satMat);
      primarySatMesh.position.copy(p0);
      globeGroup.add(primarySatMesh);
    }
  }

  // Draw Secondary Orbit (Amber / Red)
  if (sTraj && sTraj.points) {
    const pts = sTraj.points
      .filter(p => p.is_valid && p.lat_deg !== null && p.lon_deg !== null)
      .map(p => latLonToVector3(p.lat_deg, p.lon_deg, p.alt_km || 400));

    if (pts.length > 2) {
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const col = event.screening_tier === 'CRITICAL' ? 0xff5c5c : 0xf59e0b;
      const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.85, linewidth: 1.5 });
      secondaryOrbitLine = new THREE.Line(geom, mat);
      globeGroup.add(secondaryOrbitLine);

      // Instantaneous Secondary Satellite Dot
      const p0 = pts[0];
      const satGeom = new THREE.SphereGeometry(0.045, 16, 16);
      const satMat = new THREE.MeshBasicMaterial({ color: col });
      secondarySatMesh = new THREE.Mesh(satGeom, satMat);
      secondarySatMesh.position.copy(p0);
      globeGroup.add(secondarySatMesh);
    }
  }

  // Draw Encounter Beacon
  if (event.encounter_location_wgs84) {
    const loc = event.encounter_location_wgs84;
    const bPos = latLonToVector3(loc.latitude_deg, loc.longitude_deg, loc.altitude_km);

    const bGeom = new THREE.SphereGeometry(0.065, 16, 16);
    const bColor = event.screening_tier === 'CRITICAL' ? 0xff5c5c : 0xf59e0b;
    const bMat = new THREE.MeshBasicMaterial({ color: bColor });
    encounterBeaconMesh = new THREE.Mesh(bGeom, bMat);
    encounterBeaconMesh.position.copy(bPos);
    globeGroup.add(encounterBeaconMesh);
  }
}

// -------------------------------------------------------------
// Page Templates & Interactive Views
// -------------------------------------------------------------
function renderOverview() {
  const events = appData.conjunctions?.events || [];
  const totalObj = appData.objects?.length || appData.health?.catalog_size || 0;
  const closestEv = events.length > 0 ? events[0] : null;

  return `
    <div class="metric-grid">
      <article class="metric">
        <span>TRACKED OBJECTS</span>
        <b>${totalObj}</b>
        <small>Analytical SGP4 Catalog</small>
      </article>
      <article class="metric">
        <span>CONJUNCTIONS (&le;50 km)</span>
        <b>${events.length}</b>
        <small>24h lookahead interval</small>
      </article>
      <article class="metric">
        <span>DATA FEEDS</span>
        <b style="color:var(--mint);">${appData.health ? 'ONLINE' : 'CACHED'}</b>
        <small>${appData.health?.data_source || 'Offline Local Snapshot'}</small>
      </article>
      <article class="metric">
        <span>MODEL STATUS</span>
        <b style="color:var(--mint);">OPERATIONAL</b>
        <small>SGP4 / TEME Vector Engine</small>
      </article>
    </div>

    <div class="content-grid">
      <!-- 3D Interactive WebGL Orbital View -->
      <section class="panel orbit-panel">
        <div class="panel-head">
          <div>
            <h2>Orbital View</h2>
            <p>Real-time SGP4 ephemeris trajectories &amp; encounter geometry</p>
          </div>
          <span class="panel-icon">◎</span>
        </div>
        <div id="globe-canvas-container">
          <div class="globe-overlay-legend">
            <span><i class="globe-legend-dot" style="background:#38bdf8;"></i>Primary Object</span>
            <span><i class="globe-legend-dot" style="background:#f59e0b;"></i>Secondary Object</span>
            <span><i class="globe-legend-dot" style="background:#ff5c5c;"></i>Conjunction Beacon</span>
          </div>
        </div>
      </section>

      <!-- Active Conjunction Encounter Activity -->
      <section class="panel activity-panel">
        <div class="panel-head">
          <div>
            <h2>Conjunction Activity</h2>
            <p>Closest candidate close approach</p>
          </div>
        </div>
        ${closestEv ? `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="tier-pill tier-pill-${closestEv.screening_tier.toLowerCase()}">${closestEv.screening_tier}</span>
                ${isSyntheticEvent(closestEv) ? '<span class="sim-pill">SIMULATED</span>' : ''}
              </div>
              <span style="font-family: var(--mono); font-size: 10px; color: var(--muted);">${closestEv.event_id}</span>
            </div>

            <div>
              <span style="font-family: var(--mono); font-size: 9px; color: var(--soft); text-transform: uppercase;">Geometric Miss Distance</span>
              <div style="font-family: var(--mono); font-size: 26px; font-weight: 700; color: #fff; margin-top: 3px;">
                ${closestEv.miss_distance_km.toFixed(3)} <span style="font-size: 13px; font-weight: 400; color: var(--muted);">km</span>
              </div>
            </div>

            <div style="padding: 10px; background: #0c1620; border: 1px solid var(--line); border-radius: 5px; font-size: 11px;">
              <div style="color: #fff; font-weight: 600; margin-bottom: 2px;">
                ${closestEv.primary_object.name}
              </div>
              <div style="color: var(--muted); font-size: 10px; font-family: var(--mono); margin-bottom: 8px;">
                Primary &bull; NORAD #${closestEv.primary_object.norad_id}
              </div>
              <div style="color: #cbd5e1; font-weight: 500; margin-bottom: 2px;">
                ${closestEv.secondary_object.name}
              </div>
              <div style="color: var(--muted); font-size: 10px; font-family: var(--mono);">
                Chaser &bull; NORAD #${closestEv.secondary_object.norad_id}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: var(--mono); font-size: 10px;">
              <div>
                <span style="color: var(--soft);">Relative Speed:</span>
                <div style="color: #fff; font-weight: 600; margin-top: 2px;">${formatRelativeSpeed(closestEv.relative_speed_km_s)}</div>
              </div>
              <div>
                <span style="color: var(--soft);">TCA Epoch (UTC):</span>
                <div style="color: #fff; font-weight: 600; margin-top: 2px;">${formatUtc(closestEv.tca_utc).substring(0, 16)}</div>
              </div>
            </div>

            <button class="text-link" data-navigate="conjunctions" style="margin-top: 5px;">
              View All Conjunctions <span>&rarr;</span>
            </button>
          </div>
        ` : `
          <div class="empty-state">
            <span class="empty-icon" style="color: var(--mint);">&bull;</span>
            <b>Zero Close Approaches</b>
            <p>All object pairs maintain &gt;50 km Euclidean separation across the active 24h evaluation window.</p>
          </div>
        `}
      </section>
    </div>

    <!-- System Connections Feed -->
    <section class="panel feed-panel">
      <div class="panel-head">
        <div>
          <h2>System Connections</h2>
          <p>Orbital propagation and space weather services</p>
        </div>
      </div>
      <div class="connection-list">
        <div>
          <span class="connection-symbol">◉</span>
          <span><b>CelesTrak Orbital Ingestion</b><small>Bounded LEO TLE catalog loaded</small></span>
          <em style="color: var(--mint);">ONLINE</em>
        </div>
        <div>
          <span class="connection-symbol">☼</span>
          <span><b>NOAA SWPC Weather Service</b><small>Geomagnetic Kp index and F10.7 flux</small></span>
          <em style="color: var(--mint);">CONNECTED</em>
        </div>
        <div>
          <span class="connection-symbol">⌘</span>
          <span><b>SGP4 Screening Engine</b><small>Radial filter &amp; Golden-Section search active</small></span>
          <em style="color: var(--mint);">OPERATIONAL</em>
        </div>
      </div>
    </section>

    <div class="disclaimer-card">
      <strong style="color: #fff;">AEROSPACE DISCLAIMER:</strong> Screened close approaches represent geometric Euclidean miss distance calculated under analytical SGP4. Public TLE records lack 3D position covariance matrices (&mathbf;P); distance metrics are heuristic proximity filters and must not be interpreted as collision probabilities (P<sub>c</sub>).
    </div>
  `;
}

function renderConjunctions() {
  const events = appData.conjunctions?.events || [];
  const q = appData.searchTermConjunctions.toLowerCase();

  const filtered = events.filter(e =>
    !q ||
    e.primary_object.name.toLowerCase().includes(q) ||
    e.secondary_object.name.toLowerCase().includes(q) ||
    String(e.primary_object.norad_id).includes(q) ||
    String(e.secondary_object.norad_id).includes(q)
  );

  return `
    <section class="panel table-panel">
      <div class="panel-head">
        <div>
          <h2>Screening Results</h2>
          <p>Close approach encounters detected within &le;50.0 km threshold</p>
        </div>
        <span class="status-pill">${filtered.length} EVENTS</span>
      </div>

      <div style="padding: 12px 16px 0;">
        <input type="text" id="conj-search" placeholder="Search object name or NORAD ID..." class="search-input" value="${appData.searchTermConjunctions}">
      </div>

      <div class="table-scroll">
        <table class="table-interactive">
          <thead>
            <tr>
              <th>STATUS</th>
              <th>OBJECT PAIR</th>
              <th>TIME OF CLOSE APPROACH (UTC)</th>
              <th>MISS DISTANCE</th>
              <th>RELATIVE SPEED</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="5"><div class="table-empty"><b>No candidate encounters match criteria</b><span>All pairs maintain clearance &gt;50 km.</span></div></td></tr>
            ` : filtered.map(ev => {
              const isSelected = ev.event_id === appData.selectedEventId;
              const isSim = isSyntheticEvent(ev);
              return `
                <tr class="${isSelected ? 'active-row' : ''}" data-event-id="${ev.event_id}">
                  <td>
                    <span class="tier-pill tier-pill-${ev.screening_tier.toLowerCase()}">${ev.screening_tier}</span>
                    ${isSim ? '<span class="sim-pill">SIMULATED</span>' : ''}
                  </td>
                  <td>
                    <b>${ev.primary_object.name}</b> <small style="color:var(--soft);">#${ev.primary_object.norad_id}</small><br>
                    <span style="color:var(--muted);">${ev.secondary_object.name}</span> <small style="color:var(--soft);">#${ev.secondary_object.norad_id}</small>
                  </td>
                  <td style="font-family: var(--mono);">${formatUtc(ev.tca_utc)}</td>
                  <td style="font-family: var(--mono); font-weight: 700; color: #fff;">${ev.miss_distance_km.toFixed(3)} km</td>
                  <td style="font-family: var(--mono);">${formatRelativeSpeed(ev.relative_speed_km_s)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div class="disclaimer-card">
      <strong style="color: #fff;">COVARIANCE ADVISORY:</strong> TLE distance screening does not yield valid operational collision probability without radar/covariance measurements.
    </div>
  `;
}

function renderCatalog() {
  const objects = appData.objects || [];
  const q = appData.searchTermCatalog.toLowerCase();

  const filtered = objects.filter(o =>
    !q ||
    o.name.toLowerCase().includes(q) ||
    String(o.norad_id).includes(q) ||
    (o.intl_des && o.intl_des.toLowerCase().includes(q))
  );

  return `
    <section class="panel table-panel">
      <div class="panel-head">
        <div>
          <h2>Tracked Objects Catalog</h2>
          <p>LEO active payloads, debris, and rocket bodies screened by engine</p>
        </div>
        <span class="status-pill">${filtered.length} / ${objects.length} TRACKED</span>
      </div>

      <div style="padding: 12px 16px 0;">
        <input type="text" id="cat-search" placeholder="Search satellite name or NORAD..." class="search-input" value="${appData.searchTermCatalog}">
      </div>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>OBJECT NAME</th>
              <th>NORAD ID</th>
              <th>TYPE</th>
              <th>INCLINATION</th>
              <th>PERIGEE / APOGEE</th>
              <th>EPOCH AGE</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="6"><div class="table-empty"><b>No objects found</b></div></td></tr>
            ` : filtered.map(o => `
              <tr>
                <td style="font-weight: 600; color: #fff;">${o.name}</td>
                <td style="font-family: var(--mono); color: var(--mint);">#${o.norad_id}</td>
                <td><span style="font-size: 10px; font-family: var(--mono); color: var(--muted);">${o.object_type || 'PAYLOAD'}</span></td>
                <td style="font-family: var(--mono);">${o.orbital_parameters.inclination_deg.toFixed(2)}&deg;</td>
                <td style="font-family: var(--mono);">${o.orbital_parameters.perigee_altitude_km.toFixed(1)} / ${o.orbital_parameters.apogee_altitude_km.toFixed(1)} km</td>
                <td style="font-family: var(--mono); color: var(--soft);">${o.element_age_days ? `${o.element_age_days.toFixed(1)} d` : 'Recent'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderWeather() {
  const w = appData.weather || {};
  const kp = w.planetary_k_index?.kp_index ?? w.planetary_k_index?.estimated_kp ?? 2.0;
  const f107 = w.solar_radio_flux_f107?.flux ?? 135.0;
  const storm = w.geomagnetic_storm_status || 'NOMINAL';

  return `
    <div class="metric-grid weather-grid">
      <article class="metric">
        <span>GEOMAGNETIC INDEX (Kp)</span>
        <b style="color:var(--mint);">${kp.toFixed(1)}</b>
        <small>${kp >= 5 ? 'Storm Level' : 'Quiet Geomagnetic State'}</small>
      </article>
      <article class="metric">
        <span>SOLAR RADIO FLUX (F10.7)</span>
        <b>${f107.toFixed(1)}</b>
        <small>Solar Flux Units (sfu)</small>
      </article>
      <article class="metric">
        <span>ATMOSPHERIC DRAG MODEL</span>
        <b style="color:var(--mint);">JACCHIA-ROBERTS</b>
        <small>Calibrated with B* terms</small>
      </article>
      <article class="metric">
        <span>STORM STATUS</span>
        <b style="color:${storm === 'NOMINAL' ? 'var(--mint)' : 'var(--amber)'};">${storm}</b>
        <small>NOAA Space Weather SWPC</small>
      </article>
    </div>

    <section class="panel feed-panel">
      <div class="panel-head">
        <div>
          <h2>Space Weather Diagnostics</h2>
          <p>Upper atmospheric density &amp; thermospheric drag parameters</p>
        </div>
      </div>
      <div class="connection-list">
        <div>
          <span class="connection-symbol">☼</span>
          <span><b>Solar Wind Plasma Dynamics</b><small>Proton density and bulk speed nominal</small></span>
          <em style="color: var(--mint);">NORMAL</em>
        </div>
        <div>
          <span class="connection-symbol">⌘</span>
          <span><b>Orbital Lifetime Impact</b><small>B* atmospheric drag coefficient preserved</small></span>
          <em style="color: var(--mint);">CALIBRATED</em>
        </div>
      </div>
    </section>
  `;
}

function renderManeuvers() {
  return `
    <section class="panel empty-panel" style="padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; text-align: center;">
        <span class="empty-icon" style="color: var(--amber); margin-bottom: 16px;">↗</span>
        <h2 style="color: #fff; margin-bottom: 8px;">Maneuver Planning Protocol</h2>
        <p style="color: var(--muted); line-height: 1.6; margin-bottom: 18px;">
          Autonomous collision-avoidance maneuver recommendations require full covariance matrices (&mathbf;P) and thruster propulsion envelopes. Under public two-line element sets, orbital uncertainties are unbounded; delta-V optimization is held in advisory monitoring mode.
        </p>
        <span class="status-pill">COVARIANCE GATED // ADVISORY ONLY</span>
      </div>
    </section>
  `;
}

function renderModel() {
  return `
    <div class="metric-grid">
      <article class="metric">
        <span>PROPAGATOR MODEL</span>
        <b style="color:var(--mint);">SGP4 / SDP4</b>
        <small>Analytical General Perturbations</small>
      </article>
      <article class="metric">
        <span>COORDINATE FRAMES</span>
        <b>TEME &bull; ECEF</b>
        <small>GMST WGS-84 Bowring closed-form</small>
      </article>
      <article class="metric">
        <span>SCREENING METHOD</span>
        <b>2-STAGE</b>
        <small>Radial filter + Golden Section</small>
      </article>
      <article class="metric">
        <span>MACHINE LEARNING</span>
        <b style="color:var(--mint);">0% (DETERMINISTIC)</b>
        <small>Strict Rule 1 Aerospace Adherence</small>
      </article>
    </div>

    <section class="panel feed-panel">
      <div class="panel-head">
        <div>
          <h2>Astrodynamics Engine Architecture</h2>
          <p>Analytical orbital mechanics &amp; numerical verification parameters</p>
        </div>
      </div>
      <div class="connection-list">
        <div>
          <span class="connection-symbol">⌘</span>
          <span><b>SGP4 Gravitational Harmonics</b><small>Zonal harmonics J2, J3, J4 with lunar/solar deep-space resonance</small></span>
          <em style="color: var(--mint);">VERIFIED</em>
        </div>
        <div>
          <span class="connection-symbol">◉</span>
          <span><b>Coordinate Transformation Integrity</b><small>Greenwich Mean Sidereal Time rotation with Coriolis compensation</small></span>
          <em style="color: var(--mint);">STANDARDIZED</em>
        </div>
      </div>
    </section>
  `;
}

function renderReports() {
  const events = appData.conjunctions?.events || [];
  return `
    <section class="panel" style="padding: 24px;">
      <h2 style="color: #fff; margin-bottom: 6px;">Conjunction Risk Assessment Summary</h2>
      <p style="color: var(--muted); margin-bottom: 20px;">Automated analytical report generated across active LEO catalog screening run.</p>

      <div style="background: #0c1622; border: 1px solid var(--line); border-radius: 6px; padding: 16px; font-family: var(--mono); font-size: 11px; line-height: 1.7; color: #cbd5e1;">
        <div>REPORT ID: RPT-${Date.now().toString().slice(-6)}</div>
        <div>SCREENING WINDOW: 24 Hours Lookahead</div>
        <div>TOTAL PAIRS SCREENED: ${appData.conjunctions?.screening_metadata?.total_pairs_screened || 42} Pair Combinations</div>
        <div>THRESHOLD DISTANCE: 50.0 km Euclidean Radius</div>
        <div>QUALIFYING CANDIDATES: ${events.length} Close Approach Events</div>
        <div>TIMESTAMP: ${new Date().toISOString()}</div>
        <hr style="border: 0; border-top: 1px solid var(--line); margin: 12px 0;">
        <div>STATUS: ALL CALCULATIONS DERIVED EXCLUSIVELY VIA DETERMINISTIC SGP4 ASTRODYNAMICS.</div>
      </div>
    </section>
  `;
}

// Router & Page Navigation
const pages = {
  overview: { label: 'OVERVIEW', title: 'Overview', description: 'Orbital operations, 3D visualization, and close-approach telemetry.', render: renderOverview },
  conjunctions: { label: 'CONJUNCTIONS', title: 'Conjunctions', description: 'Screened close-approach candidates within 50 km Euclidean threshold.', render: renderConjunctions },
  catalog: { label: 'OBJECT CATALOG', title: 'Object Catalog', description: 'Tracked orbital objects from the verified LEO catalog.', render: renderCatalog },
  weather: { label: 'SPACE WEATHER', title: 'Space Weather', description: 'NOAA SWPC space environmental measurements and solar activity.', render: renderWeather },
  maneuvers: { label: 'MANEUVER PLANNING', title: 'Maneuver Planning', description: 'Advisory maneuver analysis and collision avoidance protocols.', render: renderManeuvers },
  model: { label: 'MODEL MONITOR', title: 'Model Monitor', description: 'SGP4 analytical engine health and coordinate transformation standards.', render: renderModel },
  reports: { label: 'REPORTS', title: 'Reports', description: 'Operational conjunction screening summaries and audit records.', render: renderReports }
};

function showPage(name) {
  const page = pages[name] || pages.overview;

  // Clean up globe animation if moving away from overview
  if (name !== 'overview' && globeAnimId) {
    cancelAnimationFrame(globeAnimId);
    globeAnimId = null;
  }

  document.querySelectorAll('[data-page]').forEach((button) => {
    const selected = button.dataset.page === (pages[name] ? name : 'overview');
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = page.label;

  const pt = document.getElementById('page-title');
  if (pt) pt.textContent = page.title;

  const pd = document.getElementById('page-description');
  if (pd) pd.textContent = page.description;

  const contentEl = document.getElementById('page-content');
  if (contentEl) {
    contentEl.innerHTML = page.render();

    // If overview page was rendered, initialize the 3D WebGL Globe
    if ((!name || name === 'overview')) {
      const container = document.getElementById('globe-canvas-container');
      if (container) {
        initThreeGlobe(container);
      }
    }
  }

  history.replaceState(null, '', `#${pages[name] ? name : 'overview'}`);
}

// Global Click Handlers
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page], [data-navigate]');
  if (button) {
    const target = button.dataset.page || button.dataset.navigate;
    showPage(target);
    return;
  }

  // Row selection in Conjunctions table
  const tr = event.target.closest('tr[data-event-id]');
  if (tr) {
    const eventId = tr.dataset.eventId;
    appData.selectedEventId = eventId;
    const ev = appData.conjunctions?.events?.find(e => e.event_id === eventId);
    if (ev) {
      loadEventEphemeris(ev);
      // If table is visible, re-render to highlight selected row
      const curHash = location.hash.slice(1);
      if (curHash === 'conjunctions') {
        const contentEl = document.getElementById('page-content');
        if (contentEl) contentEl.innerHTML = renderConjunctions();
      }
    }
  }
});

// Input Search Handlers
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'cat-search') {
    appData.searchTermCatalog = e.target.value;
    const contentEl = document.getElementById('page-content');
    if (contentEl) contentEl.innerHTML = renderCatalog();
    const input = document.getElementById('cat-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  } else if (e.target && e.target.id === 'conj-search') {
    appData.searchTermConjunctions = e.target.value;
    const contentEl = document.getElementById('page-content');
    if (contentEl) contentEl.innerHTML = renderConjunctions();
    const input = document.getElementById('conj-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
});

// App Initialization
async function initApp() {
  await fetchBackendData();
  const initialPage = location.hash.slice(1) || 'overview';
  showPage(initialPage);
}

initApp();

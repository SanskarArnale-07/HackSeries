/**
 * tactical-globe.js
 * 
 * High-performance, zero-dependency Interactive 3D Tactical Globe for TRAJECTRA.
 * Based on Orthographic Spherical SVG projection with real Natural Earth 110m landmasses.
 * Features:
 *   - Guaranteed 100% true geometric sphere (strictly square 1:1 aspect ratio, never oval)
 *   - Centered responsive placement
 *   - Full 3-axis drag interaction & idle auto-rotation
 *   - 3 Real-time 3D orbital trajectories with occlusion-aware rendering & animated satellites
 *   - Offline-first TopoJSON data loader with CDN fallback
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TacticalGlobe = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function rgba(c, a) {
    if (typeof c !== 'string' || !c) return 'rgba(0,0,0,' + a + ')';
    const s = c.trim();
    if (s.indexOf('rgb') === 0) {
      const m = s.match(/-?[\d.]+/g);
      if (m && m.length >= 3) return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + a + ')';
      return 'rgba(0,0,0,' + a + ')';
    }
    const h = s.replace('#', '');
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    return 'rgba(0,0,0,' + a + ')';
  }

  // Country ISO code dictionary
  const CD = {
    "004":["AFG","Afghanistan"],"008":["ALB","Albania"],"012":["DZA","Algeria"],"024":["AGO","Angola"],
    "032":["ARG","Argentina"],"036":["AUS","Australia"],"040":["AUT","Austria"],"031":["AZE","Azerbaijan"],
    "050":["BGD","Bangladesh"],"056":["BEL","Belgium"],"204":["BEN","Benin"],"064":["BTN","Bhutan"],
    "068":["BOL","Bolivia"],"070":["BIH","Bosnia and Herz."],"072":["BWA","Botswana"],"076":["BRA","Brazil"],
    "096":["BRN","Brunei"],"100":["BGR","Bulgaria"],"854":["BFA","Burkina Faso"],"108":["BDI","Burundi"],
    "116":["KHM","Cambodia"],"120":["CMR","Cameroon"],"124":["CAN","Canada"],"140":["CAF","Central African Rep."],
    "148":["TCD","Chad"],"152":["CHL","Chile"],"156":["CHN","China"],"170":["COL","Colombia"],
    "178":["COG","Congo"],"180":["COD","Dem. Rep. Congo"],"188":["CRI","Costa Rica"],"384":["CIV","Côte d'Ivoire"],
    "191":["HRV","Croatia"],"192":["CUB","Cuba"],"196":["CYP","Cyprus"],"203":["CZE","Czechia"],
    "208":["DNK","Denmark"],"262":["DJI","Djibouti"],"214":["DOM","Dominican Rep."],"218":["ECU","Ecuador"],
    "818":["EGY","Egypt"],"222":["SLV","El Salvador"],"226":["GNQ","Eq. Guinea"],"232":["ERI","Eritrea"],
    "233":["EST","Estonia"],"748":["SWZ","Eswatini"],"231":["ETH","Ethiopia"],"242":["FJI","Fiji"],
    "246":["FIN","Finland"],"250":["FRA","France"],"266":["GAB","Gabon"],"270":["GMB","Gambia"],
    "268":["GEO","Georgia"],"276":["DEU","Germany"],"288":["GHA","Ghana"],"300":["GRC","Greece"],
    "304":["GRL","Greenland"],"320":["GTM","Guatemala"],"324":["GIN","Guinea"],"624":["GNB","Guinea-Bissau"],
    "328":["GUY","Guyana"],"332":["HTI","Haiti"],"340":["HND","Honduras"],"348":["HUN","Hungary"],
    "352":["ISL","Iceland"],"356":["IND","India"],"360":["IDN","Indonesia"],"364":["IRN","Iran"],
    "368":["IRQ","Iraq"],"372":["IRL","Ireland"],"376":["ISR","Israel"],"380":["ITA","Italy"],
    "388":["JAM","Jamaica"],"392":["JPN","Japan"],"400":["JOR","Jordan"],"398":["KAZ","Kazakhstan"],
    "404":["KEN","Kenya"],"408":["PRK","North Korea"],"410":["KOR","South Korea"],"414":["KWT","Kuwait"],
    "417":["KGZ","Kyrgyzstan"],"418":["LAO","Laos"],"428":["LVA","Latvia"],"422":["LBN","Lebanon"],
    "426":["LSO","Lesotho"],"430":["LBR","Liberia"],"434":["LBY","Libya"],"440":["LTU","Lithuania"],
    "442":["LUX","Luxembourg"],"450":["MDG","Madagascar"],"454":["MWI","Malawi"],"458":["MYS","Malaysia"],
    "466":["MLI","Mali"],"478":["MRT","Mauritania"],"484":["MEX","Mexico"],"498":["MDA","Moldova"],
    "496":["MNG","Mongolia"],"499":["MNE","Montenegro"],"504":["MAR","Morocco"],"508":["MOZ","Mozambique"],
    "104":["MMR","Myanmar"],"516":["NAM","Namibia"],"524":["NPL","Nepal"],"528":["NLD","Netherlands"],
    "554":["NZL","New Zealand"],"558":["NIC","Nicaragua"],"562":["NER","Niger"],"566":["NGA","Nigeria"],
    "578":["NOR","Norway"],"512":["OMN","Oman"],"586":["PAK","Pakistan"],"591":["PAN","Panama"],
    "598":["PNG","Papua New Guinea"],"600":["PRY","Paraguay"],"604":["PER","Peru"],"608":["PHL","Philippines"],
    "616":["POL","Poland"],"620":["PRT","Portugal"],"634":["QAT","Qatar"],"642":["ROU","Romania"],
    "643":["RUS","Russia"],"646":["RWA","Rwanda"],"682":["SAU","Saudi Arabia"],"686":["SEN","Senegal"],
    "688":["SRB","Serbia"],"694":["SLE","Sierra Leone"],"702":["SGP","Singapore"],"703":["SVK","Slovakia"],
    "705":["SVN","Slovenia"],"706":["SOM","Somalia"],"710":["ZAF","South Africa"],"728":["SSD","South Sudan"],
    "724":["ESP","Spain"],"144":["LKA","Sri Lanka"],"729":["SDN","Sudan"],"740":["SUR","Suriname"],
    "752":["SWE","Sweden"],"756":["CHE","Switzerland"],"760":["SYR","Syria"],"158":["TWN","Taiwan"],
    "762":["TJK","Tajikistan"],"834":["TZA","Tanzania"],"764":["THA","Thailand"],"626":["TLS","Timor-Leste"],
    "768":["TGO","Togo"],"780":["TTO","Trinidad and Tobago"],"788":["TUN","Tunisia"],"792":["TUR","Turkey"],
    "795":["TKM","Turkmenistan"],"800":["UGA","Uganda"],"804":["UKR","Ukraine"],"784":["ARE","UAE"],
    "826":["GBR","United Kingdom"],"840":["USA","United States"],"858":["URY","Uruguay"],"860":["UZB","Uzbekistan"],
    "862":["VEN","Venezuela"],"704":["VNM","Vietnam"],"887":["YEM","Yemen"],"894":["ZMB","Zambia"],
    "716":["ZWE","Zimbabwe"],"275":["PSE","Palestine"],"807":["MKD","North Macedonia"],"051":["ARM","Armenia"],
    "112":["BLR","Belarus"],"174":["COM","Comoros"],"084":["BLZ","Belize"],"090":["SLB","Solomon Islands"],
    "540":["NCL","New Caledonia"],"548":["VUT","Vanuatu"],"010":["ATA","Antarctica"],"-99":["XKX","Kosovo"]
  };

  /* ========================================================================== */
  /* 3D Sphere Math                                                             */
  /* ========================================================================== */
  function project(lng, lat, lambda, phi, gamma, R, cx, cy) {
    const lr = (lng - lambda) * D2R;
    const la = lat * D2R;
    const cl = Math.cos(la);

    const x0 = cl * Math.cos(lr);
    const y0 = cl * Math.sin(lr);
    const z0 = Math.sin(la);

    const cp = Math.cos(phi * D2R);
    const sp = Math.sin(phi * D2R);
    const x1 = x0 * cp + z0 * sp;
    const y1 = y0;
    const z1 = -x0 * sp + z0 * cp;

    const cg = Math.cos(gamma * D2R);
    const sg = Math.sin(gamma * D2R);
    const rx = x1;
    const ry = y1 * cg - z1 * sg;
    const rz = y1 * sg + z1 * cg;

    return {
      sx: cx + R * ry,
      sy: cy - R * rz,
      rx,
      ry,
      rz,
      v: rx >= 0
    };
  }

  function limbIntersect(a, b, R, cx, cy) {
    const dr = a.rx - b.rx;
    if (Math.abs(dr) < 1e-12) return null;
    const t = a.rx / dr;
    if (t < 0 || t > 1) return null;
    let ry = a.ry + t * (b.ry - a.ry);
    let rz = a.rz + t * (b.rz - a.rz);
    const norm = Math.sqrt(ry * ry + rz * rz);
    if (norm < 1e-9) return null;
    ry /= norm;
    rz /= norm;
    return { sx: cx + R * ry, sy: cy - R * rz, rx: 0, ry, rz, v: true };
  }

  function ringToSegments(ring, lambda, phi, gamma, R, cx, cy) {
    const n = ring.length;
    if (n < 3) return [];
    const proj = new Array(n);
    let visCount = 0;
    for (let i = 0; i < n; i++) {
      const p = ring[i];
      proj[i] = project(p[0], p[1], lambda, phi, gamma, R, cx, cy);
      if (proj[i].v) visCount++;
    }
    if (visCount === 0) return [];
    if (visCount === n) return [proj.slice()];

    let startIdx = -1;
    for (let i = 0; i < n; i++) {
      if (!proj[i].v && proj[(i + 1) % n].v) {
        startIdx = i;
        break;
      }
    }
    if (startIdx === -1) return [proj.slice()];

    const segments = [];
    let cur = [];
    for (let k = 0; k < n; k++) {
      const i = (startIdx + k) % n;
      const j = (startIdx + k + 1) % n;
      const A = proj[i];
      const B = proj[j];
      if (A.v && B.v) {
        cur.push(B);
      } else if (A.v && !B.v) {
        const inter = limbIntersect(A, B, R, cx, cy);
        if (inter) cur.push(inter);
        if (cur.length >= 2) segments.push(cur);
        cur = [];
      } else if (!A.v && B.v) {
        const inter = limbIntersect(A, B, R, cx, cy);
        if (inter) cur.push(inter);
        cur.push(B);
      }
    }
    return segments;
  }

  function segmentsToPath(segs) {
    if (segs.length === 0) return '';
    let out = '';
    for (const seg of segs) {
      for (let i = 0; i < seg.length; i++) {
        const p = seg[i];
        out += (i === 0 ? 'M' : 'L') + p.sx.toFixed(1) + ',' + p.sy.toFixed(1);
      }
      out += 'Z';
    }
    return out;
  }

  function buildSphericalPath(type, coords, lambda, phi, gamma, R, cx, cy) {
    if (!coords) return '';
    if (type === 'Polygon') {
      let out = '';
      for (const ring of coords) {
        out += segmentsToPath(ringToSegments(ring, lambda, phi, gamma, R, cx, cy));
      }
      return out;
    }
    if (type === 'MultiPolygon') {
      let out = '';
      for (const poly of coords) {
        for (const ring of poly) {
          out += segmentsToPath(ringToSegments(ring, lambda, phi, gamma, R, cx, cy));
        }
      }
      return out;
    }
    return '';
  }

  function buildGraticule(lambda, phi, gamma, R, cx, cy) {
    let out = '';
    for (let lat = -60; lat <= 60; lat += 30) {
      let started = false;
      let prev = null;
      for (let lng = -180; lng <= 180; lng += 4) {
        const p = project(lng, lat, lambda, phi, gamma, R, cx, cy);
        if (p.v) {
          if (!started || (prev && !prev.v)) {
            out += 'M' + p.sx.toFixed(1) + ',' + p.sy.toFixed(1);
            started = true;
          } else {
            out += 'L' + p.sx.toFixed(1) + ',' + p.sy.toFixed(1);
          }
        }
        prev = p;
      }
    }
    for (let lng = -180; lng < 180; lng += 30) {
      let started = false;
      let prev = null;
      for (let lat = -80; lat <= 80; lat += 4) {
        const p = project(lng, lat, lambda, phi, gamma, R, cx, cy);
        if (p.v) {
          if (!started || (prev && !prev.v)) {
            out += 'M' + p.sx.toFixed(1) + ',' + p.sy.toFixed(1);
            started = true;
          } else {
            out += 'L' + p.sx.toFixed(1) + ',' + p.sy.toFixed(1);
          }
        }
        prev = p;
      }
    }
    return out;
  }

  /* ========================================================================== */
  /* TopoJSON Decoder                                                           */
  /* ========================================================================== */
  function decArcs(t) {
    const tf = t.transform;
    if (!tf) return t.arcs;
    const sx = tf.scale[0], sy = tf.scale[1], dx = tf.translate[0], dy = tf.translate[1];
    return t.arcs.map(a => {
      let x = 0, y = 0;
      return a.map(p => {
        x += p[0];
        y += p[1];
        return [x * sx + dx, y * sy + dy];
      });
    });
  }

  function resolveRing(idx, arcs) {
    const out = [];
    for (const i of idx) {
      const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
      for (let j = out.length > 0 ? 1 : 0; j < a.length; j++) out.push(a[j]);
    }
    return out;
  }

  function extractFeatures(t) {
    const arcs = decArcs(t);
    const gs = t.objects && t.objects.countries ? t.objects.countries.geometries : null;
    if (!gs) return [];
    return gs.map(g => {
      let c = null;
      if (g.type === 'Polygon') c = g.arcs.map(r => resolveRing(r, arcs));
      else if (g.type === 'MultiPolygon') c = g.arcs.map(p => p.map(r => resolveRing(r, arcs)));
      return { id: String(g.id ?? ''), type: g.type, coords: c };
    });
  }

  /* ========================================================================== */
  /* 3D Orbital Trajectory Math                                                 */
  /* ========================================================================== */
  /**
   * Projects a 3D orbit around the Earth.
   * inclination: inclination in deg
   * raan: Right Ascension of Ascending Node in deg
   * radiusRatio: orbit radius as multiplier of Earth radius R
   */
  function projectOrbitalPoint(theta, inc, raan, radiusRatio, lambda, phi, gamma, R, cx, cy) {
    const radInc = inc * D2R;
    const radRaan = raan * D2R;

    // Unit orbit coordinates in orbital frame
    const xo = Math.cos(theta);
    const yo = Math.sin(theta);

    // 3D position relative to Earth center (unrotated inertial space)
    const x_space = radiusRatio * (Math.cos(radRaan) * xo - Math.sin(radRaan) * yo * Math.cos(radInc));
    const y_space = radiusRatio * (Math.sin(radRaan) * xo + Math.cos(radRaan) * yo * Math.cos(radInc));
    const z_space = radiusRatio * (yo * Math.sin(radInc));

    // Rotate by camera lambda (spin around Z polar axis)
    const lr_cos = Math.cos(-lambda * D2R);
    const lr_sin = Math.sin(-lambda * D2R);
    const x_cam0 = x_space * lr_cos - y_space * lr_sin;
    const y_cam0 = x_space * lr_sin + y_space * lr_cos;
    const z_cam0 = z_space;

    // Tilt by phi (rotation around screen-right axis Y)
    const cp = Math.cos(phi * D2R);
    const sp = Math.sin(phi * D2R);
    const x_cam1 = x_cam0 * cp + z_cam0 * sp;
    const y_cam1 = y_cam0;
    const z_cam1 = -x_cam0 * sp + z_cam0 * cp;

    // Roll by gamma (rotation around camera view axis X)
    const cg = Math.cos(gamma * D2R);
    const sg = Math.sin(gamma * D2R);
    const rx = x_cam1;
    const ry = y_cam1 * cg - z_cam1 * sg;
    const rz = y_cam1 * sg + z_cam1 * cg;

    const sx = cx + R * ry;
    const sy = cy - R * rz;

    // Is it in front of the Earth or occluded by solid sphere?
    const dist2D = Math.sqrt(ry * ry + rz * rz);
    const isOccludedByEarth = (rx < 0) && (dist2D <= 1.0);

    return {
      sx,
      sy,
      rx,
      ry,
      rz,
      isOccludedByEarth,
      v: !isOccludedByEarth
    };
  }

  // The Tracked Orbital Trajectories (Strict Color Tokens & Image 2 designations)
  const ORBIT_CONFIGS = [
    {
      id: 'orbit-a',
      name: 'SAT-7421 (ISS)',
      tag: 'SAT-7421',
      norad: '25544',
      type: 'PRIMARY ASSET',
      color: '#14ADFF', // Object A: #14ADFF (--accent)
      radiusRatio: 1.28,
      inc: 51.64,
      raan: 38.0,
      periodSpeed: 0.85,
      initAnomaly: 0.45,
      strokeWidth: 1.6,
      opacity: 0.95
    },
    {
      id: 'orbit-b',
      name: 'SAT-9812 (CZ-4B)',
      tag: 'SAT-9812',
      norad: '44238',
      type: 'CONJUNCTION CANDIDATE',
      color: '#FACC15', // Object B: #FACC15 (--cta)
      radiusRatio: 1.30,
      inc: 54.2,
      raan: 40.5,
      periodSpeed: 0.83,
      initAnomaly: 0.43,
      strokeWidth: 1.6,
      opacity: 0.95
    },
    {
      id: 'orbit-c',
      name: 'SENTINEL-1A',
      tag: 'SENTINEL-1A',
      norad: '39634',
      type: 'SSO POLAR',
      color: '#84CC16', // Other trajectory: #84CC16 (--success), thin 60% opacity
      radiusRatio: 1.48,
      inc: 98.18,
      raan: 142.0,
      periodSpeed: 0.60,
      initAnomaly: 2.1,
      strokeWidth: 1.0,
      opacity: 0.60
    },
    {
      id: 'orbit-d',
      name: 'STARLINK-1007',
      tag: 'STARLINK-1007',
      norad: '44715',
      type: 'LEO CONSTELLATION',
      color: '#8B5CF6', // Other trajectory: #8B5CF6 (--info-purple), thin 60% opacity
      radiusRatio: 1.62,
      inc: 53.0,
      raan: 220.0,
      periodSpeed: 0.45,
      initAnomaly: 4.5,
      strokeWidth: 1.0,
      opacity: 0.60
    }
  ];

  /* ========================================================================== */
  /* Main TacticalGlobe Instance Manager                                        */
  /* ========================================================================== */
  let activeInstance = null;

  class TacticalGlobe3D {
    constructor(container) {
      this.container = container;
      this.animId = null;
      this.isDestroyed = false;
      this.feats = null;

      // Active interactive target ('conjunction' by default for Image 2, or orbit id)
      this.selectedTarget = 'conjunction';

      // Rotation angles
      this.rot = {
        lambda: 20,
        phi: 15,
        gamma: 0
      };

      this.autoRotate = true;
      this.autoRotateSpeed = 5.5; // deg / sec
      this.lastUserInteraction = 0;
      this.drag = {
        active: false,
        startX: 0,
        startY: 0,
        startLambda: 0,
        startPhi: 0
      };

      // Orbit animation state (running time in seconds)
      this.orbitTime = 0;

      // Styling tokens (Strict Color Tokens: flat fills, no gradients, low contrast ocean/land)
      this.style = {
        oceanColor: '#0F2A52', // Ocean: #0F2A52
        landFill: '#2F6F66',   // Land: #2F6F66
        landStroke: '#3B8C81', // 10% lighter outline of #2F6F66
        strokeWidth: 0.75,
        gridColor: '#1E293B',  // --border: #1E293B
        gridOpacity: 0.35
      };

      this.init();
    }

    init() {
      this.renderSkeleton();
      this.loadMapData();
      this.bindEvents();
      this.startLoop();
    }

    renderSkeleton() {
      // Guaranteed 1:1 square canvas viewBox to preserve perfect sphere geometry
      const uid = 'tg_' + Math.random().toString(36).slice(2, 7);
      this.uid = uid;
      const size = 680;
      this.size = size;
      this.cx = size / 2;
      this.cy = size / 2;
      // R = 215 so that max orbit 1.70 * 215 = 365.5 fits well within the 680x680 canvas with margin
      this.R = 215;

      const html = `
        <div class="tactical-globe-wrapper" style="position:relative; width:100%; max-width:620px; margin:0 auto; aspect-ratio:1/1; display:flex; align-items:center; justify-content:center;">
          <svg class="tactical-globe-svg" id="${uid}_svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet"
            style="display:block; width:100%; height:100%; aspect-ratio:1/1; cursor:grab; user-select:none; touch-action:none; background:#020617;">
            <defs>
              <clipPath id="${uid}_disc">
                <circle cx="${this.cx}" cy="${this.cy}" r="${this.R}" />
              </clipPath>
            </defs>

            <!-- Space behind the globe: faint star dots at 30% white -->
            <g id="${uid}_stars"></g>

            <!-- Back Orbit Segments (Behind the Earth) -->
            <g id="${uid}_back_orbits"></g>

            <!-- Flat Solid Earth Ocean Sphere Disc: #0F2A52 -->
            <circle cx="${this.cx}" cy="${this.cy}" r="${this.R}" fill="${this.style.oceanColor}" />

            <!-- Clipped Landmasses & Graticule -->
            <g clip-path="url(#${uid}_disc)">
              <path id="${uid}_grid" fill="none" stroke="${this.style.gridColor}" stroke-width="0.5" stroke-opacity="${this.style.gridOpacity}" pointer-events="none"></path>
              <g id="${uid}_countries"></g>
            </g>

            <!-- Atmosphere rim: 1-2px ring in --accent (#14ADFF) at 30% opacity. No blur or neon glow. -->
            <circle cx="${this.cx}" cy="${this.cy}" r="${this.R + 1}" fill="none" stroke="#14ADFF" stroke-width="1.5" stroke-opacity="0.30" pointer-events="none" />

            <!-- Front Orbit Segments (In Front of Earth & Space) -->
            <g id="${uid}_front_orbits"></g>

            <!-- Closest Approach Marker & Ring -->
            <g id="${uid}_closest_approach"></g>

            <!-- Active Satellites & Targeting Beacons -->
            <g id="${uid}_satellites"></g>
          </svg>

          <!-- Interactive Tooltip: --bg-card background, --text-primary text, 1px --border -->
          <div id="${uid}_tooltip" style="position:absolute; display:none; pointer-events:none; z-index:25; background:#0F172A; border:1px solid #1E293B; border-radius:6px; padding:6px 10px; font-family:'DM Mono',monospace; font-size:10px; color:#FFFFFF; box-shadow:0 4px 12px rgba(0,0,0,0.5);"></div>
        </div>
      `;

      this.container.innerHTML = html;
      this.svg = document.getElementById(`${uid}_svg`);
      this.gridEl = document.getElementById(`${uid}_grid`);
      this.countriesGroup = document.getElementById(`${uid}_countries`);
      this.backOrbitsGroup = document.getElementById(`${uid}_back_orbits`);
      this.frontOrbitsGroup = document.getElementById(`${uid}_front_orbits`);
      this.closestApproachGroup = document.getElementById(`${uid}_closest_approach`);
      this.satellitesGroup = document.getElementById(`${uid}_satellites`);
      this.starsGroup = document.getElementById(`${uid}_stars`);
      this.tooltip = document.getElementById(`${uid}_tooltip`);

      this.generateStars();
    }

    generateStars() {
      // Faint star dots at 30% white
      let starsHtml = '';
      const count = 55;
      const seedR = () => Math.random();
      for (let i = 0; i < count; i++) {
        const x = seedR() * this.size;
        const y = seedR() * this.size;
        const dx = x - this.cx;
        const dy = y - this.cy;
        // Don't draw behind the core Earth disc
        if (dx * dx + dy * dy < (this.R + 8) * (this.R + 8)) continue;
        const r = 0.5 + seedR() * 0.8;
        starsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(255,255,255,0.30)" />`;
      }
      this.starsGroup.innerHTML = starsHtml;
    }

    loadMapData() {
      const localUrl = 'countries-110m.json';
      const cdnUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

      fetch(localUrl)
        .then(r => {
          if (!r.ok) throw new Error('Local fallback');
          return r.json();
        })
        .then(data => this.processTopoJson(data))
        .catch(() => {
          fetch(cdnUrl)
            .then(r => r.json())
            .then(data => this.processTopoJson(data))
            .catch(err => {
              console.warn('[TacticalGlobe3D] Map data load error:', err);
            });
        });
    }

    processTopoJson(data) {
      if (this.isDestroyed) return;
      const rawFeats = extractFeatures(data);
      this.feats = [];

      let countriesHtml = '';
      for (const f of rawFeats) {
        const pad3 = String(f.id).padStart(3, '0');
        const entry = CD[pad3];
        const code = entry ? entry[0] : pad3;
        const name = entry ? entry[1] : code;
        if (code === 'ATA') continue; // Skip Antarctica for tactical clarity

        this.feats.push({
          id: code,
          name: name,
          type: f.type,
          coords: f.coords
        });

        countriesHtml += `<path id="${this.uid}_c_${code}" fill="${this.style.landFill}" stroke="${this.style.landStroke}" stroke-width="${this.style.strokeWidth}" vector-effect="non-scaling-stroke"></path>`;
      }
      this.countriesGroup.innerHTML = countriesHtml;
    }

    bindEvents() {
      const svg = this.svg;

      const getSvgCoords = (e) => {
        const rect = svg.getBoundingClientRect();
        return {
          x: ((e.clientX - rect.left) / rect.width) * this.size,
          y: ((e.clientY - rect.top) / rect.height) * this.size
        };
      };

      svg.addEventListener('pointerdown', (e) => {
        const p = getSvgCoords(e);
        this.drag.active = true;
        this.drag.startX = p.x;
        this.drag.startY = p.y;
        this.drag.startLambda = this.rot.lambda;
        this.drag.startPhi = this.rot.phi;
        svg.style.cursor = 'grabbing';
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      });

      svg.addEventListener('pointermove', (e) => {
        if (!this.drag.active) return;
        const p = getSvgCoords(e);
        const dx = p.x - this.drag.startX;
        const dy = p.y - this.drag.startY;
        const sens = 0.42;

        this.rot.lambda = this.drag.startLambda - dx * sens;
        this.rot.phi = clamp(this.drag.startPhi + dy * sens, -85, 85);
      });

      const onPointerEnd = (e) => {
        if (this.drag.active) {
          this.drag.active = false;
          this.lastUserInteraction = performance.now();
          svg.style.cursor = 'grab';
          try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      svg.addEventListener('pointerup', onPointerEnd);
      svg.addEventListener('pointercancel', onPointerEnd);

      // Interactive Click Handling for Satellites and Conjunction Reticle
      svg.addEventListener('click', (e) => {
        const p = getSvgCoords(e);
        if (this.drag && Math.abs(p.x - this.drag.startX) > 6) return;

        const satEl = e.target.closest('[data-sat-id]');
        if (satEl) {
          const satId = satEl.dataset.satId;
          this.selectedTarget = this.selectedTarget === satId ? 'conjunction' : satId;
          return;
        }

        const tcaEl = e.target.closest('[data-tca="true"]');
        if (tcaEl) {
          this.selectedTarget = 'conjunction';
          return;
        }
      });

      // Buttons in external panel header
      const btnSpin = document.getElementById('btn-toggle-spin');
      if (btnSpin) {
        btnSpin.onclick = () => {
          this.autoRotate = !this.autoRotate;
          btnSpin.innerHTML = this.autoRotate ? '<span>↻</span> SPIN: AUTO' : '<span>⏸</span> SPIN: PAUSED';
          btnSpin.classList.toggle('active', this.autoRotate);
        };
      }

      const btnReset = document.getElementById('btn-reset-view');
      if (btnReset) {
        btnReset.onclick = () => {
          this.rot.lambda = 20;
          this.rot.phi = 15;
          this.rot.gamma = 0;
        };
      }
    }

    startLoop() {
      let lastTime = performance.now();

      const frame = (now) => {
        if (this.isDestroyed) return;

        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        if (this.autoRotate && !this.drag.active && (now - this.lastUserInteraction > 1200)) {
          this.rot.lambda += this.autoRotateSpeed * dt;
        }

        this.orbitTime += dt;
        this.renderScene();
        this.animId = requestAnimationFrame(frame);
      };

      this.animId = requestAnimationFrame(frame);
    }

    renderScene() {
      const { lambda, phi, gamma } = this.rot;
      const { R, cx, cy } = this;

      // 1. Render Graticule
      if (this.gridEl) {
        this.gridEl.setAttribute('d', buildGraticule(lambda, phi, gamma, R, cx, cy));
      }

      // 2. Render Landmasses
      if (this.feats) {
        for (const feat of this.feats) {
          const path = buildSphericalPath(feat.type, feat.coords, lambda, phi, gamma, R, cx, cy);
          const el = document.getElementById(`${this.uid}_c_${feat.id}`);
          if (el) el.setAttribute('d', path);
        }
      }

      // 3. Render the Tracked 3D Orbits & Closest Approach
      this.renderOrbits(lambda, phi, gamma, R, cx, cy);
    }

    renderOrbits(lambda, phi, gamma, R, cx, cy) {
      let backOrbitsHtml = '';
      let frontOrbitsHtml = '';
      let satellitesHtml = '';
      const posMap = {};

      const steps = 96;

      ORBIT_CONFIGS.forEach((cfg) => {
        let backPathD = '';
        let frontPathD = '';
        let prevPoint = null;

        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * 2 * Math.PI;
          const p = projectOrbitalPoint(theta, cfg.inc, cfg.raan, cfg.radiusRatio, lambda, phi, gamma, R, cx, cy);

          if (i === 0) {
            if (p.isOccludedByEarth) {
              backPathD += `M${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
            } else {
              frontPathD += `M${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
            }
          } else {
            if (p.isOccludedByEarth) {
              if (prevPoint && !prevPoint.isOccludedByEarth) {
                backPathD += ` M${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
              } else {
                backPathD += ` L${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
              }
            } else {
              if (prevPoint && prevPoint.isOccludedByEarth) {
                frontPathD += ` M${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
              } else {
                frontPathD += ` L${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
              }
            }
          }
          prevPoint = p;
        }

        // Back segment (rendered behind the solid Earth)
        if (backPathD) {
          backOrbitsHtml += `
            <path d="${backPathD}" fill="none" stroke="${cfg.color}" stroke-width="${cfg.strokeWidth || 1.0}"
              stroke-opacity="${(cfg.opacity || 0.9) * 0.35}" stroke-dasharray="3,4" vector-effect="non-scaling-stroke"></path>
          `;
        }

        // Front segment (flat fill, no glow filter)
        if (frontPathD) {
          frontOrbitsHtml += `
            <path d="${frontPathD}" fill="none" stroke="${cfg.color}" stroke-width="${cfg.strokeWidth || 1.4}"
              stroke-opacity="${cfg.opacity || 0.95}" vector-effect="non-scaling-stroke"></path>
          `;
        }

        // Animated Satellite Craft Position
        const currentTheta = (cfg.initAnomaly + this.orbitTime * cfg.periodSpeed * 0.45) % (2 * Math.PI);
        const satPos = projectOrbitalPoint(currentTheta, cfg.inc, cfg.raan, cfg.radiusRatio, lambda, phi, gamma, R, cx, cy);
        posMap[cfg.id] = satPos;

        // Satellites behind the Earth are dimmed
        const opacity = satPos.isOccludedByEarth ? '0.22' : '1.0';
        const tagVisibility = satPos.isOccludedByEarth ? 'none' : 'block';
        const isSelected = (this.selectedTarget === cfg.id);

        satellitesHtml += `
          <g transform="translate(${satPos.sx.toFixed(1)}, ${satPos.sy.toFixed(1)})" opacity="${opacity}" data-sat-id="${cfg.id}" style="cursor:pointer;">
            <!-- Radar tracking ring -->
            <circle r="${isSelected ? 11 : 8}" fill="none" stroke="${isSelected ? '#EF4444' : cfg.color}" stroke-width="${isSelected ? 1.6 : 1.0}" opacity="0.75">
              <animate attributeName="r" values="${isSelected ? '9;14;9' : '5;11;5'}" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0.25;0.85" dur="2.4s" repeatCount="indefinite" />
            </circle>

            <!-- Craft Core Dot -->
            <circle r="${isSelected ? 4.5 : 3.5}" fill="${isSelected ? '#EF4444' : cfg.color}" />

            <!-- Object name labels: --bg-card (#0F172A) background, --text-primary (#FFFFFF) text, 1px --border (#1E293B) -->
            <g style="display:${tagVisibility}; pointer-events:none;">
              <rect x="8" y="-14" width="${cfg.name.length * 6.4 + 14}" height="16" rx="4" fill="#0F172A" stroke="${isSelected ? '#EF4444' : '#1E293B'}" stroke-width="1" />
              <text x="14" y="-3" fill="${isSelected ? '#EF4444' : '#FFFFFF'}" font-family="'DM Mono', monospace" font-size="8.5" font-weight="600" letter-spacing="0.4px">
                ${cfg.name}
              </text>
            </g>
          </g>
        `;
      });

      // Closest-approach marker, double-reticle, dashed beam & HUD card (Image 2)
      const caPos = projectOrbitalPoint(0.44, 52.9, 39.2, 1.29, lambda, phi, gamma, R, cx, cy);
      const satA = posMap['orbit-a'];
      const satB = posMap['orbit-b'];
      let closestApproachHtml = '';

      if (!caPos.isOccludedByEarth) {
        const isConjunctionActive = (this.selectedTarget === 'conjunction' || this.selectedTarget === 'orbit-a' || this.selectedTarget === 'orbit-b');

        let beamHtml = '';
        if (satA && satB && isConjunctionActive) {
          beamHtml = `
            <line x1="${satA.sx.toFixed(1)}" y1="${satA.sy.toFixed(1)}" x2="${satB.sx.toFixed(1)}" y2="${satB.sy.toFixed(1)}"
              stroke="#EF4444" stroke-width="2.5" stroke-dasharray="6,4" stroke-opacity="0.95" />
            <line x1="${satA.sx.toFixed(1)}" y1="${satA.sy.toFixed(1)}" x2="${satB.sx.toFixed(1)}" y2="${satB.sy.toFixed(1)}"
              stroke="#EF4444" stroke-width="6.5" stroke-opacity="0.25" />
          `;
        }

        closestApproachHtml = `
          <!-- Image 2: Red Conjunction Encounter Overlay -->
          ${beamHtml}

          <!-- Double Concentric Red Reticle & Crosshair (Intersection Point) -->
          <g transform="translate(${caPos.sx.toFixed(1)}, ${caPos.sy.toFixed(1)})" data-tca="true" style="cursor:pointer;">
            <!-- Outer Pulsing Ring: #EF4444 -->
            <circle r="18" fill="none" stroke="#EF4444" stroke-width="1.8" stroke-opacity="0.95">
              <animate attributeName="r" values="16;22;16" dur="2s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="1;0.45;1" dur="2s" repeatCount="indefinite" />
            </circle>

            <!-- Inner Circle -->
            <circle r="10" fill="rgba(239, 68, 68, 0.18)" stroke="#EF4444" stroke-width="1.8" />

            <!-- Reticle Crosshairs -->
            <line x1="-24" y1="0" x2="-15" y2="0" stroke="#EF4444" stroke-width="1.8" />
            <line x1="15" y1="0" x2="24" y2="0" stroke="#EF4444" stroke-width="1.8" />
            <line x1="0" y1="-24" x2="0" y2="-15" stroke="#EF4444" stroke-width="1.8" />
            <line x1="0" y1="15" x2="0" y2="24" stroke="#EF4444" stroke-width="1.8" />

            <!-- Core Bright Center Point -->
            <circle r="3.5" fill="#FFFFFF" />
          </g>

          <!-- Red Angled Leader Line (Image 2) -->
          <path d="M ${caPos.sx.toFixed(1)},${caPos.sy.toFixed(1)} L ${(caPos.sx + 42).toFixed(1)},${(caPos.sy - 32).toFixed(1)} L ${(caPos.sx + 72).toFixed(1)},${(caPos.sy - 32).toFixed(1)}"
            fill="none" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round" />

          <!-- Red Tactical HUD Callout Box (Image 2: SAT-7421 & SAT-9812) -->
          <g transform="translate(${(caPos.sx + 72).toFixed(1)}, ${(caPos.sy - 62).toFixed(1)})" data-tca="true" style="cursor:pointer;">
            <rect x="0" y="0" width="168" height="74" rx="4" fill="rgba(28, 4, 8, 0.94)" stroke="#EF4444" stroke-width="1.8" />
            
            <!-- Tactical Corner Bracket Accents -->
            <path d="M 0,8 L 0,0 L 8,0" fill="none" stroke="#EF4444" stroke-width="2.2" />
            <path d="M 160,0 L 168,0 L 168,8" fill="none" stroke="#EF4444" stroke-width="2.2" />
            <path d="M 168,66 L 168,74 L 160,74" fill="none" stroke="#EF4444" stroke-width="2.2" />
            <path d="M 8,74 L 0,74 L 0,66" fill="none" stroke="#EF4444" stroke-width="2.2" />

            <!-- Satellite Identifiers from Image 2 -->
            <text x="14" y="24" fill="#FFFFFF" font-family="'Orbitron', 'Outfit', sans-serif" font-size="14" font-weight="800" letter-spacing="1.2px">SAT-7421</text>
            <text x="14" y="44" fill="#FFFFFF" font-family="'Orbitron', 'Outfit', sans-serif" font-size="14" font-weight="800" letter-spacing="1.2px">SAT-9812</text>

            <!-- Status Pill (Compliant with Rule 2 of AGENTS.md: Miss Distance, No Fake Pc) -->
            <rect x="14" y="52" width="140" height="15" rx="3" fill="rgba(239, 68, 68, 0.24)" />
            <text x="20" y="63" fill="#EF4444" font-family="'DM Mono', monospace" font-size="8.5" font-weight="700" letter-spacing="0.5px">MISS: 3.42 KM · CRITICAL</text>
          </g>
        `;
      }

      this.backOrbitsGroup.innerHTML = backOrbitsHtml;
      this.frontOrbitsGroup.innerHTML = frontOrbitsHtml;
      if (this.closestApproachGroup) {
        this.closestApproachGroup.innerHTML = closestApproachHtml;
      }
      this.satellitesGroup.innerHTML = satellitesHtml;
    }

    destroy() {
      this.isDestroyed = true;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.container.innerHTML = '';
    }
  }

  return {
    mount: function (container) {
      if (activeInstance) {
        activeInstance.destroy();
        activeInstance = null;
      }
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      if (!container) return null;
      activeInstance = new TacticalGlobe3D(container);
      return activeInstance;
    },
    unmount: function () {
      if (activeInstance) {
        activeInstance.destroy();
        activeInstance = null;
      }
    }
  };
});

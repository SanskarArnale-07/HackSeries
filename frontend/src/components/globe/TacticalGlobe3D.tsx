/**
 * TacticalGlobe3D.tsx
 *
 * Adapted from TacticalGlobe3D.js (Framer SVG Orthographic Sphere).
 * Cleaned of all Framer-specific imports and controls.
 * Features:
 *   - Orthographic SVG 3D spherical projection math (Z-spin, Y-tilt, X-roll)
 *   - Visible hemisphere clipping (limbIntersection, ringToSegments)
 *   - Real Natural Earth TopoJSON country boundaries & coastlines
 *   - Drag-to-rotate pointer interaction & idle auto-rotation
 *   - Multi-layer visual aesthetics: atmospheric glow, depth shading, ocean gradient, background stars
 *   - Interactive satellite/conjunction markers with depth fade & pulsers
 *   - SGP4 orbital trajectory rendering directly on the orthographic sphere
 *   - Hover tooltips for countries and orbital objects
 *   - Offline-resilient loading (local /countries-110m.json with CDN fallback)
 */

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useId,
  startTransition
} from 'react';

/* ========================================================================== */
/* Country Data — ISO numeric → [ISO3, name]                                   */
/* ========================================================================== */
const CD: Record<string, [string, string]> = {
  "004": ["AFG", "Afghanistan"], "008": ["ALB", "Albania"], "012": ["DZA", "Algeria"],
  "024": ["AGO", "Angola"], "032": ["ARG", "Argentina"], "036": ["AUS", "Australia"],
  "040": ["AUT", "Austria"], "031": ["AZE", "Azerbaijan"], "050": ["BGD", "Bangladesh"],
  "056": ["BEL", "Belgium"], "204": ["BEN", "Benin"], "064": ["BTN", "Bhutan"],
  "068": ["BOL", "Bolivia"], "070": ["BIH", "Bosnia and Herz."], "072": ["BWA", "Botswana"],
  "076": ["BRA", "Brazil"], "096": ["BRN", "Brunei"], "100": ["BGR", "Bulgaria"],
  "854": ["BFA", "Burkina Faso"], "108": ["BDI", "Burundi"], "116": ["KHM", "Cambodia"],
  "120": ["CMR", "Cameroon"], "124": ["CAN", "Canada"], "140": ["CAF", "Central African Rep."],
  "148": ["TCD", "Chad"], "152": ["CHL", "Chile"], "156": ["CHN", "China"],
  "170": ["COL", "Colombia"], "178": ["COG", "Congo"], "180": ["COD", "Dem. Rep. Congo"],
  "188": ["CRI", "Costa Rica"], "384": ["CIV", "Côte d'Ivoire"], "191": ["HRV", "Croatia"],
  "192": ["CUB", "Cuba"], "196": ["CYP", "Cyprus"], "203": ["CZE", "Czechia"],
  "208": ["DNK", "Denmark"], "262": ["DJI", "Djibouti"], "214": ["DOM", "Dominican Rep."],
  "218": ["ECU", "Ecuador"], "818": ["EGY", "Egypt"], "222": ["SLV", "El Salvador"],
  "226": ["GNQ", "Eq. Guinea"], "232": ["ERI", "Eritrea"], "233": ["EST", "Estonia"],
  "748": ["SWZ", "Eswatini"], "231": ["ETH", "Ethiopia"], "242": ["FJI", "Fiji"],
  "246": ["FIN", "Finland"], "250": ["FRA", "France"], "266": ["GAB", "Gabon"],
  "270": ["GMB", "Gambia"], "268": ["GEO", "Georgia"], "276": ["DEU", "Germany"],
  "288": ["GHA", "Ghana"], "300": ["GRC", "Greece"], "304": ["GRL", "Greenland"],
  "320": ["GTM", "Guatemala"], "324": ["GIN", "Guinea"], "624": ["GNB", "Guinea-Bissau"],
  "328": ["GUY", "Guyana"], "332": ["HTI", "Haiti"], "340": ["HND", "Honduras"],
  "348": ["HUN", "Hungary"], "352": ["ISL", "Iceland"], "356": ["IND", "India"],
  "360": ["IDN", "Indonesia"], "364": ["IRN", "Iran"], "368": ["IRQ", "Iraq"],
  "372": ["IRL", "Ireland"], "376": ["ISR", "Israel"], "380": ["ITA", "Italy"],
  "388": ["JAM", "Jamaica"], "392": ["JPN", "Japan"], "400": ["JOR", "Jordan"],
  "398": ["KAZ", "Kazakhstan"], "404": ["KEN", "Kenya"], "408": ["PRK", "North Korea"],
  "410": ["KOR", "South Korea"], "414": ["KWT", "Kuwait"], "417": ["KGZ", "Kyrgyzstan"],
  "418": ["LAO", "Laos"], "428": ["LVA", "Latvia"], "422": ["LBN", "Lebanon"],
  "426": ["LSO", "Lesotho"], "430": ["LBR", "Liberia"], "434": ["LBY", "Libya"],
  "440": ["LTU", "Lithuania"], "442": ["LUX", "Luxembourg"], "450": ["MDG", "Madagascar"],
  "454": ["MWI", "Malawi"], "458": ["MYS", "Malaysia"], "466": ["MLI", "Mali"],
  "478": ["MRT", "Mauritania"], "484": ["MEX", "Mexico"], "498": ["MDA", "Moldova"],
  "496": ["MNG", "Mongolia"], "499": ["MNE", "Montenegro"], "504": ["MAR", "Morocco"],
  "508": ["MOZ", "Mozambique"], "104": ["MMR", "Myanmar"], "516": ["NAM", "Namibia"],
  "524": ["NPL", "Nepal"], "528": ["NLD", "Netherlands"], "554": ["NZL", "New Zealand"],
  "558": ["NIC", "Nicaragua"], "562": ["NER", "Niger"], "566": ["NGA", "Nigeria"],
  "578": ["NOR", "Norway"], "512": ["OMN", "Oman"], "586": ["PAK", "Pakistan"],
  "591": ["PAN", "Panama"], "598": ["PNG", "Papua New Guinea"], "600": ["PRY", "Paraguay"],
  "604": ["PER", "Peru"], "608": ["PHL", "Philippines"], "616": ["POL", "Poland"],
  "620": ["PRT", "Portugal"], "634": ["QAT", "Qatar"], "642": ["ROU", "Romania"],
  "643": ["RUS", "Russia"], "646": ["RWA", "Rwanda"], "682": ["SAU", "Saudi Arabia"],
  "686": ["SEN", "Senegal"], "688": ["SRB", "Serbia"], "694": ["SLE", "Sierra Leone"],
  "702": ["SGP", "Singapore"], "703":["SVK", "Slovakia"], "705":["SVN", "Slovenia"],
  "706": ["SOM", "Somalia"], "710": ["ZAF", "South Africa"], "728": ["SSD", "South Sudan"],
  "724": ["ESP", "Spain"], "144": ["LKA", "Sri Lanka"], "729": ["SDN", "Sudan"],
  "740": ["SUR", "Suriname"], "752": ["SWE", "Sweden"], "756": ["CHE", "Switzerland"],
  "760": ["SYR", "Syria"], "158": ["TWN", "Taiwan"], "762": ["TJK", "Tajikistan"],
  "834": ["TZA", "Tanzania"], "764": ["THA", "Thailand"], "626": ["TLS", "Timor-Leste"],
  "768": ["TGO", "Togo"], "780": ["TTO", "Trinidad and Tobago"], "788": ["TUN", "Tunisia"],
  "792": ["TUR", "Turkey"], "795": ["TKM", "Turkmenistan"], "800": ["UGA", "Uganda"],
  "804": ["UKR", "Ukraine"], "784": ["ARE", "UAE"], "826": ["GBR", "United Kingdom"],
  "840": ["USA", "United States"], "858": ["URY", "Uruguay"], "860": ["UZB", "Uzbekistan"],
  "862": ["VEN", "Venezuela"], "704": ["VNM", "Vietnam"], "887": ["YEM", "Yemen"],
  "894": ["ZMB", "Zambia"], "716": ["ZWE", "Zimbabwe"], "275": ["PSE", "Palestine"],
  "807": ["MKD", "North Macedonia"], "051": ["ARM", "Armenia"], "112": ["BLR", "Belarus"],
  "174": ["COM", "Comoros"], "084": ["BLZ", "Belize"], "090": ["SLB", "Solomon Islands"],
  "540": ["NCL", "New Caledonia"], "548": ["VUT", "Vanuatu"], "010": ["ATA", "Antarctica"],
  "-99": ["XKX", "Kosovo"]
};

/* ========================================================================== */
/* 3D Sphere Math                                                             */
/* ========================================================================== */
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export interface ProjectedPoint {
  sx: number;
  sy: number;
  rx: number;
  ry: number;
  rz: number;
  v: boolean; // visible on front hemisphere (rx >= 0)
}

/**
 * Orthographic projection with Euler rotations:
 *   1. lambda (spin around Z polar axis)
 *   2. phi    (tilt north pole toward viewer around screen-right axis)
 *   3. gamma  (roll around camera depth axis)
 */
function project(
  lng: number,
  lat: number,
  lambda: number,
  phi: number,
  gamma: number,
  R: number,
  cx: number,
  cy: number
): ProjectedPoint {
  const lr = (lng - lambda) * D2R;
  const la = lat * D2R;
  const cl = Math.cos(la);

  // Unrotated unit-sphere position (post-Z-rotation by lambda)
  const x0 = cl * Math.cos(lr);
  const y0 = cl * Math.sin(lr);
  const z0 = Math.sin(la);

  // Rotate around Y by phi
  const cp = Math.cos(phi * D2R);
  const sp = Math.sin(phi * D2R);
  const x1 = x0 * cp + z0 * sp;
  const y1 = y0;
  const z1 = -x0 * sp + z0 * cp;

  // Rotate around X by gamma
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

/**
 * Inverse projection: screen (px, py) → (lng, lat), or null if outside sphere disc.
 */
function unproject(
  px: number,
  py: number,
  lambda: number,
  phi: number,
  gamma: number,
  R: number,
  cx: number,
  cy: number
): { lng: number; lat: number } | null {
  const Ry = (px - cx) / R;
  const Rz = -(py - cy) / R;
  const r2 = Ry * Ry + Rz * Rz;
  if (r2 > 1) return null;

  const cg = Math.cos(gamma * D2R);
  const sg = Math.sin(gamma * D2R);
  const y1 = Ry * cg + Rz * sg;
  const z1 = -Ry * sg + Rz * cg;

  const x1 = Math.sqrt(Math.max(0, 1 - r2));

  const cp = Math.cos(phi * D2R);
  const sp = Math.sin(phi * D2R);
  const x0 = x1 * cp - z1 * sp;
  const y0 = y1;
  const z0 = x1 * sp + z1 * cp;

  const lat = Math.asin(clamp(z0, -1, 1)) * R2D;
  let lng = Math.atan2(y0, x0) * R2D + lambda;
  lng = (((lng + 180) % 360) + 360) % 360 - 180;

  return { lng, lat };
}

/**
 * Find limb intersection between visible point a and invisible point b.
 */
function limbIntersect(
  a: ProjectedPoint,
  b: ProjectedPoint,
  R: number,
  cx: number,
  cy: number
): ProjectedPoint | null {
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

/**
 * Clip a closed ring to the visible hemisphere without cross-disc chords.
 */
function ringToSegments(
  ring: number[][],
  lambda: number,
  phi: number,
  gamma: number,
  R: number,
  cx: number,
  cy: number
): ProjectedPoint[][] {
  const n = ring.length;
  if (n < 3) return [];
  const proj: ProjectedPoint[] = new Array(n);
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

  const segments: ProjectedPoint[][] = [];
  let cur: ProjectedPoint[] = [];

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

function segmentsToPath(segs: ProjectedPoint[][]): string {
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

function buildSphericalPath(
  type: string,
  coords: any,
  lambda: number,
  phi: number,
  gamma: number,
  R: number,
  cx: number,
  cy: number
): string {
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

/* ========================================================================== */
/* TopoJSON Decoder                                                           */
/* ========================================================================== */
function decArcs(t: any): number[][][] {
  const tf = t.transform;
  if (!tf) return t.arcs;
  const sx = tf.scale[0],
    sy = tf.scale[1],
    dx = tf.translate[0],
    dy = tf.translate[1];
  return t.arcs.map((a: number[][]) => {
    let x = 0,
      y = 0;
    return a.map((p: number[]) => {
      x += p[0];
      y += p[1];
      return [x * sx + dx, y * sy + dy];
    });
  });
}

function resolveRing(idx: number[], arcs: number[][][]): number[][] {
  const out: number[][] = [];
  for (const i of idx) {
    const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
    for (let j = out.length > 0 ? 1 : 0; j < a.length; j++) out.push(a[j]);
  }
  return out;
}

function extractFeatures(t: any): Array<{ id: string; type: string; coords: any }> {
  const arcs = decArcs(t);
  const gs = t.objects?.countries?.geometries;
  if (!gs) return [];
  return gs.map((g: any) => {
    let c: any = null;
    if (g.type === 'Polygon') c = g.arcs.map((r: number[]) => resolveRing(r, arcs));
    else if (g.type === 'MultiPolygon')
      c = g.arcs.map((p: number[][]) => p.map((r: number[]) => resolveRing(r, arcs)));
    return { id: String(g.id ?? ''), type: g.type, coords: c };
  });
}

/* ========================================================================== */
/* Hover hit-test (point-in-polygon over lng/lat)                             */
/* ========================================================================== */
function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function findCountryAt(lng: number, lat: number, index: any[]): any {
  for (const c of index) {
    if (lng < c.bbox.minLng || lng > c.bbox.maxLng) continue;
    if (lat < c.bbox.minLat || lat > c.bbox.maxLat) continue;
    let inside = false;
    for (const ring of c.rings) {
      if (pointInRing(lng, lat, ring)) inside = !inside;
    }
    if (inside) return c;
  }
  return null;
}

/* ========================================================================== */
/* Utilities                                                                  */
/* ========================================================================== */
function rgba(c: string, a: number): string {
  if (typeof c !== 'string' || !c) return `rgba(0,0,0,${a})`;
  const s = c.trim();
  if (s.indexOf('rgb') === 0) {
    const m = s.match(/-?[\d.]+/g);
    if (m && m.length >= 3) return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
    return `rgba(0,0,0,${a})`;
  }
  if (s.indexOf('hsl') === 0) {
    const m = s.match(/-?[\d.]+/g);
    if (m && m.length >= 3) return `hsla(${m[0]},${m[1]}%,${m[2]}%,${a})`;
    return `rgba(0,0,0,${a})`;
  }
  const h = s.replace('#', '');
  if (h.length !== 3 && h.length !== 6 && h.length !== 8) return `rgba(0,0,0,${a})`;
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  return `rgba(${parseInt(f.slice(0, 2), 16)},${parseInt(f.slice(2, 4), 16)},${parseInt(
    f.slice(4, 6),
    16
  )},${a})`;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 1831565813) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraticule(
  lambda: number,
  phi: number,
  gamma: number,
  R: number,
  cx: number,
  cy: number
): string {
  let out = '';
  // Parallels (lat = const)
  for (let lat = -60; lat <= 60; lat += 30) {
    let started = false;
    let prev: ProjectedPoint | null = null;
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
  // Meridians (lng = const)
  for (let lng = -180; lng < 180; lng += 30) {
    let started = false;
    let prev: ProjectedPoint | null = null;
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

/**
 * Builds an SVG path string for an orbital ephemeris ground track / trajectory.
 */
function buildTrajectoryPath(
  coords: Array<{ lat: number; lon: number }>,
  lambda: number,
  phi: number,
  gamma: number,
  R: number,
  cx: number,
  cy: number
): string {
  if (!coords || coords.length < 2) return '';
  let out = '';
  let started = false;
  let prev: ProjectedPoint | null = null;

  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    const p = project(pt.lon, pt.lat, lambda, phi, gamma, R, cx, cy);
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
  return out;
}

/* ========================================================================== */
/* TypeScript Interfaces & Types                                              */
/* ========================================================================== */
export interface TacticalGlobeMarker {
  id: string | number;
  label: string;
  showLabel?: boolean;
  description?: string;
  latitude: number;
  longitude: number;
  color?: string;
  size?: number;
  isPulsing?: boolean;
  objectType?: 'PAYLOAD' | 'DEBRIS' | 'ROCKET_BODY' | 'UNKNOWN' | 'CONJUNCTION';
  badge?: string;
  onClick?: () => void;
}

export interface TacticalTrajectory {
  id: string;
  name: string;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  dashArray?: string;
  points: Array<{ lat: number; lon: number }>;
}

export interface TacticalGlobeProps {
  markers?: TacticalGlobeMarker[];
  trajectories?: TacticalTrajectory[];
  showOutlines?: boolean;
  showOrbits?: boolean;
  showGrid?: boolean;
  showStars?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  enableDrag?: boolean;
  dragSensitivity?: number;
  glowColor?: string;
  glowIntensity?: number;
  oceanColor?: string;
  landFill?: string;
  landStroke?: string;
  strokeWidth?: number;
  hoverColor?: string;
  onSelectMarker?: (marker: TacticalGlobeMarker) => void;
  className?: string;
}

const PRIMARY_DATA_URL = '/countries-110m.json';
const FALLBACK_DATA_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/* ========================================================================== */
/* Component Implementation                                                   */
/* ========================================================================== */
export const TacticalGlobe3D: React.FC<TacticalGlobeProps> = ({
  markers = [],
  trajectories = [],
  showOutlines = true,
  showOrbits = true,
  showGrid = true,
  showStars = true,
  autoRotate = true,
  autoRotateSpeed = 4.0,
  rotateX = 0,
  rotateY = 15,
  rotateZ = 0,
  enableDrag = true,
  dragSensitivity = 0.4,
  glowColor = '#00f0ff',
  glowIntensity = 0.35,
  oceanColor = '#04070c',
  landFill = '#0d131a',
  landStroke = '#1e293b',
  strokeWidth = 0.6,
  hoverColor = '#1e3a5f',
  onSelectMarker,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const ghostPathRefs = useRef(new Map<string, SVGPathElement>());
  const markerRefs = useRef(new Map<number, SVGGElement>());
  const trajectoryRefs = useRef(new Map<string, SVGPathElement>());
  const gridPathRef = useRef<SVGPathElement>(null);

  const [isClient] = useState(() => typeof window !== 'undefined');
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 700, h: 500 });
  const [feats, setFeats] = useState<any[] | null>(null);
  const [err, setErr] = useState(false);
  const [hM, setHM] = useState<{
    screenX: number;
    screenY: number;
    label: string;
    description?: string;
    badge?: string;
  } | null>(null);
  const [hC, setHC] = useState<{
    screenX: number;
    screenY: number;
    name: string;
    code: string;
  } | null>(null);
  const hCRef = useRef(hC);
  useEffect(() => {
    hCRef.current = hC;
  }, [hC]);

  const [isDragging, setIsDragging] = useState(false);
  const rotRef = useRef({ lambda: rotateZ, phi: rotateY, gamma: rotateX });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startLambda: 0,
    startPhi: 0
  });
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const userInteractedRef = useRef(0);

  /* Sync rotation props when not dragging */
  useEffect(() => {
    if (!dragRef.current.active) {
      rotRef.current.lambda = rotateZ;
      rotRef.current.phi = rotateY;
      rotRef.current.gamma = rotateX;
    }
  }, [rotateX, rotateY, rotateZ]);

  /* Resize observer */
  useEffect(() => {
    if (!isClient) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) {
        startTransition(() => {
          setDims({ w: r.width, h: r.height });
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isClient]);

  /* Load TopoJSON with offline-first fallback */
  useEffect(() => {
    if (!isClient) return;
    let dead = false;

    const loadData = async () => {
      try {
        // Try local bundled fixture first for 100% offline air-gapped demo
        const localRes = await fetch(PRIMARY_DATA_URL).catch(() => null);
        if (localRes && localRes.ok) {
          const json = await localRes.json();
          if (!dead) {
            startTransition(() => {
              setFeats(extractFeatures(json));
            });
            return;
          }
        }

        // Fallback to CDN
        const cdnRes = await fetch(FALLBACK_DATA_URL);
        if (!cdnRes.ok) throw new Error('CDN fetch failed');
        const json = await cdnRes.json();
        if (!dead) {
          startTransition(() => {
            setFeats(extractFeatures(json));
          });
        }
      } catch {
        if (!dead) {
          startTransition(() => {
            setErr(true);
          });
        }
      }
    };

    loadData();
    return () => {
      dead = true;
    };
  }, [isClient]);

  /* Geometry calculations */
  const { w: W, h: H } = dims;
  const pad = 12;
  const innerW = Math.max(0, W - pad * 2);
  const innerH = Math.max(0, H - pad * 2);
  const R = Math.max(20, Math.min(innerW, innerH) / 2 - 8);
  const cx = W / 2;
  const cy = H / 2;

  /* Build country index */
  const countryIndex = useMemo(() => {
    if (!feats) return [];
    const out: any[] = [];
    for (const f of feats) {
      const pad3 = String(f.id).padStart(3, '0');
      const e = CD[pad3];
      const a3 = e ? e[0] : pad3;
      const nm = e ? e[1] : a3;
      if (a3 === 'ATA') continue; // Skip Antarctica for compact clean look

      const rings: number[][][] = [];
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
      const visit = (ring: number[][]) => {
        rings.push(ring);
        for (const p of ring) {
          if (p[0] < minLng) minLng = p[0];
          if (p[0] > maxLng) maxLng = p[0];
          if (p[1] < minLat) minLat = p[1];
          if (p[1] > maxLat) maxLat = p[1];
        }
      };
      if (f.type === 'Polygon') {
        for (const r of f.coords) visit(r);
      } else if (f.type === 'MultiPolygon') {
        for (const poly of f.coords) for (const r of poly) visit(r);
      }
      out.push({
        id: a3,
        name: nm,
        type: f.type,
        coords: f.coords,
        rings,
        bbox: { minLng, maxLng, minLat, maxLat }
      });
    }
    return out;
  }, [feats]);

  /* Background stars */
  const stars = useMemo(() => {
    if (!showStars || W <= 0 || H <= 0) return [];
    const rnd = mulberry32(1584243068);
    const N = 85;
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let i = 0; i < N; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const dx = x - cx,
        dy = y - cy;
      if (dx * dx + dy * dy < (R + 14) * (R + 14)) continue;
      out.push({ x, y, r: 0.4 + rnd() * 0.9, o: 0.15 + rnd() * 0.65 });
    }
    return out;
  }, [W, H, cx, cy, R, showStars]);

  /* Animation loop imperatively updating DOM paths and markers */
  useEffect(() => {
    if (!isClient || countryIndex.length === 0) return;
    if (W <= 0 || H <= 0 || R <= 0) return;

    let raf = 0;
    let lastTime = typeof performance !== 'undefined' ? performance.now() : 0;
    const idleMs = 1200;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sinceUser = now - userInteractedRef.current;

      if (autoRotate && !dragRef.current.active && sinceUser > idleMs) {
        rotRef.current.lambda += autoRotateSpeed * dt;
      }

      const { lambda, phi, gamma } = rotRef.current;

      // Update country paths
      if (showOutlines) {
        for (const c of countryIndex) {
          const d = buildSphericalPath(c.type, c.coords, lambda, phi, gamma, R, cx, cy);
          const p = pathRefs.current.get(c.id);
          if (p) p.setAttribute('d', d);
          const g = ghostPathRefs.current.get(c.id);
          if (g) g.setAttribute('d', d);
        }
      }

      // Update graticule grid
      if (showGrid && gridPathRef.current) {
        gridPathRef.current.setAttribute('d', buildGraticule(lambda, phi, gamma, R, cx, cy));
      }

      // Update orbital trajectory lines
      if (showOrbits) {
        for (const traj of trajectories) {
          const el = trajectoryRefs.current.get(traj.id);
          if (el) {
            const pathD = buildTrajectoryPath(traj.points, lambda, phi, gamma, R, cx, cy);
            el.setAttribute('d', pathD);
          }
        }
      }

      // Update markers position and depth fade
      for (let i = 0; i < markers.length; i++) {
        const m = markers[i];
        const el = markerRefs.current.get(i);
        if (!el) continue;
        const p = project(m.longitude, m.latitude, lambda, phi, gamma, R, cx, cy);
        if (p.v) {
          const fade = clamp(p.rx * 3.5, 0, 1);
          el.style.opacity = String(fade);
          el.style.display = '';
          el.setAttribute('transform', `translate(${p.sx.toFixed(1)},${p.sy.toFixed(1)})`);
        } else {
          el.style.opacity = '0';
          el.style.display = 'none';
        }
      }

      // Re-evaluate country hover
      if (lastMouseRef.current && !dragRef.current.active) {
        const m = lastMouseRef.current;
        const ll = unproject(m.x, m.y, lambda, phi, gamma, R, cx, cy);
        if (ll) {
          const c = findCountryAt(ll.lng, ll.lat, countryIndex);
          const currentHc = hCRef.current;
          if (c) {
            if (!currentHc || currentHc.code !== c.id) {
              startTransition(() => {
                setHC({ screenX: m.x, screenY: m.y, name: c.name, code: c.id });
              });
            } else if (currentHc.screenX !== m.x || currentHc.screenY !== m.y) {
              startTransition(() => {
                setHC({ ...currentHc, screenX: m.x, screenY: m.y });
              });
            }
          } else if (currentHc) {
            startTransition(() => {
              setHC(null);
            });
          }
        } else if (hCRef.current) {
          startTransition(() => {
            setHC(null);
          });
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [
    isClient,
    countryIndex,
    markers,
    trajectories,
    R,
    cx,
    cy,
    W,
    H,
    showGrid,
    showOutlines,
    showOrbits,
    autoRotate,
    autoRotateSpeed
  ]);

  /* Sync hover highlight fill */
  useEffect(() => {
    for (const c of countryIndex) {
      const el = pathRefs.current.get(c.id);
      if (!el) continue;
      const isHov = hC?.code === c.id;
      el.setAttribute('fill', isHov ? hoverColor : landFill);
    }
  }, [countryIndex, hC, hoverColor, landFill]);

  /* Pointer drag handlers */
  const localMouse = (e: React.PointerEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enableDrag) return;
    const m = localMouse(e);
    const dx = m.x - cx,
      dy = m.y - cy;
    if (dx * dx + dy * dy > (R + 12) * (R + 12)) return;

    dragRef.current = {
      active: true,
      startX: m.x,
      startY: m.y,
      startLambda: rotRef.current.lambda,
      startPhi: rotRef.current.phi
    };
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startTransition(() => {
      setHC(null);
      setHM(null);
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const m = localMouse(e);
    lastMouseRef.current = m;
    if (dragRef.current.active) {
      const sens = dragSensitivity;
      const dx = m.x - dragRef.current.startX;
      const dy = m.y - dragRef.current.startY;
      rotRef.current.lambda = dragRef.current.startLambda - dx * sens;
      rotRef.current.phi = clamp(dragRef.current.startPhi + dy * sens, -85, 85);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      setIsDragging(false);
      userInteractedRef.current =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const onPointerLeave = () => {
    lastMouseRef.current = null;
    if (dragRef.current.active) {
      dragRef.current.active = false;
      setIsDragging(false);
    }
    startTransition(() => {
      setHC(null);
      setHM(null);
    });
  };

  /* Marker interaction handlers */
  const handleMarkerEnter = (i: number, e: React.MouseEvent) => {
    const m = markers[i];
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    startTransition(() => {
      setHM({
        screenX: e.clientX - r.left,
        screenY: e.clientY - r.top,
        label: m.label,
        description: m.description,
        badge: m.badge
      });
    });
  };

  const handleMarkerMove = (i: number, e: React.MouseEvent) => {
    const m = markers[i];
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    startTransition(() => {
      setHM({
        screenX: e.clientX - r.left,
        screenY: e.clientY - r.top,
        label: m.label,
        description: m.description,
        badge: m.badge
      });
    });
  };

  const handleMarkerLeave = () => {
    startTransition(() => {
      setHM(null);
    });
  };

  const handleMarkerClick = (m: TacticalGlobeMarker) => {
    if (m.onClick) m.onClick();
    if (onSelectMarker) onSelectMarker(m);
  };

  const loading = !feats && !err;
  const reactId = useId();
  const uid = reactId.replace(/[^a-zA-Z0-9]/g, '');
  const fG = 'g' + uid;
  const fL = 'l' + uid;
  const gO = 'o' + uid;
  const gShade = 's' + uid;
  const gAtm = 'a' + uid;
  const clipDisc = 'c' + uid;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none font-mono ${className}`}
      style={{
        background: 'transparent',
        touchAction: 'none'
      }}
    >
      <style>{`
        .mm-c { transition: fill 140ms ease, filter 140ms ease; }
        .mm-c:hover { filter: brightness(1.22); }
        @keyframes mm-pulse {
          0%, 100% { transform: scale(1); opacity: .65; }
          50% { transform: scale(1.8); opacity: .05; }
        }
        .mm-pulse {
          animation: mm-pulse 2.2s ease-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes mm-pulse-fast {
          0%, 100% { transform: scale(1); opacity: .9; }
          50% { transform: scale(2.4); opacity: .1; }
        }
        .mm-pulse-fast {
          animation: mm-pulse-fast 1.2s ease-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-[#8a99ad] text-xs uppercase tracking-widest pointer-events-none z-10">
          <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded border border-white/10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            Loading Tactical Vector Globe…
          </div>
        </div>
      )}

      {/* Error state */}
      {err && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-red-400 text-xs pointer-events-none z-10">
          <div className="bg-red-950/80 px-4 py-2 rounded border border-red-500/40 text-center">
            <div className="font-bold">Vector Map Geometry Unavailable</div>
            <div className="text-[10px] text-red-300/70">
              Verify local fixture in /countries-110m.json or internet access
            </div>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: enableDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <defs>
          <filter id={fG} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={fL} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feColorMatrix
              in="b"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.16 0"
            />
          </filter>

          <radialGradient id={gShade} cx="36%" cy="30%" r="76%">
            <stop offset="0%" stopColor={rgba('#ffffff', 0.1)} />
            <stop offset="55%" stopColor={rgba('#ffffff', 0)} />
            <stop offset="92%" stopColor={rgba('#000000', 0.4)} />
            <stop offset="100%" stopColor={rgba('#000000', 0.65)} />
          </radialGradient>

          <radialGradient id={gAtm} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={rgba(glowColor, 0)} />
            <stop
              offset={(R / Math.max(R + 14, 1) * 100).toFixed(1) + '%'}
              stopColor={rgba(glowColor, 0)}
            />
            <stop
              offset={((R + 2) / Math.max(R + 14, 1) * 100).toFixed(1) + '%'}
              stopColor={rgba(glowColor, 0.22 * glowIntensity)}
            />
            <stop offset="100%" stopColor={rgba(glowColor, 0)} />
          </radialGradient>

          <linearGradient id={gO} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={rgba('#141c24', 0.35)} />
            <stop offset="50%" stopColor={rgba('#0b0e13', 0.1)} />
            <stop offset="100%" stopColor={rgba('#05070a', 0.35)} />
          </linearGradient>

          <clipPath id={clipDisc}>
            <circle cx={cx} cy={cy} r={R} />
          </clipPath>
        </defs>

        {/* 1. Deep Space Stars */}
        {showStars &&
          stars.map((s, i) => (
            <circle
              key={`star-${i}`}
              cx={s.x.toFixed(1)}
              cy={s.y.toFixed(1)}
              r={s.r.toFixed(2)}
              fill={rgba('#ffffff', s.o)}
            />
          ))}

        {/* 2. Atmospheric Outer Glow (Subtle limb scattering) */}
        <circle cx={cx} cy={cy} r={R + 14} fill={`url(#${gAtm})`} pointerEvents="none" />

        {/* 3. Base Ocean Sphere */}
        <circle cx={cx} cy={cy} r={R} fill={oceanColor} />
        <circle cx={cx} cy={cy} r={R} fill={`url(#${gO})`} />

        {/* 4. Clipped Globe Surface (Land, Grid & Orbits) */}
        <g clipPath={`url(#${clipDisc})`}>
          {/* Subtle land halo ghost */}
          {showOutlines && (
            <g opacity={0.08} filter={`url(#${fL})`}>
              {countryIndex.map((c) => (
                <path
                  key={`ghost-${c.id}`}
                  ref={(el) => {
                    if (el) ghostPathRefs.current.set(c.id, el);
                    else ghostPathRefs.current.delete(c.id);
                  }}
                  fill={landFill}
                  stroke="none"
                  pointerEvents="none"
                />
              ))}
            </g>
          )}

          {/* Graticule latitude/longitude grid */}
          {showGrid && (
            <path
              ref={gridPathRef}
              fill="none"
              stroke="#2e3846"
              strokeWidth={0.5}
              strokeOpacity={0.4}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}

          {/* Country outlines & land fills */}
          {showOutlines &&
            countryIndex.map((c) => (
              <path
                key={`c-${c.id}`}
                ref={(el) => {
                  if (el) pathRefs.current.set(c.id, el);
                  else pathRefs.current.delete(c.id);
                }}
                className="mm-c"
                fill={landFill}
                stroke={landStroke}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'default' }}
              />
            ))}

          {/* SGP4 Ephemeris Orbital Trajectories */}
          {showOrbits &&
            trajectories.map((traj) => (
              <path
                key={`traj-${traj.id}`}
                ref={(el) => {
                  if (el) trajectoryRefs.current.set(traj.id, el);
                  else trajectoryRefs.current.delete(traj.id);
                }}
                fill="none"
                stroke={traj.color}
                strokeWidth={traj.strokeWidth ?? 1.5}
                strokeOpacity={traj.opacity ?? 0.85}
                strokeDasharray={traj.dashArray}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ))}
        </g>

        {/* 5. 3D Spherical Shading & Specular Rim */}
        <circle cx={cx} cy={cy} r={R} fill={`url(#${gShade})`} pointerEvents="none" />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={rgba(glowColor, 0.25 * glowIntensity)}
          strokeWidth={0.8}
          pointerEvents="none"
        />

        {/* 6. Orbital & Conjunction Markers */}
        {markers.map((m, i) => {
          const sz = m.size || 4;
          const col = m.color || '#38bdf8';
          const isPulsing = m.isPulsing !== false;

          return (
            <g
              key={`marker-${m.id}-${i}`}
              ref={(el) => {
                if (el) markerRefs.current.set(i, el);
                else markerRefs.current.delete(i);
              }}
              style={{ cursor: 'pointer', opacity: 0 }}
              onMouseEnter={(e) => handleMarkerEnter(i, e)}
              onMouseMove={(e) => handleMarkerMove(i, e)}
              onMouseLeave={handleMarkerLeave}
              onClick={() => handleMarkerClick(m)}
            >
              {/* Outer Pulse */}
              {isPulsing && (
                <circle
                  className={m.objectType === 'CONJUNCTION' ? 'mm-pulse-fast' : 'mm-pulse'}
                  r={sz * (m.objectType === 'CONJUNCTION' ? 2.2 : 1.5)}
                  fill={rgba(col, m.objectType === 'CONJUNCTION' ? 0.5 : 0.25)}
                />
              )}
              {/* Secondary Halo */}
              <circle r={sz * 1.8} fill={rgba(col, 0.12)} />
              {/* Core Marker Point */}
              <circle r={sz} fill={col} stroke="#05070a" strokeWidth={1} />
              {/* Specular Highlight dot */}
              <circle
                cx={-sz * 0.35}
                cy={-sz * 0.35}
                r={sz * 0.35}
                fill={rgba('#ffffff', 0.65)}
              />

              {/* Marker Label — Only displayed when showLabel is true to prevent text collisions */}
              {m.showLabel && m.label && (
                <text
                  x={sz * 2.2}
                  y={sz * 0.35 + 1}
                  fill="#f1f5f9"
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing="0.03em"
                  stroke={oceanColor}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Marker Tooltip */}
      {hM && (
        <div
          style={{
            position: 'absolute',
            left: hM.screenX + 14,
            top: hM.screenY - 14,
            transform: 'translateY(-100%)',
            background: 'rgba(8, 12, 18, 0.94)',
            color: '#f0f4f8',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: 6,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 30,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 240
          }}
        >
          {hM.badge && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#00f0ff]">
              {hM.badge}
            </span>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
            {hM.label}
          </div>
          {hM.description && (
            <div
              style={{
                fontSize: 10,
                opacity: 0.75,
                lineHeight: 1.35,
                whiteSpace: 'pre-line'
              }}
            >
              {hM.description}
            </div>
          )}
        </div>
      )}

      {/* Country Tooltip */}
      {!hM && hC && (
        <div
          style={{
            position: 'absolute',
            left: hC.screenX + 14,
            top: hC.screenY - 10,
            transform: 'translateY(-100%)',
            background: 'rgba(11, 16, 24, 0.9)',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.03em',
            pointerEvents: 'none',
            zIndex: 30,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
          }}
        >
          {hC.name} ({hC.code})
        </div>
      )}
    </div>
  );
};

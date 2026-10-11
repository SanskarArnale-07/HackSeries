# UI_UX_SPEC.md: User Interface & Experience Specification

> **Specification Status:** Frontend UI/UX Design Baseline  
> **Primary Owners:** Frontend Developer 1 (Dashboard & State), Frontend Developer 2 (3D Visualization)  
> **Target Framework:** React 18 + Vite (TypeScript)  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Design Tokens:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)  
> **API Contracts:** [`API_CONTRACT.md`](./API_CONTRACT.md)

---

## 1. Product Vision & Operator Personas

### 1.1 Interface Vision
The **Orbital Conjunction & Space Traffic Risk Engine** delivers an aerospace-grade, high-density operations console designed for situational awareness. It combines a military-style alert triage table with an interactive 3D WebGL globe, enabling an analyst to discover a candidate close approach, inspect its geometry, and understand the orbital context within seconds.

### 1.2 Target Personas
1. **Hackathon Judge / Reviewer:** Needs to understand within 30 seconds what the system does, see a live 3D orbital visualization, observe a candidate close encounter, and witness offline network resilience.
2. **Orbital Safety Analyst:** Requires immediate access to Time of Closest Approach (TCA), minimum miss distance ($\text{km}$), relative velocity ($\text{km/s}$), and element epoch age without cluttered visual distractions.
3. **Space Mission Planner:** Seeks to inspect individual satellite apogee/perigee altitudes and orbital inclinations to determine if two trajectories actually intersect.

---

## 2. Information Architecture & Layout Structure

The interface uses a single-page responsive split-screen console optimized for $1920 \times 1080$ and $1440 \times 900$ displays:

```
+----------------------------------------------------------------------------------------------------+
| [1] TOP CONSOLE HEADER: System Health | Catalog Counts | Space Weather | Disclaimer Banner         |
+--------------------------------------------------+-------------------------------------------------+
| [2] LEFT PANEL: ALERT & OBJECT TRIAGE (45% Width)| [3] RIGHT PANEL: 3D ORBITAL GLOBE (55% Width)   |
|                                                  |                                                 |
| +----------------------------------------------+ | +---------------------------------------------+ |
| | TAB A: Conjunction Alerts Table              | | | Interactive WebGL Globe (Three.js)            | |
| | - Severity Filter: [All][Crit][Warn][Watch]  | | | - Textured Earth (Local Blue Marble Texture)| |
| | - Ranked candidate encounter rows            | | | - Orbit splines (Primary & Secondary)       | |
| | - TCA (UTC), Miss Dist (km), Rel Speed (km/s)| | | - Real-time satellite 3D markers            | |
| +----------------------------------------------+ | | - Encounter point & relative velocity vector| |
|                                                  | | +---------------------------------------------+ |
| +----------------------------------------------+ |                                                 |
| | TAB B: Selected Object Telemetry Inspector   | | +---------------------------------------------+ |
| | - NORAD ID, Name, COSPAR, Object Type        | | | [4] TIMELINE SCRUBBER & PLAYBACK CONTROLS   | |
| | - Perigee, Apogee, Inclination, Period       | | | [<<] [PLAY/PAUSE] [>>] [JUMP TO TCA]        | |
| | - Element Age (Days) & Staleness Indicator   | | | 2026-10-11 08:30:00 UTC ------O------ 24h   | |
| +----------------------------------------------+ | +---------------------------------------------+ |
+--------------------------------------------------+-------------------------------------------------+
| [5] BOTTOM STATUS BAR: DataSourceMode (ONLINE/CACHED) | SGP4 Status | API Latency | Copyright / MIT|
+----------------------------------------------------------------------------------------------------+
```

---

## 3. View Components & Interaction Specifications

### 3.1 Top Console Header (P0 - MVP Core)
- **Logo & Title:** `ORBITAL RISK ENGINE // SSA OPERATIONS CONSOLE`
- **Catalog Status Badge:**
  - `102 OBJECTS ACTIVE` (Green pill badge)
  - `STALE ELEMENTS: 2` (Amber pill badge if $\Delta t_{\text{age}} > 14\text{ days}$)
- **Data Source Indicator:**
  - `ONLINE LIVE` (Pulsing green dot) when connected to CelesTrak.
  - `CACHED FALLBACK` (Static amber dot) when serving from `data/fixtures/`.
- **Space Weather Context Pill (P1 Enhancement):**
  - Displays real-time $Kp$ index: `Kp 3.7 [UNSETTLED]` with tooltip explaining NOAA scale.
- **Scientific Disclaimer Ribbon (P0 Core):**
  - Persistent text banner:  
    `[NOTICE: Screening metrics represent geometric miss distance. In the absence of covariance data, values do NOT represent collision probability.]`

---

### 3.2 Panel A: Conjunction Alert Triage Table (P0 - MVP Core)
The primary operational worklist for assessing close approaches:
- **Columns:**
  1. **Severity:** Color-coded tier badge (`CRITICAL` $<1\text{ km}$, `WARNING` $1\text{–}5\text{ km}$, `WATCH` $5\text{–}25\text{ km}$, `MONITOR` $25\text{–}50\text{ km}$).
  2. **Primary Object:** Name and NORAD ID (e.g., `ISS (ZARYA) [25544]`).
  3. **Secondary Object:** Name and NORAD ID (e.g., `FENGYUN 1C DEB [48275]`).
  4. **TCA (UTC):** Exact Time of Closest Approach formatted as `YYYY-MM-DD HH:MM:SS UTC`.
  5. **Miss Distance:** Bold numerical figure with unit (e.g., `1.842 km`).
  6. **Rel Speed:** Relative encounter speed (e.g., `14.21 km/s`).
  7. **Action:** `[INSPECT / FOCUS]` button.
- **Table Controls:**
  - **Quick Filters:** Buttons for `All (3)`, `Critical (0)`, `Warning (1)`, `Watch (2)`.
  - **Sorting:** Default sorted by ascending Miss Distance (closest encounters at the top).
- **Row Click Interaction:**
  - Clicking any row selects the conjunction event.
  - Sets global state `selectedEventId`.
  - Animates the 3D globe camera to focus directly on the encounter coordinates.
  - Sets the timeline scrubber to the exact $t_{\text{TCA}}$.

---

### 3.3 Panel B: Object Telemetry Inspector (P1 Enhancement)
Accessible via tab or side-drawer when an object is selected:
- **Header:** Object Name, International Designator (COSPAR), and NORAD Catalog Number.
- **Orbital Parameter Cards:**
  - Perigee Altitude: $416.3\text{ km}$
  - Apogee Altitude: $423.7\text{ km}$
  - Inclination: $51.64^\circ$
  - Orbital Period: $92.86\text{ min}$
  - Semi-Major Axis: $6798.15\text{ km}$
- **Data Freshness Section:**
  - Element Epoch: `2026-10-11 04:12:33 UTC`
  - Element Age: `0.18 days` ($4.3\text{ hours}$)
  - Badge: `FRESH EPOCH (<24h)` (Green) or `STALE EPOCH (>14d)` (Amber).
- **Raw TLE Viewer:**
  - Monospace code block showing Line 1 and Line 2 with character checksum validation indicators.

---

### 3.4 Panel C: Interactive 3D WebGL Globe Viewport (Three.js - P0 Core / P1 Vectors)
- **3D Canvas Elements (P0 Core):**
  - Earth sphere rendered with local daytime landmass texture (`public/earth_daymap.jpg`) and atmospheric glow (100% offline, zero network requests).
  - Primary Object Orbit: Rendered as a continuous glowing cyan spline ($360^\circ$ closed trajectory).
  - Secondary Object Orbit: Rendered as a continuous glowing orange/red spline.
  - Current Position Markers: 3D point markers along orbits with floating callout labels.
  - **Encounter Point Marker at TCA:** A pulsating beacon rendered at the exact coordinates of closest approach.
- **Advanced 3D Telemetry (P1 Enhancement):**
  - **Relative Velocity Vector:** A directional 3D vector arrow pointing along $\mathbf{v}_{\text{rel}} = \mathbf{v}_A - \mathbf{v}_B$ at TCA using backend-supplied coordinates.
- **Camera Navigation (P0 Core):**
  - Orbit control: Left-click and drag to rotate Earth using Three.js `OrbitControls`.
  - Zoom: Scroll wheel to zoom from Low Earth Orbit ($500\text{ km}$) to Deep Space ($25,000\text{ km}$).
  - Pan: Right-click and drag.
  - `[RESET CAMERA]` floating button.

---

### 3.5 Panel D: Timeline Scrubber & Simulation Playback (P1 Enhancement)
- **Timeline Slider:**
  - Spans from current time $t_0$ to $t_0 + 24\text{ hours}$.
  - Markers indicating candidate TCA moments as vertical color-coded ticks along the track.
- **Playback Controls:**
  - `Play / Pause` button.
  - Playback Speed: `1x`, `10x`, `60x`, `300x`.
  - `[JUMP TO TCA]` button: Instantly positions the simulation cursor at the exact second of closest approach.

---

## 4. System States & Defensive UX

The dashboard strictly differentiates empty operational states from backend network failures:

```
+-----------------------------------+-----------------------------------------------------------------+
| System State                      | UI Representation & User Feedback                               |
+-----------------------------------+-----------------------------------------------------------------+
| 1. Normal Operation (Alerts Found)| Alert table lists ranked conjunction events with colored tiers. |
|                                   | Status pill shows "3 CONJUNCTIONS DETECTED".                    |
+-----------------------------------+-----------------------------------------------------------------+
| 2. Confirmed Clear Screening      | Alert table displays a clean green banner:                      |
|    (0 Conjunctions Detected)      | "SCREENING COMPLETE // ZERO CLOSE APPROACHES DETECTED"          |
|                                   | "No candidate pairs breached the 50.0 km screening threshold."  |
|                                   | (Strictly distinguishes zero results from system failure).      |
+-----------------------------------+-----------------------------------------------------------------+
| 3. Upstream Outage / Cached Mode  | Yellow header banner: "[NOTICE: CelesTrak Offline - Operating   |
|                                   | on local verified test fixtures. Data freshness preserved.]"    |
+-----------------------------------+-----------------------------------------------------------------+
| 4. Backend Disconnected           | Modal banner: "Connecting to Screening Engine..." with a toggle:|
|                                   | "[Switch to Bundled Client Demo Mode]" for presentation safety. |
+-----------------------------------+-----------------------------------------------------------------+
| 5. SGP4 Computation Error         | Red toast notification identifying the object: "NORAD 99999     |
|                                   | orbit decayed during propagation window. Point marked invalid." |
+-----------------------------------+-----------------------------------------------------------------+
```

---

## 5. Confirmed Technical Decisions

1. **[CONFIRMED DECISION 1 - Default Screen Split]:**
   The layout defaults to a 45% left (Data Table / Inspector) and 55% right (3D Globe) split. Users can toggle a fullscreen 3D globe mode with a top-right maximize icon.
2. **[CONFIRMED DECISION 2 - 3D Visualization Engine]:**
   Three.js is confirmed as the 3D globe visualizer using a local Earth texture (`public/earth_daymap.jpg`), completely eliminating Cesium ion tokens, bundler worker plugins, and asset 404 hazards.
3. **[CONFIRMED DECISION 3 - P0 vs P1 Scope Separation]:**
   P0 MVP delivers static orbit splines, encounter markers, and alert table focus at TCA. Animated timeline scrubbing is strictly designated as a P1 enhancement.

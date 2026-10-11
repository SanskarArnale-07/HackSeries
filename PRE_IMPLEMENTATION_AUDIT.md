# PRE_IMPLEMENTATION_AUDIT.md: Pre-Implementation Audit & Feasibility Assessment

> **System Target:** Orbital Conjunction & Space Traffic Risk Engine  
> **Development Context:** 8-Hour Engineering Hackathon (5-Person Team; 4 Vibe-Coding Beginners)  
> **Audit Status:** Authoritative Pre-Implementation Baseline  
> **Audited Files:** `AGENTS.md`, `PROJECT_BRIEF.md`, `ARCHITECTURE.md`, `API_CONTRACT.md`, `ORBITAL_ENGINE.md`, `DATA_PIPELINE.md`, `UI_UX_SPEC.md`, `DESIGN_SYSTEM.md`, `TESTING_AND_VALIDATION.md`, `HACKATHON_EXECUTION_PLAN.md`, `DEPLOYMENT.md`

---

## 1. Executive Summary

This audit evaluates the system architecture, mathematical formulations, and engineering roadmap before writing application code. 

**Core Finding:** The project's aerospace foundations (especially the categorical rejection of unvalidated collision probability $P_c$) are sound and scientifically defensible. However, **several critical implementation traps** must be addressed before coding begins:
1. **Visualization Library Overkill:** CesiumJS is too complex for an 8-hour hackathon with four vibe-coding beginners; **Three.js / Globe.gl** must be formally adopted to avoid hours of Vite bundling and asset configuration.
2. **Conjunction Screening Edge Cases:** While the coarse trigger threshold was expanded to $500\text{ km}$, strict equality checks ($d(t_k) < d(t_{k+1})$) can fail on symmetric midpoint encounters without non-strict comparisons ($\le$).
3. **Coordinate Frame Handoff for 3D Vectors:** The backend currently outputs relative velocity vectors in the inertial TEME frame, while the 3D globe operates in Earth-Centered Earth-Fixed (ECEF) coordinates. This forces the frontend to perform complex sidereal time rotations in JavaScript unless resolved at the API layer.
4. **Scope Creep vs. Team Profile:** Advanced timeline scrubbers, multi-speed playback, and geomagnetic storm scenario injectors threaten MVP delivery and must be formally relegated to P1/P2.

---

## 2. Itemized Issue Log (Severity Rated)

### Issue 1: 3D Visualization Library Overhead (CesiumJS vs. Hackathon Realities)
- **Severity:** **Critical**
- **Affected Files & Sections:**
  - [`ARCHITECTURE.md`](./ARCHITECTURE.md) §4.1, §4.2 (Table 4.1)
  - [`UI_UX_SPEC.md`](./UI_UX_SPEC.md) §3.4
  - [`DEPLOYMENT.md`](./DEPLOYMENT.md) §4, §6
  - [`HACKATHON_EXECUTION_PLAN.md`](./HACKATHON_EXECUTION_PLAN.md) §2, §4
- **What is Wrong or Ambiguous:**
  CesiumJS is listed as the primary proposed visualization engine. In Vite, CesiumJS requires `@types/cesium`, `vite-plugin-cesium`, copying ~50 MB of static assets (Workers, Assets, Widgets), handling WebGL shader compilation, and configuring ion access tokens. For a 5-person team where 4 members are new to vibe coding, debugging Cesium asset 404s and Web Worker communication in Vite routinely consumes 2 to 3 hours of the 8-hour window.
- **Recommended Resolution:**
  **Formally select Three.js with Globe.gl (or standard Three.js textured sphere + 3D splines).**
  - Zero external access tokens or accounts required.
  - Zero Vite plugin asset copying required.
  - Runs 100% offline using a single local 2 MB NASA Blue Marble equirectangular texture in `frontend/public/earth.jpg`.
  - Orbit splines are drawn with native `THREE.Line` / `THREE.BufferGeometry` in under 40 lines of clean React code.

---

### Issue 2: Relative Velocity Vector Coordinate Frame Mismatch
- **Severity:** **High**
- **Affected Files & Sections:**
  - [`API_CONTRACT.md`](./API_CONTRACT.md) §2.3 (`relative_velocity_vector_teme`)
  - [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md) §2.5
  - [`UI_UX_SPEC.md`](./UI_UX_SPEC.md) §3.4
- **What is Wrong or Ambiguous:**
  The API contract specifies that relative encounter velocity is returned as `relative_velocity_vector_teme: {vx, vy, vz}` in kilometers per second. However, the 3D globe renders Earth in the Earth-Centered, Earth-Fixed (ECEF / WGS-84) frame. 
  If Frontend Dev 2 plots a TEME vector directly onto an ECEF globe, the velocity arrow will be misaligned by the Greenwich Mean Sidereal Time (GMST) angle ($\theta_{\text{GMST}}$) at TCA. Expecting a beginner frontend developer to write sidereal time coordinate transformations in JavaScript creates severe integration friction.
- **Recommended Resolution:**
  The backend must compute the GMST rotation matrix at $t_{\text{TCA}}$ and provide **both** inertial and earth-relative representation in the API response:
  Add `relative_velocity_vector_ecef: {vx, vy, vz}` to `ConjunctionEventDto`. Frontend Dev 2 can then render the vector arrow in Three.js without any celestial coordinate conversions.

---

### Issue 3: Symmetric Midpoint Conjunction Local Minimum Detection
- **Severity:** **High**
- **Affected Files & Sections:**
  - [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md) §2.3, §2.4
  - [`TESTING_AND_VALIDATION.md`](./TESTING_AND_VALIDATION.md) §3.3 (Test Case 3.3)
- **What is Wrong or Ambiguous:**
  In `ORBITAL_ENGINE.md` §2.3, candidate minima on the 60-second coarse grid are detected when:
  $$d(t_k) < d(t_{k-1}) \quad \text{and} \quad d(t_k) < d(t_{k+1})$$
  If an encounter occurs exactly midway between two coarse sample points (e.g. at $t = t_k + 30.0\text{s}$), the two adjacent samples $t_k$ and $t_{k+1}$ may have nearly identical or mathematically equal Euclidean distances: $d(t_k) \approx d(t_{k+1})$.
  Strict inequality (`<`) will evaluate to `False` for both $t_k$ and $t_{k+1}$, causing the algorithm to silently discard the local minimum!
- **Recommended Resolution:**
  1. Change the coarse local minimum condition to non-strict inequality:
     $$d(t_k) \le d(t_{k-1}) \quad \text{and} \quad d(t_k) \le d(t_{k+1})$$
  2. In the event of a plateau ($d(t_k) == d(t_{k+1})$ within a 1% relative tolerance), set the search bracket to $[t_{k-1}, t_{k+2}]$ and evaluate the midpoint $t_{\text{mid}} = t_k + 30\text{s}$ to establish a valid unimodal bracket before executing Golden-Section Search.

---

### Issue 4: Decayed Satellites and `NaN` Propagation in Vectorized NumPy Arrays
- **Severity:** **Medium**
- **Affected Files & Sections:**
  - [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md) §1.1, §2.3
  - [`ARCHITECTURE.md`](./ARCHITECTURE.md) §8.3
- **What is Wrong or Ambiguous:**
  In SGP4, if a satellite's perigee dips into Earth's dense atmosphere ($h_p < 80\text{ km}$), the propagator terminates with error code 6 (decay). 
  In a vectorized NumPy array structure `positions[N, T, 3]`, an unhandled SGP4 decay exception will leave unfilled values or `NaN`s in the array. When pair-wise Euclidean distances $d(t) = \|\mathbf{P}_i(t) - \mathbf{P}_j(t)\|$ are computed via array broadcasting, any `NaN` propagates across comparisons, causing boolean masking (`d < 500.0`) to silently fail or throw invalid value runtime warnings.
- **Recommended Resolution:**
  The propagation engine must explicitly handle decayed objects:
  - If SGP4 raises error 6 at step $k$, freeze the remaining trajectory coordinates to a subterranean sentinel $[0.0, 0.0, 0.0]$ and mark the object's status metadata as `DECAYED_IN_WINDOW`.
  - Exclude decayed objects from pair-wise distance screening from the moment of decay.

---

### Issue 5: Discrepancy in Screening Trigger Endpoint Response
- **Severity:** **Low**
- **Affected Files & Sections:**
  - [`API_CONTRACT.md`](./API_CONTRACT.md) §2.6
  - [`ARCHITECTURE.md`](./ARCHITECTURE.md) §5.1, §9.1
- **What is Wrong or Ambiguous:**
  In `API_CONTRACT.md` §2.6, `POST /screening/refresh` returns:
  `{"status": "COMPLETED", "execution_duration_ms": 1420, "events_count": 1}`.
  However, in `ARCHITECTURE.md` §9.1 and `HACKATHON_EXECUTION_PLAN.md`, this route is described as an optional trigger, while the GET endpoints (`/conjunctions`) are treated as the primary interface.
  If Frontend Dev 1 attempts to build an interactive "Refresh Screening" button that expects a re-calculation loop, it introduces unnecessary state synchronization issues.
- **Recommended Resolution:**
  Relegate `POST /screening/refresh` to **P2 (Optional)**. In the P0 MVP, screening is executed once on server startup (or loaded from cache), and the frontend strictly queries `GET /api/v1/conjunctions`.

---

### Issue 6: Unverified Synthetic Test Target Assertion Bounds
- **Severity:** **Medium**
- **Affected Files & Sections:**
  - [`TESTING_AND_VALIDATION.md`](./TESTING_AND_VALIDATION.md) §3.3 (Test Case 3.2)
  - [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md) §4.2
- **What is Wrong or Ambiguous:**
  Test Case 3.2 in `TESTING_AND_VALIDATION.md` specifies assertions against `data/fixtures/synthetic_close_pair.tle` without committing the underlying TLE lines or the calibration metadata. If developer tests fail due to slight numerical discrepancies between platforms (e.g. Linux vs. Windows floating-point rounding in SGP4), developers could waste valuable hackathon time debugging whether the test or the propagator is wrong.
- **Recommended Resolution:**
  The calibration script (`scripts/generate_synthetic_fixture.py`) must be executed during Hour 1 by Data Dev 2. The script must write both the TLE file and a JSON ground-truth file containing:
  - Exact $t_{\text{TCA}}$ in UTC
  - Exact miss distance in km
  - Exact relative velocity in km/s
  Test assertions must load this JSON file directly and apply a robust floating-point tolerance ($\pm 1.0\text{s}$ for TCA, $\pm 0.05\text{ km}$ for miss distance).

---

## 3. Coarse Sampling & Refinement Reliability Analysis

### 3.1 Mathematical Soundness of the 500 km Trigger
In circular Low Earth Orbit:
- Maximum circular velocity at $300\text{ km}$ altitude:
  $$v_{\text{circ}} = \sqrt{\frac{398600.4418}{6378.137 + 300}} \approx 7.72\text{ km/s}$$
- Maximum possible head-on relative velocity between two circular LEO objects:
  $$v_{\text{rel,max}} = 2 \times v_{\text{circ}} \approx 15.44\text{ km/s}$$
- On a 60-second coarse grid, the maximum time offset between the true TCA and the nearest coarse sample point is:
  $$\tau_{\text{max}} = \frac{\Delta t_{\text{coarse}}}{2} = 30.0\text{ seconds}$$
- For an encounter with true minimum separation $d_{\text{min}} \le 50.0\text{ km}$, the Euclidean distance at the nearest coarse sample point is bounded by:
  $$d_{\text{sample}} \le \sqrt{d_{\text{min}}^2 + (v_{\text{rel,max}} \cdot \tau_{\text{max}})^2} = \sqrt{50^2 + (15.44 \times 30)^2} = \sqrt{2500 + 214556} \approx 465.9\text{ km}$$

**Conclusion:** Setting the coarse proximity trigger to $D_{\text{coarse\_trigger}} = 500.0\text{ km}$ guarantees that **zero candidate circular LEO close approaches will be omitted**, provided the local minimum plateau condition (Issue 3) is handled properly.

---

## 4. API Contract vs. Frontend/Backend Responsibility Alignment

An audit of [`API_CONTRACT.md`](./API_CONTRACT.md) against frontend component requirements shows that the contracts are largely well-aligned, with one essential addition:

| Component | Required Data | API Contract Source | Status |
| :--- | :--- | :--- | :--- |
| **Alert Triage Table** | NORAD IDs, names, TCA, miss distance, relative speed, severity badge | `GET /conjunctions` (`events` array) | **Complete & Aligned** |
| **3D Earth Globe** | Orbit paths over 24 hours (Cartesian ECEF & Lat/Lon/Alt) | `GET /ephemeris/{norad_id}` | **Complete & Aligned** |
| **Encounter Marker** | Latitude, Longitude, Altitude of close approach | `GET /conjunctions` (`encounter_location_wgs84`) | **Complete & Aligned** |
| **Encounter 3D Vector** | Relative velocity vector in Earth-fixed coordinates | `GET /conjunctions` (`relative_velocity_vector_ecef`) | **Needs Resolution (Issue 2)** |
| **Health Header** | Object counts, data source status (`ONLINE_LIVE` vs `CACHED_FALLBACK`) | `GET /health` | **Complete & Aligned** |
| **Space Weather Card** | $Kp$ index, $F_{10.7}$ flux, storm alert tier | `GET /space-weather` | **Complete (P1)** |

---

## 5. Feature Classification (P0 / P1 / P2 Priorities)

Given that four team members are new to vibe coding, strict scope discipline is vital:

```
+----------------------------------------------------------------------------------------------------+
|                                    FEATURE TRIAGE CLASSIFICATION                                   |
+----------------------------------------------------------------------------------------------------+

  [ P0: ESSENTIAL WORKING MVP (Must be completed by Hour 4:30) ]
  1. Offline Snapshot Ingestion: Read data/fixtures/celestrak_snapshot.txt with live fallback.
  2. TLE Parsing & Validation: Line length (69 chars), Line 1 & Line 2 modulo 10 checksums.
  3. SGP4 Trajectory Propagation: Ingest 50-100 LEO objects, propagate over 24h at 60s steps in TEME.
  4. Conjunction Screening Engine: Stage 1 radial filter -> Stage 2 coarse 500 km trigger ->
     Stage 3 Golden-Section refinement to <= 1.0s TCA tolerance with <= 50 km final filter.
  5. REST API: FastAPI endpoints: GET /health, GET /objects, GET /conjunctions, GET /ephemeris/{norad_id}.
  6. Frontend Operations Console:
     - Header: Health status badge, catalog count, offline fallback indicator.
     - Left Panel: Conjunction Alert Triage Table with color-coded severity badges.
     - Right Panel: Three.js 3D Globe with textured Earth, primary/secondary orbit splines,
       and close encounter marker at TCA.
     - Persistent Scientific Disclaimer Banner (clarifying miss distance != collision probability).
  7. Automated Tests: Pytest unit tests for SGP4 math and API contract compliance.

  [ P1: USEFUL ENHANCEMENTS (Hours 5:00 - 6:30, if P0 is functional) ]
  1. Space Weather Telemetry Widget: Ingest NOAA SWPC Kp index & F10.7 solar flux.
  2. Earth-Relative Encounter Vector: 3D directional arrow rendered at TCA on the globe.
  3. Interactive Camera Focus: Clicking an alert row animates the Three.js camera to encounter coords.
  4. Object Inspector Drawer: Side panel displaying satellite telemetry and raw TLE lines.
  5. Single-Command Launcher: run_demo.py running FastAPI and Vite concurrently with --offline flag.

  [ P2: OPTIONAL / CUT FIRST (De-scope immediately if time is short) ]
  1. Orbit Timeline Scrubber: Multi-speed playback slider animating satellites along splines.
  2. Dynamic Space-Weather Scenario Injection: Simulated G4 geomagnetic storm decay modifier.
  3. Runtime Screening Trigger: POST /api/v1/screening/refresh endpoint.
  4. Full-text search and pagination query parameters on GET /objects.
  5. Cesium ion high-resolution terrain streaming.
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Visualization Library Recommendation: Three.js / Globe.gl

### 6.1 Recommendation: Adopt Three.js / Globe.gl; Reject CesiumJS
We definitively recommend **Three.js with a lightweight sphere textured by a local equirectangular Earth image** (or `three-globe` / `Globe.gl`).

### 6.2 Justification for an 8-Hour Hackathon with Beginners
1. **Zero Access Tokens or Licensing Friction:** CesiumJS requires a Cesium ion token for standard basemaps. If an API key expires or is blocked by venue Wi-Fi, the globe fails to render. Three.js uses a local 2 MB JPEG image (`public/earth_daymap.jpg`) with 100% offline reliability.
2. **Zero Vite Bundling / Web Worker Issues:** CesiumJS requires copying static assets (`Cesium/Workers`, `Cesium/Assets`, `Cesium/Widgets`) and configuring specialized bundler plugins (`vite-plugin-cesium`). In Vite, this frequently leads to MIME-type errors, broken dynamic imports, and compilation failures. Three.js installs cleanly via `npm install three @types/three` and works instantly with zero bundler plugins.
3. **Low Cognitive Load for Vibe Coding:** Three.js scene creation consists of four simple primitives:
   - `SphereGeometry` + `MeshStandardMaterial` for Earth.
   - `Line` + `BufferGeometry` for orbital splines.
   - `Points` for current satellite positions.
   - `Mesh` (sphere/beacon) for the encounter point.
   This can be generated, understood, and debugged by beginner vibe coders in under 45 minutes.

---

## 7. Minimum Dependencies Required

To prevent dependency hell and prolonged install times, dependencies are trimmed to the absolute minimum:

### 7.1 Backend (`backend/requirements.txt`)
```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
sgp4>=2.23
numpy>=1.26.0
pydantic>=2.6.0
httpx>=0.27.0
pytest>=8.0.0
```
*(Total download size: $< 40\text{ MB}$; installation time: $< 30\text{ seconds}$)*.

### 7.2 Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^0.162.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/three": "^0.162.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0"
  }
}
```
*(Zero Tailwind, zero Redux, zero Cesium, zero component library bloat; styling handled by Vanilla CSS tokens defined in `DESIGN_SYSTEM.md`)*.

---

## 8. Missing Decisions That Would Prevent Implementation

The following three implementation decisions must be resolved before writing code:

1. **[DECISION 1 - 3D Coordinate Convention in `/ephemeris`]:**
   Does `/api/v1/ephemeris/{norad_id}` return Cartesian ECEF kilometers $[x, y, z]$, Geodetic Cartographic $[\text{lat}, \text{lon}, \text{alt}]$, or both?
   - *Recommendation:* Return **both** in each point object (`lat_deg`, `lon_deg`, `alt_km`, `ecef_km: {x, y, z}`). This allows Three.js to plot Cartesian coordinates directly on the sphere without frontend trigonometric conversions.
2. **[DECISION 2 - Baseline Catalog Snapshot Contents]:**
   Which specific satellites form the static 100-object demonstration catalog in `data/fixtures/celestrak_snapshot.txt`?
   - *Recommendation:* Curate the snapshot with:
     - Human Spaceflight: ISS (25544), Tiangong CSS (48274).
     - Famous Payloads: Hubble Space Telescope (20580), Envisat (27386).
     - Commercial Constellations: 50 active Starlink and OneWeb satellites.
     - Known Debris: 40 cataloged debris fragments from the Cosmos 1408 and Fengyun-1C fragmentation events.
3. **[DECISION 3 - Velocity Vector in ECEF]:**
   Confirm that the backend will provide `relative_velocity_vector_ecef` alongside `relative_velocity_vector_teme` to unblock 3D vector rendering on the globe.

---

## 9. Test Plan Evaluation: False Negatives & TCA Precision

### 9.1 Can the Test Plan Detect False Negatives?
- **Current Vulnerability:** If the test suite only tests co-planar orbits with low relative velocities, it will not detect whether the 500 km coarse trigger succeeds under high-velocity conditions ($v_{\text{rel}} \approx 14\text{ km/s}$).
- **Required Test Addition:** The test suite must include `test_high_speed_cross_track_encounter`:
  - Primary: Circular LEO at inclination $51.6^\circ$.
  - Secondary: Circular LEO at retrograde inclination $98.0^\circ$ (crossing geometry, $v_{\text{rel}} \approx 13.5\text{ km/s}$).
  - Verify that the pair is captured and that miss distance converges to the true analytical minimum.

### 9.2 Can the Test Plan Detect Incorrect TCA Calculations?
- **Current Vulnerability:** If an encounter occurs at the edge of the screening window (e.g. $t = 23\text{h }59\text{m}$), the search bracket cannot be closed on the right side.
- **Required Test Addition:** Add `test_window_boundary_tca`:
  - Verifies that boundary close approaches do not trigger an index out-of-bounds error and correctly compute one-sided minimum separation.

---

## 10. Final Architecture & Execution Blueprint

### A. Final Recommended MVP Scope (P0)
1. **Data:** Ingest 100 curated LEO objects from `data/fixtures/celestrak_snapshot.txt` with CelesTrak HTTP fallback.
2. **Engine:** SGP4 TEME propagation + Stage 1 radial filter + Stage 2 coarse 60s grid (500 km trigger) + Stage 3 Golden-Section refinement ($\le 1.0\text{s}$ tolerance).
3. **API:** FastAPI endpoints: `GET /health`, `GET /objects`, `GET /conjunctions`, `GET /ephemeris/{norad_id}`.
4. **UI:** React split-screen console:
   - Header with health badge and scientific disclaimer.
   - Conjunction Alert Triage Table (TCA, miss distance, relative speed, severity badges).
   - Three.js 3D Globe rendering Earth texture, orbit splines, and encounter point beacon.

### B. Final Technology Stack
- **Backend:** Python 3.11+, FastAPI, SGP4, NumPy, Pydantic v2, HTTPX, Pytest.
- **Frontend:** React 18, Vite, TypeScript, Three.js, Vanilla CSS tokens.
- **Data/Fixtures:** Plaintext TLE snapshot, JSON SWPC snapshot.

### C. Recommended Implementation Order (Hour 0 to Hour 8)
1. **Hour 0:00 - 0:45:** Create `data/fixtures/celestrak_snapshot.txt` and `backend/mock_data.py`. Verify FastAPI serves mock JSON matching `API_CONTRACT.md`.
2. **Hour 0:45 - 2:00:** 
   - Backend: Build TLE validator and SGP4 propagation engine.
   - Frontend: Build Dashboard shell and Conjunction Alert Table consuming mock API.
   - Frontend 2: Initialize Three.js Earth sphere with local texture.
3. **Hour 2:00 - 3:45:**
   - Backend: Implement Stage 1 radial filter, Stage 2 coarse 500 km search, and Stage 3 Golden-Section refinement.
   - Frontend 2: Render 3D orbit splines and encounter point beacon from ephemeris data.
4. **Hour 3:45 - 4:30:** **Midpoint Integration Gate:** Connect frontend to live FastAPI endpoints; verify real conjunctions populate the table and globe.
5. **Hour 4:30 - 6:00 (P1 Polish):** Add Space Weather context widget, camera focus on alert row click, and offline test mode.
6. **Hour 6:00 - 7:15:** Run full Pytest suite; test air-gapped demo with Wi-Fi disabled.
7. **Hour 7:15 - 8:00:** Code freeze, 3-minute demo rehearsal.

### D. Decisions Requiring Human Approval
1. **Approval of Three.js over CesiumJS:** Confirm replacing CesiumJS with Three.js to eliminate ion tokens and bundler plugins.
2. **Approval of `relative_velocity_vector_ecef` API Addition:** Confirm adding Earth-fixed encounter velocity vector to `ConjunctionEventDto`.
3. **Approval of P0/P1/P2 Scope Boundaries:** Confirm freezing the P0 MVP to the core screening pipeline, alert table, and 3D globe, treating timeline scrubbers and scenario injectors as optional P1/P2 enhancements.

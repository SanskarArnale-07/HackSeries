# ARCHITECTURE.md: Orbital Conjunction & Space Traffic Risk Engine

> **Project Target:** 8-Hour Hackathon Prototype  
> **Engineering Team:** 5 Developers (1 Backend/Integration Lead, 2 Frontend Developers, 2 Data Pipeline Developers)  
> **Document Status:** Authoritative Architectural Baseline  
> **Related Specifications:** [`API_CONTRACT.md`](./API_CONTRACT.md), [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md), [`DATA_PIPELINE.md`](./DATA_PIPELINE.md), [`HACKATHON_EXECUTION_PLAN.md`](./HACKATHON_EXECUTION_PLAN.md)

---

## 1. Overview

### 1.1 The Problem
Low Earth Orbit (LEO) is experiencing exponential growth in satellite constellations, spent rocket bodies, and fragmentation debris. Satellite operators and orbital analysts require rapid situational awareness of close approaches (conjunctions). However, comprehensive catalog screening across 45,000+ objects demands high-performance compute clusters and specialized astrodynamics toolkits. Small operators, researchers, and public stakeholders lack accessible, transparent, and interactive screening engines capable of isolating high-priority orbital conjunctions within a lightweight dashboard.

### 1.2 System Purpose
The **Orbital Conjunction & Space Traffic Risk Engine** is an open-architecture, developer-friendly monitoring tool that:
1. Ingests and validates orbital elements (Two-Line Element sets / General Perturbations data) for a bounded, high-interest subset of Low Earth Orbit objects.
2. Propagates trajectories over a defined screening window (24–72 hours) using a standardized Simplified General Perturbations 4 (SGP4) analytical propagator.
3. Detects candidate conjunctions, computes the Time of Closest Approach (TCA), relative velocity, and minimum geometric separation (miss distance).
4. Delivers actionable alerts, contextual space-weather metrics, and 3D geospatial trajectories through a responsive, web-based operations dashboard.

### 1.3 Intended Users
- **Orbital Operations Students & Researchers:** Exploring close approach geometries and propagation behaviors.
- **Satellite Operators & Mission Planners:** Evaluating candidate close encounters for active LEO payloads against cataloged debris.
- **Space Situational Awareness (SSA) Analysts:** Demonstrating real-time visualization and deterministic screening workflows during briefings.

### 1.4 Core Functionality
- **Automated / Snapshot Ingestion:** Ingests General Perturbations (GP) TLE datasets from CelesTrak with deterministic local caching.
- **Strict Data Validation:** Enforces schema conformity, epoch currency checks, and orbital element bounds before computation.
- **Dual-Phase Conjunction Screening:** Implements apogee-perigee altitude filtering followed by fine-resolution temporal propagation to detect closest approach minima.
- **Contextual Space-Weather Overlay:** Queries NOAA Space Weather Prediction Center (SWPC) metrics (Kp index, 10.7 cm Solar Radio Flux) for situational awareness.
- **Interactive 3D Web Dashboard:** Visualizes Earth, orbital ephemeris paths, sensor footprints, and conjunction vectors with an alert triage drawer.

### 1.5 MVP Boundaries (8-Hour Hackathon Scope)
To ensure delivery within an 8-hour timeframe by a 5-person team, the MVP strictly adheres to bounded execution constraints:
- **Core P0 MVP Focus:** Robust SGP4 orbital propagation, pairwise conjunction screening with TCA and geometric miss distance, a lightweight FastAPI backend, and a functional React + Three.js operations dashboard.
- **Bounded Target Catalog:** Fixed subset of 50 to 200 cataloged objects (e.g., active human spaceflight missions including ISS/CSS, mega-constellation shells, and high-risk debris families).
- **Fixed Screening Window:** Standard 24-hour lookahead horizon (configurable up to 72 hours), evaluated at coarse intervals (60s) with local refinement (1s) around candidate minima.
- **Analytical SGP4 Only:** Propagation relies strictly on standard SGP4/SDP4; numerical integrators (e.g., Cowell/Dormand-Prince) and high-order gravity/radiation pressure models are excluded.
- **Deterministic Geometric Metrics:** Output metrics are restricted to geometric miss distance ($\Delta r$), relative velocity vectors in both TEME and ECEF frames ($\mathbf{v}_{\text{rel}}$), and TCA.
- **Self-Contained Local Execution:** Single backend service (FastAPI) and single frontend single-page application (React/Vite) with 100% offline capability using local fixtures and a bundled Earth texture.

### 1.6 Explicitly Excluded & Deferred Features
- **Collision Probability ($P_c$) Calculation:** Calculation of Foster-1992, Akella-Alfriend, or 2D/3D Gaussian collision probabilities is **explicitly excluded**. TLE data does not contain position/velocity covariance matrices ($\mathbf{P}_{3\times3}$ or $\mathbf{P}_{6\times6}$). Miss distance is strictly a geometric heuristic.
- **Deferred Out of P0 MVP (P1 / P2 Scope):**
  - Animated timeline playback and scrubbing (P1 enhancement; P0 focuses on static orbit and TCA vector visualization).
  - Dynamic solar storm scenario injection (P2 optional; P0 displays contextual SWPC telemetry from cache).
  - Runtime screening threshold re-triggering via `POST /screening/refresh` (P2 optional; P0 pre-screens upon server startup).
- **Orbital Maneuver Optimization:** No autonomous burn planning, delta-v calculation, or propulsion modeling.
- **Live Catalog Tracking of 50,000+ Objects:** All-pairs $O(N^2)$ brute-force screening over the entire public space track catalog is computationally incompatible with an 8-hour hackathon compute footprint.
- **Direct Atmospheric Density Couplers:** Dynamic thermospheric drag coupling (e.g., NRLMSISE-00 / JB2008 driven by real-time solar indices) is excluded from the propagation loop; SGP4 relies on its internal static ballistic drag parameter ($B^*$).
- **Multi-Tenant Authentication & Distributed Queues:** No Kafka, Celery, Redis, Kubernetes, or OAuth2 workflows.

---

## 2. System Components

```
+----------------------------------------------------------------------------------------------------+
|                                    SYSTEM COMPONENT TOPOLOGY                                       |
+----------------------------------------------------------------------------------------------------+

  [ Upstream: CelesTrak ]                     [ Upstream: NOAA SWPC ]
             |                                           |
             v                                           v
  +-------------------------+                 +-------------------------+
  |  2.1 Ingestion Engine   |                 | 2.5 Space Weather Feed  |
  +-------------------------+                 +-------------------------+
             |                                           |
             v                                           v
  +-------------------------+                 +-------------------------+
  |  2.2 Data Validation    |                 |   Contextual Storage    |
  |    & Normalization      |                 |    & Scenario Store     |
  +-------------------------+                 +-------------------------+
             |                                           |
             v                                           |
  +-------------------------+                            |
  | 2.3 SGP4 Propagation    |                            |
  |         Engine          |                            |
  +-------------------------+                            |
             |                                           |
             v                                           |
  +-------------------------+                            |
  | 2.4 Conjunction         |                            |
  |     Screening Engine    |                            |
  +-------------------------+                            |
             |                                           |
             +--------------------+----------------------+
                                  |
                                  v
                      +-------------------------+
                      |     2.6 Backend API     |
                      |   (FastAPI Endpoints)   |
                      +-------------------------+
                                  |
                   JSON / HTTP    |    Local Cache (2.8)
                                  v
                      +-------------------------+
                      | 2.7 Frontend Dashboard  |
                      |   & 3D WebGL Viewer     |
                      +-------------------------+
```

### 2.1 Orbital Data Ingestion
- **Responsibilities:** Fetches orbital elements for pre-selected object groups from CelesTrak GP/TLE endpoints; falls back immediately to committed local snapshots if upstream APIs timeout or rate-limit.
- **Inputs:** Target catalog group configurations (e.g., `stations.txt`, `active.txt`), local filesystem cache path.
- **Outputs:** Raw TLE line-pairs/triplets or OMM (Orbit Mean-Elements Message) JSON strings accompanied by ingestion epoch timestamps.
- **Dependencies:** HTTP client library (`httpx` / `requests`), local filesystem I/O.

### 2.2 Data Validation and Normalization
- **Responsibilities:**
  - Verifies TLE checksums (modulo 10 across columns 1–68) and string lengths (strictly 69 characters per line).
  - Validates epoch timestamps, inclination ($0 \le i \le 180^\circ$), eccentricity ($0 \le e < 1$), mean motion ($n > 0$), and NORAD ID integer formatting.
  - Normalizes orbital records into immutable internal Pydantic domain models with canonical UTC ISO-8601 timestamps.
  - Flags or discards stale orbital elements where $\Delta t_{\text{epoch}} = |t_{\text{current}} - t_{\text{epoch}}| > 14\text{ days}$.
- **Inputs:** Raw TLE/OMM payloads.
- **Outputs:** Collection of validated `OrbitalObject` domain entities.
- **Dependencies:** `pydantic`, Python standard library `datetime`.

### 2.3 Orbital Propagation Engine
- **Responsibilities:**
  - Initializes standard SGP4/SDP4 satellite models from validated orbital elements.
  - Computes state vectors (position $\mathbf{r}$ in km, velocity $\mathbf{v}$ in km/s) at discrete temporal steps $t_k \in [t_{\text{start}}, t_{\text{end}}]$.
  - Preserves the native True Equator, Mean Equinox (TEME) reference frame throughout propagation, and provides deterministic transformations to International Terrestrial Reference Frame (ITRF/ECEF) or GCRF where required for 3D globe display.
- **Inputs:** Validated `OrbitalObject` instances, evaluation timestamps or epoch offsets.
- **Outputs:** Ephemeris trajectories containing arrays of Cartesian state vectors $[\mathbf{r}(t_k), \mathbf{v}(t_k)]$ in TEME and converted ECEF coordinates.
- **Dependencies:** `sgp4` (official Python implementation by Brandon Rhodes / David Vallado), `numpy`.

### 2.4 Conjunction Screening Engine
- **Responsibilities:**
  - Executes pair-wise screening across candidate pairs $(A, B)$ using a two-stage filter:
    1. *Stage 1 (Geometric Filter):* Compares perigee and apogee radial boundaries: if $(r_{p, A} - d_{\text{margin}}) > r_{a, B}$ or $(r_{p, B} - d_{\text{margin}}) > r_{a, A}$, the pair is bypassed without time-series propagation.
    2. *Stage 2 (Temporal Coarse-to-Fine Search):* Evaluates Euclidean separation $d(t) = \|\mathbf{r}_A(t) - \mathbf{r}_B(t)\|$ on a 60-second coarse grid over the window. When $d(t) < D_{\text{threshold}}$ (e.g., 50 km), a localized 1-second bisection/golden-section search isolates the exact local minimum.
  - Calculates the Time of Closest Approach (TCA), minimum separation distance (miss distance in km), relative velocity vector ($\mathbf{v}_{\text{rel}} = \mathbf{v}_A - \mathbf{v}_B$), and scalar relative speed ($\|\mathbf{v}_{\text{rel}}\|$ in km/s).
  - Assigns deterministic screening risk tiers based strictly on geometric miss distance.
- **Inputs:** Propagated ephemerides, screening threshold $D_{\text{threshold}}$, screening duration.
- **Outputs:** Ranked collection of `ConjunctionEvent` records.
- **Dependencies:** `numpy`.

### 2.5 Space-Weather Integration
- **Responsibilities:**
  - Retrieves real-time and historical space-weather telemetry from NOAA SWPC (Planetary K-index $Kp$, Observed 10.7 cm Solar Radio Flux $F_{10.7}$, and Geomagnetic Storm Alerts).
  - Normalizes values into a contextual risk advisory panel on the dashboard.
  - Serves parameterized "drag perturbation simulation scenarios" for demonstration, illustrating how atmospheric expansion during a geomagnetic storm alters orbital decay rates qualitatively.
  - **Scientific Boundary:** Space-weather indices are **never** treated as direct measurements of satellite drag.
- **Inputs:** NOAA SWPC JSON endpoints (`noaa-planetary-k-index.json`, `f107_cm_flux.json`) or static fallback files.
- **Outputs:** Validated `SpaceWeatherState` model and environmental modifier flags.
- **Dependencies:** `httpx` / `requests`, local snapshot store.

### 2.6 Backend API
- **Responsibilities:**
  - Exposes RESTful JSON endpoints for catalog retrieval, screening triggers, conjunction summaries, detailed ephemeris paths, and space-weather telemetry.
  - Enforces schema serialization, handles query parameters, and returns standard HTTP error structures.
  - Bridges the core numerical algorithms to the web client without introducing heavy asynchronous job brokers.
- **Inputs:** Client HTTP GET/POST requests.
- **Outputs:** OpenAPI-compliant JSON payloads.
- **Dependencies:** `fastapi`, `uvicorn`, `pydantic`.

### 2.7 Frontend and Visualization
- **Responsibilities:**
  - Renders a multi-view operator dashboard: Conjunction Alert Table, Object Detail Cards, Data Freshness & System Health Indicator, and Space Weather Context Panel.
  - Renders an interactive 3D WebGL globe using Three.js with a local bundled NASA Blue Marble texture (`public/earth_daymap.jpg`), displaying Earth, satellite orbit paths, real-time object positions, and visual conjunction encounter vectors at TCA.
  - Static visual inspection at TCA is prioritized for P0; animated temporal scrubbing is structured as a P1 enhancement.
- **Inputs:** Backend API JSON responses.
- **Outputs:** Interactive browser DOM elements and WebGL 3D scenes.
- **Dependencies:** React, Vite, Three.js, Vanilla CSS with Design System Tokens.

### 2.8 Caching and Error Handling
- **Responsibilities:**
  - Implements an immutable filesystem cache (`data/cache/`) for external TLE downloads and space-weather feeds to ensure zero external network dependence during live presentations.
  - Intercepts upstream network failures, partial HTTP responses, and parse errors with structured fallbacks.
  - Categorizes system states: `ONLINE_LIVE`, `CACHED_FALLBACK`, `PARTIAL_CATALOG`, and `EMPTY_SET_CONFIRMED`.
- **Inputs:** Network responses, filesystem read/write states.
- **Outputs:** Cached file blobs, error logs, and health status indicators.
- **Dependencies:** Python standard library `os`, `pathlib`, `json`.

---

## 3. Data Flow

### 3.1 Primary Orbital Conjunction Pipeline
The orbital data flow executes sequentially through deterministic pipeline boundaries:

```
[External Sources]
   CelesTrak GP API (stations.txt / active.txt)
          |
          | HTTP GET (Stream / Text)
          v
[Data Ingestion]
   Ingestion Worker -> Check Local Cache -> Fetch Remote -> Write Snapshot
          |
          | Raw TLE Strings (Lines 1 & 2) + Catalog Metadata
          v
[Validation & Normalization]
   Checksum Verification -> Epoch Parsing -> Parameter Bounds Verification
   Discard corrupt/stale records -> Instantiate OrbitalObject Entities
          |
          | Validated OrbitalObject List (Pydantic Models)
          v
[Orbital Propagation Engine]
   Initialize SGP4 Satellite Models
   Compute TEME Coordinates: [r(t), v(t)] for t in [0, T_window, dt_coarse]
   Convert TEME to ECEF (WGS-84) for geospatial rendering & Earth-fixed velocity
   Preserve propagation validity: Decayed/failed samples marked is_valid=False (never [0,0,0])
          |
          | Ephemeris Time-Series Arrays (Filtered for validity)
          v
[Conjunction Screening Engine]
   Stage 1: Perigee-Apogee Altitude Filter (Filter incompatible orbital pairs)
   Stage 2: Coarse Relative Distance Screening (dt = 60s, trigger = 500 km, v_rel <= 15 km/s bound)
   Stage 3: Fine Minimum-Distance Search (dt = 1s Golden-Section Search on verified brackets)
   Calculate: TCA, Miss Distance (km), Inertial & Earth-Fixed Relative Velocity Vectors (km/s)
          |
          | ConjunctionEvent DTOs
          v
[Result Serialization]
   Convert ConjunctionEvents & Object Ephemerides to API Schema
   Attach Ingestion Timestamp & Pipeline Health Metadata
          |
          | REST Response (JSON)
          v
[Backend API Layer]
   FastAPI Endpoints (/api/v1/conjunctions, /api/v1/objects)
          |
          | HTTP / JSON over localhost:8000
          v
[Frontend Dashboard & 3D Visualization]
   State Management -> Alert Table Display -> Three.js Scene Graph (Offline Texture)
   Render Earth, Orbital Paths, Close Approach Vector, & Encounter Point
```

### 3.2 Space-Weather Data Flow
The space-weather data flow operates independently from orbital propagation to ensure that environmental monitoring failures never compromise the core conjunction pipeline:

```
[External Source: NOAA SWPC]
   SWPC 3-Day Geomagnetic Forecast / Observed 10.7 cm Flux API
          |
          | HTTP GET (JSON)
          v
[Ingestion & Cache Fallback]
   Fetch Live Telemetry -> If Failure: Fallback to data/cache/space_weather.json
          |
          | Raw Environmental Telemetry
          v
[Normalization & Scenario Store]
   Parse Kp Index (0-9) & F10.7 Flux (sfu)
   Map to Alert Levels (Quiet, Unsettled, Active, Storm)
   Provide Reference Scenarios (e.g., "G4 Severe Geomagnetic Storm Event")
          |
          | SpaceWeatherState DTO
          v
[Backend API Endpoint]
   FastAPI Endpoint (/api/v1/space-weather)
          |
          | HTTP / JSON
          v
[Frontend Contextual Display]
   Context Bar: Displays current Kp index, F10.7 flux, and operational disclaimer:
   "Space weather metrics provide atmospheric context; drag perturbation
    is not coupled directly into SGP4 analytical propagation."
```

### 3.3 State Preservation and Reference Frame Integrity
To maintain scientific integrity across component boundaries, units, reference frames, and identifiers are strictly preserved:

| Parameter Type | Internal Convention | Wire/API Representation | Visualization Representation | Preservation Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Timestamps** | Python `datetime.datetime` (tz=UTC) | ISO-8601 UTC String (`YYYY-MM-DDTHH:MM:SS.sssZ`) | Formatted UTC string + Epoch scrub offset | Never convert to local machine time; keep UTC across the pipeline. |
| **Position Frame** | TEME (True Equator, Mean Equinox) | Cartesian $[\mathbf{r}_x, \mathbf{r}_y, \mathbf{r}_z]$ in km & ECEF $[\mathbf{r}_{\text{ecef},x}, \dots]$ | Three.js World Coordinates (scaled ECEF / WGS-84) | SGP4 propagates in TEME; compute relative separation in TEME. Backend pre-computes ECEF for frontend Three.js rendering. Never substitute $[0, 0, 0]$ for failed/decayed positions; preserve `is_valid: False` and exclude from screening. |
| **Velocity Frame** | TEME & ECEF (km/s) | Cartesian $[\mathbf{v}_x, \mathbf{v}_y, \mathbf{v}_z]$ in TEME & ECEF | Magnitude scalar ($v_{\text{rel}}$ in km/s) & encounter vector | Both inertial $\mathbf{v}_{\text{rel, TEME}}$ and Earth-fixed $\mathbf{v}_{\text{rel, ECEF}}$ supplied directly by backend so frontend never performs astronomical rotations. |
| **Distance Units** | Kilometers ($\text{km}$) | Float ($\text{km}$) rounded to 3 decimal places | $\text{km}$ (metric) | Never convert to nautical miles; all internal math uses $\text{km}$. Proximity metrics are geometric screening heuristics, never collision probabilities. |
| **Object IDs** | Integer (NORAD Catalog Number) | Integer (`25544`) | `"ISS (ZARYA) [NORAD 25544]"` | NORAD IDs must remain unique integer keys; COSPAR designators preserved in metadata. |

---

## 4. Key Technologies

To guarantee implementation feasibility within an 8-hour hackathon, we select a minimal set of established, mature libraries. Machine-learning training infrastructure, microservices, container orchestrators (Kubernetes), and message queues (RabbitMQ/Kafka) are **intentionally excluded**.

### 4.1 Confirmed Technology Stack

| Component Layer | Technology | Status | Rationale |
| :--- | :--- | :--- | :--- |
| **Backend Language** | Python 3.11+ | **Confirmed** | De facto standard for scientific computing; native support for SGP4 and numerical vectorization. |
| **Backend Web Framework**| FastAPI | **Confirmed** | Rapid setup, automatic OpenAPI schema generation, native async support, and tight integration with Pydantic. |
| **Orbital Propagation** | `sgp4` (Rhodes / Vallado) | **Confirmed** | Standard Python C/Python implementation of SGP4/SDP4 models compliant with AIAA 2006-6753. |
| **Numerical Computation** | `numpy` | **Confirmed** | Vectorized Euclidean distance computation across temporal coordinate arrays. |
| **Data Validation** | `pydantic` v2 | **Confirmed** | Strict type-safe schema enforcement and serialization for orbital elements and conjunction records. |
| **HTTP Client** | `httpx` | **Confirmed** | Modern HTTP client supporting synchronous fallbacks and asynchronous queries with timeout controls. |
| **Frontend Framework** | React 18 + Vite | **Confirmed** | Fast hot-reloading, modular component structure, and minimal bundling overhead for hackathons. |
| **Styling** | Vanilla CSS Tokens | **Confirmed** | Pure CSS variables defined in `DESIGN_SYSTEM.md`; eliminates build-tooling complexity. |
| **3D Globe Visualization** | Three.js | **Confirmed** | Zero-token, lightweight WebGL renderer with local NASA Blue Marble texture (`public/earth_daymap.jpg`); eliminates bundler plugins, Web Worker 404s, and external API friction. |
| **Testing Framework** | `pytest` | **Confirmed** | Frictionless test runner for unit validation of SGP4 outputs and API schemas against known reference values. |

### 4.2 Architectural Decision: Adoption of Three.js over CesiumJS
Following the pre-implementation technical audit, the engineering team formally approved replacing CesiumJS with Three.js:
1. **Zero Access Tokens or Licensing Dependencies:** CesiumJS requires Cesium ion access tokens or third-party tile endpoints. Three.js uses a bundled local Earth texture (`public/earth_daymap.jpg`), ensuring 100% offline reliability.
2. **Elimination of Bundler Overhead:** CesiumJS requires copying ~50 MB of static assets (Workers, Assets, Widgets) and configuring `vite-plugin-cesium`, which introduces MIME-type errors and Web Worker communication hurdles in Vite. Three.js installs cleanly via `npm install three @types/three` and builds without plugins.
3. **P0 Hackathon Scope Fit:** Three.js provides the exact visual capabilities required for P0 (Earth sphere, orbit splines, encounter markers) within a fraction of the bundle size and setup time.

---

## 5. Architecture Diagram

### 5.1 End-to-End System Architecture (ASCII)

```
=================================================================================================================
                               ORBITAL CONJUNCTION & SPACE TRAFFIC RISK ENGINE
=================================================================================================================

 [ UPSTREAM DATA SOURCES ]
   +---------------------------------------+         +---------------------------------------+
   |             CelesTrak API             |         |               NOAA SWPC               |
   | (GP / TLE Data: Stations & Active)   |         |  (Kp Index & F10.7 Solar Flux Feeds)  |
   +---------------------------------------+         +---------------------------------------+
                       |                                                 |
                       | HTTPS GET (or Local Fallback)                   | HTTPS GET (or Local Fallback)
                       v                                                 v
 [ DATA INGESTION & STORAGE LAYER ]
   +---------------------------------------+         +---------------------------------------+
   |   orbital_ingestion.py                |         |   space_weather_client.py             |
   |   - Fetch & Cache Management          |         |   - Fetch SWPC Telemetry              |
   |   - Local Store: data/cache/tle/      |         |   - Local Store: data/cache/swpc/     |
   +---------------------------------------+         +---------------------------------------+
                       |                                                 |
                       v                                                 v
 [ VALIDATION & NORMALIZATION ]                      +---------------------------------------+
   +---------------------------------------+         |   weather_normalizer.py               |
   |   orbital_validator.py                |         |   - Map Kp to Alert Levels            |
   |   - Checksum & Range Verification     |         |   - Inject Storm Scenarios (Exp.)     |
   |   - Epoch Staleness Filter (<14 days) |         +---------------------------------------+
   |   - Generate Validated Pydantic DTOs  |                             |
   +---------------------------------------+                             |
                       |                                                 |
                       v                                                 |
 [ COMPUTATIONAL CORE ]                                                  |
   +-------------------------------------------------------------+       |
   |   sgp4_engine.py (Orbital Propagation Engine)               |       |
   |   - SGP4/SDP4 Analytical Propagation                        |       |
   |   - TEME Coordinate Ephemeris Generation                    |       |
   +-------------------------------------------------------------+       |
                       |                                                 |
                       v                                                 |
   +-------------------------------------------------------------+       |
   |   conjunction_screener.py (Screening Engine)                |       |
   |   - Stage 1: Apogee/Perigee Shell Boundary Filter           |       |
   |   - Stage 2: Coarse Temporal Screening (dt = 60s)           |       |
   |   - Stage 3: Fine Minimum Separation Search (dt = 1s)       |       |
   |   - Output: Miss Distance (km), TCA (UTC), v_rel (km/s)     |       |
   +-------------------------------------------------------------+       |
                       |                                                 |
                       +-----------------------+-------------------------+
                                               |
                                               v
 [ BACKEND API LAYER (FastAPI) ]
   +---------------------------------------------------------------------------------------------+
   |   FastAPI Application (main.py / routes/)                                                   |
   |   - GET  /api/v1/health            -> System Health & Ingestion Status                      |
   |   - GET  /api/v1/objects           -> Catalog Objects & Orbital Parameters                  |
   |   - GET  /api/v1/conjunctions      -> Ranked Conjunction Alerts (TCA, Miss Distance)        |
   |   - GET  /api/v1/ephemeris/{norad_id} -> 3D Trajectory Points for Object Rendering          |
   |   - GET  /api/v1/space-weather     -> Contextual Kp Index & Solar Flux Telemetry            |
   +---------------------------------------------------------------------------------------------+
                                               |
                                               | JSON / HTTP Responses
                                               v
 [ FRONTEND USER INTERFACE (React + Vite) ]
   +---------------------------------------------------------------------------------------------+
   |   Operator Dashboard Shell (App.tsx)                                                        |
   |   +----------------------------------+  +------------------------------------------------+  |
   |   | Panel A: Alert Triage Table      |  | Panel C: Interactive 3D WebGL Globe            |  |
   |   | - Ranked candidate conjunctions  |  | - Earth Globe (WGS-84)                         |  |
   |   | - Miss distance (km), TCA, v_rel |  | - Orbit splines & current positions            |  |
   |   | - Severity tags (Critical/Watch) |  | - TCA encounter point & relative vector        |  |
   |   +----------------------------------+  +------------------------------------------------+  |
   |   +----------------------------------+  +------------------------------------------------+  |
   |   | Panel B: Object & Mission Info   |  | Panel D: Space Weather & System Status         |  |
   |   | - NORAD ID, Perigee, Apogee, Inc |  | - Kp Index, F10.7 Flux, Cache Freshness        |  |
   |   | - Element Age & Ingestion Epoch  |  | - Scientific Limitations & Disclaimer Banner   |  |
   |   +----------------------------------+  +------------------------------------------------+  |
   +---------------------------------------------------------------------------------------------+
=================================================================================================================
```

---

## 6. Design Decisions

### 6.1 Bounded Object Subset (50–200 Objects)
- **Rationale:** All-pairs orbital screening has computational complexity $O(N^2)$. For the complete tracking catalog ($N \approx 45,000$), screening requires $\approx 1.01 \times 10^9$ pair evaluations per time step. In an 8-hour hackathon on standard developer hardware, this would cause memory exhaustion and multi-hour runtimes.
- **Implementation Decision:** We bound the operational catalog to $N \in [50, 200]$ carefully selected objects:
  - High-value crewed habitats: International Space Station (ISS), Tiangong Space Station (CSS).
  - Selected active commercial satellites (Starlink, OneWeb samples).
  - Significant historical debris fragments (Cosmos 1408 debris, Iridium 33 debris, Fengyun-1C debris).
- **Result:** Reduces pair evaluations to $\frac{N(N-1)}{2} \approx 1,225 \text{ to } 19,900$, which evaluates in under 3 seconds in Python with `numpy`.

### 6.2 SGP4 Analytical Propagation for Compatible Elements
- **Rationale:** Two-Line Element (TLE) sets are not osculating Keplerian orbital elements; they are *mean orbital elements* generated by US Space Command via analytical filtering. Propagating TLEs using high-order numerical integrators (e.g., Runge-Kutta 4 with spherical harmonics) violates the mathematical assumptions of TLE generation and produces artificial errors.
- **Implementation Decision:** Standard SGP4/SDP4 (Simplified General Perturbations 4 / Simplified Deep-space Perturbations 4) is mandatory. It incorporates secular and periodic variations caused by Earth oblateness ($J_2, J_3, J_4$), solar/lunar gravitational perturbations, and simplified atmospheric drag via $B^*$.

### 6.3 Separation of Conjunction Screening from the API Layer
- **Rationale:** Embedding long-running mathematical loops directly inside API request handlers blocks the ASGI event loop and introduces HTTP connection timeouts.
- **Implementation Decision:** The Conjunction Screening Engine runs as a dedicated modular service. Results are pre-calculated upon startup or triggered via an explicit screening refresh, caching results in memory. The API routes simply serialize and serve pre-computed results instantly.

### 6.4 Server-Side Propagation vs. Frontend Calculation
- **Rationale:** Performing SGP4 propagation and pair-wise screening in browser JavaScript creates significant CPU bottlenecks, drains client resources, causes frame-rate drops on WebGL rendering threads, and risks numerical drift due to browser-specific JavaScript floating-point implementations.
- **Implementation Decision:** The Python backend acts as the single source of mathematical truth. The frontend strictly acts as a visualization and presentation consumer, receiving sanitized Cartesian coordinate arrays and screening event DTOs.

### 6.5 Deterministic Local Caching for Demonstration Resilience
- **Rationale:** External public APIs (CelesTrak, NOAA SWPC) are subject to rate limiting, network latency, intermittent 503 outages, or firewall restrictions during hackathon judging.
- **Implementation Decision:** The repository includes committed static snapshot fixtures (`data/fixtures/celestrak_snapshot.txt` and `data/fixtures/swpc_snapshot.json`). The system attempts an upstream refresh on startup; if the remote request fails or exceeds a 2.5-second timeout, the system falls back seamlessly to the local cache and sets the `DataSourceStatus` header to `CACHED_FALLBACK`.

### 6.6 Categorical Rejection of "Collision Probability" Claims
- **Rationale:** True collision probability ($P_c$) requires a 3D position covariance matrix ($\mathbf{P}$) representing the Gaussian uncertainty ellipsoid of both objects at TCA. TLE sets do not publish error covariances. Computing a synthetic $P_c$ from miss distance without covariance data is scientifically invalid, irresponsible, and misrepresents the nature of orbital conjunction analysis.
- **Implementation Decision:** The engine strictly computes and displays:
  - **Minimum Geometric Separation (Miss Distance)** in kilometers.
  - **Screening Risk Score / Tier:** A deterministic heuristic classification based on spatial proximity thresholds:
    - `CRITICAL`: Miss distance $\Delta r < 1.0\text{ km}$
    - `WARNING`: $1.0\text{ km} \le \Delta r < 5.0\text{ km}$
    - `WATCH`: $5.0\text{ km} \le \Delta r < 25.0\text{ km}$
    - `MONITOR`: $25.0\text{ km} \le \Delta r < 50.0\text{ km}$
  - Under no circumstances is a geometric proximity score labeled as a "Collision Probability".

---

## 7. Dependencies and External Services

```
+------------------+-----------------------+-----------------------+--------------------------------------+
| Service / Source | Endpoint / Format     | Rate Limits / Access  | Fallback & Caching Strategy          |
+------------------+-----------------------+-----------------------+--------------------------------------+
| CelesTrak GP API | https://celestrak.org | Public, unauthenticated| 2.5s HTTP timeout. On failure, read  |
|                  | /NORAD/elements/gp.cgi| Max ~1 req/sec.       | data/fixtures/celestrak_snapshot.txt.|
|                  | Plaintext / TLE format|                       | Cache valid for 24 hours.            |
+------------------+-----------------------+-----------------------+--------------------------------------+
| NOAA SWPC Feeds  | https://services.swpc | Public, unauthenticated| 2.5s HTTP timeout. On failure, read  |
|                  | .noaa.gov/json/...    | No strict key required| data/fixtures/swpc_snapshot.json.    |
|                  | REST JSON             |                       | Cache valid for 6 hours.             |
+------------------+-----------------------+-----------------------+--------------------------------------+
| Earth Texture    | public/               | Bundled local asset   | 100% offline; zero tokens or network |
| (Three.js Globe) | earth_daymap.jpg      | Local static file     | calls. NASA Blue Marble 2MB image.   |
+------------------+-----------------------+-----------------------+--------------------------------------+
```

### 7.1 CelesTrak Ingestion Strategy
- Targets curated public files: `stations.txt` (space stations and docked craft), `active.txt` (active commercial and scientific payloads).
- Ingestion client writes all successful responses to `data/cache/celestrak_latest.txt` with an accompanying metadata JSON file storing the HTTP ETag and retrieval timestamp.
- If upstream returns non-200 or times out, the local cache is loaded automatically.

### 7.2 NOAA SWPC Ingestion Strategy
- Queries two lightweight JSON feeds:
  1. `planetary_k_index_1m.json`: Real-time geomagnetic activity indicator ($Kp \in [0, 9]$).
  2. `f107_cm_flux.json`: 10.7 cm Solar Radio Flux ($F_{10.7}$ in solar flux units).
- Space weather telemetry is strictly contextual. If NOAA SWPC is unreachable, the system displays cached metrics with a yellow `[SWPC OFFLINE - SHOWING CACHED METRICS]` status badge.

### 7.3 Zero-External-Dependency Guarantee
The prototype can run completely disconnected from the public internet (air-gapped demonstration mode). Running `python -m backend.main --offline` instructs the server to bypass all external HTTP calls and load verified local test fixtures immediately.

---

## 8. Scaling and Performance

### 8.1 Performance Budget for the 8-Hour Prototype
- **Catalog Size:** 100 objects ($\approx 4,950$ candidate pairs).
- **Screening Window:** 24 hours ($86,400$ seconds).
- **Coarse Step Size ($\Delta t_{\text{coarse}}$):** 60 seconds ($1,440$ evaluation epochs).
- **Target Screening Latency:** $< 3.0$ seconds for full catalog screening.
- **Target API Response Time:** $< 50$ milliseconds for cached conjunction queries.

### 8.2 Three-Tier Screening Optimization

```
[ All Candidate Pairs: N(N-1)/2 = 4,950 pairs ]
                       |
                       v
   +-------------------------------------------------------+
   | FILTER 1: Radial Shell Boundary Check                 |
   | Is (Perigee_A - Margin) > Apogee_B?                   |
   | Is (Perigee_B - Margin) > Apogee_A?                   |
   +-------------------------------------------------------+
                       |
                       | Eliminates ~75% to 85% of pairs immediately
                       v
[ Surviving Pairs: ~800 pairs ]
                       |
                       v
   +-------------------------------------------------------+
   | FILTER 2: Vectorized Coarse Time Propagation          |
   | Sample separation at dt = 60s (1,440 points)          |
   | Identify local minima below 500 km coarse trigger     |
   | (Guarantees detection for relative speeds <= 15 km/s) |
   +-------------------------------------------------------+
                       |
                       | Eliminates ~98% of remaining pairs
                       v
[ Candidate Close Approach Intervals: ~5 to 15 pairs ]
                       |
                       v
   +-------------------------------------------------------+
   | FILTER 3: Bracket Verification & Fine Golden Search   |
   | Verify unimodal bracket; refine to 1-second precision |
   | Filter to final threshold: miss_distance <= 50.0 km   |
   | Compute exact TCA, Miss Distance (km), v_rel (km/s)   |
   +-------------------------------------------------------+
                       |
                       v
[ Final Conjunction Alert Events ]
```

### 8.3 Avoiding Redundant Propagation
- Objects are propagated **once** across the temporal grid $[t_0, t_0 + T]$.
- Ephemeris coordinates are stored in a contiguous 3D NumPy array: `positions[object_idx, time_step_idx, coordinate_idx]`.
- Pair-wise Euclidean separation is computed via vectorized array broadcasting:
  $$\mathbf{D}_{ij}(t) = \sqrt{\sum_{c=x,y,z} \left(\mathbf{P}_{i,t,c} - \mathbf{P}_{j,t,c}\right)^2}$$
- This eliminates redundant SGP4 evaluations, converting the bottleneck from SGP4 propagation to vector subtraction.

### 8.4 Graceful Degradation
If server memory or CPU constraints are detected:
1. The screening lookahead window automatically contracts from 72 hours down to 24 hours.
2. The coarse time step increases from 60 seconds to 120 seconds.
3. The bounding catalog is trimmed to the top 50 highest-value active objects.

---

## 9. API and Module Boundaries

To maintain strict modularity during rapid development, detailed schemas and algorithms are isolated into dedicated project specifications.

- **Authoritative API Specification:** See [`API_CONTRACT.md`](./API_CONTRACT.md) for full JSON request/response schemas, query parameters, status codes, and error models.
- **Orbital Calculation Algorithms:** See [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md) for mathematical definitions of coordinate conversions (TEME $\leftrightarrow$ ECEF), SGP4 initialization routines, and fine bisection search mechanics.
- **Data Pipeline & Schema Specifications:** See [`DATA_PIPELINE.md`](./DATA_PIPELINE.md) for TLE parser edge-cases, validation error codes, and normalization rules.
- **Hackathon Execution Timeline:** See [`HACKATHON_EXECUTION_PLAN.md`](./HACKATHON_EXECUTION_PLAN.md) for hourly team milestones, integration checkpoints, and role allocations.

### 9.1 Core Module Boundaries

```
backend/
├── main.py                     # FastAPI entrypoint and middleware
├── config.py                   # System configuration, paths, and defaults
├── routes/
│   ├── health.py               # Health and data freshness endpoints
│   ├── objects.py              # Orbital object catalog endpoints
│   ├── conjunctions.py         # Conjunction screening and alert endpoints
│   └── space_weather.py        # NOAA space-weather endpoints
├── core/
│   ├── ingestion/              # Ingestion clients and local cache manager
│   ├── validation/             # Pydantic schemas and TLE validation rules
│   ├── propagation/            # SGP4 engine and TEME coordinate routines
│   ├── screening/              # Radial filter and coarse/fine search engine
│   └── weather/                # Space-weather normalizer and scenario simulator
└── tests/
    ├── test_validation.py      # TLE checksum and boundary tests
    ├── test_propagation.py     # SGP4 reference trajectory tests
    ├── test_screening.py       # Deterministic conjunction screening tests
    └── test_api.py             # FastAPI endpoint integration tests
```

---

## 10. Team Responsibilities

The system is developed by a five-person team over an eight-hour sprint. Responsibilities and interface contracts are explicitly defined to prevent blocking dependencies:

```
+--------------------------------------------------------------------------------------------------+
|                                    TEAM WORKFLOW ALLOCATION                                      |
+--------------------------------------------------------------------------------------------------+

  [ DATA DEV 1 ]           [ DATA DEV 2 ]            [ BACKEND LEAD ]
  Orbital Ingestion        Space Weather Feeds       FastAPI Router
  TLE Validation           Local Caching Fixtures    SGP4 Engine Integration
  Model Normalization      Scenario Injector         Screening Logic & API
         |                        |                         |
         +------------------------+-------------------------+
                                  |
                                  | Delivers: Verified API Endpoints & Mock JSON
                                  v
         +------------------------+-------------------------+
         |                                                  |
         v                                                  v
  [ FRONTEND DEV 1 ]                                 [ FRONTEND DEV 2 ]
  Dashboard Shell & Layout                           3D Globe & WebGL Canvas
  Conjunction Alert Table                            Ephemeris Trajectory Rendering
  Object Detail Drawers                              TCA Encounter Point Vectors
  Space Weather Context Card                         Interactive Orbit Scrubbing
+--------------------------------------------------------------------------------------------------+
```

### 10.1 Role Allocations and Deliverables
1. **Backend and Integration Lead (1 Developer):**
   - **Ownership:** `backend/main.py`, `backend/routes/`, `backend/core/propagation/`, `backend/core/screening/`.
   - **Key Deliverables:** FastAPI application skeleton, integration of SGP4 engine and conjunction screening pipeline, result serialization, and automated test suite.
   - **Shared Interface:** Exposes mock API responses by Hour 2 so frontend developers can build against live contracts immediately.

2. **Frontend Developer 1 — Dashboard & State Lead (1 Developer):**
   - **Ownership:** `frontend/src/components/dashboard/`, `frontend/src/components/alerts/`, `frontend/src/api/`.
   - **Key Deliverables:** Application layout, conjunction alert triage table with severity badges, object detail inspector, data freshness and health header, and API data fetching layer.
   - **Shared Interface:** Consumes `/api/v1/conjunctions` and `/api/v1/objects`.

3. **Frontend Developer 2 — 3D Visualization Specialist (1 Developer):**
   - **Ownership:** `frontend/src/components/globe/`, `frontend/src/visualization/`.
   - **Key Deliverables:** 3D interactive WebGL globe (Three.js with local Earth texture `public/earth_daymap.jpg`), rendering of satellite orbits, static close-approach geometry and encounter vectors at TCA (P0 MVP), with animated timeline scrubber structured as a P1 enhancement.
   - **Shared Interface:** Consumes `/api/v1/ephemeris/{id}` and coordinates with Frontend Dev 1 for synchronized selection state.

4. **Data Developer 1 — Orbital Data Specialist (1 Developer):**
   - **Ownership:** `backend/core/ingestion/orbital_ingestion.py`, `backend/core/validation/`.
   - **Key Deliverables:** CelesTrak HTTP ingestion client, TLE parser, checksum validator, coordinate normalization, and test fixtures for standard satellite constellations.
   - **Shared Interface:** Hands validated `List[OrbitalObject]` domain models to Backend Lead.

5. **Data Developer 2 — Space Weather & Resilience Specialist (1 Developer):**
   - **Ownership:** `backend/core/weather/`, `backend/core/ingestion/cache_manager.py`, `data/fixtures/`.
   - **Key Deliverables:** NOAA SWPC client, space-weather normalization, local caching and fallback system, offline test scenarios, and reference data validation.
   - **Shared Interface:** Delivers `SpaceWeatherState` models and offline cache mechanisms to Backend Lead and Frontend Dev 1.

---

## 11. Reliability and Failure Handling

The application must maintain continuous operational capability regardless of external network disruptions. The table below outlines how seven critical failure modes are resolved:

```
+-------------------------------------+---------------------------------------------------------------+
| Failure Scenario                    | System Handling and Mitigation Strategy                       |
+-------------------------------------+---------------------------------------------------------------+
| 1. Invalid or Incomplete TLE        | Checksum verification rejects corrupt records. Line length and|
|    Record                           | numerical bounds validation isolates faulty lines. The record |
|                                     | is discarded, an error log is recorded, and valid records in  |
|                                     | the batch continue processing.                                |
+-------------------------------------+---------------------------------------------------------------+
| 2. Stale Orbital Elements           | If an element epoch is older than 14 days, the validator      |
|    (Epoch > 14 days old)            | flags the object with a STALE_EPOCH warning tag. The object is|
|                                     | still propagated, but the UI displays an amber warning badge. |
+-------------------------------------+---------------------------------------------------------------+
| 3. Failed External Requests         | If CelesTrak or NOAA SWPC times out (> 2.5s) or returns 5xx/4xx|
|    (CelesTrak / NOAA Outage)        | the client loads verified local fixtures from data/fixtures/. |
|                                     | The system status switches to CACHED_FALLBACK.                |
+-------------------------------------+---------------------------------------------------------------+
| 4. Empty Screening Results          | When no candidate pairs breach the screening threshold (e.g.  |
|    (Zero Conjunctions Detected)     | miss distance < 50 km), the system returns HTTP 200 with an   |
|                                     | empty events array: {"events": [], "status": "CLEAR"}. The UI |
|                                     | explicitly displays: "Screening complete: Zero candidate      |
|                                     | close approaches detected within the selected time window."   |
|                                     | (Strictly distinguished from pipeline failure).               |
+-------------------------------------+---------------------------------------------------------------+
| 5. SGP4 Numerical Propagation Error | If SGP4 raises an error code (e.g., error 6: orbit decaying   |
|    (Decayed / Hyperbolic Orbit)     | into Earth), the point is flagged with is_valid=False and     |
|                                     | propagation_status="DECAYED". Failed positions are NEVER      |
|                                     | substituted with [0, 0, 0]. Invalid samples are excluded from |
|                                     | conjunction screening, preventing false close approaches.     |
+-------------------------------------+---------------------------------------------------------------+
| 6. Unsupported Data Formats         | Non-standard TLE variations or malformed OMM JSON payloads are|
|                                     | rejected during initial Pydantic schema validation with a 422 |
|                                     | Unprocessable Entity error, preventing downstream engine crash.|
+-------------------------------------+---------------------------------------------------------------+
| 7. Frontend API Disconnection       | If the frontend cannot reach the backend API, the client UI   |
|                                     | displays a persistent reconnection banner and provides a      |
|                                     | toggle: "Switch to Static Client Demo Mode" using bundled JSON.|
+-------------------------------------+---------------------------------------------------------------+
```

---

## 12. Limitations and Scientific Validity

To adhere to rigorous aerospace standards, the system's operational constraints are explicitly documented and communicated throughout the application:

### 12.1 Orbital Element Accuracy and Age
- Two-Line Element (TLE) sets are generated using analytical smoothing of radar and optical tracking observations.
- TLE position accuracy degrades rapidly over time due to unmodeled atmospheric drag variations and solar radiation pressure. Typical position errors range from $1\text{ to }3\text{ km}$ at epoch and can exceed $10\text{ to }30\text{ km}$ after several days in Low Earth Orbit.

### 12.2 Analytical SGP4 Propagation Boundaries
- SGP4 models gravitational oblateness through low-order spherical harmonics ($J_2, J_3, J_4$) and approximates atmospheric drag using an idealized static atmospheric model coupled with the historical ballistic coefficient ($B^*$).
- SGP4 does not incorporate dynamic solar-wind fluctuations, high-order gravitational tesseral harmonics, or space-craft orientation/attitude drag area variations.

### 12.3 Screening Window Limitations
- Analytical propagation beyond $72\text{ hours}$ without fresh orbital updates introduces compounding ephemeris drift. The engine therefore restricts default operational screening to a forward window of $24\text{ to }72\text{ hours}$.

### 12.4 Absence of Covariance and Invalidation of Collision Probability
- **Fundamental Rule:** Collision probability ($P_c$) cannot be calculated without 3D/6D error covariance matrices ($\mathbf{P}$).
- Public TLE data does **not** provide covariance information.
- Substituting an arbitrary or assumed spherical covariance matrix to compute a synthetic collision probability produces scientifically meaningless numbers that create a false sense of precision.
- Therefore, this system strictly outputs **Geometric Miss Distance** ($\Delta r_{\text{min}}$ in km) and relative velocity vectors ($\mathbf{v}_{\text{rel}}$ in km/s).

```
+--------------------------------------------------------------------------------------------------+
|                                  SCIENTIFIC TERMINOLOGY BOUNDARY                                 |
+--------------------------------------------------------------------------------------------------+
| ACCEPTABLE (Scientifically Defensible)    | PROHIBITED (Unvalidated Assumption)                  |
|-------------------------------------------+------------------------------------------------------|
| - Minimum Separation / Miss Distance (km) | - Collision Probability (Pc = 0.0034)                |
| - Time of Closest Approach (TCA in UTC)   | - Probability of Impact (%)                          |
| - Relative Velocity Vector (km/s)         | - Confirmed Orbital Collision Forecast               |
| - Geometric Conjunction Screening Tier    | - Automated Collision Avoidance Maneuver Instruction |
+--------------------------------------------------------------------------------------------------+
```

### 12.5 Contextual Nature of Space Weather
- Space weather telemetry (Planetary K-index $Kp$, 10.7 cm Solar Radio Flux $F_{10.7}$) represents planetary-scale solar and geomagnetic activity.
- These indices are **not** direct local measurements of thermospheric drag on an individual satellite.
- The space weather module provides high-level environmental context; it does not alter SGP4 propagation parameters dynamically in the baseline screening pipeline.

### 12.6 Operational Safety Notice
> **Notice:** This software prototype is developed for educational, demonstration, and preliminary space situational awareness research. It does **not** replace operational conjunction assessment messages (CDMs) produced by 18th Space Defense Squadron or commercial SSA providers, and must **never** be used to command real satellite maneuvers.

---

## 13. MVP Acceptance Criteria

To determine successful project completion at the conclusion of the 8-hour hackathon, the system must satisfy the following verifiable acceptance criteria:

- [ ] **1. Deterministic Data Ingestion:**
  - System successfully ingests a bounded catalog of $\ge 50$ LEO satellites from CelesTrak or loads committed local fallback fixtures in $< 3.0$ seconds.
- [ ] **2. Strict Data Validation:**
  - Data validation engine successfully verifies checksums, epochs, and parameter bounds, rejecting or tagging corrupt/stale records without process termination.
- [ ] **3. SGP4 Trajectory Propagation:**
  - SGP4 engine successfully propagates all valid catalog objects across a 24-hour screening window at 60-second steps, generating valid TEME coordinate vectors.
- [ ] **4. Conjunction Screening Execution:**
  - Screening engine detects all candidate close approaches breaching the 50 km screening threshold, correctly refining the local minimum to 1-second resolution.
- [ ] **5. Conjunction Event Metric Precision:**
  - Conjunction outputs contain valid primary/secondary NORAD IDs, precise UTC Time of Closest Approach (TCA), minimum miss distance (km), and relative velocity (km/s).
- [ ] **6. OpenAPI Contract Compliance:**
  - Backend API serves valid JSON responses strictly adhering to [`API_CONTRACT.md`](./API_CONTRACT.md) for `/api/v1/health`, `/api/v1/objects`, `/api/v1/conjunctions`, and `/api/v1/space-weather`.
- [ ] **7. Interactive Frontend Dashboard:**
  - React application displays the Conjunction Alert Table, Object Inspector, and Space Weather Context Panel with real-time responsive filtering.
- [ ] **8. 3D Geospatial Visualization:**
  - 3D globe displays Earth, selected satellite orbit splines, and visually highlights the close encounter geometry at TCA for selected conjunction events.
- [ ] **9. Robust Error Handling & Zero-Result Clarity:**
  - System distinguishes an empty conjunction finding (`0 close approaches detected`) from an upstream data outage, displaying clear and distinct status indicators.
- [ ] **10. Scientific Integrity & Disclaimers:**
  - Dashboard prominently displays the scientific limitations banner, clarifying that metrics represent geometric screening miss distances, not validated collision probabilities ($P_c$).

# CHANGELOG.md: Orbital Conjunction Engine Specification Finalization

> **Document Status:** Authoritative Change & Decision Record  
> **Milestone:** Pre-Implementation Specification Lockdown (Hour 0:00)  
> **Governing Review:** [`PRE_IMPLEMENTATION_AUDIT.md`](./PRE_IMPLEMENTATION_AUDIT.md)  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 1. Overview & Milestone Charter

Following the pre-implementation technical audit of the **Orbital Conjunction & Space Traffic Risk Engine**, all twelve foundational project specification documents have been systematically reviewed, corrected, and aligned. Contradictions between architecture, API, astrodynamics math, UI/UX, testing, and execution planning documents have been resolved.

All proposed defaults have been confirmed by the engineering team. The project specifications are locked and ready for implementation by the five-person team within the eight-hour hackathon timeframe.

---

## 2. Approved Architectural & Design Decisions

| # | Approved Decision | Operational Impact & Rationale |
| :- | :--- | :--- |
| **1** | **Replace CesiumJS with Three.js** | Eliminates `@types/cesium`, `vite-plugin-cesium`, Web Worker bundling friction, and asset 404 hazards in Vite. Provides a lightweight, reliable WebGL canvas ideal for the 8-hour sprint. |
| **2** | **Bundled Local Earth Texture** | Incorporates a bundled 2 MB NASA Blue Marble texture (`public/earth_daymap.jpg`) to ensure 100% offline, token-free visualization during judging without external tile servers. |
| **3** | **Dual Velocity Exposure in API Contract** | Exposes both inertial ($\mathbf{v}_{\text{rel, TEME}}$) and Earth-fixed ($\mathbf{v}_{\text{rel, ECEF}}$) relative velocity vectors, decoupling the frontend from astronomical coordinate transformations. |
| **4** | **P0 MVP Scope Discipline** | Focuses P0 strictly on SGP4 propagation, pairwise conjunction screening, FastAPI endpoints, and a functional React + Three.js dashboard. Timeline scrubbing and encounter vector rendering are P1; dynamic solar storm injection and runtime screening re-triggers (`POST /screening/refresh`) are P2. |
| **5** | **Real Orbital Elements with Local Caching** | Targets real-world CelesTrak TLE datasets (100 objects) with an instant $\le 2.5\text{s}$ fallback to committed fixtures (`data/fixtures/celestrak_snapshot.txt`) to guarantee air-gapped demo resilience. |
| **6** | **Standard Analytical SGP4/SDP4** | Uses official `sgp4` library for compatible mean Keplerian elements; strictly prohibits numerical integration (Runge-Kutta) or machine learning regressors on mean TLEs. |
| **7** | **Proximity as Geometric Heuristic** | Categorically prohibits labeling miss distance as "Collision Probability" ($P_c$). TLEs lack covariance matrices ($\mathbf{P}$); proximity metrics are strictly labeled as geometric miss distance ($\text{km}$) or screening tiers. |
| **8** | **Monolithic Clean Architecture** | Maintains a clean, single FastAPI backend and a single React/Vite single-page application without message brokers, distributed queues, or heavyweight databases. |

---

## 3. Mandatory Technical Corrections Applied

### Correction A: Bounded Screening Assumptions & High-Speed Verification
- **Audit Finding:** The 500 km coarse proximity trigger on a 60-second grid was previously claimed as an unconditional guarantee against blindspots.
- **Correction Applied:** Documented the explicit mathematical assumptions:
  1. Maximum relative velocity is bounded by $v_{\text{rel}} \le 15.0\text{ km/s}$ (valid for circular and low-eccentricity LEO intersections where $v \approx 7.5\text{–}7.8\text{ km/s}$ and $v_{\text{rel,max}} \approx 2 \times 7.8 = 15.6\text{ km/s}$).
  2. Relative motion is approximately rectilinear over the coarse half-step $\tau \le \Delta t_{\text{coarse}} / 2 = 30\text{ seconds}$.
- **Non-Guarantee Disclosure:** Explicitly disclosed that the 500 km trigger is a bounded LEO engineering heuristic, not a universal guarantee for hyperbolic uncataloged debris or extreme GTO transfer intersections exceeding $15.5\text{ km/s}$. Added high-relative-speed test case ($v_{\text{rel}} \approx 14\text{ km/s}$) in `TESTING_AND_VALIDATION.md`.

### Correction B: Propagation Error Preservation & Zero-Vector Prohibition
- **Audit Finding:** Decayed or failed propagation samples risked being replaced with synthetic zeros `[0, 0, 0]`, which would falsely create artificial conjunction alerts at Earth's center.
- **Correction Applied:** Mandated that failed SGP4 states or decayed orbits (e.g., error code 6) must **never** be replaced with synthetic zeros `[0.0, 0.0, 0.0]` or `NaN`. Added `is_valid: bool` and `propagation_status: str` to `EphemerisPointDto`. Mandated that Stage 2 distance matrices and Stage 3 Golden-Section Search explicitly exclude invalid epochs from proximity computation.

### Correction C: Explicit Coordinate Transformations & Frontend Decoupling
- **Audit Finding:** The coordinate math interface between backend and frontend was ambiguous, risking frontend implementation of complex sidereal rotations.
- **Correction Applied:** Documented exact mathematical transformations in `ORBITAL_ENGINE.md`:
  - TEME to ECEF position: $\mathbf{r}_{\text{ECEF}}(t) = \mathbf{R}_z(\theta_{\text{GMST}}) \mathbf{r}_{\text{TEME}}(t)$.
  - TEME to ECEF velocity: $\mathbf{v}_{\text{ECEF}}(t) = \mathbf{R}_z(\theta_{\text{GMST}}) \mathbf{v}_{\text{TEME}}(t) - \boldsymbol{\omega}_{\text{earth}} \times \mathbf{r}_{\text{ECEF}}(t)$.
  - Backend pre-computes and exposes all required coordinates (TEME Cartesian $[\text{km}, \text{km/s}]$, ECEF Cartesian $[\text{km}, \text{km/s}]$, and geodetic WGS-84 $[\text{deg}, \text{deg}, \text{km}]$). The frontend never performs astronomical rotations.

### Correction D: Golden-Section Search Bracket Verification & Safeguards
- **Audit Finding:** Golden-Section Search assumed a valid unimodal bracket without addressing plateaus, multiple minima, window boundaries, or propagation decay.
- **Correction Applied:** Established five mandatory safeguards in `ORBITAL_ENGINE.md` and `TESTING_AND_VALIDATION.md`:
  1. *Unimodal Bracket Verification:* Requires $d(t_b) < \min(d(t_a), d(t_c))$.
  2. *Plateau Safeguard:* When $d(t_k) \approx d(t_{k+1})$ within numerical tolerance $\epsilon = 10^{-3}\text{ km}$, uses non-strict inequality $\le$, expands bracket to $[t_{k-1}, t_{k+2}]$, and samples midpoint $t_{\text{mid}} = t_k + 30\text{s}$. If distance profile is flat across the interval, flags `PLATEAU_DETECTED` and reports midpoint distance without looping.
  3. *Multiple Minima Safeguard:* Over multi-orbit windows ($24\text{ to }72\text{ hours}$), Stage 2 isolates all distinct local minima separated by $\ge 45\text{ minutes}$, refining each separately.
  4. *Window Boundary Safeguard:* Encounters at $t=0$ or $t=T_{\text{window}}$ cannot form an interior bracket; flagged as `BOUNDARY_ENCOUNTER` and refined with bounded interval search.
  5. *Invalid Sample Safeguard:* If SGP4 returns an error code or decayed state at any point during refinement, golden search halts for that bracket, logs failure, and discards the event.

### Correction E: Independent Verification Protocol for Synthetic Fixtures
- **Audit Finding:** Synthetic test fixtures risked circular self-validation if test assertions merely checked that the fixture generator matched its own output.
- **Correction Applied:** Enforced in `ORBITAL_ENGINE.md`, `TESTING_AND_VALIDATION.md`, and `HACKATHON_EXECUTION_PLAN.md` that expected test targets ($t_{\text{TCA,ref}}$, $d_{\text{min,ref}}$, $v_{\text{rel,ref}}$) must be independently cross-verified using closed-form analytical orbital geometry or an independent reference propagator before committing test assertions.

---

## 4. Documentation File Update Summary

| File | Primary Modifications Applied |
| :--- | :--- |
| [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md) | Added ECEF velocity math with Coriolis transport; added Section 1.3 on propagation decay lifecycle and zero-vector prohibition; bounded 500 km trigger assumptions with non-guarantee disclosure; formalized 5 GSS safeguards; added dual velocity vector equations; established independent synthetic calibration protocol; confirmed technical decisions. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Formally replaced CesiumJS with Three.js across all sections; updated Table 4.1 to confirmed status; frozen P0 vs P1/P2 feature boundaries; integrated ECEF relative velocity vector; enforced zero-vector prohibition in failure mode table; updated role deliverables. |
| [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) | Updated KR 2.1 to Three.js with local Earth texture; adjusted demonstration narrative flow to prioritize static TCA encounter inspection (P0) with timeline scrubber as P1. |
| [`AGENTS.md`](./AGENTS.md) | Replaced Cesium with Three.js in role ownership and codebase tree; added Inviolable Rule 6 prohibiting `[0, 0, 0]` substitution and requiring validity flags; added frontend decoupling rule; confirmed operational baselines. |
| [`API_CONTRACT.md`](./API_CONTRACT.md) | Added `relative_velocity_vector_ecef` alongside `relative_velocity_vector_teme` in `ConjunctionEventDto`; added `is_valid: bool` and `propagation_status: str` to `EphemerisPointDto`; standardized `events_count` key and $50.0\text{ km}$ threshold; confirmed API decisions. |
| [`DATA_PIPELINE.md`](./DATA_PIPELINE.md) | Added Section 4.1 specifying ephemeris validity flags and exclusion from screening; confirmed catalog size (100 objects) and staleness threshold (14 days) in Section 6. |
| [`UI_UX_SPEC.md`](./UI_UX_SPEC.md) | Replaced CesiumJS with Three.js in layout ASCII and Section 3.4; documented local bundled Earth texture (`public/earth_daymap.jpg`); aligned defensive UX table with error codes; confirmed 3D engine decisions. |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Confirmed typography loading fallbacks and semantic orbit trajectory color assignments in Section 5. |
| [`TESTING_AND_VALIDATION.md`](./TESTING_AND_VALIDATION.md) | Added Test Cases 3.3 (midpoint high-speed encounter), 3.4 (decayed sample exclusion), 3.5 (boundary TCA), and 3.6 (plateau/multi-minima); mandated independent cross-verification for synthetic benchmarks; confirmed testing decisions. |
| [`HACKATHON_EXECUTION_PLAN.md`](./HACKATHON_EXECUTION_PLAN.md) | Updated Hour 0:00 setup and Hour 1:30 milestone to Three.js; updated Midpoint Gateway Matrix to address Three.js texture fallback; updated independent synthetic fixture milestone; aligned checklists with P0 vs P1/P2 priorities. |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Removed `CESIUM_ION_TOKEN`; added `EARTH_TEXTURE_PATH`; updated runbook troubleshooting for Three.js texture fallback and SGP4 decay error codes; confirmed deployment standards. |
| [`PRE_IMPLEMENTATION_AUDIT.md`](./PRE_IMPLEMENTATION_AUDIT.md) | Retained as the authoritative audit record documenting all evaluated options, scientific critiques, and team decisions. |

---

## 5. Verification Checklist & Status of Unresolved Issues

- [x] **CesiumJS Elimination:** Zero occurrences of CesiumJS remain as an active or proposed renderer. Three.js is confirmed across all 11 specification files.
- [x] **Local Earth Texture:** `public/earth_daymap.jpg` is standardized as the local offline texture across UI, Architecture, Deployment, and Execution specs.
- [x] **API & Coordinate Uniformity:** Field names, physical units, and coordinate frames (`TEME`, `ECEF`, `WGS84`) are 100% consistent across `API_CONTRACT.md`, `ARCHITECTURE.md`, and `ORBITAL_ENGINE.md`.
- [x] **Propagation Error Integrity:** Zero-vector substitution (`[0, 0, 0]`) is strictly prohibited across all documents; ephemeris validity status (`is_valid`, `propagation_status`) and screening exclusion are codified.
- [x] **Screening Threshold Bounds:** The 500 km coarse trigger is explicitly bounded under $v_{\text{rel}} \le 15.0\text{ km/s}$ and linear relative motion over $\tau \le 30\text{s}$; non-guarantee disclosures and high-speed test cases are in place.
- [x] **GSS Safeguards:** Plateau detection ($\le$ + midpoint sampling), multiple minima isolation, window boundary handling, and decay aborts are explicitly defined.
- [x] **Synthetic Calibration Protocol:** Circular verification is eliminated; independent analytical or reference calibration is mandatory.
- [x] **Priority Alignment:** P0, P1, and P2 feature categorizations are completely harmonized across all documents.
- [x] **Unresolved Issues:** **NONE.** All open questions and decisions have been approved and reconciled. Ready for implementation.

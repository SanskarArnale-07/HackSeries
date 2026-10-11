# TESTING_AND_VALIDATION.md: Quality Assurance & Verification Suite

> **Document Status:** Authoritative Testing & Verification Specification  
> **Primary Owners:** Backend & Integration Lead (Testing Architecture), Data Developer 1 & 2 (Fixtures & Scenarios)  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Related Contracts:** [`API_CONTRACT.md`](./API_CONTRACT.md), [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md)

---

## 1. Testing Strategy & Hackathon QA Philosophy

Under the tight constraints of an 8-hour hackathon, testing must be fast, automated, and strictly focused on high-risk failure modes:
1. **Mathematical Correctness:** Ensuring that SGP4 propagation and conjunction screening produce mathematically verified trajectories and close-approach minima.
2. **Defensive Parsing:** Verifying that corrupt, truncated, or stale TLE lines do not crash the backend process.
3. **Resilience & Offline Verification:** Proving that the entire application runs with zero external internet access by loading local snapshot fixtures.
4. **Contract Fidelity:** Ensuring all FastAPI endpoints return valid JSON matching [`API_CONTRACT.md`](./API_CONTRACT.md).

---

## 2. Test Pyramid & Automation Levels

```
+--------------------------------------------------------------------------------------------------+
|                                      TEST PYRAMID ARCHITECTURE                                   |
+--------------------------------------------------------------------------------------------------+

                / \
               /   \      LEVEL 3: End-to-End Smoke Test
              / E2E \     - Full system launch with mock/live data
             /       \    - Frontend renders 3D globe & alert table without console errors
            /---------\
           /           \  LEVEL 2: Integration & Contract Tests
          / INTEGRATION \ - FastAPI endpoint tests via httpx (TestClient)
         /               \- Offline fallback switch tests
        /-----------------\
       /                   \  LEVEL 1: Unit & Astrodynamics Math Tests
      /      UNIT & MATH    \ - SGP4 Vallado test vector verification
     /                       \- TLE checksum & bounds validation
    /-------------------------\- Golden-section search convergence
```

---

## 3. Test Suites & Verification Specifications

### 3.1 Suite 1: Astrodynamics & SGP4 Numerical Verification (`tests/test_propagation.py`)
- **Objective:** Verify that the `sgp4` library is correctly initialized and produces state vectors matching AIAA-2006-6753 reference benchmarks.
- **Test Case 1.1 (Vallado Benchmark NORAD 25544):**
  - Propagate ISS elements at epoch $+360\text{ minutes}$.
  - Assert position vector $|\mathbf{r}_{\text{calc}} - \mathbf{r}_{\text{ref}}| \le 10^{-4}\text{ km}$ ($0.1\text{ meters}$).
- **Test Case 1.2 (TEME to ECEF Rotation & Velocity):**
  - Propagate a known orbit point.
  - Verify that GMST rotation matrix preserves vector magnitude: $\|\mathbf{r}_{\text{ECEF}}\| = \|\mathbf{r}_{\text{TEME}}\|$.
  - Verify that ECEF velocity includes the Coriolis transport term $-\boldsymbol{\omega}_{\text{earth}} \times \mathbf{r}_{\text{ECEF}}$.
- **Test Case 1.3 (Decayed Orbit Error Handling & Zero-Vector Prohibition):**
  - Inject an orbit with perigee inside dense atmosphere ($h_p < 80\text{ km}$).
  - Catch SGP4 error code 6 (decay).
  - **Assert:** The resulting point is flagged with `is_valid = False` and `propagation_status = "DECAYED"`.
  - **Assert:** Position vector is **never** replaced with synthetic zeros `[0.0, 0.0, 0.0]` or arbitrary coordinates.

---

### 3.2 Suite 2: TLE Parser & Checksum Verification (`tests/test_validation.py`)
- **Objective:** Validate that bad data is sanitized or rejected before reaching the computational core.
- **Test Case 2.1 (Valid Checksum Calculation):**
  - Verify standard ISS TLE Line 1 and Line 2 checksums calculate to expected modulo 10 digits.
- **Test Case 2.2 (Corrupted Line Length):**
  - Pass lines with 68 or 70 characters. Assert rejection with `ERR_LINE_LENGTH`.
- **Test Case 2.3 (Checksum Mismatch):**
  - Alter a single inclination character. Assert rejection with `ERR_CHECKSUM`.
- **Test Case 2.4 (Unphysical Eccentricity):**
  - Set eccentricity field to $1.2$ (hyperbolic). Assert rejection with `ERR_PARABOLIC`.
- **Test Case 2.5 (Stale Epoch Flagging):**
  - Feed a TLE with epoch 30 days in the past. Assert record is accepted but flagged with `is_stale=True`.

---

### 3.3 Suite 3: Conjunction Screening Verification (`tests/test_screening.py`)
- **Objective:** Verify that the screening engine accurately identifies candidate close approaches without blindspots or false negatives.
- **Test Case 3.1 (Radial Shell Boundary Pruning):**
  - Pair A: LEO orbit ($400\text{ km}$ circular).
  - Pair B: GEO orbit ($35,786\text{ km}$ circular).
  - Assert that Stage 1 eliminates this pair instantly in $0.0\text{ ms}$, performing zero temporal propagations.
- **Test Case 3.2 (Independently Calibrated Synthetic Benchmark):**
  - Load `data/fixtures/synthetic_close_pair.tle`.
  - Load independently verified ground-truth metadata (`data/fixtures/synthetic_close_pair_metadata.json`), calibrated using analytical two-body geometry or an independent reference propagator (not circularly assumed from generator script output).
  - Execute full screening pipeline.
  - **Assert:**
    - Event detected with status `CONJUNCTIONS_DETECTED`.
    - Calculated miss distance matches $d_{\text{min,ref}} \pm 0.05\text{ km}$.
    - Calculated TCA falls within $\pm 1.0\text{ second}$ of $t_{\text{TCA,ref}}$.
    - Relative speed matches $v_{\text{rel,ref}} \pm 0.1\text{ km/s}$.
    - Screening tier matches expected severity based on $d_{\text{min,ref}}$.
- **Test Case 3.3 (High-Relative-Speed Midway Blindspot Test):**
  - Inject an encounter scenario where TCA occurs midway between two coarse sample epochs ($\Delta t = +30.0\text{ seconds}$ relative to sample $t_k$).
  - Configure head-on encounter with $v_{\text{rel}} \approx 14.0\text{ km/s}$ and miss distance $\le 5.0\text{ km}$.
  - Assert that the $500\text{ km}$ coarse proximity trigger successfully flags sample points $t_k$ and $t_{k+1}$ ($d(t) \le 453\text{ km} < 500\text{ km}$).
  - Assert that Golden-Section Search successfully refines TCA to within $\pm 1.0\text{ second}$ of true midpoint TCA.
- **Test Case 3.4 (Decayed Sample Exclusion Test):**
  - Propagate a satellite pair where one object decays at $t = 6\text{ hours}$ (`is_valid = False`).
  - Assert that the screening engine excludes decayed epochs from pairwise distance matrices.
  - Assert that no artificial conjunction alerts are generated at or near coordinate origin $[0, 0, 0]$.
- **Test Case 3.5 (Window Boundary Encounter Test):**
  - Inject an encounter occurring at $t \approx 15\text{ seconds}$ from window start ($t_0$).
  - Assert that the engine detects a boundary condition, flags `BOUNDARY_ENCOUNTER`, and refines without indexing errors.
- **Test Case 3.6 (Plateau & Multiple Minima Safeguard Test):**
  - Inject a pair with identical coarse distances $d(t_k) \approx d(t_{k+1})$ within $\epsilon = 10^{-3}\text{ km}$.
  - Assert that midpoint sampling resolves the bracket and converges without infinite loops.
  - Verify that across a 48-hour window, multiple orbital encounters ($\ge 2$) are each independently captured.

---

### 3.4 Suite 4: API Contract Compliance (`tests/test_api.py`)
- **Objective:** Ensure all REST endpoints conform to [`API_CONTRACT.md`](./API_CONTRACT.md).
- **Test Case 4.1 (`GET /health`):**
  - Assert HTTP 200, schema keys `status`, `data_source_mode`, `catalog_summary`.
- **Test Case 4.2 (`GET /conjunctions`):**
  - Assert HTTP 200, schema fields for primary/secondary objects, TCA, miss distance, `relative_velocity_vector_teme`, `relative_velocity_vector_ecef`, and presence of `scientific_disclaimer` string.
- **Test Case 4.3 (Zero-Result Differentiation):**
  - Execute screening with threshold set to $0.001\text{ km}$ (impossible to breach).
  - Assert HTTP 200 returned with `"events": []` and `"status": "CLEAR"`.
  - Assert that this is **not** treated as an HTTP error.
- **Test Case 4.4 (`GET /space-weather`):**
  - Assert HTTP 200, valid float range for $Kp \in [0.0, 9.0]$.

---

### 3.5 Suite 5: Air-Gapped Offline Resilience (`tests/test_resilience.py`)
- **Objective:** Verify that the system executes flawlessly with network calls disabled.
- **Test Case 5.1 (Simulated CelesTrak Outage):**
  - Mock HTTP client to raise `httpx.ConnectTimeout`.
  - Trigger ingestion.
  - Assert that `data/fixtures/celestrak_snapshot.txt` is loaded automatically.
  - Assert `data_source_mode` equals `"CACHED_FALLBACK"`.

---

## 4. Test Fixtures Catalog

The repository maintains immutable test fixtures in `data/fixtures/`:

```
data/fixtures/
├── celestrak_snapshot.txt         # 100 verified LEO objects (Stations + Active)
├── synthetic_close_pair.tle       # Known synthetic conjunction encounter pair
├── malformed_records.txt          # Corrupted TLE lines for negative testing
├── swpc_snapshot.json             # Static NOAA SWPC space-weather telemetry
└── scenario_geomagnetic_storm.json# Historical G4 geomagnetic storm scenario
```

---

## 5. Execution Commands & Test Runbook

### 5.1 Running the Backend Test Suite
```powershell
# From project root:
pytest backend/tests/ -v --tb=short
```
*Expected Result:* All tests pass in under 5.0 seconds.

### 5.2 Running the Synthetic Benchmark Verification Script
```powershell
# Standalone benchmark verification
python -m backend.core.screening.benchmark_runner
```

### 5.3 Frontend Smoke Verification
```powershell
# In frontend directory:
npm run test:smoke # (or npm run build to verify type checking)
```

---

## 6. Acceptance Criteria Traceability Matrix

| Requirement from ARCHITECTURE.md §13 | Test Suite & Test Case | Success Metric |
| :--- | :--- | :--- |
| **1. Ingest $\ge 50$ LEO Objects** | `test_validation.py::test_load_catalog` | $\ge 50$ valid objects parsed in $< 3.0\text{s}$ |
| **2. TLE Checksum & Bounds Validation**| `test_validation.py::test_corrupted_tle` | Checksums verified; bad lines rejected |
| **3. SGP4 Trajectory Propagation** | `test_propagation.py::test_vallado_benchmark` | Error $\le 10^{-4}\text{ km}$ vs reference |
| **4. Conjunction Screening Engine** | `test_screening.py::test_synthetic_encounter`| Refines TCA and miss distance to $1\text{s}$ |
| **5. Precise Conjunction Metrics** | `test_screening.py::test_metric_precision` | Outputs TCA, miss dist, $v_{\text{rel}}$ vector |
| **6. OpenAPI Contract Compliance** | `test_api.py::test_api_schemas` | 100% adherence to `API_CONTRACT.md` |
| **7. Interactive Dashboard Display** | Frontend build & manual verification | Conjunction alerts render with badges |
| **8. 3D Geospatial Visualization** | Manual verification on WebGL canvas | Orbits and encounter vector render |
| **9. Robust Error & Empty Result Handling** | `test_api.py::test_zero_result_status` | Status `CLEAR` returned on empty events |
| **10. Scientific Disclaimer Enforcement** | `test_api.py::test_disclaimer_header` | Headers & UI clarify miss distance $\ne P_c$ |

---

## 7. Confirmed Testing Decisions

1. **[CONFIRMED DECISION 1 - Synthetic Benchmark Inclusion & Calibration]:**
   The synthetic benchmark fixture (`synthetic_close_pair.tle`) is included in standard automated CI/test runs so that conjunction logic can be proven even if real-world satellite pairs in the snapshot do not have a close approach within the 24h window. Expected values are independently cross-verified using analytical two-body geometry or an independent propagator.
2. **[CONFIRMED DECISION 2 - Maximum Acceptable Test Execution Time]:**
   The entire backend test suite must execute in $< 5.0\text{ seconds}$ to ensure rapid developer iteration during the hackathon.

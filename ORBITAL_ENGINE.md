# ORBITAL_ENGINE.md: Astrodynamics & Conjunction Screening Engine

> **Module Status:** Core Numerical Specification  
> **Primary Owner:** Backend & Integration Lead  
> **Key Implementation Dependencies:** `sgp4` (Vallado / Rhodes), `numpy`  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Related Contracts:** [`API_CONTRACT.md`](./API_CONTRACT.md), [`DATA_PIPELINE.md`](./DATA_PIPELINE.md)

---

## 1. Mathematical Foundations & Astrodynamics Models

### 1.1 SGP4 Analytical Propagation Model
Two-Line Element (TLE) and General Perturbations (GP) datasets represent **mean orbital elements** derived from analytical filtering of tracking observations. They cannot be integrated using classical numerical integrators (e.g., Cowell or Runge-Kutta 4th order) without introducing artificial secular divergence.

The system uses the standard **Simplified General Perturbations 4 (SGP4)** and **Simplified Deep-space Perturbations 4 (SDP4)** analytical theories (AIAA 2006-6753):
- **Gravitational Oblateness Perturbations:** Incorporates secular and periodic variations arising from Earth's zonal harmonics $J_2$, $J_3$, and $J_4$.
- **Atmospheric Drag Modeling:** Approximates upper-atmospheric drag through a modified ballistic drag parameter $B^*$ (derived from the satellite's drag coefficient $C_D$, cross-sectional area $A$, and mass $m$):
  $$B^* = \frac{\rho_0 C_D A}{2 m}$$
  where $\rho_0$ is a reference atmospheric density. In standard SGP4, this remains static per TLE epoch.
- **Deep-Space Resonances (SDP4):** For orbital periods $P \ge 225\text{ minutes}$ (semi-synchronous, Molniya, and geostationary orbits), the engine automatically transitions to SDP4, including lunar-solar third-body gravitational perturbations and sectorial/tesseral resonance terms.

### 1.2 Coordinate Reference Frames & Transformations
SGP4 outputs Cartesian position and velocity state vectors in the **True Equator, Mean Equinox (TEME)** coordinate system:
- **TEME Definition:** An Earth-centered inertial (ECI) frame aligned with the true celestial equator of date and mean equinox of date.

```
+----------------------------------------------------------------------------------------------------+
|                                    COORDINATE TRANSFORMATION FLOW                                  |
+----------------------------------------------------------------------------------------------------+

       TLE Epoch Elements
               |
               v
  [ SGP4 Propagation Engine ]  ---> Outputs State Vectors in TEME:
                                    r_TEME(t) = [x, y, z]^T  (km)
                                    v_TEME(t) = [vx, vy, vz]^T (km/s)
               |
               +-----------------------------------------------------------+
               |                                                           |
   (Screening Calculation)                                      (Geospatial Visualization)
               |                                                           |
               v                                                           v
   Relative Euclidean Separation                             Greenwich Sidereal Rotation
   in Inertial Frame (TEME):                                 r_ECEF(t) = R_z(theta_GMST) * r_TEME(t)
   d(t) = ||r_A,TEME(t) - r_B,TEME(t)||                                    |
                                                                           v
                                                             WGS-84 Ellipsoidal Projection
                                                             (Latitude, Longitude, Altitude)
```

#### Transformation from TEME to ECEF (WGS-84):
To render orbits over Earth's surface in the 3D dashboard and compute Earth-fixed encounter kinematics, TEME coordinates are rotated into the Earth-Centered, Earth-Fixed (ECEF) frame using the Greenwich Mean Sidereal Time (GMST) angle $\theta_{\text{GMST}}$:

$$\mathbf{r}_{\text{ECEF}}(t) = \mathbf{R}_z(\theta_{\text{GMST}}) \, \mathbf{r}_{\text{TEME}}(t)$$

$$\mathbf{R}_z(\theta_{\text{GMST}}) = \begin{bmatrix} \cos\theta_{\text{GMST}} & \sin\theta_{\text{GMST}} & 0 \\ -\sin\theta_{\text{GMST}} & \cos\theta_{\text{GMST}} & 0 \\ 0 & 0 & 1 \end{bmatrix}$$

For velocity state vectors, the Earth's rotation vector $\boldsymbol{\omega}_{\text{earth}} = [0, 0, \omega_e]^T$ (where $\omega_e \approx 7.292115 \times 10^{-5}\text{ rad/s}$) introduces the Coriolis transport term:

$$\mathbf{v}_{\text{ECEF}}(t) = \mathbf{R}_z(\theta_{\text{GMST}}) \, \mathbf{v}_{\text{TEME}}(t) - \boldsymbol{\omega}_{\text{earth}} \times \mathbf{r}_{\text{ECEF}}(t)$$

#### Transformation from ECEF to Geodetic Coordinates (WGS-84):
Geodetic latitude ($\phi$), longitude ($\lambda$), and ellipsoidal altitude ($h$) are computed from $\mathbf{r}_{\text{ECEF}} = [x, y, z]^T$ using Bowring's closed-form algorithm:
- Equatorial radius: $a_{\text{earth}} = 6378.137\text{ km}$
- Flattening factor: $f = 1 / 298.257223563$
- First eccentricity squared: $e^2 = 2f - f^2$
- Longitude: $\lambda = \text{atan2}(y, x)$
- Latitude and altitude are resolved via Bowring's parametric latitude approximation.

#### Backend Representation & Frontend Decoupling:
To prevent complex astronomical math in the UI layer, the backend computes all required coordinate representations (inertial TEME Cartesian, Earth-fixed ECEF Cartesian, and geodetic lat/lon/alt) and supplies them directly in the API payloads (`EphemerisPointDto`, `ConjunctionEventDto`). The frontend consumes these pre-transformed coordinates directly for Three.js rendering without performing GMST or frame rotations.

### 1.3 Propagation Error Handling & Decay Lifecycle
SGP4 propagation can fail due to physical orbit decay or numerical limits (e.g., error codes from `sgp4`: `1` for mean elements out of bounds, `2` for negative mean motion, `6` for satellite decay where perigee falls inside the Earth):
- **Prohibition of Default Zero Vectors:** Under no circumstances may failed or decayed positions be substituted with synthetic zeros `[0.0, 0.0, 0.0]` or arbitrary coordinates. Replacing decayed objects with origin coordinates creates artificial conjunctions at Earth's center.
- **Explicit Validity Status:** Ephemeris points must preserve propagation errors explicitly via `is_valid: False` and descriptive `propagation_status` strings (e.g., `"DECAYED"`, `"ERROR_CODE_6"`).
- **Exclusion from Screening Pipeline:** Stage 2 distance matrices and Stage 3 refinement must strictly check `is_valid`. Any evaluation timestamp where either object is invalid must be excluded from proximity screening, preventing false alerts.

---

## 2. Conjunction Screening Engine Architecture

### 2.1 Algorithmic Pipeline Overview
Screening $N$ objects across a continuous time window $t \in [0, T_{\text{window}}]$ is partitioned into three sequential filter stages to minimize computational cost while avoiding silent omission of high-speed encounters:

```
[ Stage 1: Apogee/Perigee Radial Filter ]
  Input: N objects (N(N-1)/2 pairs)
  Prunes non-overlapping orbital shells without time-series propagation.
  Eliminates ~80% of pairs in O(N^2) instantaneous scalar operations.
       |
       v
[ Stage 2: Coarse Temporal Screening Grid (Enhanced Proximity Trigger) ]
  Input: Surviving candidate pairs (~20% of catalog)
  Vectorized propagation at dt_coarse = 60s across screening window.
  Evaluates Euclidean separation d(t) = ||r_A(t) - r_B(t)||.
  Flags candidate intervals where d(t) < D_coarse_trigger (500 km) around local minima.
       |
       v
[ Stage 3: Bracket Verification & Fine Local Optimization ]
  Input: Verified bracketed intervals [t_left, t_mid, t_right] where d(t_mid) < min(d(t_left), d(t_right))
  Isolates exact minimum separation distance with 1-second precision via Golden-Section Search.
  Calculates Time of Closest Approach (TCA), miss distance (km), and v_rel (km/s).
       |
       v
[ Conjunction Alert Generation (Filtered by Final Threshold: miss_distance <= 50 km) ]
```

---

### 2.2 Stage 1: Apogee/Perigee Radial Boundary Filter
For any two objects $A$ and $B$, geometric apogee and perigee altitudes above Earth's mean radius are defined as:

$$r_{p} = a (1 - e) - R_{\text{earth}}, \quad r_{a} = a (1 + e) - R_{\text{earth}}$$

Given an operational screening threshold $D_{\text{threshold}}$ and an orbital perturbation margin $d_{\text{margin}}$ (default: $50\text{ km} + 20\text{ km} = 70\text{ km}$):

$$\text{Condition 1: } r_{p, A} - (D_{\text{threshold}} + d_{\text{margin}}) > r_{a, B}$$
$$\text{Condition 2: } r_{p, B} - (D_{\text{threshold}} + d_{\text{margin}}) > r_{a, A}$$

If either Condition 1 or Condition 2 is true, the orbits are radially disjoint throughout the entire screening window. The pair $(A, B)$ is **bypassed immediately**, avoiding all time-series SGP4 evaluations.

> **Assumptions and Limitations of Stage 1 Filtering:**
> - Stage 1 assumes that $d_{\text{margin}} = 20.0\text{ km}$ is sufficient to absorb natural LEO eccentricity variations, Kozai mean-to-osculating element conversion offsets, and drag perturbations over the screening window ($24\text{ to }72\text{ hours}$).
> - This filter cannot silently discard candidate pairs whose true trajectories could enter the $50\text{ km}$ threshold, provided orbital perturbations remain within $d_{\text{margin}}$. If higher eccentricity variations are expected, $d_{\text{margin}}$ must be widened to $50.0\text{ km}$.

---

### 2.3 Stage 2: Vectorized Coarse Temporal Grid & Blindspot Resolution

#### 2.3.1 The Coarse-Grid Sampling Blindspot
In Low Earth Orbit, orbital velocities are $\approx 7.5\text{ to }7.8\text{ km/s}$. For crossing-inclination or head-on encounters, relative velocities reach $v_{\text{rel}} \approx 10\text{ to }15\text{ km/s}$.
At $v_{\text{rel}} = 14\text{ km/s}$, two objects with a true miss distance of $1.0\text{ km}$ will be within $50\text{ km}$ of each other for only:
$$\Delta t = 2 \times \frac{\sqrt{50^2 - 1^2}}{14} \approx 7.1\text{ seconds}$$
If a fixed 60-second coarse grid is sampled with a rigid $50\text{ km}$ trigger, the closest discrete sample point can fall up to $30\text{ seconds}$ away from the true TCA. At $\Delta t = 30\text{s}$, the sampled separation is:
$$d \approx 14\text{ km/s} \times 30\text{s} = 420\text{ km} \gg 50\text{ km}$$
A naive filter checking $d(t_k) < 50\text{ km}$ would evaluate to `False` and silently discard a critical conjunction.

#### 2.3.2 Evaluation of Mitigations for the 8-Hour MVP
Two alternative strategies address this issue:
- **Alternative 1: Expanded Coarse Proximity Trigger ($D_{\text{coarse\_trigger}} = 500\text{ km}$) with $\Delta t_{\text{coarse}} = 60\text{s}$:**
  Under linear relative motion over $\tau \le \Delta t / 2 = 30\text{s}$ and maximum LEO relative velocity $v_{\text{rel}} \le 15.0\text{ km/s}$, the maximum sampled distance for any encounter with $d_{\text{min}} \le 50\text{ km}$ is bounded by:
  $$d(t_k) \le \sqrt{d_{\text{min}}^2 + (v_{\text{rel}} \cdot \tau)^2} \le \sqrt{50^2 + (15 \times 30)^2} \approx 452.8\text{ km}$$
  Under these explicit assumptions, setting $D_{\text{coarse\_trigger}} = 500.0\text{ km}$ ensures that every conjunction breaching $50.0\text{ km}$ produces at least one coarse sample point with $d(t_k) \le 500.0\text{ km}$.
- **Alternative 2: 10-Second Coarse Sampling Grid ($\Delta t_{\text{coarse}} = 10\text{s}$):**
  Reduces the maximum time offset to $\tau \le 5\text{s}$. The maximum sampled distance becomes $d(t_k) \le \sqrt{50^2 + (15 \times 5)^2} \approx 90.1\text{ km}$. A coarse trigger of $100\text{ km}$ captures all events. However, this increases temporal array size from 1,440 to 8,640 epochs per object ($6\times$ memory and computation).

#### 2.3.3 Selected MVP Strategy
For the 8-hour MVP, **Alternative 1 (60s grid with 500 km coarse proximity trigger)** is selected as the baseline to minimize memory footprint and keep propagation rapid across 100 objects. Alternative 2 remains a configurable fallback for smaller catalogs ($N \le 50$).

> **Assumptions and Limitations of the 500 km Trigger (Non-Guarantee Disclosure):**
> - **Governing Assumption 1:** Maximum relative velocity is bounded by $v_{\text{rel}} \le 15.0\text{ km/s}$ (valid for circular and near-circular LEO orbits where orbital speed $v \approx 7.5\text{ to }7.8\text{ km/s}$ and $v_{\text{rel,max}} \approx 2 \times 7.8 = 15.6\text{ km/s}$).
> - **Governing Assumption 2:** Relative motion between candidate objects is approximately rectilinear over the half-step interval $\tau \le \Delta t_{\text{coarse}} / 2 = 30\text{ seconds}$.
> - **Non-Guarantee Notice:** This threshold is a **bounded engineering heuristic**, NOT an unconditional physical guarantee. It does not guarantee capture for hyperbolic uncataloged debris, parabolic escape trajectories, or extreme GTO transfer orbit intersections exceeding $v_{\text{rel}} > 15.5\text{ km/s}$. For non-standard high-speed encounters, the screening grid must be reduced ($\Delta t_{\text{coarse}} = 10\text{s}$) or the trigger distance enlarged.
> - **Candidate Identification:** A candidate interval is flagged when $d(t_k) \le 500\text{ km}$ AND $d(t_k)$ represents a coarse local minimum ($d(t_k) \le d(t_{k-1})$ and $d(t_k) \le d(t_{k+1})$).

---

### 2.4 Stage 3: Bracket Verification & TCA Refinement

#### 2.4.1 Strict Bracket Verification & Numerical Safeguards
Golden-Section Search requires a strictly unimodal bracket $[a, b, c]$ where $f(b) < \min(f(a), f(c))$. To guarantee numerical stability, the refinement pipeline implements five mandatory safeguards:

1. **Unimodal Bracket Verification:**
   Identify a candidate local minimum at sample $t_k$ where $d(t_k) \le 500\text{ km}$. Check that $d(t_{k-1}) \ge d(t_k)$ and $d(t_{k+1}) \ge d(t_k)$.
2. **Plateau and Near-Equality Safeguard:**
   If $d(t_k) \approx d(t_{k+1})$ within numerical tolerance ($\epsilon = 10^{-3}\text{ km}$) due to symmetric midpoint encounters, strict `<` fails. The engine detects the plateau, evaluates intermediate midpoint $t_{\text{mid}} = t_k + 30\text{s}$, and verifies whether $d(t_{\text{mid}}) < d(t_k)$. If true, brackets $[t_k, t_{\text{mid}}, t_{k+1}]$ are formed. If distance is flat across the interval (e.g., co-planar, co-orbital formation flights), the engine flags `PLATEAU_DETECTED`, terminates iterative refinement, and records the midpoint distance.
3. **Multiple Minima Safeguard:**
   Over a 24-to-72-hour screening window, LEO objects complete $\approx 15\text{ to }16$ revolutions per day. Two overlapping orbits can experience multiple close approaches. Stage 2 scans the full coarse time series and isolates **all** distinct local minima separated by $\ge 45\text{ minutes}$, refining each event independently rather than assuming a single global minimum per pair.
4. **Window Boundary Safeguard:**
   If a candidate minimum occurs at $t_k = t_0$ (window start) or $t_k = t_{\text{end}}$ (window end), a three-point interior bracket cannot be formed. The encounter is flagged as `BOUNDARY_ENCOUNTER` and refined using a bounded one-sided search over $[t_0, t_0 + \Delta t]$ or $[t_{\text{end}} - \Delta t, t_{\text{end}}]$.
5. **Invalid Sample & Decay Safeguard:**
   If SGP4 returns an error code or decayed status (`is_valid == False`) for any sample evaluated during bracket verification or golden-section iterations, the refinement halts immediately for that bracket, logs `PROPAGATION_FAILURE_DURING_REFINEMENT`, and discards the candidate interval from alert generation.

#### 2.4.2 Golden-Section Search on Verified Bracket:
Once a valid bracket $[a, b]$ is confirmed:

```python
def refine_closest_approach(sat_a, sat_b, t_start_sec, t_end_sec, tolerance_sec=1.0):
    """Refine TCA and minimum miss distance on a verified unimodal bracket [t_start, t_end].
    
    Args:
        sat_a: Propagated SGP4 satellite model for Primary object.
        sat_b: Propagated SGP4 satellite model for Secondary object.
        t_start_sec: Left bracket boundary in seconds from epoch.
        t_end_sec: Right bracket boundary in seconds from epoch.
        tolerance_sec: Convergence tolerance (default: 1.0 second).
        
    Returns:
        tuple[float, float]: (tca_seconds, min_miss_distance_km)
    """
    phi = (1.0 + 5.0**0.5) / 2.0
    resphi = 2.0 - phi

    a = t_start_sec
    b = t_end_sec
    c = a + resphi * (b - a)
    d = b - resphi * (b - a)

    fc, valid_c = compute_separation_teme_safe(sat_a, sat_b, c)
    fd, valid_d = compute_separation_teme_safe(sat_a, sat_b, d)

    if not valid_c or not valid_d:
        # Safeguard: Terminate search if decayed or invalid sample encountered
        return None, None

    while abs(b - a) > tolerance_sec:
        if fc < fd:
            b = d
            d = c
            fd = fc
            c = a + resphi * (b - a)
            fc, valid_c = compute_separation_teme_safe(sat_a, sat_b, c)
            if not valid_c:
                return None, None
        else:
            a = c
            c = d
            fc = fd
            d = b - resphi * (b - a)
            fd, valid_d = compute_separation_teme_safe(sat_a, sat_b, d)
            if not valid_d:
                return None, None

    tca_sec = (a + b) / 2.0
    min_separation_km, valid_final = compute_separation_teme_safe(sat_a, sat_b, tca_sec)
    if not valid_final:
        return None, None
    return tca_sec, min_separation_km
```

- **Final Filter:** Only encounters where the refined `min_separation_km <= 50.0` are published as active `ConjunctionEvent` records.

---

### 2.5 Encounter Velocity Vectors & Scalar Relative Speed
At the identified Time of Closest Approach ($t_{\text{TCA}}$), the relative velocity vector is calculated in both TEME (inertial) and ECEF (Earth-fixed) coordinates:

#### 1. Inertial Frame Relative Velocity (TEME):
$$\mathbf{v}_{\text{rel, TEME}} = \mathbf{v}_{A, \text{TEME}}(t_{\text{TCA}}) - \mathbf{v}_{B, \text{TEME}}(t_{\text{TCA}}) = \begin{bmatrix} v_{x,A} - v_{x,B} \\ v_{y,A} - v_{y,B} \\ v_{z,A} - v_{z,B} \end{bmatrix}$$

$$\text{Inertial Relative Speed: } v_{\text{rel}} = \|\mathbf{v}_{\text{rel, TEME}}\| = \sqrt{v_{x,\text{rel}}^2 + v_{y,\text{rel}}^2 + v_{z,\text{rel}}^2} \quad (\text{km/s})$$

#### 2. Earth-Fixed Relative Velocity (ECEF):
$$\mathbf{v}_{\text{rel, ECEF}} = \mathbf{v}_{A, \text{ECEF}}(t_{\text{TCA}}) - \mathbf{v}_{B, \text{ECEF}}(t_{\text{TCA}}) \quad (\text{km/s})$$

$$\text{Earth-Fixed Relative Speed: } v_{\text{rel, ECEF}} = \|\mathbf{v}_{\text{rel, ECEF}}\| \quad (\text{km/s})$$

- **Physical Distinction:** The inertial vector ($\mathbf{v}_{\text{rel, TEME}}$) represents true physical encounter kinematics invariant under coordinate rotation. The Earth-fixed vector ($\mathbf{v}_{\text{rel, ECEF}}$) represents encounter velocity relative to Earth's rotating surface, used for ground-track intersection analysis and 3D globe encounter vectors. Both are exposed in the API contract.

---

## 3. Scientific Limitations & Invalidation of Collision Probability

### 3.1 Mathematical Definition of Collision Probability ($P_c$)
In operational astrodynamics (e.g., NASA CARA / USSF 18th SDS), collision probability $P_c$ is determined by integrating a 2D or 3D Gaussian probability density function over a hard-body sphere representing the combined radii ($R_{\text{HBR}} = R_A + R_B$):

$$P_c = \frac{1}{2 \pi \sqrt{|\mathbf{C}|}} \iint_{\mathcal{A}_{\text{HBR}}} \exp\left(-\frac{1}{2} \mathbf{r}^T \mathbf{C}^{-1} \mathbf{r}\right) dx \, dy$$

where $\mathbf{C}$ is the combined $2\times2$ position covariance matrix projected onto the encounter frame (B-plane):

$$\mathbf{C} = \mathbf{P}_{A,\text{enc}} + \mathbf{P}_{B,\text{enc}}$$

### 3.2 Why TLE Data Precludes $P_c$ Calculation
1. **No Covariance in TLEs:** Public TLE/GP records provide mean Keplerian elements and $B^*$. They contain **no uncertainty information**—no $3\times3$ or $6\times6$ covariance matrices.
2. **The Danger of Assumed Covariance:** If an engineering team synthesizes a fake spherical covariance (e.g., assuming $\sigma = 1\text{ km}$), the resulting $P_c$ number is arbitrary and mathematically invalid. In fact, due to the non-linear "probability dilution" phenomenon, increasing assumed covariance can artificially *reduce* calculated collision probability, creating a dangerous false sense of security.
3. **Mandatory Architectural Constraint:**
   The engine strictly computes and displays **Geometric Miss Distance** ($\Delta r_{\text{min}}$ in km). The dashboard **shall never** label any geometric screening metric as a "Collision Probability" or "Chance of Impact."

---

## 4. Verification & Validation Benchmarks

### 4.1 SGP4 Engine Baseline Verification
The `sgp4` Python package is verified during test execution using the canonical AIAA-2006-6753 test vectors (Vallado et al.).
- **Tolerance:** Maximum Cartesian position discrepancy $\le 10^{-4}\text{ km}$ ($10\text{ cm}$) against published reference ephemeris for NORAD 00005 and NORAD 25544.

### 4.2 Synthetic Close Approach Benchmark Scenario & Independent Verification Protocol
To verify that the Conjunction Screening Engine functions properly without waiting for natural real-world close approaches:
- A synthetic test pair (`synthetic_close_pair.tle`) will be generated in `data/fixtures/` using two coplanar circular LEO orbits with identical inclinations and small argument of perigee offsets.
- **Independent Verification Protocol:**
  - Expected numerical targets (TCA epoch offset, miss distance in km, relative speed in km/s) must **never** be assumed correct merely because the generator script created them.
  - Test targets must be established through independent mathematical calibration (e.g., exact analytical orbital geometry or an independent reference propagation check) before committing expected test assertions in `tests/test_screening.py`.
- **Mandatory Test Suite Benchmarks:**
  1. **Midway Encounter Test:** Close approach occurs midway between coarse sample points (at $\Delta t = 30\text{s}$ from a coarse epoch) to prove that the coarse-grid blindspot mitigation functions correctly.
  2. **High-Relative-Speed Test:** Head-on or crossing geometry with $v_{\text{rel}} \approx 14.0\text{ km/s}$ verifying that the $500\text{ km}$ coarse trigger reliably captures the event within the documented LEO speed bound.
  3. **Decayed Sample Exclusion Test:** A scenario containing decayed or invalid propagation samples confirms that invalid states are skipped and do not produce false conjunction alerts at coordinate origin $[0, 0, 0]$.
  4. **Boundary TCA Test:** A close approach occurring near the screening window boundary ($t \approx 0$ or $t \approx T_{\text{window}}$) confirms stable handling of partial brackets.

---

## 5. Confirmed Technical Decisions (Team Approved)

1. **[CONFIRMED DECISION 1 - Radial Altitude Margin]:**
   The Stage 1 perigee-apogee screening margin is set to $d_{\text{margin}} = 20.0\text{ km}$ on top of the $50\text{ km}$ threshold (total screening separation $70\text{ km}$). This guarantees that natural orbit eccentricity fluctuations over 24 hours do not falsely prune pairs.
2. **[CONFIRMED DECISION 2 - Golden-Section Search Termination Tolerance]:**
   Golden-section temporal search termination tolerance is confirmed at $|b - a| \le 1.0\text{ second}$.
3. **[CONFIRMED DECISION 3 - Coarse Screening Trigger]:**
   Stage 2 coarse proximity trigger is confirmed at $D_{\text{coarse\_trigger}} = 500.0\text{ km}$ on a 60-second grid, subject to the explicit documented assumption that LEO relative velocities satisfy $v_{\text{rel}} \le 15.0\text{ km/s}$.
4. **[CONFIRMED DECISION 4 - Visualization Engine]:**
   Three.js is confirmed as the 3D globe visualization engine, utilizing a local Earth texture (`public/earth_daymap.jpg`) for 100% offline demonstration reliability.
5. **[CONFIRMED DECISION 5 - Dual Coordinate Frame Velocities]:**
   The backend API exposes both inertial ($\mathbf{v}_{\text{rel, TEME}}$) and Earth-fixed ($\mathbf{v}_{\text{rel, ECEF}}$) relative velocity vectors, decoupling the frontend from astronomical frame transformations.


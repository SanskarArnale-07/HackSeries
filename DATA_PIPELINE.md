# DATA_PIPELINE.md: Ingestion, Validation, and Normalization Pipeline

> **Module Status:** Data Pipeline Specification  
> **Primary Owners:** Data Developer 1 (Orbital Ingestion/Validation), Data Developer 2 (Space Weather/Caching)  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Related Contracts:** [`API_CONTRACT.md`](./API_CONTRACT.md), [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md)

---

## 1. Upstream Data Sources & Acquisition Protocols

The engine interfaces with two external public scientific data providers, backed by an immutable local fallback cache:

```
+--------------------------------------------------------------------------------------------------+
|                                    DATA ACQUISITION TOPOLOGY                                     |
+--------------------------------------------------------------------------------------------------+

  [ Primary Upstream: CelesTrak ]                       [ Primary Upstream: NOAA SWPC ]
  https://celestrak.org/NORAD/elements/gp.cgi           https://services.swpc.noaa.gov/json/
  - Target: stations.txt (Space Stations)               - Target 1: planetary_k_index_1m.json
  - Target 2: active.txt (Selected Active LEO)          - Target 2: f107_cm_flux.json
                  |                                                     |
                  | HTTPS GET (Timeout: 2.5s)                           | HTTPS GET (Timeout: 2.5s)
                  v                                                     v
  +-------------------------------+                     +-------------------------------+
  |   CelesTrak Ingestion Client  |                     |    NOAA SWPC Ingestion Client |
  +-------------------------------+                     +-------------------------------+
                  |                                                     |
        Success?  |  Network Outage / Timeout?                Success?  |  Network Outage / Timeout?
       +----------+----------+                               +----------+----------+
       |                     |                               |                     |
       v                     v                               v                     v
  [ Save Cache ]     [ Load Fallback Fixture ]          [ Save Cache ]     [ Load Fallback Fixture ]
  data/cache/        data/fixtures/                     data/cache/        data/fixtures/
  celestrak.txt      celestrak_snapshot.txt             swpc.json          swpc_snapshot.json
```

### 1.1 Ingestion Specifications

| Attribute | CelesTrak Orbital Ingestion | NOAA SWPC Space Weather Ingestion |
| :--- | :--- | :--- |
| **Protocol** | HTTPS GET | HTTPS GET |
| **Payload Format** | Plaintext TLE / GP 3-line format | JSON REST Arrays |
| **Max Network Timeout**| 2.5 seconds | 2.5 seconds |
| **Ingestion Cadence** | On application startup / On-demand refresh | On application startup / 15-minute polling |
| **Rate Limit Policy** | Max 1 request per second | Max 1 request per 10 seconds |
| **Local Cache Path** | `data/cache/celestrak_latest.txt` | `data/cache/swpc_latest.json` |
| **Fallback Path** | `data/fixtures/celestrak_snapshot.txt` | `data/fixtures/swpc_snapshot.json` |
| **Failure Behavior** | Seamless switch to fallback fixture | Seamless switch to fallback fixture |

---

## 2. Two-Line Element (TLE) Syntax & Verification Rules

Every orbital record consists of a title line followed by Line 1 and Line 2. Both lines must contain strictly 69 ASCII characters.

### 2.1 Line 1 Anatomy & Checksum Verification
```
Line 1: 1 25544U 98067A   26284.17538715  .00014238  00000+0  25624-3 0  9993
        ^ ^^^^^^ ^^^^^^^^ ^^^^^^^^^^^^^^  ^^^^^^^^^^  ^^^^^^^  ^^^^^^^ ^  ^^^ ^
Cols:   1 3-7    10-17    19-32           34-43       45-52    54-61   63 65-68 69
```

- **Checksum Algorithm (Modulo 10):**
  1. Iterate across columns 1 through 68.
  2. Numbers 0–9 contribute their face value.
  3. Minus signs (`-`) contribute 1.
  4. All other characters (letters, spaces, periods, plus signs) contribute 0.
  5. The checksum equals $\text{sum} \pmod{10}$.
  6. The result must match the single digit in column 69.

### 2.2 Line 2 Anatomy & Parameter Bounds
```
Line 2: 2 25544  51.6432 120.4561 0005430  85.2341 274.9123 15.50731234476542
        ^ ^^^^^  ^^^^^^^ ^^^^^^^^ ^^^^^^^  ^^^^^^^ ^^^^^^^^ ^^^^^^^^^^^^^^^ ^
Cols:   1 3-7    9-16    18-25    27-33    35-42   44-51    53-63       64-68 69
```

- **Validation Rules & Physical Ranges:**
  - **Inclination ($i$):** $0.0^\circ \le i \le 180.0^\circ$ (Cols 9–16).
  - **Right Ascension of Ascending Node ($\Omega$):** $0.0^\circ \le \Omega < 360.0^\circ$ (Cols 18–25).
  - **Eccentricity ($e$):** Extracted as a 7-digit decimal fraction: $e = \text{val} \times 10^{-7}$. Must satisfy $0.0 \le e < 1.0$ (elliptical orbit).
  - **Argument of Perigee ($\omega$):** $0.0^\circ \le \omega < 360.0^\circ$ (Cols 35–42).
  - **Mean Anomaly ($M$):** $0.0^\circ \le M < 360.0^\circ$ (Cols 44–51).
  - **Mean Motion ($n$):** Must be positive ($n > 0.0$ revolutions per day). For LEO, typically $12.0 < n < 16.5$.
  - **NORAD Catalog ID Match:** The 5-digit catalog number in Line 1 (Cols 3–7) must strictly match Line 2 (Cols 3–7).

---

## 3. Data Quality Rules & Sanitization Logic

```
+-----------------------------------+-------------------+---------------------------------------------+
| Condition                         | Error Code        | Engine Action                               |
+-----------------------------------+-------------------+---------------------------------------------+
| Line length != 69 characters      | ERR_LINE_LENGTH   | Discard record; log malformed line warning. |
| Checksum mismatch on Line 1 or 2  | ERR_CHECKSUM      | Discard record; increment rejected_records. |
| NORAD ID mismatch between lines   | ERR_ID_MISMATCH   | Discard record.                             |
| Non-elliptical eccentricity (e>=1)| ERR_PARABOLIC     | Discard record (SGP4 supports e < 1 only).  |
| Negative mean motion (n <= 0)     | ERR_MEAN_MOTION   | Discard record.                             |
| Element epoch age > 14 days old   | WARN_STALE_EPOCH  | Retain record; mark is_stale=True. Show UI  |
|                                   |                   | warning badge; continue propagation.        |
+-----------------------------------+-------------------+---------------------------------------------+
```

### 3.1 Epoch Staleness Determination
The epoch timestamp is derived from Line 1 columns 19–32:
- Two-digit year: $\text{YY} \ge 57 \implies 19\text{YY}$, else $20\text{YY}$.
- Fractional day of year: converted to standard UTC `datetime`.
- Staleness threshold:
  $$\Delta t_{\text{age}} = |t_{\text{current}} - t_{\text{epoch}}| > 14\text{ days}$$
  Stale elements are kept in the catalog for historical/monitoring purposes but flagged so the user is informed of potential ephemeris drift.

---

## 4. Domain Model Normalization

Validated raw lines are converted into immutable Pydantic domain models:

```python
class OrbitalObject(BaseModel):
    norad_id: int = Field(..., ge=1, le=99999)
    name: str
    intl_des: str
    object_type: Literal["PAYLOAD", "DEBRIS", "ROCKET_BODY", "UNKNOWN"]
    epoch_utc: datetime
    element_age_days: float
    is_stale: bool
    inclination_deg: float = Field(..., ge=0.0, le=180.0)
    raan_deg: float = Field(..., ge=0.0, lt=360.0)
    eccentricity: float = Field(..., ge=0.0, lt=1.0)
    arg_perigee_deg: float = Field(..., ge=0.0, lt=360.0)
    mean_anomaly_deg: float = Field(..., ge=0.0, lt=360.0)
    mean_motion_rev_day: float = Field(..., gt=0.0)
    bstar_drag: float
    semi_major_axis_km: float
    perigee_altitude_km: float
    apogee_altitude_km: float
    period_minutes: float
    line1: str
    line2: str
```

Derived orbital parameters are calculated using standard Keplerian formulas for **UI metadata display and catalog overview only**:
- Semi-major axis: $a = \left(\frac{\mu}{(n \cdot \frac{2\pi}{86400})^2}\right)^{1/3}$ with $\mu = 398600.4418\text{ km}^3/\text{s}^2$
- Perigee altitude: $h_p = a(1 - e) - 6378.137\text{ km}$
- Apogee altitude: $h_a = a(1 + e) - 6378.137\text{ km}$
- Orbital period: $T = \frac{1440.0}{n}\text{ minutes}$

> **Scientific Clarification on Display Approximation:**
> Because TLE mean motion $n$ incorporates first-order $J_2$ gravitational perturbations (Kozai mean elements), this two-body Keplerian formula represents an unperturbed display approximation that differs by $\approx 1\text{ to }5\text{ km}$ in LEO from the internal SGP4 Brouwer-Lyddane mean semi-major axis. This calculation is strictly used for dashboard card metadata; it is **never a replacement for SGP4-propagated TEME state vectors $[\mathbf{r}(t), \mathbf{v}(t)]$** used in the conjunction screening engine.

### 4.1 Ephemeris Point Validity & Decay Representation
When orbital objects are propagated across time grids, the resulting ephemeris points must preserve numerical validity:
- Under no circumstances may failed or decayed states be replaced with `[0.0, 0.0, 0.0]` or `NaN`.
- The ephemeris data model preserves:
  - `is_valid: bool = True` (or `False` on decay/error)
  - `propagation_status: str = "NOMINAL"` (or `"DECAYED"`, `"ERROR_CODE_X"`)
- Any epoch with `is_valid == False` is strictly excluded from pairwise distance computation in the conjunction screening pipeline.

---

## 5. Space-Weather Pipeline & Scenario Modeling

### 5.1 Ingestion of Real-Time Metrics
The NOAA SWPC client queries:
1. **Planetary K-index ($Kp$):** Real-time geomagnetic disturbance indicator on a quasi-logarithmic scale from $0.0$ to $9.0$.
2. **Solar Radio Flux ($F_{10.7}$):** Daily solar emission at $2800\text{ MHz}$ ($10.7\text{ cm}$) in solar flux units ($\text{sfu} = 10^{-22}\text{ W}\cdot\text{m}^{-2}\cdot\text{Hz}^{-1}$).

```
+---------------+-------------------+---------------------------------------------------------+
| Kp Index      | NOAA Storm Tier   | Environmental Interpretation                            |
+---------------+-------------------+---------------------------------------------------------+
| 0.0 - 2.0     | Quiet (G0)        | Nominal upper-atmosphere conditions. Standard decay.    |
| 2.3 - 4.0     | Unsettled (G0)    | Slight thermospheric temperature elevation.             |
| 4.3 - 5.0     | Active (G1 Minor) | Minor atmospheric density increase; elevated drag on LEO.|
| 5.3 - 6.0     | G2 Moderate Storm | Moderate satellite drag increase below 500 km.          |
| 6.3 - 7.0     | G3 Strong Storm   | Noticeable tracking drift across LEO constellations.     |
| 7.3 - 8.0     | G4 Severe Storm   | Significant orbital decay rate acceleration.            |
| 8.3 - 9.0     | G5 Extreme Storm  | Extreme satellite drag events; frequent ephemeris loss. |
+---------------+-------------------+---------------------------------------------------------+
```

### 5.2 Pre-Configured Demonstration Scenarios
To enable engaging demonstration during hackathon judging, Data Developer 2 provides three pre-configured space-weather scenarios:
1. **Scenario A (Nominal Baseline):** $Kp = 1.33$, $F_{10.7} = 135\text{ sfu}$ (Quiet conditions).
2. **Scenario B (G4 Severe Geomagnetic Storm Event):** $Kp = 8.0$, $F_{10.7} = 260\text{ sfu}$ (Historic coronal mass ejection profile).
3. **Scenario C (Solar Flare / Radio Blackout):** $Kp = 4.0$, $F_{10.7} = 310\text{ sfu}$ (Extreme solar flux spike).

### 5.3 Scientific Drag Clarification
> **Crucial Rule:** The space-weather pipeline outputs environmental context data. The application explicitly documents that space-weather indices are **not** direct drag measurements, and SGP4 does **not** dynamically couple these indices into its analytical equations during baseline screening.

---

## 6. Confirmed Technical Decisions

1. **[CONFIRMED DECISION 1 - Target Catalog Group]:**
   The ingestion engine targets CelesTrak `stations.txt` ($\approx 25$ objects) and the top 75 objects from `active.txt` to form a bounded catalog of $\approx 100$ objects.
2. **[CONFIRMED DECISION 2 - Staleness Expiry Window]:**
   Elements older than 14 days are flagged as stale but retained with a warning badge.
3. **[CONFIRMED DECISION 3 - Ephemeris Validity Contract]:**
   Failed or decayed points explicitly output `is_valid=False` and are excluded from screening without zero-vector substitution.

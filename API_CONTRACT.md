# API_CONTRACT.md: Backend Interface Specification

> **Specification Status:** Authoritative API Contract  
> **Server Implementation:** FastAPI (Python 3.11+)  
> **Client Consumers:** Frontend Dashboard (React/Vite), Test Automation Suite  
> **Base URL:** `http://localhost:8000/api/v1`  
> **Related Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 1. General Protocol & Design Principles

### 1.1 Content Types & Wire Protocol
- All request and response bodies utilize `application/json; charset=utf-8`.
- Responses are generated via Pydantic v2 domain schemas to guarantee strict type consistency.
- All timestamps in request and response payloads use **ISO-8601 UTC** with the `Z` suffix (e.g., `2026-10-11T12:00:00.000Z`).
- All physical units are strictly metric:
  - Distance / Coordinates: Kilometers ($\text{km}$)
  - Velocity: Kilometers per second ($\text{km/s}$)
  - Angles: Degrees ($^\circ$)

### 1.2 Mandatory Aerospace Headers
Every response from the API carries explicit scientific transparency headers:
```http
X-Scientific-Disclaimer: Geometric screening only; no covariance data; not a collision probability.
X-Coordinate-Frame-Physics: TEME
X-Coordinate-Frame-Display: WGS84-ECEF
```

### 1.3 Global Error Envelope
All error responses (HTTP $4\text{xx}$ and $5\text{xx}$) adhere to the standardized `ErrorResponse` schema:

```json
{
  "error": {
    "code": "ERR_VALIDATION_FAILED",
    "message": "Orbital element validation failed for requested NORAD ID.",
    "details": [
      {
        "field": "eccentricity",
        "issue": "Value 1.05 exceeds elliptical bound (0 <= e < 1)."
      }
    ],
    "timestamp": "2026-10-11T12:00:00.000Z"
  }
}
```

Standardized Error Codes:
- `ERR_NOT_FOUND`: Requested object or event does not exist in catalog.
- `ERR_INVALID_PARAM`: Query parameter outside allowable bounds.
- `ERR_DATA_UNAVAILABLE`: Upstream source unavailable and no cache exists.
- `ERR_PROPAGATION_FAILED`: SGP4 numerical error encountered (e.g. decayed orbit).
- `ERR_INTERNAL`: Unhandled server exception.

---

## 2. API Endpoints

### 2.1 System Health & Ingestion Status
#### `GET /health`
Returns the operational health of the screening engine, upstream connectivity status, and catalog freshness.

**Response Headers:** `200 OK`
```json
{
  "status": "HEALTHY",
  "data_source_mode": "ONLINE_LIVE",
  "catalog_summary": {
    "total_objects_loaded": 104,
    "valid_objects": 102,
    "stale_objects": 2,
    "rejected_records": 0,
    "last_ingested_utc": "2026-10-11T08:30:00.000Z"
  },
  "screening_engine": {
    "status": "READY",
    "last_run_utc": "2026-10-11T08:30:15.000Z",
    "active_screening_window_hours": 24,
    "detected_conjunctions_count": 3
  },
  "space_weather": {
    "status": "CONNECTED",
    "last_sync_utc": "2026-10-11T08:30:05.000Z"
  }
}
```
*Note:* If upstream APIs fail and local fixtures are loaded, `"data_source_mode"` switches to `"CACHED_FALLBACK"`.

---

### 2.2 Catalog Objects
#### `GET /objects`
Retrieves a paginated list of cataloged objects currently managed by the screening engine.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | integer | No | `100` | Max records to return ($1 \le \text{limit} \le 500$) |
| `offset` | integer | No | `0` | Pagination offset |
| `search` | string | No | `null` | Filter by object name or NORAD catalog ID |
| `type` | string | No | `ALL` | Filter: `PAYLOAD`, `DEBRIS`, `ROCKET_BODY`, `ALL` |

**Response Headers:** `200 OK`
```json
{
  "total": 102,
  "limit": 100,
  "offset": 0,
  "items": [
    {
      "norad_id": 25544,
      "name": "ISS (ZARYA)",
      "intl_des": "1998-067A",
      "object_type": "PAYLOAD",
      "epoch_utc": "2026-10-11T04:12:33.450Z",
      "element_age_days": 0.18,
      "is_stale": false,
      "orbital_parameters": {
        "inclination_deg": 51.6432,
        "eccentricity": 0.000543,
        "semi_major_axis_km": 6798.15,
        "perigee_altitude_km": 416.32,
        "apogee_altitude_km": 423.71,
        "period_minutes": 92.86
      }
    }
  ]
}
```

---

#### `GET /objects/{norad_id}`
Retrieves detailed telemetry, TLE raw lines, and orbital metadata for a specific cataloged object.

**Path Parameters:**
- `norad_id` (integer, required): The NORAD Catalog identifier (e.g. `25544`).

**Response Headers:** `200 OK` (or `404 Not Found`)
```json
{
  "norad_id": 25544,
  "name": "ISS (ZARYA)",
  "intl_des": "1998-067A",
  "object_type": "PAYLOAD",
  "epoch_utc": "2026-10-11T04:12:33.450Z",
  "element_age_days": 0.18,
  "is_stale": false,
  "raw_tle": {
    "line1": "1 25544U 98067A   26284.17538715  .00014238  00000+0  25624-3 0  9993",
    "line2": "2 25544  51.6432 120.4561 0005430  85.2341 274.9123 15.50731234476542"
  },
  "orbital_parameters": {
    "inclination_deg": 51.6432,
    "raan_deg": 120.4561,
    "eccentricity": 0.000543,
    "arg_perigee_deg": 85.2341,
    "mean_anomaly_deg": 274.9123,
    "mean_motion_rev_day": 15.50731234,
    "bstar_drag": 0.00025624,
    "perigee_altitude_km": 416.32,
    "apogee_altitude_km": 423.71
  }
}
```

---

### 2.3 Conjunction Screening Results
#### `GET /conjunctions`
Retrieves ranked candidate close approach events detected within the screening window.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `threshold_km` | float | No | `50.0` | Maximum miss distance to include ($1.0 \le \text{threshold} \le 100.0$) |
| `window_hours` | integer| No | `24` | Screening horizon ($12 \le \text{window} \le 72$) |
| `severity` | string | No | `ALL` | Filter: `CRITICAL`, `WARNING`, `WATCH`, `MONITOR`, `ALL` |
| `sort_by` | string | No | `miss_distance` | Sort order: `miss_distance` (asc), `tca` (asc) |

**Response Headers:** `200 OK`
```json
{
  "screening_metadata": {
    "evaluation_timestamp_utc": "2026-10-11T08:30:15.000Z",
    "screening_window_hours": 24,
    "threshold_km": 50.0,
    "total_pairs_screened": 5151,
    "events_count": 1,
    "status": "CONJUNCTIONS_DETECTED"
  },
  "events": [
    {
      "event_id": "CONJ-25544-48275-20261011T143210Z",
      "primary_object": {
        "norad_id": 25544,
        "name": "ISS (ZARYA)",
        "type": "PAYLOAD"
      },
      "secondary_object": {
        "norad_id": 48275,
        "name": "FENGYUN 1C DEB",
        "type": "DEBRIS"
      },
      "tca_utc": "2026-10-11T14:32:10.420Z",
      "miss_distance_km": 2.145,
      "relative_speed_km_s": 14.120,
      "relative_velocity_vector_teme": {
        "vx": 4.120,
        "vy": -11.890,
        "vz": 6.430
      },
      "relative_velocity_vector_ecef": {
        "vx": 12.240,
        "vy": -2.850,
        "vz": 6.430
      },
      "primary_position_teme_km": {
        "x": 3412.140,
        "y": -5120.650,
        "z": 2840.110
      },
      "encounter_location_wgs84": {
        "latitude_deg": 24.3512,
        "longitude_deg": -64.1205,
        "altitude_km": 418.52
      },
      "coordinate_notes": {
        "teme": "Inertial relative velocity vector (km/s) used for astrodynamic screening.",
        "ecef": "Earth-fixed relative velocity vector (km/s) rotated via GMST at TCA for direct 3D visual rendering on the globe."
      },
      "screening_tier": "WARNING",
      "scientific_disclaimer": "Geometric miss distance only. TLE data does not contain covariance matrices; this metric is NOT a collision probability."
    }
  ]
}
```

*Note on Empty Screening Results:* If no pairs breach the threshold, the server returns HTTP `200` with `"events": []` and `"status": "CLEAR"`. This strictly differentiates a genuine clear window from an ingestion failure.

---

### 2.4 Ephemeris Trajectories for 3D Visualization
#### `GET /ephemeris/{norad_id}`
Returns a time-series trajectory of positions for rendering orbital paths on the 3D globe.

**Path Parameters:**
- `norad_id` (integer, required): Target object NORAD ID.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `step_seconds` | integer | No | `60` | Sampling interval ($10 \le \text{step} \le 300$) |
| `window_hours` | integer | No | `24` | Trajectory duration ($6 \le \text{window} \le 72$) |

**Response Headers:** `200 OK`
```json
{
  "norad_id": 25544,
  "name": "ISS (ZARYA)",
  "reference_frame": "WGS84_CARTOGRAPHIC_AND_ECEF",
  "epoch_start_utc": "2026-10-11T08:30:00.000Z",
  "epoch_end_utc": "2026-10-12T08:30:00.000Z",
  "step_seconds": 60,
  "total_points": 1440,
  "points": [
    {
      "time_utc": "2026-10-11T08:30:00.000Z",
      "is_valid": true,
      "propagation_status": "VALID",
      "lat_deg": -12.4512,
      "lon_deg": 45.1204,
      "alt_km": 417.82,
      "ecef_km": {
        "x": 4410.12,
        "y": 4425.80,
        "z": -1440.25
      }
    }
  ]
}
```

*Note on Propagation Validity:* If an orbit decays or encounters a numerical exception during propagation, `is_valid` is set to `false` and `propagation_status` to `"DECAYED"` or `"ERROR"`. Invalid coordinates are set to `null` (never replaced with `[0, 0, 0]`), and the sample is excluded from conjunction distance screening.

---

### 2.5 Space-Weather Context Telemetry
#### `GET /space-weather`
Returns current planetary geomagnetic activity and solar flux indices retrieved from NOAA SWPC.

**Response Headers:** `200 OK`
```json
{
  "source": "NOAA_SWPC",
  "timestamp_utc": "2026-10-11T08:00:00.000Z",
  "is_cached": false,
  "planetary_k_index": {
    "current_value": 3.67,
    "alert_level": "UNSETTLED",
    "scale_description": "Kp 3: Quiet to unsettled geomagnetic conditions."
  },
  "solar_radio_flux_f107": {
    "current_sfu": 165.4,
    "baseline_average_sfu": 150.0,
    "description": "Observed 10.7 cm Solar Radio Flux in solar flux units (sfu)."
  },
  "geomagnetic_storm_status": "NONE",
  "contextual_notes": {
    "operational_impact": "Atmospheric heating nominal. Low Earth Orbit neutral density within standard seasonal bounds.",
    "scientific_boundary": "Space weather indices provide atmospheric environmental context. They are NOT coupled directly into SGP4 analytical propagation."
  }
}
```

---

### 2.6 Screening Refresh Trigger (P2 - Optional Endpoint)
#### `POST /screening/refresh`
Triggers an immediate re-run of the conjunction screening pipeline across the catalog. (Optional runtime trigger; default screening executes on server startup).

**Request Body (Optional Configuration):**
```json
{
  "threshold_km": 50.0,
  "window_hours": 24,
  "coarse_step_seconds": 60
}
```

**Response Headers:** `200 OK`
```json
{
  "status": "COMPLETED",
  "execution_duration_ms": 1420,
  "total_pairs_screened": 5151,
  "events_count": 1,
  "completed_at_utc": "2026-10-11T08:32:00.000Z"
}
```

---

## 3. Data Transfer Objects (DTOs) Reference

```
+------------------------------------+---------------------------------------------------------------+
| DTO Schema Name                    | Purpose & Fields Summary                                      |
+------------------------------------+---------------------------------------------------------------+
| OrbitalObjectDto                   | Clean representation of validated satellite: NORAD ID, name,  |
|                                    | COSPAR, epoch, age, apogee, perigee, inclination, period.     |
+------------------------------------+---------------------------------------------------------------+
| ConjunctionEventDto                | Encounter summary: event ID, primary/secondary objects, TCA,   |
|                                    | miss distance (km), v_rel (km/s), TEME & ECEF vectors, tier.  |
+------------------------------------+---------------------------------------------------------------+
| EphemerisTrajectoryDto             | Time-series trajectory: points array with lat/lon/alt/ecef,   |
|                                    | is_valid flags, sampled at fixed steps for 3D globe display.  |
+------------------------------------+---------------------------------------------------------------+
| SpaceWeatherDto                    | Environmental context: Kp index, F10.7 flux, storm tier,      |
|                                    | timestamp, and educational disclaimers. (P1 Feature).         |
+------------------------------------+---------------------------------------------------------------+
| ErrorResponseDto                   | Standard error envelope: error code, human message, details.   |
+------------------------------------+---------------------------------------------------------------+
```

---

## 4. Confirmed API Decisions

1. **[CONFIRMED DECISION 1 - Default Miss Distance Threshold]:** Default screening threshold is confirmed at $50.0\text{ km}$. Encounters below this are refined to 1-second resolution via Golden-Section Search on verified brackets.
2. **[CONFIRMED DECISION 2 - Ephemeris Point Sampling]:** Default ephemeris sampling step is confirmed at $60\text{ seconds}$ for 3D globe trajectories (1,440 points per 24h window; payload $\approx 120\text{ KB}$).
3. **[CONFIRMED DECISION 3 - Mock Endpoint Fallback]:** In the event of backend startup delay, the backend serves static mock JSON matching this contract by Hour 1.5 to unblock frontend developers.
4. **[CONFIRMED DECISION 4 - Dual Velocity Vectors]:** API contract exposes both inertial (`relative_velocity_vector_teme`) and Earth-fixed (`relative_velocity_vector_ecef`) vectors, decoupling the frontend from astronomical rotations.

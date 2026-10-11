# API Credential Policy & External Services Audit

> **System Target:** TRAJACTRA — Orbital Conjunction & Space Traffic Risk Engine  
> **Development Context:** 8-Hour Engineering Hackathon MVP  
> **Authority Level:** Mandatory Operational Policy  
> **Related Documents:** [`AGENTS.md`](./AGENTS.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md)

---

## 1. Policy Statement & Core Principles

The TRAJACTRA Orbital Conjunction & Space Traffic Risk Engine enforces a strict **Zero-Credential / Zero-Paid-Subscription MVP Architecture**:

1. **Zero External API Keys or Subscriptions:** The core application operates entirely without private tokens, API keys, OAuth credentials, or paid third-party subscriptions.
2. **Deterministic Offline Operation:** The application must start and execute all conjunction screening, ephemeris calculations, and 3D geospatial rendering in a completely air-gapped / offline environment (`--offline` mode).
3. **Bounded External Network Dependencies:**
   - External network calls are strictly limited to open, unauthenticated public scientific data feeds.
   - All network calls enforce a strict timeout ($\le 2.5\text{ seconds}$).
   - Any network failure or latency immediately triggers a fallback to validated local offline snapshots.
4. **Prohibition of Non-Essential External Services:**
   - **No Space-Track.org or NASA APIs:** Avoids authentication friction, account rate limits, and network hurdles during demonstrations.
   - **No Third-Party Geospatial Services:** No Cesium ion tokens, Mapbox access tokens, Google Maps Platform keys, or external tile servers. Coastlines and planet surfaces are rendered locally via Three.js with bundled vector geometries (`world-land.json`).
   - **No Hosted AI / ML APIs:** No external LLM endpoints, neural network inference servers, or cloud regressors. Conjunction analysis is executed via analytical SGP4 and Euclidean vector screening in local Python/NumPy.
5. **No Credential Exposure:** Under no circumstances are private tokens or secret keys hardcoded or committed into frontend or backend code.

---

## 2. Comprehensive Inventory of External Services

| Service Name | Purpose | Authentication Required? | Network Fallback Fixture | Non-Blocking / Optional? |
| :--- | :--- | :--- | :--- | :--- |
| **CelesTrak (NORAD GP)** | Ingest current Two-Line Element (TLE) orbital sets for active LEO satellites and space stations | **No** (Public open HTTP GET) | `data/fixtures/celestrak_snapshot.txt` | **Core Data Source** (Falls back gracefully to committed offline snapshot) |
| **NOAA Space Weather Prediction Center (SWPC)** | Real-time geomagnetic Planetary K-index ($K_p$) and Solar Radio Flux ($F_{10.7}$) for upper atmospheric context | **No** (Public open JSON endpoint) | `data/fixtures/swpc_snapshot.json` | **Optional / Non-Blocking** (Screening engine runs normally without it) |
| **Local Vector Geography (Natural Earth)** | 3D continental coastline outlines rendered on Three.js globe | **No** (Local file bundled in repo) | `frontend/src/assets/world-land.json` | **Bundled Static Asset** (Zero external requests) |

---

## 3. Detailed Service Specifications

### 3.1 CelesTrak Orbital Elements Feed
- **Service & Purpose:** Retrieves public orbital ephemerides in standard 3-line / 2-line format for bounded Low Earth Orbit (LEO) satellite catalogs.
- **Why Needed:** Provides initial Keplerian and mean-motion elements for SGP4 orbital propagation.
- **Authentication & Cost:** Completely free, open public access. No registration or API keys required.
- **Upstream URLs:**
  - Stations: `https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle`
  - Active: `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`
- **Fallback Mechanism:**
  - Ingestion client applies an HTTP timeout of $2.5\text{ seconds}$.
  - On timeout, HTTP non-200, or `--offline` flag, loads `data/fixtures/celestrak_snapshot.txt`.
- **Works Without It:** **Yes.** The system is 100% functional using local fixtures.

### 3.2 NOAA Space Weather Prediction Center (SWPC)
- **Service & Purpose:** Provides planetary geomagnetic activity index ($K_p$) and solar 10.7 cm radio flux ($F_{10.7}$).
- **Why Needed:** Displays contextual space weather conditions indicating upper atmospheric density variations that affect LEO drag.
- **Authentication & Cost:** Completely free, open public access. No authentication required.
- **Upstream URLs:**
  - Planetary K-index: `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
  - F10.7 Solar Flux: `https://services.swpc.noaa.gov/json/f107_cm_flux.json`
- **Fallback Mechanism:**
  - Ingestion client applies an HTTP timeout of $2.5\text{ seconds}$.
  - On timeout, HTTP non-200, or `--offline` flag, loads `data/fixtures/swpc_snapshot.json` or defaults to quiet baseline conditions ($K_p=3.0, F_{10.7}=150.0\text{ sfu}$).
- **Works Without It:** **Yes.** The core conjunction screening pipeline does not depend on SWPC.

---

## 4. Policy for Introducing Future Services

If an enhancement or post-MVP feature requires an external service that demands authentication:
1. **Document Service & Purpose:** Explain the precise capability provided.
2. **Justify Necessity:** Prove why existing local math or open public data cannot satisfy the requirement.
3. **Credential Acquisition:** Document exact public URLs and procedures to obtain credentials.
4. **Environment Configuration:** Specify required environment variable names (e.g., `SERVICE_API_KEY`).
5. **Graceful Degradation:** The application **must continue to boot and operate** when the environment variable is unset, with a visible UI warning rather than an application crash.
6. **Frontend Isolation:** Secret tokens must only exist on the backend and never be forwarded to or embedded in frontend bundles.

---

## 5. Runtime Environment Variable Reference

All configuration variables are optional and provide safe local defaults:

| Environment Variable | Required? | Default | Description |
| :--- | :--- | :--- | :--- |
| `BACKEND_PORT` | No | `8000` | Port for FastAPI service |
| `FRONTEND_PORT` | No | `3000` | Port for Vite frontend service |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://127.0.0.1:3000` | Allowed origins for browser client |
| `OFFLINE_MODE` | No | `false` | When `true`, forces immediate fixture fallback |
| `SCREENING_THRESHOLD_KM` | No | `50.0` | Close-approach screening alert distance |
| `COARSE_PROXIMITY_TRIGGER_KM` | No | `500.0` | Coarse search trigger boundary |
| `SCREENING_WINDOW_HOURS` | No | `24` | Forward screening propagation horizon |
| `COARSE_STEP_SECONDS` | No | `60` | Coarse SGP4 step size |

**Conclusion:** No secret keys or API tokens are required to run, build, test, or demonstrate the application.

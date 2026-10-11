# DEPLOYMENT.md: Deployment, Runbook, and Environment Configuration

> **Document Status:** Operational Runbook & Setup Guide  
> **Target Environment:** Local Workstations (Windows, macOS, Linux) & Hackathon Demo Environments  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **API Specifications:** [`API_CONTRACT.md`](./API_CONTRACT.md)

---

## 1. System Requirements & Prerequisites

The system is engineered as a lightweight, two-tier architecture (Python FastAPI backend + React Vite frontend) requiring minimal external prerequisites:

### 1.1 Software Requirements
- **Python:** Version `3.11` or higher (verified with standard `pip`).
- **Node.js:** Version `18.x` or `20.x` LTS (with `npm` v9+).
- **Web Browser:** Modern WebGL2-compatible browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).
- **Operating System:** Windows 10/11, macOS (Apple Silicon or Intel), or Linux (Ubuntu 22.04+).

### 1.2 Hardware Recommendations
- **CPU:** Dual-core 2.0 GHz or higher (quad-core recommended for rapid SGP4 propagation).
- **RAM:** Minimum 4 GB available system memory (8 GB recommended).
- **GPU:** Dedicated or integrated graphics with WebGL2 acceleration enabled.
- **Disk Space:** $< 500\text{ MB}$ total repository footprint including dependencies and local cache.

---

## 2. Step-by-Step Local Development Setup

### 2.1 Backend Setup (FastAPI & Astrodynamics Engine)

```powershell
# 1. Navigate to the project root
cd d:\HackSeries

# 2. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # (On Linux/macOS: source venv/bin/activate)

# 3. Install backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# 4. Launch the FastAPI development server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

*Verification:* Open `http://127.0.0.1:8000/api/v1/health` in your browser. You should receive a JSON response showing `"status": "HEALTHY"`.

---

### 2.2 Frontend Setup (React & WebGL Dashboard)

```powershell
# 1. In a separate terminal, navigate to the frontend directory
cd d:\HackSeries\frontend

# 2. Install Node dependencies
npm install

# 3. Launch the Vite development server
npm run dev -- --port 3000
```

*Verification:* Open `http://localhost:3000` in your browser. The Operations Console shell should load with the top navigation bar, alert table, and 3D globe viewport.

---

## 3. Single-Command Demo Launcher

To ensure a seamless start during live hackathon judging, the repository includes a Python demonstration launcher (`run_demo.py`):

```powershell
# Launch both backend and frontend concurrently:
python run_demo.py
```

### 3.1 Offline Air-Gapped Demonstration Mode
During judging, venue Wi-Fi may be unstable or subject to enterprise firewall blocking. The engine provides an offline mode that bypasses all external network calls and immediately serves verified test fixtures:

```powershell
# Launch in air-gapped demonstration mode:
python run_demo.py --offline
```
- Disables external requests to `celestrak.org` and `services.swpc.noaa.gov`.
- Loads `data/fixtures/celestrak_snapshot.txt` and `data/fixtures/swpc_snapshot.json`.
- Displays the amber `CACHED_FALLBACK` status indicator in the UI.

---

## 4. Environment Variables & System Configuration

Configuration is managed via environment variables or a `.env` file in the project root:

| Variable Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `BACKEND_PORT` | integer | `8000` | Port for the FastAPI HTTP server |
| `FRONTEND_PORT` | integer | `3000` | Port for the Vite development server |
| `CORS_ORIGINS` | string | `http://localhost:3000,http://127.0.0.1:3000` | Allowed CORS origins for browser access |
| `OFFLINE_MODE` | boolean | `false` | When `true`, forces local fixture loading |
| `SCREENING_THRESHOLD_KM`| float | `50.0` | Default conjunction screening distance |
| `COARSE_PROXIMITY_TRIGGER_KM`| float | `500.0` | Coarse grid proximity trigger to prevent blindspot |
| `SCREENING_WINDOW_HOURS`| integer | `24` | Default forward propagation time horizon |
| `COARSE_STEP_SECONDS` | integer | `60` | Time step for coarse temporal screening |
| `EARTH_TEXTURE_PATH`  | string | `public/earth_daymap.jpg` | Local Earth texture for Three.js (zero external tokens required) |

---

## 5. Production & Presentation Packaging

For environments requiring a single unified server without running two separate terminals, the frontend can be built and mounted as static assets within FastAPI:

```powershell
# 1. Build the production React bundle
cd d:\HackSeries\frontend
npm run build

# 2. Run FastAPI with static files mounted at root
cd d:\HackSeries
python -m backend.main --serve-static
```
- Access the entire application at a single URL: `http://localhost:8000`.

---

## 6. Troubleshooting & Operational Runbook

```
+-------------------------------------+---------------------------------------------------------------+
| Symptom / Error                     | Root Cause & Immediate Remediation Strategy                   |
+-------------------------------------+---------------------------------------------------------------+
| Port 8000 or 3000 already in use    | Kill existing process:                                        |
|                                     | Windows: netstat -ano | findstr :8000  -> taskkill /PID <PID> /F|
|                                     | Linux/macOS: lsof -i :8000 -> kill -9 <PID>                   |
+-------------------------------------+---------------------------------------------------------------+
| CORS error in browser console       | Ensure FRONTEND_PORT matches CORS_ORIGINS in backend/.env.   |
|                                     | Default allows localhost:3000.                                |
+-------------------------------------+---------------------------------------------------------------+
| Three.js globe texture missing      | Local texture asset missing from public/earth_daymap.jpg.     |
|                                     | Remediation: Three.js renders default fallback Lambert sphere;|
|                                     | verify local 2MB Blue Marble file is committed in repo.       |
+-------------------------------------+---------------------------------------------------------------+
| SGP4 raises Error Code 6 (Decay)    | Orbit perigee decayed into Earth's atmosphere during window.  |
|                                     | The engine sets is_valid=False and propagation_status=DECAYED.|
|                                     | Points are excluded from screening; never replaced with [0,0,0]|
+-------------------------------------+---------------------------------------------------------------+
| Upstream CelesTrak HTTP 503 Outage  | Start server with --offline flag to immediately use local     |
|                                     | verified snapshots in data/fixtures/celestrak_snapshot.txt.   |
+-------------------------------------+---------------------------------------------------------------+
```

---

## 7. Confirmed Deployment Decisions

1. **[CONFIRMED DECISION 1 - Default Single Command Script]:**
   The project includes `run_demo.py` at the root, which uses Python's standard `subprocess` module to launch both FastAPI and Vite without requiring external process managers like PM2 or Foreman.
2. **[CONFIRMED DECISION 2 - Port Standards]:**
   Backend defaults strictly to port `8000`; frontend defaults to port `3000`.
3. **[CONFIRMED DECISION 3 - Three.js Visualization Packaging]:**
   Three.js is confirmed as the primary WebGL visualizer using bundled local assets, eliminating Cesium ion tokens and bundler worker plugins.

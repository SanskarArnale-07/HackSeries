# TRAJACTRA: Orbital Conjunction & Space Traffic Risk Engine

High-performance astrodynamics screening engine and interactive 3D space traffic operations dashboard built with FastAPI, SGP4, and React/Three.js.

---

## Quick Start (Single Command)

All Python and Node.js dependencies are installed and verified. Run both the backend and frontend concurrently with:

```powershell
python run_demo.py
```

### Air-Gapped / Offline Demonstration Mode
For presentations without external internet access or when behind restricted networks:
```powershell
python run_demo.py --offline
```
- Automatically uses local cached fixtures in `data/fixtures/`.
- Zero external network dependency.

---

## Access URLs

| Interface | URL | Description |
| :--- | :--- | :--- |
| **Frontend Console** | [http://localhost:3000](http://localhost:3000) | Interactive 3D globe & conjunction triage table |
| **Backend API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive Swagger REST API documentation |
| **Engine Health** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | System health, catalog size, and screening metrics |

---

## Running in Separate Terminals (Manual)

### Terminal 1: Backend (FastAPI & SGP4)
```powershell
# From project root
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend (React & Three.js)
```powershell
cd frontend
npm run dev -- --port 3000
```

---

## Running Tests

To verify SGP4 propagation, Stage 1/2/3 conjunction screening, and API contracts:
```powershell
python -m pytest backend/tests
```
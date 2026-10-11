# AGENTS.md: Developer & AI Assistant Operational Guidelines

> **System Target:** Orbital Conjunction & Space Traffic Risk Engine  
> **Development Context:** 8-Hour Engineering Hackathon (5-Person Team)  
> **Target Audience:** AI Coding Assistants (Antigravity, Claude, Copilot) & Human Collaborators  
> **Parent Specifications:** [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md), [`API_CONTRACT.md`](./API_CONTRACT.md)

---

## 1. Project Context & Team Mission

This repository contains the codebase for the **Orbital Conjunction & Space Traffic Risk Engine**, a prototype developed within an 8-hour hackathon. The system screens a bounded subset of 50 to 200 Low Earth Orbit (LEO) satellites and space debris objects using the Simplified General Perturbations 4 (SGP4) analytical propagator, identifies candidate close approaches, and renders them through an interactive web-based 3D operations dashboard.

### 1.1 Team Division of Responsibilities
When generating code, scripts, tests, or documentation, AI agents must respect ownership boundaries:
- **User (Backend & Integration Lead):** Owns `backend/main.py`, `backend/routes/`, `backend/core/propagation/`, `backend/core/screening/`, end-to-end integration, and system architecture.
- **Frontend Developer 1 (Dashboard & State):** Owns `frontend/src/components/dashboard/`, alert triage tables, object inspectors, space-weather cards, and API data fetching.
- **Frontend Developer 2 (3D Visualization):** Owns `frontend/src/components/globe/`, Three.js WebGL canvas, orbit splines, and encounter vector rendering.
- **Data Developer 1 (Orbital Ingestion):** Owns `backend/core/ingestion/orbital_ingestion.py`, TLE parsing, checksum validation, and domain models.
- **Data Developer 2 (Space Weather & Resilience):** Owns `backend/core/weather/`, caching layers, offline fixtures, and reference test scenarios.

---

## 2. Inviolable Operational Rules for AI Agents

Every AI assistant working in this repository **must strictly enforce** the following non-negotiable rules:

### Rule 1: Zero Machine Learning Training or Inference
- **Prohibition:** Do **not** suggest or create machine learning training pipelines, neural network regressors, PyTorch/TensorFlow models, or genetic algorithms for orbit prediction or collision risk.
- **Requirement:** Rely exclusively on analytical SGP4/SDP4 propagation via the official `sgp4` library and classical Euclidean vector math in `numpy`.

### Rule 2: Absolute Prohibition of "Collision Probability" ($P_c$) Claims
- **Prohibition:** Under no circumstances may an agent generate code, UI copy, comments, or documentation claiming that a distance-based screening score is a "Collision Probability" ($P_c$).
- **Scientific Fact:** Public TLEs do not contain 3D position covariance matrices ($\mathbf{P}$). Generating a synthetic covariance produces mathematically invalid numbers and violates aerospace standards.
- **Requirement:** Always label proximity metrics as **Geometric Miss Distance** ($\text{km}$), **Minimum Separation** ($\text{km}$), or **Screening Alert Tier** (`CRITICAL`, `WARNING`, `WATCH`, `MONITOR`).

### Rule 3: Explicit Coordinate Frame Transparency & Frontend Decoupling
- SGP4 propagation outputs coordinates in the **TEME** (True Equator, Mean Equinox) inertial frame.
- Relative Euclidean separation $d(t) = \|\mathbf{r}_A - \mathbf{r}_B\|$ must be evaluated in TEME.
- Geospatial rendering on Earth requires rotating TEME into **ECEF** via Greenwich Mean Sidereal Time (GMST) and projecting to **WGS-84** geodetic coordinates.
- **Requirement:** Agents must explicitly label coordinate frames in function names and docstrings (e.g., `propagate_teme()`, `teme_to_ecef()`).
- **Frontend Decoupling:** The backend must provide all coordinate frames needed by the frontend (inertial TEME Cartesian, Earth-fixed ECEF Cartesian, and geodetic lat/lon/alt) so the frontend does not perform astronomical transformations.

### Rule 4: Zero External Network Dependency During Demonstrations
- **Requirement:** All external network calls to CelesTrak and NOAA SWPC must have local fallback fixtures located in `data/fixtures/`.
- If an agent modifies an ingestion client, it must ensure a timeout of $\le 2.5\text{ seconds}$ and an immediate fallback to `data/fixtures/celestrak_snapshot.txt` or `data/fixtures/swpc_snapshot.json`.
- The system must run flawlessly in `--offline` mode using the local Earth texture (`public/earth_daymap.jpg`).

### Rule 5: Keep the Scope Achievable Within 8 Hours (P0 MVP Focus)
- **Prohibition:** Do not introduce Kafka, RabbitMQ, Redis, Celery, Docker Swarm, Kubernetes, PostgreSQL, or OAuth2.
- **Requirement:** Keep the architecture monolithic and clean: a single FastAPI backend service and a single React/Vite single-page application.
- **P0 Priority Focus:** Prioritize the working conjunction-screening pipeline, backend REST API, and functioning alert dashboard. Space-weather widgets, advanced timeline scrubbers, and scenario injectors are P1/P2 enhancements and must not block P0 completion.

### Rule 6: Propagation Error Preservation & Screening Integrity
- **Prohibition:** Agents must **never** replace failed SGP4 propagations or decayed orbital positions with synthetic zeros `[0.0, 0.0, 0.0]` or `NaN`.
- **Requirement:** Always preserve propagation error codes and mark points with `is_valid: False` and descriptive `propagation_status` strings (e.g., `"DECAYED"`). Exclude invalid samples from distance screening matrices to prevent false positive conjunction alerts at Earth's center.

---

## 3. Codebase Structure & Conventions

```
HackSeries/
├── backend/
│   ├── main.py                     # FastAPI application setup
│   ├── config.py                   # Configuration & system constants
│   ├── routes/                     # API routers (health, objects, conjunctions, weather)
│   ├── core/
│   │   ├── ingestion/              # CelesTrak client and cache manager
│   │   ├── validation/             # TLE validator and Pydantic schemas
│   │   ├── propagation/            # SGP4 engine and TEME coordinate math
│   │   ├── screening/              # Radial filter and golden-section search
│   │   └── weather/                # NOAA SWPC client and scenario models
│   └── tests/                      # Pytest unit and integration tests
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                 # Root layout and state providers
│       ├── api/                    # Typed API client functions
│       ├── components/
│       │   ├── dashboard/          # Header, stats bar, disclaimers
│       │   ├── alerts/             # Conjunction alert triage table
│       │   ├── objects/            # Satellite detail card / drawer
│       │   ├── weather/            # Space weather widget
│       │   └── globe/              # 3D Three.js canvas (offline local texture)
│       └── styles/                 # CSS design system tokens
├── data/
│   ├── cache/                      # Ignored in git, runtime cache
│   └── fixtures/                   # Committed offline demo fixtures
└── *.md                            # Authoritative architecture and documentation files
```

### 3.1 Backend Code Standards
- **Python Version:** Python 3.11+
- **Type Annotations:** Full type hinting (`typing` / Python 3.10+ native pipe syntax `int | None`).
- **Data Modeling:** Pydantic v2 schemas for all API payloads and internal DTOs.
- **Vector Operations:** Use NumPy arrays for all coordinate matrices; avoid Python list iteration over large time grids.
- **Docstrings:** Use Google-style docstrings specifying physical units ($\text{km}$, $\text{km/s}$, $\text{seconds}$).

### 3.2 Frontend Code Standards
- **Framework:** React 18 with TypeScript.
- **Visualization:** Three.js with OrbitControls and local Earth texture (`public/earth_daymap.jpg`).
- **Styling:** CSS design system tokens defined in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
- **State Management:** Lightweight React state / Context API; no Redux or complex state machines.
- **Resilience:** Defensive rendering with loading spinners, error boundaries, and empty-state placeholders.

---

## 4. Verification & Testing Protocol for Agents

Whenever an agent writes or refactors code:
1. **Validate API Contracts:** Check against [`API_CONTRACT.md`](./API_CONTRACT.md). Do not alter field names or types without explicit instruction.
2. **Execute Unit Tests:** Run backend tests via `pytest` and verify that all tests pass without warnings.
3. **Verify Offline Execution:** Confirm that running the ingestion module with an invalid network URL properly loads the fixture from `data/fixtures/`.
4. **Preserve Documentation Consistency:** Ensure that changes do not contradict [`ARCHITECTURE.md`](./ARCHITECTURE.md) or [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md).

---

## 5. Confirmed Operational Parameters

The engineering team has confirmed the following operational baselines:
- Screening threshold: $50.0\text{ km}$ (with Stage 2 coarse proximity trigger at $500.0\text{ km}$, bounded under $v_{\text{rel}} \le 15.0\text{ km/s}$).
- Lookahead window: $24\text{ hours}$ (expandable to $72\text{ hours}$).
- Coarse step: $60\text{ seconds}$; Fine search tolerance: $1.0\text{ second}$ with verified unimodal brackets and plateau/boundary safeguards.
- Bounded object catalog size: $100\text{ objects}$.
- Globe visualization engine: Three.js with local Earth texture (`public/earth_daymap.jpg`).

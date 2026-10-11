# PROJECT_BRIEF.md: Orbital Conjunction & Space Traffic Risk Engine

> **Project Title:** Orbital Conjunction & Space Traffic Risk Engine  
> **Event Type:** 8-Hour Engineering Hackathon  
> **Team Composition:** 5 Developers  
> **Team Lead / Integration Responsibility:** Backend & Integration Lead  
> **Document Status:** Authoritative Project Charter  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 1. Executive Summary

The rapid industrialization of Low Earth Orbit (LEO)—driven by commercial mega-constellations, scientific missions, and accumulated space debris—has created an urgent need for accessible space situational awareness (SSA). While military and commercial orbital safety services (such as the 18th Space Defense Squadron and commercial tracking networks) process vast catalogs on high-performance supercomputing clusters, researchers, university satellite teams, and independent operators frequently lack lightweight, transparent, and interactive tools to explore candidate close approaches in real time.

The **Orbital Conjunction & Space Traffic Risk Engine** is an open-architecture, rapid-screening prototype built during an 8-hour sprint. It demonstrates an end-to-end astrodynamics pipeline: ingesting public Two-Line Element (TLE) orbital sets, propagating trajectories via the Simplified General Perturbations 4 (SGP4) model, screening for candidate conjunctions over a 24- to 72-hour window, contextualizing encounters with live space-weather telemetry, and visualizing results through a modern 3D WebGL operations dashboard.

---

## 2. Problem Statement & Scope Boundaries

### 2.1 The Challenge
Orbital conjunction screening across the entire cataloged space population ($>45,000$ tracked objects) requires evaluating $\approx 10^9$ candidate pairs at fine temporal discretization. For an 8-hour hackathon, attempting all-pairs screening across the full catalog is computationally infeasible and leads to system failure. Furthermore, many existing hackathon projects present distance-based miss distances as "collision probabilities," misleading users about orbital mechanics and measurement uncertainties.

### 2.2 The Solution
Our prototype solves this by implementing a **scientifically grounded, bounded-catalog screening engine**:
1. **Targeted Catalog:** Screens a curated, high-interest subset of 50 to 200 LEO objects (crewed habitats including ISS and Tiangong, selected Starlink/OneWeb satellites, and notable debris fragments).
2. **Two-Stage Screening:** Combines apogee/perigee altitude boundary filtering with a coarse-to-fine time-step search to identify local separation minima in seconds.
3. **Transparent Aerospace Rigor:** Explicitly reports geometric miss distance ($\text{km}$), Time of Closest Approach (TCA), and relative velocity ($\text{km/s}$), while categorically rejecting unvalidated collision probability claims.
4. **Resilient Local Demonstration:** Decouples external API dependencies via deterministic offline fixtures, guaranteeing a flawless presentation regardless of network conditions.

---

## 3. Objectives & Key Results (OKRs)

### Objective 1: Deliver a Validated, End-to-End Conjunction Screening Pipeline (P0 - MVP Priority)
- **KR 1.1:** Successfully ingest and validate $\ge 50$ real-world LEO objects from CelesTrak GP feeds within 3 seconds (with local offline fixture fallback).
- **KR 1.2:** Propagate valid objects across a 24-hour horizon at 60-second intervals using standard SGP4/SDP4.
- **KR 1.3:** Filter candidate pairs via two-stage screening (Stage 1 radial filter, Stage 2 coarse search with 500 km proximity trigger) and refine candidate encounters to $\le 1.0\text{ second}$ TCA resolution with final threshold $\le 50\text{ km}$.

### Objective 2: Build an Operator-Grade Visualization Dashboard (P0 - MVP Priority)
- **KR 2.1:** Render an interactive 3D WebGL globe using Three.js with a local Earth texture, displaying Earth, orbital trajectories, and conjunction encounter points.
- **KR 2.2:** Provide a triage table ranking conjunction events by minimum miss distance with visual risk tiers (`CRITICAL`, `WARNING`, `WATCH`, `MONITOR`).
- **KR 2.3:** Synchronize 3D camera focus with user selections from the alert table.

### Objective 3: Maintain Operational Resilience and Scientific Transparency (P0 - MVP Priority)
- **KR 3.1:** Implement an offline demonstration mode (`data/fixtures/`) that functions with zero active internet access.
- **KR 3.2:** Display persistent scientific disclaimer: proximity metrics indicate geometric miss distance and do NOT constitute collision probabilities.
- **KR 3.3:** Pass 100% of core unit and integration tests covering SGP4 accuracy, TLE checksum validation, and API schemas.

### Secondary Objectives (P1 / P2 - Optional Enhancements)
- **P1 (If Time Permits):** Contextual space-weather telemetry widget (NOAA SWPC $Kp$ index and $F_{10.7}$ flux), orbit timeline scrubbing animation, and 3D relative velocity encounter vectors.
- **P2 (De-scoped / Extra):** Dynamic geomagnetic storm scenario injection (historical storm profiles), and runtime parameter recomputation via `POST /screening/refresh`.

---

## 4. Scientific Boundaries & Non-Negotiable Rules

The project enforces strict aerospace principles to maintain technical defensibility:

1. **No Collision Probability ($P_c$) Claims:**
   - Calculation of true collision probability requires a 3D/6D error covariance matrix ($\mathbf{P}$) representing positional uncertainties at TCA.
   - Public TLE data does **not** provide covariance matrices.
   - The engine **shall not** invent synthetic covariance or label geometric miss distance as a "probability of collision."
2. **No Machine Learning Models:**
   - Classical analytical astrodynamics (SGP4) is deterministic and well-verified.
   - Training or inferencing black-box neural networks for orbital propagation within an 8-hour sprint introduces unverified hallucinations and unnecessary engineering overhead.
3. **Contextual Space Weather Only:**
   - Geomagnetic indices ($Kp$) and solar flux ($F_{10.7}$) illustrate space environmental variability.
   - Standard SGP4 utilizes a static ballistic drag parameter ($B^*$) and cannot dynamically ingest thermospheric density models in real time. Space weather metrics are strictly contextual.
4. **Non-Operational Safety Notice:**
   - This software is an educational prototype and research demonstration. It must not be used to plan or execute operational satellite maneuvers.

---

## 5. Team Composition & Role Ownership

The team consists of five developers operating under strict interface contracts:

```
+--------------------------------------------------------------------------------------------------+
|                                  TEAM ROLES & RESPONSIBILITIES                                   |
+--------------------------------------------------------------------------------------------------+
| Role                       | Primary Ownership                   | Key Deliverables              |
+----------------------------+-------------------------------------+-------------------------------+
| 1. Backend & Integration   | System Architecture, FastAPI API,   | - Core FastAPI application    |
|    Lead (Task Owner)       | SGP4 Integration, Screening Core    | - Conjunction screening engine|
|                            |                                     | - End-to-end integration tests|
+----------------------------+-------------------------------------+-------------------------------+
| 2. Frontend Developer 1    | Dashboard UI, Alert Table,          | - React dashboard shell       |
|                            | Object Details, State Management    | - Conjunction triage table    |
|                            |                                     | - Space weather context card  |
+----------------------------+-------------------------------------+-------------------------------+
| 3. Frontend Developer 2    | 3D Visualization, WebGL Canvas,     | - Interactive 3D globe        |
|                            | Orbit Paths, Encounter Geometry     | - Ephemeris orbit rendering   |
|                            |                                     | - TCA vector visualization    |
+----------------------------+-------------------------------------+-------------------------------+
| 4. Data Developer 1        | Orbital Ingestion, TLE Validation,  | - CelesTrak HTTP client       |
|                            | Normalization & Coordinate Math     | - TLE checksum/range validator|
|                            |                                     | - Validated object datasets   |
+----------------------------+-------------------------------------+-------------------------------+
| 5. Data Developer 2        | Space Weather Client, Cache Store,  | - NOAA SWPC client            |
|                            | Test Fixtures, Scenario Injection   | - Offline snapshot manager    |
|                            |                                     | - Storm scenario test cases   |
+--------------------------------------------------------------------------------------------------+
```

---

## 6. Target Audience & Demonstration Storyline

### 6.1 Demonstration Persona
The hackathon demonstration will be delivered from the perspective of an **Orbital Safety Analyst** monitoring human spaceflight assets in Low Earth Orbit.

### 6.2 Three-Minute Live Demonstration Flow
1. **Minute 0:00 - 0:45 (System Initialization & Health):**
   - Launch application in online or cached offline mode.
   - Highlight the data health indicator: 100 cataloged objects loaded, SGP4 models initialized, NOAA SWPC telemetry connected.
2. **Minute 0:45 - 1:45 (Conjunction Detection & Alert Triage):**
   - Open the Conjunction Alert Table.
   - Identify a candidate close encounter between the International Space Station (NORAD 25544) and a cataloged debris fragment.
   - Point out key screening parameters: TCA in UTC, minimum miss distance ($1.84\text{ km}$), relative velocity ($14.2\text{ km/s}$).
   - Emphasize the clear distinction between geometric miss distance and collision probability.
3. **Minute 1:45 - 2:30 (Interactive 3D Visualizer):**
   - Click the alert row to focus the 3D globe camera on the encounter coordinates.
   - Inspect orbital trajectories and relative encounter geometry at TCA (P0 MVP), showing encounter vectors and miss distance visualization (with timeline scrubbing demonstrated if P1 complete).
4. **Minute 2:30 - 3:00 (Space Weather Context & Resilience):**
   - Inspect the Space Weather card showing current $Kp$ index and $F_{10.7}$ solar flux.
   - Demonstrate the offline fallback resilience by severing the network and verifying that the dashboard remains completely responsive.

---

## 7. Associated Project Documentation

This project charter is supported by comprehensive specifications across the workspace:
- **Architecture Baseline:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **API Specification:** [`API_CONTRACT.md`](./API_CONTRACT.md)
- **Orbital Mechanics & Math:** [`ORBITAL_ENGINE.md`](./ORBITAL_ENGINE.md)
- **Data Ingestion & Schemas:** [`DATA_PIPELINE.md`](./DATA_PIPELINE.md)
- **AI Agent Guidelines:** [`AGENTS.md`](./AGENTS.md)
- **UI/UX Design Specification:** [`UI_UX_SPEC.md`](./UI_UX_SPEC.md)
- **Design System & Tokens:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- **Quality Assurance & Tests:** [`TESTING_AND_VALIDATION.md`](./TESTING_AND_VALIDATION.md)
- **Hour-by-Hour Roadmap:** [`HACKATHON_EXECUTION_PLAN.md`](./HACKATHON_EXECUTION_PLAN.md)
- **Deployment & Runbook:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)

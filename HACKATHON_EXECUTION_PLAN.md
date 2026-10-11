# HACKATHON_EXECUTION_PLAN.md: Eight-Hour Sprint Roadmap & Milestones

> **Project Target:** 8-Hour Hackathon Prototype Delivery  
> **Team Size:** 5 Engineers (1 Backend/Integration Lead, 2 Frontend Developers, 2 Data Developers)  
> **Target Status:** Operational Execution Plan  
> **Parent Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Project Charter:** [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md)

---

## 1. Execution Strategy & Sprint Philosophy

In an 8-hour sprint, time is the scarcest resource. The team cannot afford blocking dependencies, architectural redesigns mid-sprint, or unverified complex integrations:
1. **Contract-First Synchronization (Hour 1):** Backend and Frontend lock in [`API_CONTRACT.md`](./API_CONTRACT.md). Mock JSON files are created immediately so Frontend can build without waiting for the computational backend.
2. **Defensive Modularity:** Data developers produce immutable local fixtures (`data/fixtures/`) early, guaranteeing that network outages cannot stop development.
3. **Strict Midpoint Checkpoint (Hour 4):** Integration between the real SGP4 screening backend and the React frontend occurs at exactly the 4-hour mark. If any secondary feature is lagging, it is de-scoped immediately.
4. **Dedicated Polish & Dry Run (Hours 7–8):** The final 90 minutes are strictly protected for offline resilience checks, end-to-end testing, and demo script rehearsal.

---

## 2. Hour-by-Hour Master Sprint Timeline

```
=================================================================================================================
                                  EIGHT-HOUR HACKATHON TIMELINE (HOURS 0 - 8)
=================================================================================================================

 [ HOUR 0:00 - 1:00 ] SETUP & CONTRACTS LOCKDOWN
 ----------------------------------------------------------------------------------------------------------------
 - ALL: Confirm team roles, review ARCHITECTURE.md, lock API_CONTRACT.md schemas.
 - BACKEND: Initialize FastAPI repository skeleton, CORS middleware, and static mock endpoints.
 - FRONTEND 1: Initialize Vite/React project, configure CSS design tokens, build top navigation bar.
 - FRONTEND 2: Initialize Three.js canvas with local Earth texture (public/earth_daymap.jpg), verify Earth sphere rendering.
 - DATA 1 & 2: Commit verified snapshot fixtures (celestrak_snapshot.txt, swpc_snapshot.json).

 [ HOUR 1:00 - 2:00 ] INGESTION, PARSING & MOCK INTEGRATION
 ----------------------------------------------------------------------------------------------------------------
 - BACKEND: Build Pydantic domain models; serve mock data matching API_CONTRACT.md for all endpoints.
 - FRONTEND 1: Build Conjunction Alert Table and Object Detail cards consuming mock JSON.
 - FRONTEND 2: Render sample static 3D orbital spline on the globe canvas using mock ephemeris.
 - DATA 1: Implement TLE parser, Line 1 & Line 2 modulo 10 checksum validators, and epoch age calculator.
 - DATA 2: Implement NOAA SWPC client and local caching manager.

 [ HOUR 2:00 - 4:00 ] COMPUTATIONAL CORE & COMPONENT BUILD (PARALLEL EXECUTION)
 ----------------------------------------------------------------------------------------------------------------
 - BACKEND: Integrate SGP4/SDP4 propagation engine; implement Stage 1 (Apogee/Perigee) and Stage 2 (Coarse 60s with 500 km proximity trigger)
   conjunction screening algorithms; implement Stage 3 (Bracket Verification & Golden-Section Search) for exact TCA.
 - FRONTEND 1: Implement alert table sorting, severity filtering, and responsive inspector side-drawer.
 - FRONTEND 2: Implement dynamic ephemeris path rendering, satellite markers, and camera fly-to on alert click.
 - DATA 1: Wire CelesTrak HTTP ingestion to the validation pipeline with 2.5s timeout.
 - DATA 2: Build Space Weather widget data provider and synthetic test scenarios (e.g., G4 storm profile).

 [ HOUR 4:00 - 5:00 ] CRITICAL MILESTONE: END-TO-END MIDPOINT INTEGRATION
 ----------------------------------------------------------------------------------------------------------------
 - BACKEND + FRONTEND 1 & 2: Switch frontend API base URL from mock fixtures to live FastAPI endpoints.
 - VERIFY: Real SGP4 propagation results flow into the Conjunction Alert Table and 3D Globe.
 - GATEWAY REVIEW: If live screening takes > 5 seconds, shrink catalog to top 50 objects immediately.

 [ HOUR 5:00 - 6:00 ] ADVANCED FEATURES & 3D INTERACTION REFINEMENT
 ----------------------------------------------------------------------------------------------------------------
 - BACKEND: Expose /api/v1/ephemeris/{norad_id} and optimize NumPy Euclidean vector math.
 - FRONTEND 1: Wire up Space Weather context card and Persistent Scientific Disclaimer Banner.
 - FRONTEND 2: Implement 3D relative velocity encounter vector rendering at TCA and timeline scrubber.
 - DATA 2: Implement offline demonstration toggle (--offline) in backend configuration.

 [ HOUR 6:00 - 7:00 ] SYSTEM HARDENING, RESILIENCE & TESTS
 ----------------------------------------------------------------------------------------------------------------
 - BACKEND: Write and run Pytest suite (propagation benchmarks, TLE corrupt line rejection, API schemas).
 - FRONTEND 1 & 2: Audit defensive states: verify empty conjunction window ("CLEAR") displays properly;
   verify disconnection banner functions if backend stops.
 - DATA 1 & 2: Validate synthetic close-approach scenario (synthetic_close_pair.tle) produces expected TCA.

 [ HOUR 7:00 - 8:00 ] DEMO POLISH, DRY RUN & PRESENTATION READINESS
 ----------------------------------------------------------------------------------------------------------------
 - ALL: Execute 3-minute presentation dry run twice (once online, once with Wi-Fi disabled).
 - ALL: Verify presentation slide deck / narrative alignment with live UI.
 - CODE FREEZE: Strictly no new feature code in the final 30 minutes!
=================================================================================================================
```

---

## 3. Team Role Checklists & Milestones

### 3.1 Backend & Integration Lead (User)
- [ ] Hour 1:00 [P0]: FastAPI skeleton responding with HTTP 200 on `/health` and mock endpoints live.
- [ ] Hour 2:30 [P0]: SGP4 propagator generating TEME coordinates for 100 objects in $< 1.0\text{s}$.
- [ ] Hour 3:45 [P0]: Conjunction screening engine (Stage 1 radial + Stage 2 500 km trigger + Stage 3 Golden-Section) detecting close approach minima.
- [ ] Hour 4:30 [P0]: Successful live integration with frontend dashboard.
- [ ] Hour 6:30 [P0]: Automated pytest suite passing 100% of core math and API contract tests.

### 3.2 Frontend Developer 1 (Dashboard & State)
- [ ] Hour 1:30 [P0]: Dashboard shell and Vanilla CSS design tokens configured.
- [ ] Hour 3:00 [P0]: Conjunction alert table rendering mock events with severity badges.
- [ ] Hour 4:30 [P0]: Table successfully receiving live data from FastAPI backend.
- [ ] Hour 6:00 [P1]: Object inspector drawer and space-weather context widget integrated.
- [ ] Hour 7:00 [P0]: Empty-state ("CLEAR") and offline indicator banners verified.

### 3.3 Frontend Developer 2 (3D Visualization Specialist)
- [ ] Hour 1:30 [P0]: 3D Earth globe rendered with smooth camera orbit controls (Three.js with local Earth texture).
- [ ] Hour 3:30 [P0]: Satellite orbit splines and real-time position markers rendering.
- [ ] Hour 5:00 [P0]: Camera focus and encounter point markers synchronized with table selections.
- [ ] Hour 6:30 [P1]: Relative velocity vector arrow rendered at TCA on the 3D canvas.
- [ ] Hour 7:00 [P1]: Orbit scrubbing timeline stepping satellite positions.

### 3.4 Data Developer 1 (Orbital Ingestion & Validation)
- [ ] Hour 1:00 [P0]: Committed verified `celestrak_snapshot.txt` fixture.
- [ ] Hour 2:30 [P0]: Checksum and Line 1/Line 2 length validation module completed.
- [ ] Hour 4:00 [P0]: Ingestion client feeding validated Pydantic models to the propagation engine.
- [ ] Hour 6:00 [P0]: Edge-case tests covering malformed records and stale epoch detection.

### 3.5 Data Developer 2 (Space Weather & Resilience Specialist)
- [ ] Hour 1:00 [P0]: Committed verified `swpc_snapshot.json` fixture.
- [ ] Hour 2:30 [P1]: NOAA SWPC client with 2.5s timeout and local caching completed.
- [ ] Hour 4:00 [P0]: Synthetic conjunction test fixture (`synthetic_close_pair.tle`) independently calibrated and verified.
- [ ] Hour 6:00 [P0]: Complete offline execution verified with network disabled.

---

## 4. Midpoint Gateway Review (Hour 4:00 Decision Gate)

At Hour 4:00, the team convenes for a mandatory 10-minute Gateway Review:
```
+--------------------------------------------------------------------------------------------------+
|                                  HOUR 4:00 GATEWAY DECISION MATRIX                               |
+--------------------------------------------------------------------------------------------------+
| Condition Detected at Hour 4:00          | Mandatory Remediation Action                          |
+------------------------------------------+-------------------------------------------------------+
| SGP4 screening takes > 5 seconds         | Reduce catalog from 100 objects to top 50 objects.    |
|                                          | Increase coarse screening step from 60s to 120s.      |
+------------------------------------------+-------------------------------------------------------+
| Three.js texture loading issue           | Check path public/earth_daymap.jpg; if asset fails,   |
|                                          | render basic untextured MeshStandardMaterial sphere.  |
+------------------------------------------+-------------------------------------------------------+
| Live CelesTrak API rate-limiting/offline | Lock system into data/fixtures/celestrak_snapshot.txt |
|                                          | and proceed without live fetching.                    |
+------------------------------------------+-------------------------------------------------------+
| Backend integration behind schedule      | Frontend continues on mock JSON; backend focuses only  |
|                                          | on screening route /api/v1/conjunctions.              |
+--------------------------------------------------------------------------------------------------+
```

---

## 5. De-Scoping & Contingency Plan (What Gets Cut First)

If unexpected blockers emerge, features are dropped in strict reverse priority order:
1. **Drop First (Hour 5):** Dynamic space-weather scenario injection (serve static SWPC card instead).
2. **Drop Second (Hour 6):** Orbit timeline scrubbing slider (render static orbit at current epoch + TCA encounter point).
3. **Drop Third (Hour 6.5):** 72-hour screening horizon (freeze to standard 24-hour window).
4. **NEVER DROP (Non-Negotiable Core):**
   - SGP4 trajectory propagation.
   - Conjunction screening (miss distance & TCA calculation).
   - Conjunction Alert Table with severity tiers.
   - 3D Globe with orbit display.
   - Scientific disclaimer banner.

---

## 6. Live Demonstration Script & Storyline (3-Minute Presentation)

```
[ 0:00 - 0:30 ] THE HOOK & SYSTEM OVERVIEW
"Judges, Low Earth Orbit is more congested than ever. Today we built the Orbital Conjunction
& Space Traffic Risk Engine—an open-architecture, real-time screening platform running on SGP4."

[ 0:30 - 1:15 ] LIVE CONJUNCTION DETECTION
"Our backend ingested real-world LEO orbital data, performed two-stage radial and temporal screening,
and identified a candidate close approach between the International Space Station and a Fengyun-1C
debris fragment. Here in our alert table: Miss Distance is 1.84 km, with a relative velocity of 14.2 km/s."

[ 1:15 - 2:00 ] 3D VISUALIZATION & ENCOUNTER GEOMETRY
"Clicking the alert commands the 3D WebGL globe to focus on the encounter coordinates. We can see
the orbital planes intersecting, the encounter beacon at TCA, and the relative velocity vector."

[ 2:00 - 2:30 ] AEROSPACE RIGOR & SCIENTIFIC TRANSPARENCY
"Crucially, our system practices aerospace transparency: notice this persistent banner. Public TLEs
do not include 3D error covariance matrices. Therefore, we report geometric miss distance and
explicitly refuse to display misleading, unvalidated 'collision probabilities'."

[ 2:30 - 3:00 ] RESILIENCE & OFFLINE CAPABILITY
"Finally, watch what happens when we disconnect the network: the system immediately switches to our
verified offline fixtures with zero downtime. Fast, defensible, and resilient. Thank you!"
```

---

## 7. Confirmed Execution Decisions

1. **[CONFIRMED DECISION 1 - Hour 4 Integration Checkpoint Time]:**
   The integration sync is set for exactly Hour 4:00 (10 minutes duration). All developers pause independent tasks to verify live data communication.
2. **[CONFIRMED DECISION 2 - Code Freeze Window]:**
   Code freeze is enforced at Hour 7:30. No new features, refactoring, or dependency changes may be introduced after this time.

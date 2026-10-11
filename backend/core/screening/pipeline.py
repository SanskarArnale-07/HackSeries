import uuid
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List
from backend.config import settings
from backend.models.orbital import OrbitalObject
from backend.models.ephemeris import CartesianVector3D, VelocityVector3D
from backend.models.conjunction import (
    ConjunctionEventDto,
    ConjunctionObjectSummary,
    ConjunctionLocation,
    ScreeningMetadata,
    ConjunctionsResponseDto
)
from backend.core.propagation.propagator import SGP4Propagator
from backend.core.propagation.transforms import (
    compute_gmst,
    teme_to_ecef,
    teme_to_ecef_velocity,
    ecef_to_geodetic
)
from backend.core.screening.radial_filter import radial_apogee_perigee_filter
from backend.core.screening.golden_search import refine_closest_approach

SCIENTIFIC_DISCLAIMER_TEXT = (
    "TRAJACTRA is a research and demonstration prototype. Screened close approaches "
    "and miss-distance tiers are heuristic indicators, not validated collision "
    "probabilities or operational collision-avoidance advice."
)

def determine_screening_tier(miss_distance_km: float) -> str:
    """Assigns heuristic alert tier based on Euclidean miss distance."""
    if miss_distance_km < 5.0:
        return "CRITICAL"
    elif miss_distance_km < 15.0:
        return "WARNING"
    elif miss_distance_km < 30.0:
        return "WATCH"
    elif miss_distance_km <= 50.0:
        return "MONITOR"
    return "CLEAR"

def execute_conjunction_screening(
    objects: List[OrbitalObject],
    start_utc: datetime | None = None,
    window_hours: int = settings.SCREENING_WINDOW_HOURS,
    coarse_step_seconds: int = settings.COARSE_STEP_SECONDS,
    coarse_proximity_km: float = settings.COARSE_PROXIMITY_TRIGGER_KM,
    threshold_km: float = settings.SCREENING_THRESHOLD_KM
) -> ConjunctionsResponseDto:
    """Executes the full 3-stage orbital conjunction screening pipeline."""
    eval_time = datetime.now(timezone.utc)
    if start_utc is None:
        start_utc = eval_time
        
    end_utc = start_utc + timedelta(hours=window_hours)
    
    # 1. Stage 1: Geometric Altitude Radial Filter
    candidate_pairs = radial_apogee_perigee_filter(objects)
    
    # Pre-build time grid for coarse screening
    time_grid: List[datetime] = []
    curr = start_utc
    while curr <= end_utc:
        time_grid.append(curr)
        curr += timedelta(seconds=coarse_step_seconds)
        
    num_steps = len(time_grid)
    conjunction_events: List[ConjunctionEventDto] = []
    
    # Pre-propagate all unique objects once over the coarse grid
    sat_cache = {}
    for obj in objects:
        satrec = SGP4Propagator.create_satrec(obj.line1, obj.line2)
        pos, _, valid = SGP4Propagator.propagate_state_vectors(satrec, time_grid)
        sat_cache[obj.norad_id] = (satrec, pos, valid)
    
    # 2. Stage 2 & 3: Coarse search & fine refinement per candidate pair
    for obj_a, obj_b in candidate_pairs:
        sat_a, pos_a, valid_a = sat_cache[obj_a.norad_id]
        sat_b, pos_b, valid_b = sat_cache[obj_b.norad_id]
        
        # Valid mask: both must be valid
        valid_both = valid_a & valid_b
        if not np.any(valid_both):
            continue
            
        # Compute Euclidean separations where valid
        diff = pos_a - pos_b
        dist_km = np.full(num_steps, np.inf)
        dist_km[valid_both] = np.linalg.norm(diff[valid_both], axis=1)
        
        # Skip docked/identical spacecraft where separation is identically ~0 km across the entire window
        valid_dists = dist_km[valid_both]
        if len(valid_dists) == 0 or np.max(valid_dists) < 0.1:
            continue
            
        # Detect discrete encounter passes (contiguous intervals where separation <= coarse_proximity_km)
        bracket_indices: List[int] = []
        k = 0
        while k < num_steps:
            if valid_both[k] and dist_km[k] <= coarse_proximity_km:
                dip_start = k
                while k < num_steps and valid_both[k] and dist_km[k] <= coarse_proximity_km:
                    k += 1
                dip_end = k - 1
                # Find the minimum point in this encounter pass
                best_k = dip_start + int(np.argmin(dist_km[dip_start : dip_end + 1]))
                bracket_indices.append(best_k)
            else:
                k += 1
                    
        # Stage 3: Fine refinement for each candidate minimum
        for idx in bracket_indices:
            idx_start = max(0, idx - 1)
            idx_end = min(num_steps - 1, idx + 1)
            t_bracket_start = time_grid[idx_start]
            t_bracket_end = time_grid[idx_end]
            
            res = refine_closest_approach(
                sat_a,
                sat_b,
                t_bracket_start,
                t_bracket_end,
                tolerance_seconds=settings.FINE_TOLERANCE_SECONDS
            )
            tca_dt, min_dist, ra, rb, va, vb, status = res
            
            if status != "CONVERGED" or tca_dt is None or min_dist is None:
                continue
                
            # Filter against reporting threshold (50.0 km)
            if min_dist <= threshold_km:
                v_rel_teme = va - vb
                rel_speed = float(np.linalg.norm(v_rel_teme))
                
                # Astronomical coordinate calculations
                jd, fr = SGP4Propagator.datetime_to_jd(tca_dt)
                gmst_rad = compute_gmst(jd, fr)
                
                ra_ecef = teme_to_ecef(ra, gmst_rad)
                rb_ecef = teme_to_ecef(rb, gmst_rad)
                va_ecef = teme_to_ecef_velocity(va, ra_ecef, gmst_rad)
                vb_ecef = teme_to_ecef_velocity(vb, rb_ecef, gmst_rad)
                v_rel_ecef = va_ecef - vb_ecef
                
                # Encounter location (midpoint of closest approach in WGS-84)
                midpoint_ecef = (ra_ecef + rb_ecef) / 2.0
                enc_lat, enc_lon, enc_alt = ecef_to_geodetic(midpoint_ecef)
                
                tier = determine_screening_tier(min_dist)
                event_id = f"CONJ-{obj_a.norad_id}-{obj_b.norad_id}-{int(tca_dt.timestamp())}"
                
                event = ConjunctionEventDto(
                    event_id=event_id,
                    primary_object=ConjunctionObjectSummary(
                        norad_id=obj_a.norad_id,
                        name=obj_a.name,
                        type=obj_a.object_type
                    ),
                    secondary_object=ConjunctionObjectSummary(
                        norad_id=obj_b.norad_id,
                        name=obj_b.name,
                        type=obj_b.object_type
                    ),
                    tca_utc=tca_dt.astimezone(timezone.utc).isoformat(),
                    miss_distance_km=round(min_dist, 3),
                    relative_speed_km_s=round(rel_speed, 4),
                    relative_velocity_vector_teme=VelocityVector3D(
                        vx=round(float(v_rel_teme[0]), 5),
                        vy=round(float(v_rel_teme[1]), 5),
                        vz=round(float(v_rel_teme[2]), 5)
                    ),
                    relative_velocity_vector_ecef=VelocityVector3D(
                        vx=round(float(v_rel_ecef[0]), 5),
                        vy=round(float(v_rel_ecef[1]), 5),
                        vz=round(float(v_rel_ecef[2]), 5)
                    ),
                    primary_position_teme_km=CartesianVector3D(
                        x=round(float(ra[0]), 3),
                        y=round(float(ra[1]), 3),
                        z=round(float(ra[2]), 3)
                    ),
                    encounter_location_wgs84=ConjunctionLocation(
                        latitude_deg=enc_lat,
                        longitude_deg=enc_lon,
                        altitude_km=enc_alt
                    ),
                    coordinate_notes={
                        "inertial_frame": "TEME (True Equator, Mean Equinox)",
                        "earth_fixed_frame": "ECEF (WGS-84 with Coriolis velocity correction)",
                        "geodetic": "WGS-84 ellipsoidal coordinates via Bowring closed-form"
                    },
                    screening_tier=tier,
                    scientific_disclaimer=SCIENTIFIC_DISCLAIMER_TEXT
                )
                conjunction_events.append(event)
                
    # Sort events by miss distance ascending
    conjunction_events.sort(key=lambda e: e.miss_distance_km)
    
    metadata = ScreeningMetadata(
        evaluation_timestamp_utc=eval_time.isoformat(),
        screening_window_hours=window_hours,
        threshold_km=threshold_km,
        total_pairs_screened=len(candidate_pairs),
        events_count=len(conjunction_events),
        status="CONJUNCTIONS_DETECTED" if conjunction_events else "CLEAR"
    )
    
    return ConjunctionsResponseDto(
        screening_metadata=metadata,
        events=conjunction_events
    )

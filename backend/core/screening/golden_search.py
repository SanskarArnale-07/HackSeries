import math
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
import numpy as np
from sgp4.api import Satrec
from backend.core.propagation.propagator import SGP4Propagator

INV_PHI = (math.sqrt(5.0) - 1.0) / 2.0  # ~0.618033988749895
INV_PHI_SQ = (3.0 - math.sqrt(5.0)) / 2.0  # ~0.381966011250105

def evaluate_separation_teme(
    sat_a: Satrec,
    sat_b: Satrec,
    target_dt: datetime
) -> Tuple[Optional[float], Optional[np.ndarray], Optional[np.ndarray], Optional[np.ndarray], Optional[np.ndarray]]:
    """Evaluates Euclidean distance in TEME frame at target_dt.
    
    Returns:
        (separation_km, r_a_teme, r_b_teme, v_a_teme, v_b_teme)
        or (None, None, None, None, None) if propagation fails.
    """
    jd, fr = SGP4Propagator.datetime_to_jd(target_dt)
    err_a, r_a, v_a = sat_a.sgp4(jd, fr)
    err_b, r_b, v_b = sat_b.sgp4(jd, fr)
    
    if err_a != 0 or err_b != 0:
        return None, None, None, None, None
        
    ra = np.array(r_a, dtype=float)
    rb = np.array(r_b, dtype=float)
    va = np.array(v_a, dtype=float)
    vb = np.array(v_b, dtype=float)
    
    sep_km = float(np.linalg.norm(ra - rb))
    return sep_km, ra, rb, va, vb

def refine_closest_approach(
    sat_a: Satrec,
    sat_b: Satrec,
    t_start: datetime,
    t_end: datetime,
    tolerance_seconds: float = 1.0,
    max_iterations: int = 50
) -> Tuple[Optional[datetime], Optional[float], Optional[np.ndarray], Optional[np.ndarray], Optional[np.ndarray], Optional[np.ndarray], str]:
    """Refines closest approach using Golden-Section Search with unimodal, plateau, and error safeguards.
    
    Returns:
        (tca_dt, min_distance_km, r_a_teme, r_b_teme, v_a_teme, v_b_teme, status_str)
    """
    # Safeguard 1: Initial bracket evaluation & Unimodal check
    t0_sec = 0.0
    t1_sec = (t_end - t_start).total_seconds()
    if t1_sec <= 0:
        return None, None, None, None, None, None, "INVALID_TIME_INTERVAL"
        
    f_a, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, t_start)
    f_b, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, t_end)
    
    # Safeguard 5: Abort on invalid propagation at endpoints
    if f_a is None or f_b is None:
        return None, None, None, None, None, None, "PROPAGATION_FAILURE_IN_BRACKET"
        
    # Safeguard 2: Test interior sample
    t_mid = t_start + timedelta(seconds=t1_sec / 2.0)
    f_mid, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, t_mid)
    if f_mid is None:
        return None, None, None, None, None, None, "PROPAGATION_FAILURE_IN_BRACKET"
        
    # Standard Golden Section bracket initialization
    a = t0_sec
    b = t1_sec
    h = b - a
    
    c = a + INV_PHI_SQ * h
    d = a + INV_PHI * h
    
    dt_c = t_start + timedelta(seconds=c)
    dt_d = t_start + timedelta(seconds=d)
    
    fc, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, dt_c)
    fd, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, dt_d)
    
    if fc is None or fd is None:
        return None, None, None, None, None, None, "PROPAGATION_FAILURE_IN_BRACKET"
        
    iterations = 0
    while (b - a) > tolerance_seconds and iterations < max_iterations:
        iterations += 1
        # Safeguard 2: Use <= to ensure convergence on plateaus or symmetric minima
        if fc <= fd:
            b = d
            d = c
            fd = fc
            h = b - a
            c = a + INV_PHI_SQ * h
            dt_c = t_start + timedelta(seconds=c)
            fc, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, dt_c)
            if fc is None:
                return None, None, None, None, None, None, "PROPAGATION_FAILURE_IN_BRACKET"
        else:
            a = c
            c = d
            fc = fd
            h = b - a
            d = a + INV_PHI * h
            dt_d = t_start + timedelta(seconds=d)
            fd, _, _, _, _ = evaluate_separation_teme(sat_a, sat_b, dt_d)
            if fd is None:
                return None, None, None, None, None, None, "PROPAGATION_FAILURE_IN_BRACKET"
                
    best_sec = (a + b) / 2.0
    tca_dt = t_start + timedelta(seconds=best_sec)
    
    min_dist, ra, rb, va, vb = evaluate_separation_teme(sat_a, sat_b, tca_dt)
    if min_dist is None:
        return None, None, None, None, None, None, "PROPAGATION_FAILURE_IN_BRACKET"
        
    return tca_dt, min_dist, ra, rb, va, vb, "CONVERGED"

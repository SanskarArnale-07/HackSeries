from typing import List, Tuple
from backend.models.orbital import OrbitalObject
from backend.config import settings

import numpy as np
from typing import List, Tuple
from backend.models.orbital import OrbitalObject
from backend.config import settings

def radial_apogee_perigee_filter(
    objects: List[OrbitalObject],
    margin_km: float = settings.STAGE1_RADIAL_MARGIN_KM,
    max_pairs: int | None = settings.MAX_CONJUNCTION_SCREENING_PAIRS
) -> List[Tuple[OrbitalObject, OrbitalObject]]:
    """Stage 1: Filters all O(N^2) pairs by geometric altitude envelope overlap with O(N log N) sorting.
    
    Condition for non-intersection:
    If perigee(A) - margin > apogee(B) OR perigee(B) - margin > apogee(A),
    the orbits are radially separated and cannot intersect within the margin.
    """
    n = len(objects)
    if n < 2:
        return []

    # Fast vector arrays
    perigees = np.array([o.orbital_parameters.perigee_altitude_km for o in objects], dtype=np.float64)
    apogees = np.array([o.orbital_parameters.apogee_altitude_km for o in objects], dtype=np.float64)
    
    # Sort by perigee altitude
    sort_idx = np.argsort(perigees)
    p_sorted = perigees[sort_idx]
    a_sorted = apogees[sort_idx]
    
    candidate_pairs: List[Tuple[OrbitalObject, OrbitalObject]] = []
    
    for i in range(n):
        idx_a = sort_idx[i]
        obj_a = objects[idx_a]
        max_p = a_sorted[i] + margin_km
        
        # Binary search for objects where perigee <= apogee(A) + margin
        j_end = int(np.searchsorted(p_sorted, max_p, side="right"))
        
        for j in range(i + 1, min(j_end, n)):
            idx_b = sort_idx[j]
            obj_b = objects[idx_b]
            
            # Non-intersection test: perigee(B) <= apogee(A) + margin AND perigee(A) <= apogee(B) + margin
            if perigees[idx_b] - margin_km <= apogees[idx_a] and perigees[idx_a] - margin_km <= apogees[idx_b]:
                candidate_pairs.append((obj_a, obj_b))
                
    if max_pairs is not None and len(candidate_pairs) > max_pairs:
        # Prioritize pairs with smallest altitude separation (highest geometric conjunction risk)
        candidate_pairs.sort(
            key=lambda pair: abs(pair[0].orbital_parameters.perigee_altitude_km - pair[1].orbital_parameters.perigee_altitude_km) +
                             abs(pair[0].orbital_parameters.apogee_altitude_km - pair[1].orbital_parameters.apogee_altitude_km)
        )
        candidate_pairs = candidate_pairs[:max_pairs]
        
    return candidate_pairs

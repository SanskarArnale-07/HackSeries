from typing import List, Tuple
from backend.models.orbital import OrbitalObject
from backend.config import settings

def radial_apogee_perigee_filter(
    objects: List[OrbitalObject],
    margin_km: float = settings.STAGE1_RADIAL_MARGIN_KM
) -> List[Tuple[OrbitalObject, OrbitalObject]]:
    """Stage 1: Filters all O(N^2) pairs by geometric altitude envelope overlap.
    
    Condition for non-intersection:
    If perigee(A) - margin > apogee(B) OR perigee(B) - margin > apogee(A),
    the orbits are radially separated and cannot intersect within the margin.
    """
    candidate_pairs: List[Tuple[OrbitalObject, OrbitalObject]] = []
    n = len(objects)
    
    for i in range(n):
        obj_a = objects[i]
        p_a = obj_a.orbital_parameters.perigee_altitude_km
        a_a = obj_a.orbital_parameters.apogee_altitude_km
        
        for j in range(i + 1, n):
            obj_b = objects[j]
            p_b = obj_b.orbital_parameters.perigee_altitude_km
            a_b = obj_b.orbital_parameters.apogee_altitude_km
            
            # Non-intersection test
            if (p_a - margin_km > a_b) or (p_b - margin_km > a_a):
                continue
                
            candidate_pairs.append((obj_a, obj_b))
            
    return candidate_pairs

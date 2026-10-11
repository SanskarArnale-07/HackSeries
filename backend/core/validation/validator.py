import math
from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Any
from backend.models.orbital import OrbitalObject, OrbitalParameters

def calculate_tle_checksum(line: str) -> int:
    """Computes modulo 10 checksum over columns 1-68 of a TLE line."""
    if len(line) < 68:
        return -1
    total = 0
    for char in line[:68]:
        if char.isdigit():
            total += int(char)
        elif char == "-":
            total += 1
    return total % 10

def parse_epoch(epoch_str: str) -> datetime:
    """Parses TLE epoch string (YYDDD.DDDDDDDD) into a UTC datetime.
    
    Cols 19-20: Two digit year. YY >= 57 -> 19YY, else 20YY.
    Cols 21-32: Fractional day of the year (1-based).
    """
    clean_str = epoch_str.strip()
    year_prefix = int(clean_str[:2])
    year = 1900 + year_prefix if year_prefix >= 57 else 2000 + year_prefix
    
    day_fraction = float(clean_str[2:])
    # 1.0 is Jan 1 00:00:00
    base_date = datetime(year, 1, 1, tzinfo=timezone.utc)
    target_date = base_date + timedelta(days=day_fraction - 1.0)
    return target_date

def validate_tle_record(name: str, line1: str, line2: str) -> Tuple[OrbitalObject | None, str | None]:
    """Validates and normalizes a 3-line or 2-line TLE record into an OrbitalObject.
    
    Returns:
        (OrbitalObject, None) on success
        (None, error_code) on failure
    """
    line1 = line1.strip().rstrip("\r\n")
    line2 = line2.strip().rstrip("\r\n")
    
    # 1. Line length verification (must be exactly 69 characters)
    if len(line1) != 69 or len(line2) != 69:
        return None, "ERR_LINE_LENGTH"
        
    # 2. Checksum verification
    expected_c1 = calculate_tle_checksum(line1)
    expected_c2 = calculate_tle_checksum(line2)
    if not line1[68].isdigit() or int(line1[68]) != expected_c1:
        return None, "ERR_CHECKSUM"
    if not line2[68].isdigit() or int(line2[68]) != expected_c2:
        return None, "ERR_CHECKSUM"
        
    # 3. Line identifier verification
    if line1[0] != "1" or line2[0] != "2":
        return None, "ERR_LINE_FORMAT"
        
    # 4. NORAD Catalog Number match
    try:
        norad_1 = int(line1[2:7].strip())
        norad_2 = int(line2[2:7].strip())
    except ValueError:
        return None, "ERR_INVALID_NORAD_ID"
        
    if norad_1 != norad_2:
        return None, "ERR_ID_MISMATCH"
        
    # 5. International Designator
    intl_des = line1[9:17].strip()
    
    # 6. Parse Epoch
    try:
        epoch_str = line1[18:32]
        epoch_utc = parse_epoch(epoch_str)
    except Exception:
        return None, "ERR_INVALID_EPOCH"
        
    now_utc = datetime.now(timezone.utc)
    element_age_days = abs((now_utc - epoch_utc).total_seconds()) / 86400.0
    is_stale = element_age_days > 14.0
    
    # 7. Ballistic drag coefficient B*
    # Format: +/-DDDDD+/-D (e.g. 25624-3 -> 0.25624e-3)
    bstar_raw = line1[53:61].strip()
    try:
        if bstar_raw and len(bstar_raw) >= 6:
            mantissa_sign = -1.0 if bstar_raw[0] == "-" else 1.0
            mantissa_str = bstar_raw[1:-2] if bstar_raw[0] in ("-", "+") else bstar_raw[:-2]
            exp_str = bstar_raw[-2:]
            mantissa = float("0." + mantissa_str) * mantissa_sign
            exponent = float(exp_str)
            bstar = mantissa * (10.0 ** exponent)
        else:
            bstar = 0.0
    except Exception:
        bstar = 0.0

    # 8. Parse Line 2 physical orbital elements
    try:
        inclination_deg = float(line2[8:16].strip())
        raan_deg = float(line2[17:25].strip())
        eccentricity_raw = line2[26:33].strip()
        eccentricity = float("0." + eccentricity_raw)
        arg_perigee_deg = float(line2[34:42].strip())
        mean_anomaly_deg = float(line2[43:51].strip())
        mean_motion_rev_day = float(line2[52:63].strip())
    except ValueError:
        return None, "ERR_INVALID_ELEMENTS"
        
    # Bounds validation
    if not (0.0 <= inclination_deg <= 180.0):
        return None, "ERR_INCLINATION_BOUNDS"
    if eccentricity >= 1.0 or eccentricity < 0.0:
        return None, "ERR_PARABOLIC"
    if mean_motion_rev_day <= 0.0:
        return None, "ERR_MEAN_MOTION"
        
    # 9. Compute display Keplerian parameters
    # Earth gravitational parameter mu = 398600.4418 km^3/s^2
    mu = 398600.4418
    r_earth = 6378.137
    n_rad_s = mean_motion_rev_day * (2.0 * math.pi / 86400.0)
    semi_major_axis_km = (mu / (n_rad_s ** 2)) ** (1.0 / 3.0)
    perigee_altitude_km = semi_major_axis_km * (1.0 - eccentricity) - r_earth
    apogee_altitude_km = semi_major_axis_km * (1.0 + eccentricity) - r_earth
    period_minutes = 1440.0 / mean_motion_rev_day
    
    # Classify object type based on name
    name_upper = name.upper()
    if "DEB" in name_upper or "DEBRIS" in name_upper:
        obj_type = "DEBRIS"
    elif "R/B" in name_upper or "ROCKET" in name_upper:
        obj_type = "ROCKET_BODY"
    else:
        obj_type = "PAYLOAD"
        
    params = OrbitalParameters(
        inclination_deg=round(inclination_deg, 4),
        raan_deg=round(raan_deg, 4),
        eccentricity=round(eccentricity, 7),
        arg_perigee_deg=round(arg_perigee_deg, 4),
        mean_anomaly_deg=round(mean_anomaly_deg, 4),
        mean_motion_rev_day=round(mean_motion_rev_day, 8),
        bstar_drag=bstar,
        semi_major_axis_km=round(semi_major_axis_km, 3),
        perigee_altitude_km=round(perigee_altitude_km, 3),
        apogee_altitude_km=round(apogee_altitude_km, 3),
        period_minutes=round(period_minutes, 3)
    )
    
    obj = OrbitalObject(
        norad_id=norad_1,
        name=name.strip(),
        intl_des=intl_des,
        object_type=obj_type,
        epoch_utc=epoch_utc,
        element_age_days=round(element_age_days, 2),
        is_stale=is_stale,
        orbital_parameters=params,
        line1=line1,
        line2=line2
    )
    
    return obj, None

def parse_tle_catalog_text(text: str) -> Tuple[List[OrbitalObject], Dict[str, Any]]:
    """Parses a multi-record TLE string (2-line or 3-line format).
    
    Returns:
        (valid_objects, diagnostics)
    """
    lines = [l for l in text.splitlines() if l.strip()]
    objects: List[OrbitalObject] = []
    diagnostics = {
        "total_parsed": 0,
        "valid_count": 0,
        "stale_count": 0,
        "rejected_count": 0,
        "rejection_reasons": {}
    }
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        # Check for 3-line format (Title, Line 1, Line 2)
        if not line.startswith("1 ") and i + 2 < len(lines) and lines[i+1].strip().startswith("1 ") and lines[i+2].strip().startswith("2 "):
            name = line
            line1 = lines[i+1].strip()
            line2 = lines[i+2].strip()
            i += 3
        # Check for 2-line format without title line
        elif line.startswith("1 ") and i + 1 < len(lines) and lines[i+1].strip().startswith("2 "):
            norad = line[2:7].strip()
            name = f"OBJECT {norad}"
            line1 = line
            line2 = lines[i+1].strip()
            i += 2
        else:
            i += 1
            continue
            
        diagnostics["total_parsed"] += 1
        obj, err = validate_tle_record(name, line1, line2)
        if obj is not None:
            objects.append(obj)
            diagnostics["valid_count"] += 1
            if obj.is_stale:
                diagnostics["stale_count"] += 1
        else:
            diagnostics["rejected_count"] += 1
            reason = err or "UNKNOWN_ERROR"
            diagnostics["rejection_reasons"][reason] = diagnostics["rejection_reasons"].get(reason, 0) + 1
            
    return objects, diagnostics

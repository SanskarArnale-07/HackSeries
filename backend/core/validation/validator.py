import math
import json
from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Any, Union
from backend.models.orbital import OrbitalObject, OrbitalParameters

ALPHA5_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"

def format_norad_id(norad: int) -> str:
    """Formats an integer NORAD ID into standard 5-character string with Alpha-5 for IDs >= 100000."""
    if norad < 100000:
        return f"{norad:5d}"
    idx = (norad - 100000) // 10000
    if idx < len(ALPHA5_CHARS):
        char = ALPHA5_CHARS[idx]
        rem = (norad - 100000) % 10000
        return f"{char}{rem:04d}"
    return f"{norad:5d}"

def parse_norad_id(field: str) -> int:
    """Parses a 5-character TLE NORAD ID field, handling both standard digits and Alpha-5 format."""
    clean = field.strip().upper()
    if not clean:
        raise ValueError("Empty NORAD ID field")
    if clean.isdigit():
        return int(clean)
    if len(clean) == 5 and clean[0] in ALPHA5_CHARS and clean[1:].isdigit():
        idx = ALPHA5_CHARS.index(clean[0])
        return 100000 + idx * 10000 + int(clean[1:])
    raise ValueError(f"Invalid NORAD ID field: {field}")

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
        
    # 4. NORAD Catalog Number match (supports digits & Alpha-5)
    try:
        norad_1 = parse_norad_id(line1[2:7])
        norad_2 = parse_norad_id(line2[2:7])
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

def omm_to_tle_lines(omm: Dict[str, Any]) -> Tuple[str, str]:
    """Generates strictly compliant 69-character Line 1 and Line 2 TLEs from an OMM JSON record."""
    norad = int(omm["NORAD_CAT_ID"])
    norad_str = format_norad_id(norad)
    classif = str(omm.get("CLASSIFICATION_TYPE") or "U").strip() or "U"
    
    # International designator formatting
    intldesg = str(omm.get("OBJECT_ID") or "").strip()
    parts = intldesg.split("-")
    if len(parts) == 2 and len(parts[0]) >= 2:
        yy = parts[0][-2:]
        piece = parts[1]
        desg = f"{yy}{piece:<6}"[:8]
    elif len(intldesg) > 0:
        desg = f"{intldesg:<8}"[:8]
    else:
        desg = "00000A  "
        
    # Epoch conversion to YYDDD.DDDDDDDD
    epoch_raw = str(omm["EPOCH"]).strip()
    if epoch_raw.endswith("Z"):
        epoch_raw = epoch_raw[:-1]
    epoch_dt = datetime.fromisoformat(epoch_raw)
    if epoch_dt.tzinfo is not None:
        epoch_dt = epoch_dt.astimezone(timezone.utc).replace(tzinfo=None)
    yy = epoch_dt.year % 100
    start_year = datetime(epoch_dt.year, 1, 1)
    day_of_year = (epoch_dt - start_year).total_seconds() / 86400.0 + 1.0
    epoch_str = f"{yy:02d}{day_of_year:012.8f}"
    
    # First derivative of mean motion
    n_dot = float(omm.get("MEAN_MOTION_DOT") or 0.0)
    sign = "-" if n_dot < 0 else " "
    abs_dot = abs(n_dot)
    dot_field = f"{sign}.{int(round(abs_dot * 1e8)):08d}"
    
    # Exponential field formatter for BSTAR and DDOT (+/-DDDDD+/-D)
    def fmt_exp(val: float) -> str:
        if val == 0.0:
            return " 00000+0"
        sign = "-" if val < 0 else " "
        v = abs(val)
        exp = int(math.floor(math.log10(v))) + 1
        mant = int(round(v * (10.0 ** (5 - exp))))
        exp_sign = "+" if exp >= 0 else "-"
        return f"{sign}{mant:05d}{exp_sign}{abs(exp)}"
        
    n_ddot = float(omm.get("MEAN_MOTION_DDOT") or 0.0)
    ddot_field = fmt_exp(n_ddot)
    bstar = float(omm.get("BSTAR") or 0.0)
    bstar_field = fmt_exp(bstar)
    
    ephem_type = int(omm.get("EPHEMERIS_TYPE") or 0)
    elset = int(omm.get("ELEMENT_SET_NO") or 999) % 10000
    
    line1_base = f"1 {norad_str}{classif} {desg} {epoch_str} {dot_field} {ddot_field} {bstar_field} {ephem_type} {elset:4d}"
    line1 = f"{line1_base}{calculate_tle_checksum(line1_base)}"
    
    inc = float(omm["INCLINATION"])
    raan = float(omm.get("RA_OF_ASC_NODE") or 0.0)
    e = float(omm["ECCENTRICITY"])
    e_field = f"{int(round(e * 1e7)):07d}"
    argp = float(omm.get("ARG_OF_PERICENTER") or 0.0)
    m = float(omm.get("MEAN_ANOMALY") or 0.0)
    mm = float(omm["MEAN_MOTION"])
    rev = int(omm.get("REV_AT_EPOCH") or 0) % 100000
    
    line2_base = f"2 {norad_str} {inc:8.4f} {raan:8.4f} {e_field} {argp:8.4f} {m:8.4f} {mm:11.8f}{rev:5d}"
    line2 = f"{line2_base}{calculate_tle_checksum(line2_base)}"
    
    return line1, line2

def parse_omm_json_record(omm: Dict[str, Any]) -> Tuple[OrbitalObject | None, str | None]:
    """Parses and validates a single CelesTrak OMM JSON record into an OrbitalObject."""
    if not isinstance(omm, dict):
        return None, "ERR_INVALID_RECORD_TYPE"
        
    # 1. NORAD Catalog ID
    norad_raw = omm.get("NORAD_CAT_ID")
    if norad_raw is None:
        return None, "ERR_MISSING_NORAD_ID"
    try:
        norad_id = int(norad_raw)
    except (ValueError, TypeError):
        return None, "ERR_INVALID_NORAD_ID"
        
    if norad_id < 1 or norad_id > 999999:
        return None, "ERR_NORAD_BOUNDS"
        
    # 2. Name & International Designator
    name = str(omm.get("OBJECT_NAME") or f"OBJECT {norad_id}").strip()
    intl_des = str(omm.get("OBJECT_ID") or "").strip()
    
    # 3. Epoch UTC
    epoch_raw = omm.get("EPOCH")
    if not epoch_raw:
        return None, "ERR_MISSING_EPOCH"
    try:
        epoch_str = str(epoch_raw).strip()
        if epoch_str.endswith("Z"):
            epoch_str = epoch_str[:-1]
        epoch_utc = datetime.fromisoformat(epoch_str)
        if epoch_utc.tzinfo is None:
            epoch_utc = epoch_utc.replace(tzinfo=timezone.utc)
    except Exception:
        return None, "ERR_INVALID_EPOCH"
        
    now_utc = datetime.now(timezone.utc)
    element_age_days = abs((now_utc - epoch_utc).total_seconds()) / 86400.0
    is_stale = element_age_days > 14.0
    
    # 4. Orbital Elements & Bounds
    try:
        inc = float(omm["INCLINATION"])
        ecc = float(omm["ECCENTRICITY"])
        mean_motion = float(omm["MEAN_MOTION"])
        raan = float(omm.get("RA_OF_ASC_NODE") or 0.0)
        arg_p = float(omm.get("ARG_OF_PERICENTER") or 0.0)
        mean_anomaly = float(omm.get("MEAN_ANOMALY") or 0.0)
        bstar = float(omm.get("BSTAR") or 0.0)
    except (KeyError, ValueError, TypeError):
        return None, "ERR_INVALID_ELEMENTS"
        
    if not (0.0 <= inc <= 180.0):
        return None, "ERR_INCLINATION_BOUNDS"
    if ecc < 0.0 or ecc >= 1.0:
        return None, "ERR_PARABOLIC"
    if mean_motion <= 0.0:
        return None, "ERR_MEAN_MOTION"
        
    # 5. Compute Keplerian parameters
    mu = 398600.4418
    r_earth = 6378.137
    n_rad_s = mean_motion * (2.0 * math.pi / 86400.0)
    semi_major_axis_km = (mu / (n_rad_s ** 2)) ** (1.0 / 3.0)
    perigee_altitude_km = semi_major_axis_km * (1.0 - ecc) - r_earth
    apogee_altitude_km = semi_major_axis_km * (1.0 + ecc) - r_earth
    period_minutes = 1440.0 / mean_motion
    
    # 6. Generate TLE representation for SGP4 and TLE views
    try:
        line1, line2 = omm_to_tle_lines(omm)
    except Exception:
        return None, "ERR_TLE_GENERATION"
        
    # Classify object type
    name_upper = name.upper()
    if "DEB" in name_upper or "DEBRIS" in name_upper:
        obj_type = "DEBRIS"
    elif "R/B" in name_upper or "ROCKET" in name_upper:
        obj_type = "ROCKET_BODY"
    else:
        obj_type = "PAYLOAD"
        
    params = OrbitalParameters(
        inclination_deg=round(inc, 4),
        raan_deg=round(raan, 4),
        eccentricity=round(ecc, 7),
        arg_perigee_deg=round(arg_p, 4),
        mean_anomaly_deg=round(mean_anomaly, 4),
        mean_motion_rev_day=round(mean_motion, 8),
        bstar_drag=bstar,
        semi_major_axis_km=round(semi_major_axis_km, 3),
        perigee_altitude_km=round(perigee_altitude_km, 3),
        apogee_altitude_km=round(apogee_altitude_km, 3),
        period_minutes=round(period_minutes, 3)
    )
    
    obj = OrbitalObject(
        norad_id=norad_id,
        name=name,
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

def parse_omm_catalog_json(
    data: Union[List[Dict[str, Any]], str],
    max_records: int = 100
) -> Tuple[List[OrbitalObject], Dict[str, Any]]:
    """Parses a CelesTrak OMM JSON dataset, deduplicating NORAD IDs and rejecting corrupt records.
    
    Returns:
        (valid_objects, diagnostics)
    """
    diagnostics = {
        "total_parsed": 0,
        "valid_count": 0,
        "stale_count": 0,
        "rejected_count": 0,
        "rejection_reasons": {}
    }
    
    if isinstance(data, str):
        try:
            records = json.loads(data)
        except Exception:
            diagnostics["rejected_count"] = 1
            diagnostics["rejection_reasons"]["ERR_MALFORMED_JSON"] = 1
            return [], diagnostics
    elif isinstance(data, list):
        records = data
    else:
        diagnostics["rejected_count"] = 1
        diagnostics["rejection_reasons"]["ERR_INVALID_DATA_FORMAT"] = 1
        return [], diagnostics
        
    objects: List[OrbitalObject] = []
    seen_norad_ids = set()
    
    for rec in records:
        diagnostics["total_parsed"] += 1
        if not isinstance(rec, dict):
            diagnostics["rejected_count"] += 1
            diagnostics["rejection_reasons"]["ERR_NON_DICT_RECORD"] = (
                diagnostics["rejection_reasons"].get("ERR_NON_DICT_RECORD", 0) + 1
            )
            continue
            
        norad_val = rec.get("NORAD_CAT_ID")
        if norad_val is not None:
            try:
                nid = int(norad_val)
                if nid in seen_norad_ids:
                    diagnostics["rejected_count"] += 1
                    diagnostics["rejection_reasons"]["ERR_DUPLICATE_NORAD_ID"] = (
                        diagnostics["rejection_reasons"].get("ERR_DUPLICATE_NORAD_ID", 0) + 1
                    )
                    continue
            except (ValueError, TypeError):
                pass
                
        obj, err = parse_omm_json_record(rec)
        if obj is not None:
            seen_norad_ids.add(obj.norad_id)
            objects.append(obj)
            diagnostics["valid_count"] += 1
            if obj.is_stale:
                diagnostics["stale_count"] += 1
            if max_records is not None and len(objects) >= max_records:
                break
        else:
            diagnostics["rejected_count"] += 1
            reason = err or "UNKNOWN_ERROR"
            diagnostics["rejection_reasons"][reason] = diagnostics["rejection_reasons"].get(reason, 0) + 1
            
    return objects, diagnostics

import math
import numpy as np

# WGS-84 Constants
WGS84_A_KM = 6378.137  # Semi-major axis in km
WGS84_F = 1.0 / 298.257223563  # Flattening
WGS84_B_KM = WGS84_A_KM * (1.0 - WGS84_F)  # Semi-minor axis in km
WGS84_E2 = 2.0 * WGS84_F - WGS84_F ** 2  # First eccentricity squared
WGS84_E_PRIME2 = (WGS84_A_KM ** 2 - WGS84_B_KM ** 2) / (WGS84_B_KM ** 2)

# Earth angular rotation rate in rad/s
OMEGA_EARTH_RAD_S = 7.292115146706979e-5

def compute_gmst(jd_ut1: float, fr_ut1: float = 0.0) -> float:
    """Computes Greenwich Mean Sidereal Time (GMST) in radians for a given Julian Date.
    
    Standard IAU formula (Vallado Eq. 3-47).
    """
    t_ut1 = (jd_ut1 + fr_ut1 - 2451545.0) / 36525.0
    # GMST in seconds of time
    gmst_sec = (
        67310.54841
        + (876600.0 * 3600.0 + 8640184.812866) * t_ut1
        + 0.093104 * (t_ut1 ** 2)
        - 6.2e-6 * (t_ut1 ** 3)
    )
    # Convert seconds to radians (2pi rad per 86400 sec)
    gmst_rad = (gmst_sec % 86400.0) * (2.0 * math.pi / 86400.0)
    if gmst_rad < 0:
        gmst_rad += 2.0 * math.pi
    return gmst_rad

def teme_to_ecef(r_teme: np.ndarray, gmst_rad: float) -> np.ndarray:
    """Rotates position vector from TEME inertial frame to ECEF frame.
    
    Args:
        r_teme: 3D position vector [x, y, z] in km.
        gmst_rad: Greenwich Mean Sidereal Time in radians.
        
    Returns:
        3D position vector in ECEF [x, y, z] in km.
    """
    cos_theta = math.cos(gmst_rad)
    sin_theta = math.sin(gmst_rad)
    # Rotation matrix around Z-axis by +theta
    # r_ecef = R_z(theta) * r_teme
    x = cos_theta * r_teme[0] + sin_theta * r_teme[1]
    y = -sin_theta * r_teme[0] + cos_theta * r_teme[1]
    z = r_teme[2]
    return np.array([x, y, z], dtype=float)

def teme_to_ecef_velocity(v_teme: np.ndarray, r_ecef: np.ndarray, gmst_rad: float) -> np.ndarray:
    """Rotates velocity vector from TEME inertial frame to ECEF frame.
    
    Incorporates the Coriolis transport term:
    v_ecef = R_z(theta) * v_teme - omega_earth x r_ecef
    
    Args:
        v_teme: 3D velocity vector [vx, vy, vz] in km/s.
        r_ecef: 3D position vector in ECEF [x, y, z] in km.
        gmst_rad: Greenwich Mean Sidereal Time in radians.
        
    Returns:
        3D velocity vector in ECEF [vx, vy, vz] in km/s.
    """
    cos_theta = math.cos(gmst_rad)
    sin_theta = math.sin(gmst_rad)
    # R_z(theta) * v_teme
    vx_rot = cos_theta * v_teme[0] + sin_theta * v_teme[1]
    vy_rot = -sin_theta * v_teme[0] + cos_theta * v_teme[1]
    vz_rot = v_teme[2]
    
    # omega_earth = [0, 0, OMEGA_EARTH_RAD_S]
    # omega x r = [-omega * y, omega * x, 0]
    omega_x_r = np.array([
        -OMEGA_EARTH_RAD_S * r_ecef[1],
        OMEGA_EARTH_RAD_S * r_ecef[0],
        0.0
    ], dtype=float)
    
    return np.array([vx_rot, vy_rot, vz_rot], dtype=float) - omega_x_r

def ecef_to_geodetic(r_ecef: np.ndarray) -> tuple[float, float, float]:
    """Converts Cartesian ECEF position to WGS-84 geodetic latitude, longitude, and altitude.
    
    Uses Bowring's closed-form algorithm.
    
    Args:
        r_ecef: 3D position vector [x, y, z] in km.
        
    Returns:
        tuple (latitude_deg, longitude_deg, altitude_km)
    """
    x, y, z = float(r_ecef[0]), float(r_ecef[1]), float(r_ecef[2])
    p = math.sqrt(x ** 2 + y ** 2)
    
    if p < 1e-6:
        # Near poles
        lat_rad = math.pi / 2.0 if z > 0 else -math.pi / 2.0
        lon_rad = 0.0
        alt_km = abs(z) - WGS84_B_KM
        return math.degrees(lat_rad), math.degrees(lon_rad), alt_km
        
    lon_rad = math.atan2(y, x)
    
    # Bowring's parametric latitude approximation
    theta = math.atan2(z * WGS84_A_KM, p * WGS84_B_KM)
    sin_theta = math.sin(theta)
    cos_theta = math.cos(theta)
    
    lat_rad = math.atan2(
        z + WGS84_E_PRIME2 * WGS84_B_KM * (sin_theta ** 3),
        p - WGS84_E2 * WGS84_A_KM * (cos_theta ** 3)
    )
    
    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    # Radius of curvature in prime vertical
    N = WGS84_A_KM / math.sqrt(1.0 - WGS84_E2 * (sin_lat ** 2))
    alt_km = p / cos_lat - N
    
    lat_deg = math.degrees(lat_rad)
    lon_deg = math.degrees(lon_rad)
    # Normalize longitude to [-180, 180]
    if lon_deg > 180.0:
        lon_deg -= 360.0
    elif lon_deg < -180.0:
        lon_deg += 360.0
        
    return round(lat_deg, 6), round(lon_deg, 6), round(alt_km, 3)

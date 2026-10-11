import math
import numpy as np
import pytest
from datetime import datetime, timezone, timedelta
from backend.core.propagation.propagator import SGP4Propagator
from backend.core.propagation.transforms import (
    compute_gmst,
    teme_to_ecef,
    teme_to_ecef_velocity,
    ecef_to_geodetic,
    OMEGA_EARTH_RAD_S
)

ISS_L1 = "1 25544U 98067A   26283.78925095  .00010839  00000+0  20582-3 0  9996"
ISS_L2 = "2 25544  51.6393 120.4502 0005423  75.1234 285.0123 15.49876543000018"

def test_sgp4_valid_propagation():
    satrec = SGP4Propagator.create_satrec(ISS_L1, ISS_L2)
    target_dt = datetime(2026, 10, 11, 12, 0, 0, tzinfo=timezone.utc)
    point = SGP4Propagator.propagate_point(satrec, target_dt)
    
    assert point.is_valid is True
    assert point.propagation_status == "VALID"
    assert point.teme_km is not None
    assert point.ecef_km is not None
    assert point.velocity_teme_km_s is not None
    assert point.velocity_ecef_km_s is not None
    
    # Altitude must be physically in LEO (380 - 450 km)
    assert 380.0 < point.alt_km < 450.0
    
    # Speed in inertial frame must be approx 7.6 - 7.8 km/s
    speed_teme = math.sqrt(point.velocity_teme_km_s.vx**2 + point.velocity_teme_km_s.vy**2 + point.velocity_teme_km_s.vz**2)
    assert 7.5 < speed_teme < 7.9

def test_sgp4_error_preservation_no_zero_vectors():
    # Construct synthetic decayed satrec with suborbital perigee
    # Line 2 with tiny mean motion or extreme eccentricity causing SGP4 error
    bad_l1 = "1 99999U 24001A   26284.00000000  .00000000  00000+0  00000+0 0  9994"
    bad_l2 = "2 99999  51.6400 120.0000 9999999   0.0000   0.0000  1.00000000000012"
    
    satrec = SGP4Propagator.create_satrec(bad_l1, bad_l2)
    target_dt = datetime(2026, 10, 11, 12, 0, 0, tzinfo=timezone.utc)
    point = SGP4Propagator.propagate_point(satrec, target_dt)
    
    # Inviolable Rule: Never replace decayed with [0,0,0]
    assert point.is_valid is False
    assert point.propagation_status != "VALID"
    assert point.teme_km is None
    assert point.ecef_km is None
    assert point.alt_km is None

def test_coriolis_velocity_correction():
    # Test that ECEF velocity differs from rotated TEME velocity by -omega x r
    r_ecef = np.array([6000.0, 2000.0, 1000.0])
    v_teme = np.array([0.0, 7.5, 1.0])
    gmst_rad = 0.5
    
    v_ecef = teme_to_ecef_velocity(v_teme, r_ecef, gmst_rad)
    
    # Rotate v_teme without Coriolis
    cos_t = math.cos(gmst_rad)
    sin_t = math.sin(gmst_rad)
    v_rot = np.array([
        cos_t * v_teme[0] + sin_t * v_teme[1],
        -sin_t * v_teme[0] + cos_t * v_teme[1],
        v_teme[2]
    ])
    
    omega_x_r = np.array([
        -OMEGA_EARTH_RAD_S * r_ecef[1],
        OMEGA_EARTH_RAD_S * r_ecef[0],
        0.0
    ])
    
    expected_v_ecef = v_rot - omega_x_r
    np.testing.assert_allclose(v_ecef, expected_v_ecef, rtol=1e-8)

def test_bowring_geodetic_transformation():
    # Test equator (0, 0, 0 km)
    r_equator = np.array([6378.137, 0.0, 0.0])
    lat, lon, alt = ecef_to_geodetic(r_equator)
    assert lat == pytest.approx(0.0, abs=1e-4)
    assert lon == pytest.approx(0.0, abs=1e-4)
    assert alt == pytest.approx(0.0, abs=1e-2)
    
    # Test North Pole
    r_pole = np.array([0.0, 0.0, 6356.752])
    lat, lon, alt = ecef_to_geodetic(r_pole)
    assert lat == pytest.approx(90.0, abs=1e-3)
    assert alt == pytest.approx(0.0, abs=1e-2)

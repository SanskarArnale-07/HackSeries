import pytest
from backend.core.validation.validator import (
    calculate_tle_checksum,
    parse_epoch,
    validate_tle_record,
    parse_tle_catalog_text
)

# Valid ISS TLE sample
ISS_L1 = "1 25544U 98067A   26283.78925095  .00010839  00000+0  20582-3 0  9996"
ISS_L2 = "2 25544  51.6307  88.0087 0006720 246.7167 113.3114 15.48817123589672"

def test_tle_checksum_calculation():
    # Valid line checksums
    assert calculate_tle_checksum(ISS_L1) == 6
    assert calculate_tle_checksum(ISS_L2) == 2
    
    # Empty or truncated lines
    assert calculate_tle_checksum("1 25544U") == -1

def test_epoch_parsing():
    # Epoch: year 2026, day 283.78925095
    dt = parse_epoch("26283.78925095")
    assert dt.year == 2026
    assert dt.month == 10  # Day 283 is in October

def test_valid_tle_record():
    obj, err = validate_tle_record("ISS (ZARYA)", ISS_L1, ISS_L2)
    assert err is None
    assert obj is not None
    assert obj.norad_id == 25544
    assert obj.name == "ISS (ZARYA)"
    assert obj.object_type == "PAYLOAD"
    assert obj.orbital_parameters.inclination_deg == pytest.approx(51.6307, abs=1e-3)
    assert 400.0 < obj.orbital_parameters.perigee_altitude_km < 440.0
    assert 400.0 < obj.orbital_parameters.apogee_altitude_km < 440.0

def test_invalid_checksum_rejected():
    # Corrupt last digit
    corrupt_l1 = ISS_L1[:-1] + "0"
    obj, err = validate_tle_record("CORRUPT", corrupt_l1, ISS_L2)
    assert obj is None
    assert err == "ERR_CHECKSUM"

def test_norad_id_mismatch_rejected():
    mismatched_l2 = "2 99999  51.6393 120.4502 0005423  75.1234 285.0123 15.49876543000018"
    obj, err = validate_tle_record("MISMATCH", ISS_L1, mismatched_l2)
    assert obj is None
    assert err in ("ERR_ID_MISMATCH", "ERR_CHECKSUM")

def test_line_length_rejected():
    short_l1 = ISS_L1[:60]
    obj, err = validate_tle_record("SHORT", short_l1, ISS_L2)
    assert obj is None
    assert err == "ERR_LINE_LENGTH"

import json
import pytest
from datetime import datetime, timezone
from backend.core.validation.validator import (
    parse_omm_json_record,
    parse_omm_catalog_json,
    omm_to_tle_lines,
    parse_norad_id,
    format_norad_id
)
from backend.core.ingestion.celestrak_client import (
    fetch_celestrak_active_catalog,
    get_cached_active_data,
    CelesTrakIngestionResult
)
from backend.core.propagation.propagator import SGP4Propagator

def test_alpha5_norad_encoding():
    """Verifies Alpha-5 NORAD catalog number encoding and parsing for aerospace standards."""
    # Standard 5-digit
    assert format_norad_id(25544) == "25544"
    assert parse_norad_id("25544") == 25544
    assert format_norad_id(900) == "  900"
    assert parse_norad_id("  900") == 900
    
    # Alpha-5 for IDs >= 100000
    assert format_norad_id(100093) == "A0093"
    assert parse_norad_id("A0093") == 100093
    assert format_norad_id(100480) == "A0480"
    assert parse_norad_id("A0480") == 100480

def test_parse_omm_json_record_valid():
    """Verifies parsing of a valid CelesTrak OMM record with Keplerian conversion."""
    sample = {
        "OBJECT_NAME": "ISS (ZARYA)",
        "OBJECT_ID": "1998-067A",
        "EPOCH": "2026-10-10T18:56:31.282080Z",
        "MEAN_MOTION": 15.48817123,
        "ECCENTRICITY": 0.0006720,
        "INCLINATION": 51.6307,
        "RA_OF_ASC_NODE": 88.0087,
        "ARG_OF_PERICENTER": 246.7167,
        "MEAN_ANOMALY": 113.3114,
        "EPHEMERIS_TYPE": 0,
        "CLASSIFICATION_TYPE": "U",
        "NORAD_CAT_ID": 25544,
        "ELEMENT_SET_NO": 999,
        "REV_AT_EPOCH": 58967,
        "BSTAR": 0.00020582,
        "MEAN_MOTION_DOT": 0.00010839,
        "MEAN_MOTION_DDOT": 0.0
    }
    
    obj, err = parse_omm_json_record(sample)
    assert err is None
    assert obj is not None
    assert obj.norad_id == 25544
    assert obj.name == "ISS (ZARYA)"
    assert obj.orbital_parameters.inclination_deg == 51.6307
    assert obj.orbital_parameters.eccentricity == 0.0006720
    assert obj.orbital_parameters.perigee_altitude_km > 300.0  # LEO orbit
    assert len(obj.line1) == 69
    assert len(obj.line2) == 69

def test_parse_omm_json_record_rejections():
    """Verifies that invalid or corrupted OMM records are properly rejected."""
    # Bad inclination > 180
    bad_inc = {
        "NORAD_CAT_ID": 12345,
        "OBJECT_NAME": "TEST",
        "EPOCH": "2026-10-10T00:00:00Z",
        "INCLINATION": 195.0,
        "ECCENTRICITY": 0.01,
        "MEAN_MOTION": 14.0
    }
    obj, err = parse_omm_json_record(bad_inc)
    assert obj is None
    assert err == "ERR_INCLINATION_BOUNDS"
    
    # Parabolic orbit (e >= 1.0)
    bad_ecc = {
        "NORAD_CAT_ID": 12345,
        "OBJECT_NAME": "TEST",
        "EPOCH": "2026-10-10T00:00:00Z",
        "INCLINATION": 50.0,
        "ECCENTRICITY": 1.05,
        "MEAN_MOTION": 14.0
    }
    obj, err = parse_omm_json_record(bad_ecc)
    assert obj is None
    assert err == "ERR_PARABOLIC"
    
    # Negative mean motion
    bad_mm = {
        "NORAD_CAT_ID": 12345,
        "OBJECT_NAME": "TEST",
        "EPOCH": "2026-10-10T00:00:00Z",
        "INCLINATION": 50.0,
        "ECCENTRICITY": 0.01,
        "MEAN_MOTION": -2.0
    }
    obj, err = parse_omm_json_record(bad_mm)
    assert obj is None
    assert err == "ERR_MEAN_MOTION"

def test_parse_omm_catalog_json_deduplication():
    """Verifies that duplicate NORAD IDs in CelesTrak feed are rejected."""
    rec = {
        "NORAD_CAT_ID": 25544,
        "OBJECT_NAME": "ISS (ZARYA)",
        "OBJECT_ID": "1998-067A",
        "EPOCH": "2026-10-10T18:56:31.282080Z",
        "MEAN_MOTION": 15.48817123,
        "ECCENTRICITY": 0.0006720,
        "INCLINATION": 51.6307,
        "RA_OF_ASC_NODE": 88.0087,
        "ARG_OF_PERICENTER": 246.7167,
        "MEAN_ANOMALY": 113.3114,
        "BSTAR": 0.00020582
    }
    dataset = [rec, rec]  # duplicate
    objs, diag = parse_omm_catalog_json(dataset, max_records=10)
    assert len(objs) == 1
    assert diag["rejected_count"] == 1
    assert "ERR_DUPLICATE_NORAD_ID" in diag["rejection_reasons"]

def test_sgp4_propagation_on_omm_parsed_satellite():
    """Verifies that satellites parsed from CelesTrak OMM propagate accurately using SGP4."""
    sample = {
        "OBJECT_NAME": "ISS (ZARYA)",
        "OBJECT_ID": "1998-067A",
        "EPOCH": "2026-10-10T18:56:31.282080Z",
        "MEAN_MOTION": 15.48817123,
        "ECCENTRICITY": 0.0006720,
        "INCLINATION": 51.6307,
        "RA_OF_ASC_NODE": 88.0087,
        "ARG_OF_PERICENTER": 246.7167,
        "MEAN_ANOMALY": 113.3114,
        "NORAD_CAT_ID": 25544,
        "BSTAR": 0.00020582
    }
    obj, _ = parse_omm_json_record(sample)
    assert obj is not None
    
    satrec = SGP4Propagator.create_satrec(obj.line1, obj.line2)
    pt = SGP4Propagator.propagate_point(satrec, obj.epoch_utc)
    
    assert pt.is_valid is True
    assert pt.propagation_status == "VALID"
    assert pt.teme_km is not None
    assert pt.ecef_km is not None
    assert pt.lat_deg is not None
    assert pt.lon_deg is not None
    assert 400.0 < pt.alt_km < 440.0  # ISS altitude ~ 420 km

def test_fetch_celestrak_active_catalog_offline_resilience():
    """Verifies that CelesTrak client falls back seamlessly to cache in offline mode."""
    res_bounded = fetch_celestrak_active_catalog(max_objects=100, force_offline=True)
    assert len(res_bounded.objects) == 100
    assert res_bounded.is_live is False
    assert res_bounded.source_name in ("CELESTRAK_LOCAL_CACHE", "CELESTRAK_OFFLINE_FIXTURE")

    # Unlimited maximum available catalog
    res_all = fetch_celestrak_active_catalog(max_objects=None, force_offline=True)
    assert len(res_all.objects) >= 2000
    assert res_all.is_live is False
    assert res_all.diagnostics["valid_count"] >= 2000
    assert res_all.diagnostics["rejected_count"] == 0


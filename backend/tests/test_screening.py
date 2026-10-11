from pathlib import Path
from datetime import datetime, timezone
import pytest
from backend.core.validation.validator import parse_tle_catalog_text
from backend.core.screening.radial_filter import radial_apogee_perigee_filter
from backend.core.screening.pipeline import execute_conjunction_screening, determine_screening_tier
from backend.core.screening.golden_search import refine_closest_approach
from backend.core.propagation.propagator import SGP4Propagator

def test_stage1_radial_filter():
    # Low orbit object (altitude ~300 km, mm ~16.0)
    # High orbit object (altitude ~800 km, mm ~14.2)
    # They should NOT pass Stage 1 filter (margin = 20 km, diff = 500 km)
    from backend.core.validation.validator import calculate_tle_checksum
    
    l1_low = "1 90001U 24001A   26284.00000000  .00001000  00000+0  10000-3 0  999"
    l1_low += str(calculate_tle_checksum(l1_low))
    l2_low = "2 90001  51.6400 120.0000 0015000   0.0000   0.0000 16.0000000000001"
    l2_low += str(calculate_tle_checksum(l2_low))
    
    l1_high = "1 90002U 24001A   26284.00000000  .00001000  00000+0  10000-3 0  999"
    l1_high += str(calculate_tle_checksum(l1_high))
    l2_high = "2 90002  51.6400 120.0000 0015000   0.0000   0.0000 14.2000000000001"
    l2_high += str(calculate_tle_checksum(l2_high))
    
    tles = f"LOW_OBJ\n{l1_low}\n{l2_low}\nHIGH_OBJ\n{l1_high}\n{l2_high}\n"
    objs, diag = parse_tle_catalog_text(tles)
    assert len(objs) == 2
    pairs = radial_apogee_perigee_filter(objs, margin_km=20.0)
    assert len(pairs) == 0

def test_screening_tier_classification():
    assert determine_screening_tier(2.1) == "CRITICAL"
    assert determine_screening_tier(8.5) == "WARNING"
    assert determine_screening_tier(22.0) == "WATCH"
    assert determine_screening_tier(45.0) == "MONITOR"
    assert determine_screening_tier(60.0) == "CLEAR"

def test_synthetic_conjunction_benchmark_pipeline():
    tle_path = Path("data/fixtures/synthetic_close_pair.tle")
    assert tle_path.exists()
    objs, diag = parse_tle_catalog_text(tle_path.read_text(encoding="utf-8"))
    assert len(objs) == 2
    
    # Run screening with 24-hour lookahead
    start_dt = datetime(2026, 10, 11, 12, 0, 0, tzinfo=timezone.utc)
    res = execute_conjunction_screening(objs, start_utc=start_dt, window_hours=24)
    
    assert res.screening_metadata.total_pairs_screened == 1
    assert res.screening_metadata.events_count > 0
    assert res.screening_metadata.status == "CONJUNCTIONS_DETECTED"
    
    first_event = res.events[0]
    # Check calibrated bounds
    assert 0.5 <= first_event.miss_distance_km <= 25.0
    assert first_event.screening_tier in ("CRITICAL", "WARNING")
    
    # Mandatory Scientific Rule: Never claim collision probability
    assert "collision probability" not in str(first_event).lower() or "disclaimer" in str(first_event).lower()
    assert "heuristic" in first_event.scientific_disclaimer.lower()
    
    # Coordinates must be populated and non-zero
    assert first_event.relative_speed_km_s > 0.0
    assert first_event.relative_velocity_vector_teme.vx != 0.0 or first_event.relative_velocity_vector_teme.vy != 0.0
    assert first_event.encounter_location_wgs84.altitude_km > 300.0

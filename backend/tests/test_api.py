import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.state import app_state

@pytest.fixture(scope="module")
def client():
    # Initialize state with offline mode for reliable fast testing
    app_state.initialize(force_offline=True)
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "HEALTHY"
    assert data["service"] == "TRAJACTRA_BACKEND"
    assert data["catalog_size"] > 0
    assert "X-Scientific-Disclaimer" in resp.headers

def test_objects_endpoint(client):
    resp = client.get("/api/v1/objects?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "objects" in data
    assert len(data["objects"]) <= 5
    
    first_norad = data["objects"][0]["norad_id"]
    detail_resp = client.get(f"/api/v1/objects/{first_norad}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["norad_id"] == first_norad

def test_conjunctions_endpoint(client):
    resp = client.get("/api/v1/conjunctions")
    assert resp.status_code == 200
    data = resp.json()
    assert "screening_metadata" in data
    assert "events" in data
    assert data["screening_metadata"]["threshold_km"] == 50.0

def test_ephemeris_endpoint(client):
    first_norad = app_state.objects[0].norad_id
    resp = client.get(f"/api/v1/ephemeris/{first_norad}?step_seconds=120&duration_hours=1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["norad_id"] == first_norad
    assert len(data["points"]) > 0
    
    # Check that points have TEME, ECEF, lat, lon, alt
    p0 = data["points"][0]
    assert p0["is_valid"] is True
    assert p0["lat_deg"] is not None
    assert p0["ecef_km"] is not None
    assert p0["teme_km"] is not None

def test_weather_endpoint(client):
    resp = client.get("/api/v1/weather/current")
    assert resp.status_code == 200
    data = resp.json()
    assert "planetary_k_index" in data
    assert "geomagnetic_storm_status" in data

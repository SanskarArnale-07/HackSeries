from backend.core.ingestion.client import load_orbital_catalog
from backend.core.weather.client import load_space_weather
from backend.config import settings

def test_orbital_ingestion_offline_mode():
    res = load_orbital_catalog(max_objects=50, force_offline=True)
    assert res.is_live is False
    assert res.source_name == "LOCAL_FIXTURE_OFFLINE"
    assert len(res.objects) > 0
    assert len(res.objects) <= 50

def test_space_weather_offline_mode():
    weather = load_space_weather(force_offline=True)
    assert weather.source == "NOAA_SWPC"
    assert weather.is_cached is True
    assert weather.planetary_k_index is not None
    assert weather.solar_radio_flux_f107 is not None
    assert weather.geomagnetic_storm_status in ["QUIET", "UNSETTLED", "MINOR_STORM", "STRONG_STORM"]

import json
from datetime import datetime, timezone
import httpx
from backend.config import settings
from backend.models.weather import SpaceWeatherState

def load_space_weather(force_offline: bool = False) -> SpaceWeatherState:
    """Fetches NOAA SWPC planetary K-index and solar radio flux F10.7, or falls back to snapshot."""
    fixture_path = settings.SWPC_FIXTURE_PATH
    
    if force_offline or settings.OFFLINE_MODE:
        return _load_fixture(fixture_path)
        
    try:
        with httpx.Client(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            rkp = client.get(settings.SWPC_KP_URL)
            rf107 = client.get(settings.SWPC_F107_URL)
            if rkp.status_code == 200 and rf107.status_code == 200:
                kp_list = rkp.json()
                f107_list = rf107.json()
                latest_kp = kp_list[-1] if kp_list else {"kp_index": 3.0}
                latest_f107 = f107_list[-1] if f107_list else {"flux": 150.0}
                
                kp_val = float(latest_kp.get("kp_index", 3.0))
                storm_status = "QUIET"
                if kp_val >= 7.0:
                    storm_status = "STRONG_STORM"
                elif kp_val >= 5.0:
                    storm_status = "MINOR_STORM"
                elif kp_val >= 4.0:
                    storm_status = "UNSETTLED"
                    
                return SpaceWeatherState(
                    source="NOAA_SWPC_LIVE",
                    timestamp_utc=datetime.now(timezone.utc).isoformat(),
                    is_cached=False,
                    planetary_k_index=latest_kp,
                    solar_radio_flux_f107=latest_f107,
                    geomagnetic_storm_status=storm_status,
                    contextual_notes={
                        "kp_interpretation": f"Kp = {kp_val:.2f}: Upper atmospheric drag variation evaluated.",
                        "f107_interpretation": f"F10.7 = {latest_f107.get('flux', 150.0)} sfu: Solar radio flux nominal."
                    }
                )
    except Exception:
        pass
        
    return _load_fixture(fixture_path)

def _load_fixture(path) -> SpaceWeatherState:
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return SpaceWeatherState(**data)
    # Default fallback if file is somehow missing
    return SpaceWeatherState(
        source="DEFAULT_FALLBACK",
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        is_cached=True,
        planetary_k_index={"kp_index": 3.0},
        solar_radio_flux_f107={"flux": 150.0},
        geomagnetic_storm_status="QUIET",
        contextual_notes={
            "kp_interpretation": "Default quiet conditions.",
            "f107_interpretation": "Solar flux nominal."
        }
    )

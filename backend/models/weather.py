from pydantic import BaseModel

class SpaceWeatherState(BaseModel):
    source: str = "NOAA_SWPC"
    timestamp_utc: str
    is_cached: bool = False
    planetary_k_index: dict
    solar_radio_flux_f107: dict
    geomagnetic_storm_status: str
    contextual_notes: dict[str, str]

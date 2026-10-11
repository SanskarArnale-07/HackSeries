from fastapi import APIRouter, HTTPException
from backend.models.weather import SpaceWeatherState
from backend.core.state import app_state

router = APIRouter(prefix="/api/v1/weather", tags=["Space Weather"])

@router.get("/current", response_model=SpaceWeatherState)
def get_current_space_weather():
    """Retrieves current NOAA SWPC space weather indices and upper atmospheric density context."""
    if not app_state.weather:
        raise HTTPException(status_code=503, detail="Space weather state unavailable")
    return app_state.weather

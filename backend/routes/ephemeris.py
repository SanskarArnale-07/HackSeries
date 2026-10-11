from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from backend.models.ephemeris import EphemerisTrajectoryDto
from backend.core.state import app_state
from backend.core.propagation.propagator import SGP4Propagator

router = APIRouter(prefix="/api/v1/ephemeris", tags=["Ephemeris"])

@router.get("/{norad_id}", response_model=EphemerisTrajectoryDto)
def get_object_ephemeris(
    norad_id: int,
    step_seconds: int = Query(default=60, ge=10, le=300),
    duration_hours: float = Query(default=2.0, ge=0.5, le=24.0)
):
    """Calculates orbital ephemeris time series for 3D visualization and orbit rendering."""
    obj = app_state.objects_by_id.get(norad_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"NORAD ID {norad_id} not found in catalog")
        
    start_utc = datetime.now(timezone.utc)
    end_utc = start_utc + timedelta(hours=duration_hours)
    
    try:
        trajectory = SGP4Propagator.propagate_trajectory(
            sat_obj=obj,
            start_utc=start_utc,
            end_utc=end_utc,
            step_seconds=step_seconds
        )
        return trajectory
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SGP4 propagation error: {str(e)}")

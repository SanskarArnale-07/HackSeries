from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.models.conjunction import ConjunctionsResponseDto, ConjunctionEventDto
from backend.core.state import app_state

router = APIRouter(prefix="/api/v1/conjunctions", tags=["Conjunctions"])

@router.get("", response_model=ConjunctionsResponseDto)
def list_conjunctions(
    tier: Optional[str] = Query(default=None, description="Filter by screening tier: CRITICAL, WARNING, WATCH, MONITOR"),
    max_miss_km: Optional[float] = Query(default=None, description="Upper bound for miss distance in km")
):
    """Retrieves screened conjunction events over the evaluation window."""
    if not app_state.conjunctions:
        raise HTTPException(status_code=503, detail="Conjunction screening engine initializing")
        
    events = app_state.conjunctions.events
    if tier:
        events = [e for e in events if e.screening_tier.upper() == tier.upper()]
    if max_miss_km is not None:
        events = [e for e in events if e.miss_distance_km <= max_miss_km]
        
    return ConjunctionsResponseDto(
        screening_metadata=app_state.conjunctions.screening_metadata,
        events=events
    )

@router.get("/{event_id}", response_model=ConjunctionEventDto)
def get_conjunction_event(event_id: str):
    """Retrieves full telemetry, relative velocity vectors, and geodetic encounter point for an event."""
    if not app_state.conjunctions:
        raise HTTPException(status_code=503, detail="Conjunction screening engine initializing")
        
    for ev in app_state.conjunctions.events:
        if ev.event_id == event_id:
            return ev
            
    raise HTTPException(status_code=404, detail=f"Conjunction event {event_id} not found")

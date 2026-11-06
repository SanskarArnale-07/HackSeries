from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.models.orbital import OrbitalObject, CatalogSummary
from backend.core.state import app_state

router = APIRouter(prefix="/api/v1/objects", tags=["Objects"])

@router.get("", response_model=dict)
def list_objects(
    limit: int = Query(default=100, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None)
):
    """Lists tracked orbital objects in the LEO catalog with optional filtering and pagination."""
    filtered = app_state.objects
    if search:
        search_lower = search.lower()
        filtered = [
            obj for obj in filtered
            if search_lower in obj.name.lower()
            or search_lower in str(obj.norad_id)
            or (obj.intl_des and search_lower in obj.intl_des.lower())
            or search_lower in obj.object_type.lower()
        ]
        
    paginated = filtered[offset : offset + limit]
    return {
        "summary": app_state.catalog_summary,
        "total_matched": len(filtered),
        "limit": limit,
        "offset": offset,
        "objects": paginated
    }

@router.post("/refresh")
@router.get("/refresh")
def refresh_catalog(force: bool = False):
    """Triggers re-ingestion of CelesTrak active GP data and re-runs conjunction screening."""
    app_state.initialize(force_refresh=force)
    return {
        "status": "SUCCESS",
        "data_source": app_state.data_source,
        "is_live": app_state.is_live,
        "total_objects": len(app_state.objects),
        "last_update_utc": app_state.last_update_utc,
        "data_age_seconds": app_state.data_age_seconds,
        "events_screened": app_state.conjunctions.screening_metadata.events_count if app_state.conjunctions else 0
    }

@router.get("/{norad_id}", response_model=OrbitalObject)
def get_object_by_id(norad_id: int):
    """Retrieves metadata and Keplerian parameters for a specific NORAD ID."""
    obj = app_state.objects_by_id.get(norad_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object NORAD ID {norad_id} not found in catalog")
    return obj

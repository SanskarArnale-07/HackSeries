from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.models.orbital import OrbitalObject, CatalogSummary
from backend.core.state import app_state

router = APIRouter(prefix="/api/v1/objects", tags=["Objects"])

@router.get("", response_model=dict)
def list_objects(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None)
):
    """Lists tracked orbital objects in the LEO catalog with optional filtering and pagination."""
    filtered = app_state.objects
    if search:
        search_lower = search.lower()
        filtered = [
            obj for obj in filtered
            if search_lower in obj.name.lower() or search_lower in str(obj.norad_id)
        ]
        
    paginated = filtered[offset : offset + limit]
    return {
        "summary": app_state.catalog_summary,
        "total_matched": len(filtered),
        "limit": limit,
        "offset": offset,
        "objects": paginated
    }

@router.get("/{norad_id}", response_model=OrbitalObject)
def get_object_by_id(norad_id: int):
    """Retrieves metadata and Keplerian parameters for a specific NORAD ID."""
    obj = app_state.objects_by_id.get(norad_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Orbital object NORAD ID {norad_id} not found in catalog")
    return obj

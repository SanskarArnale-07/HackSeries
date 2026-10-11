from datetime import datetime, timezone
from fastapi import APIRouter
from backend.core.state import app_state

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    """Health check endpoint exposing system status, catalog size, and data source provenance."""
    return {
        "status": "HEALTHY",
        "service": "TRAJACTRA_BACKEND",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "catalog_size": len(app_state.objects),
        "screening_engine_status": "ONLINE",
        "data_source": app_state.data_source,
        "is_offline_mode": app_state.is_offline_mode,
        "events_screened": app_state.conjunctions.screening_metadata.events_count if app_state.conjunctions else 0
    }

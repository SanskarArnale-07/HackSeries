import time
from typing import Tuple, List, Dict, Any
import httpx
from backend.config import settings
from backend.core.ingestion.cache import get_cached_tle_data, save_tle_cache, load_fixture_data
from backend.core.validation.validator import parse_tle_catalog_text
from backend.models.orbital import OrbitalObject

class IngestionResult:
    def __init__(
        self,
        objects: List[OrbitalObject],
        diagnostics: Dict[str, Any],
        is_live: bool,
        source_name: str,
        data_age_seconds: float = 0.0
    ):
        self.objects = objects
        self.diagnostics = diagnostics
        self.is_live = is_live
        self.source_name = source_name
        self.data_age_seconds = data_age_seconds

def load_orbital_catalog(max_objects: int = 100, force_offline: bool = False) -> IngestionResult:
    """Ingests orbital catalog with live CelesTrak fetching, bounded timeout, and offline fallback.
    
    1. If offline mode is requested or configured, load from local fixture.
    2. Try live retrieval with timeout <= 2.5s.
    3. If live retrieval fails or rate limits (304 / notice), check local cache.
    4. If cache is unavailable or expired, fallback to validated offline fixture.
    """
    if force_offline or settings.OFFLINE_MODE:
        raw_text = load_fixture_data()
        objs, diag = parse_tle_catalog_text(raw_text)
        return IngestionResult(
            objects=objs[:max_objects],
            diagnostics=diag,
            is_live=False,
            source_name="LOCAL_FIXTURE_OFFLINE",
            data_age_seconds=0.0
        )

    # Attempt live retrieval
    live_text = None
    try:
        # Use stations or active
        url = settings.CELESTRAK_STATIONS_URL
        with httpx.Client(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            resp = client.get(url)
            if resp.status_code == 200 and "1 " in resp.text and "2 " in resp.text:
                live_text = resp.text
                save_tle_cache(live_text)
    except Exception:
        live_text = None

    if live_text:
        objs, diag = parse_tle_catalog_text(live_text)
        if objs:
            return IngestionResult(
                objects=objs[:max_objects],
                diagnostics=diag,
                is_live=True,
                source_name="CELESTRAK_LIVE_HTTP",
                data_age_seconds=0.0
            )

    # Check cache
    cached_text, cache_age = get_cached_tle_data()
    if cached_text:
        objs, diag = parse_tle_catalog_text(cached_text)
        if objs:
            return IngestionResult(
                objects=objs[:max_objects],
                diagnostics=diag,
                is_live=False,
                source_name="LOCAL_CACHE",
                data_age_seconds=cache_age or 0.0
            )

    # Fallback to committed offline fixture
    fixture_text = load_fixture_data()
    objs, diag = parse_tle_catalog_text(fixture_text)
    return IngestionResult(
        objects=objs[:max_objects],
        diagnostics=diag,
        is_live=False,
        source_name="LOCAL_FIXTURE_FALLBACK",
        data_age_seconds=0.0
    )

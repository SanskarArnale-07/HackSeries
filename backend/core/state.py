from datetime import datetime, timezone
from typing import List, Dict, Optional
from backend.models.orbital import OrbitalObject, CatalogSummary
from backend.models.conjunction import ConjunctionsResponseDto
from backend.models.weather import SpaceWeatherState
from backend.core.ingestion.client import load_orbital_catalog
from backend.core.weather.client import load_space_weather
from backend.core.screening.pipeline import execute_conjunction_screening

class AppState:
    def __init__(self):
        self.objects: List[OrbitalObject] = []
        self.objects_by_id: Dict[int, OrbitalObject] = {}
        self.catalog_summary: CatalogSummary = CatalogSummary()
        self.conjunctions: Optional[ConjunctionsResponseDto] = None
        self.weather: Optional[SpaceWeatherState] = None
        self.data_source: str = "INITIALIZING"
        self.is_live: bool = False
        self.is_offline_mode: bool = False

    def initialize(self, force_offline: bool = False):
        """Loads catalog, computes baseline screening, and fetches space weather."""
        self.is_offline_mode = force_offline
        
        # 1. Ingest catalog
        ingest_res = load_orbital_catalog(max_objects=100, force_offline=force_offline)
        self.objects = ingest_res.objects
        self.objects_by_id = {obj.norad_id: obj for obj in self.objects}
        self.data_source = ingest_res.source_name
        self.is_live = ingest_res.is_live
        
        # Fallback to full fixture snapshot if fewer than 50 objects loaded
        if len(self.objects) < 50:
            from backend.core.ingestion.cache import load_fixture_data
            from backend.core.validation.validator import parse_tle_catalog_text
            fix_text = load_fixture_data()
            fix_objs, fix_diag = parse_tle_catalog_text(fix_text)
            self.objects = fix_objs[:100]
            self.objects_by_id = {obj.norad_id: obj for obj in self.objects}
            self.data_source = "LOCAL_FIXTURE_FALLBACK"
            self.is_live = False
            
        diag = ingest_res.diagnostics
        self.catalog_summary = CatalogSummary(
            total_objects_loaded=len(self.objects),
            valid_objects=len(self.objects),
            stale_objects=diag.get("stale_count", 0),
            rejected_records=diag.get("rejected_count", 0),
            last_ingested_utc=datetime.now(timezone.utc).isoformat()
        )
        
        # 2. Conjunction screening over lookahead window
        self.conjunctions = execute_conjunction_screening(
            objects=self.objects,
            window_hours=24
        )
        
        # 3. Space weather
        self.weather = load_space_weather(force_offline=force_offline)

app_state = AppState()

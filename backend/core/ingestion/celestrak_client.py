import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import httpx

from backend.config import settings
from backend.models.orbital import OrbitalObject
from backend.core.validation.validator import parse_omm_catalog_json

class CelesTrakIngestionResult:
    """Encapsulates the result of a CelesTrak active catalog ingestion pass."""
    def __init__(
        self,
        objects: List[OrbitalObject],
        diagnostics: Dict[str, Any],
        is_live: bool,
        source_name: str,
        last_update_utc: str,
        data_age_seconds: float = 0.0,
        raw_count: int = 0,
        group_counts: Optional[Dict[str, int]] = None
    ):
        self.objects = objects
        self.diagnostics = diagnostics
        self.is_live = is_live
        self.source_name = source_name
        self.last_update_utc = last_update_utc
        self.data_age_seconds = round(data_age_seconds, 1)
        self.raw_count = raw_count
        self.group_counts = group_counts or {}

def get_cached_active_data() -> Tuple[Optional[List[Dict[str, Any]]], Optional[float], Optional[str]]:
    """Retrieves cached active catalog JSON data, age in seconds, and recorded update timestamp."""
    cache_path = settings.CELESTRAK_ACTIVE_CACHE_PATH
    if not cache_path.exists():
        return None, None, None
        
    try:
        stat = cache_path.stat()
        file_mtime = stat.st_mtime
        age = max(0.0, time.time() - file_mtime)
        content = cache_path.read_text(encoding="utf-8")
        raw = json.loads(content)
        
        if isinstance(raw, dict) and "records" in raw:
            records = raw.get("records", [])
            retrieved_utc = raw.get("retrieved_utc") or datetime.fromtimestamp(file_mtime, timezone.utc).isoformat()
        elif isinstance(raw, list):
            records = raw
            retrieved_utc = datetime.fromtimestamp(file_mtime, timezone.utc).isoformat()
        else:
            return None, None, None
            
        return records, age, retrieved_utc
    except Exception:
        return None, None, None

def save_active_cache(records: List[Dict[str, Any]], retrieved_utc: str) -> None:
    """Atomically caches the active catalog records to local disk."""
    cache_path = settings.CELESTRAK_ACTIVE_CACHE_PATH
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        # Atomic write via temp file
        temp_path = cache_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(records), encoding="utf-8")
        temp_path.replace(cache_path)
    except Exception:
        pass

def load_active_fixture_data() -> Tuple[List[Dict[str, Any]], str]:
    """Loads fallback CelesTrak active fixture from data/fixtures/."""
    fixture_path = settings.CELESTRAK_ACTIVE_FIXTURE_PATH
    if fixture_path.exists():
        try:
            content = fixture_path.read_text(encoding="utf-8")
            raw = json.loads(content)
            records = raw if isinstance(raw, list) else raw.get("records", [])
            mtime = fixture_path.stat().st_mtime
            ts = datetime.fromtimestamp(mtime, timezone.utc).isoformat()
            return records, ts
        except Exception:
            pass
            
    # Fallback to secondary fixture orbital_records.json
    alt_fixture = settings.FIXTURES_DIR / "orbital_records.json"
    if alt_fixture.exists():
        try:
            raw = json.loads(alt_fixture.read_text(encoding="utf-8"))
            return raw if isinstance(raw, list) else [], datetime.now(timezone.utc).isoformat()
        except Exception:
            pass
            
    return [], datetime.now(timezone.utc).isoformat()

def fetch_group_from_celestrak(group_name: str, client: httpx.Client) -> Tuple[List[Dict[str, Any]], bool]:
    """Fetches a single group of orbital records from CelesTrak GP JSON API."""
    url = f"{settings.CELESTRAK_GP_BASE_URL}?GROUP={group_name}&FORMAT=JSON"
    try:
        resp = client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                return data, True
    except Exception:
        pass
    return [], False

def fetch_celestrak_active_catalog(
    max_objects: Optional[int] = None,
    force_offline: bool = False,
    force_refresh: bool = False,
    target_groups: Optional[List[str]] = None
) -> CelesTrakIngestionResult:
    """Fetches the maximum available valid satellite orbital data from CelesTrak.
    
    1. If offline mode is requested or configured, load from local cache or fixture.
    2. Check cache TTL (2 hours / 7200s): if cache is fresh and force_refresh is False, return cache.
    3. Attempt HTTP GET to CelesTrak multi-group GP JSON API with timeout <= 5.0s per request.
    4. On successful 200 response with valid records: merge uniquely by NORAD ID, save to cache.
    5. On network error, rate limit, or timeout: fall back gracefully to cache or fixture.
       Never overwrites valid cached data with an invalid or empty response.
    """
    now_utc_str = datetime.now(timezone.utc).isoformat()
    groups_to_fetch = target_groups or settings.CELESTRAK_TARGET_GROUPS
    
    # 1. Force offline handling
    if force_offline or settings.OFFLINE_MODE:
        cached_recs, cache_age, cache_utc = get_cached_active_data()
        if cached_recs and len(cached_recs) > 0:
            objs, diag = parse_omm_catalog_json(cached_recs, max_records=max_objects)
            return CelesTrakIngestionResult(
                objects=objs,
                diagnostics=diag,
                is_live=False,
                source_name="CELESTRAK_LOCAL_CACHE",
                last_update_utc=cache_utc or now_utc_str,
                data_age_seconds=cache_age or 0.0,
                raw_count=len(cached_recs)
            )
            
        fix_recs, fix_utc = load_active_fixture_data()
        objs, diag = parse_omm_catalog_json(fix_recs, max_records=max_objects)
        return CelesTrakIngestionResult(
            objects=objs,
            diagnostics=diag,
            is_live=False,
            source_name="CELESTRAK_OFFLINE_FIXTURE",
            last_update_utc=fix_utc,
            data_age_seconds=0.0,
            raw_count=len(fix_recs)
        )

    # 2. Check local cache freshness (CelesTrak rate-limiting policy: GP data updates every 2 hours)
    cached_recs, cache_age, cache_utc = get_cached_active_data()
    if not force_refresh and cached_recs and cache_age is not None:
        if cache_age < settings.CELESTRAK_CACHE_TTL_SECONDS and len(cached_recs) > 0:
            objs, diag = parse_omm_catalog_json(cached_recs, max_records=max_objects)
            if len(objs) > 0:
                return CelesTrakIngestionResult(
                    objects=objs,
                    diagnostics=diag,
                    is_live=False,
                    source_name="CELESTRAK_LOCAL_CACHE",
                    last_update_utc=cache_utc or now_utc_str,
                    data_age_seconds=cache_age,
                    raw_count=len(cached_recs)
                )

    # 3. Attempt multi-group retrieval
    merged_records: Dict[int, Dict[str, Any]] = {}
    # Seed with existing cache to ensure we never lose satellites when individual groups throttle
    if cached_recs:
        for r in cached_recs:
            nid = r.get("NORAD_CAT_ID")
            if nid:
                merged_records[nid] = r
                
    group_stats: Dict[str, int] = {}
    any_live_success = False
    
    headers = {
        "User-Agent": settings.CELESTRAK_USER_AGENT,
        "Accept": "application/json"
    }
    
    try:
        with httpx.Client(timeout=10.0, headers=headers, follow_redirects=True) as client:
            for g in groups_to_fetch:
                recs, ok = fetch_group_from_celestrak(g, client)
                if ok and recs:
                    any_live_success = True
                    group_stats[g] = len(recs)
                    for r in recs:
                        nid = r.get("NORAD_CAT_ID")
                        if nid:
                            if nid not in merged_records:
                                r["GROUPS"] = [g]
                                merged_records[nid] = r
                            else:
                                if "GROUPS" in merged_records[nid] and g not in merged_records[nid]["GROUPS"]:
                                    merged_records[nid]["GROUPS"].append(g)
                else:
                    group_stats[g] = 0
    except Exception:
        pass

    final_raw_list = list(merged_records.values())

    # If we have valid records
    if len(final_raw_list) > 0:
        objs, diag = parse_omm_catalog_json(final_raw_list, max_records=max_objects)
        if any_live_success:
            save_active_cache(final_raw_list, now_utc_str)
            return CelesTrakIngestionResult(
                objects=objs,
                diagnostics=diag,
                is_live=True,
                source_name="CELESTRAK_LIVE_API",
                last_update_utc=now_utc_str,
                data_age_seconds=0.0,
                raw_count=len(final_raw_list),
                group_counts=group_stats
            )
        else:
            # Sourced from cache
            return CelesTrakIngestionResult(
                objects=objs,
                diagnostics=diag,
                is_live=False,
                source_name="CELESTRAK_LOCAL_CACHE",
                last_update_utc=cache_utc or now_utc_str,
                data_age_seconds=cache_age or 0.0,
                raw_count=len(final_raw_list),
                group_counts=group_stats
            )

    # Final fallback: committed offline fixture
    fix_recs, fix_utc = load_active_fixture_data()
    objs, diag = parse_omm_catalog_json(fix_recs, max_records=max_objects)
    return CelesTrakIngestionResult(
        objects=objs,
        diagnostics=diag,
        is_live=False,
        source_name="CELESTRAK_LOCAL_FIXTURE",
        last_update_utc=fix_utc,
        data_age_seconds=0.0,
        raw_count=len(fix_recs)
    )

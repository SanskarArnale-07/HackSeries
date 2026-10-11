import time
from pathlib import Path
from backend.config import settings

CACHE_FILE = settings.CACHE_DIR / "celestrak_cache.txt"
CACHE_TTL_SECONDS = 7200  # 2 hours per CelesTrak policy

def get_cached_tle_data() -> tuple[str | None, float | None]:
    """Returns cached TLE text and age in seconds if cache exists, else (None, None)."""
    if not CACHE_FILE.exists():
        return None, None
    try:
        mtime = CACHE_FILE.stat().st_mtime
        age = time.time() - mtime
        content = CACHE_FILE.read_text(encoding="utf-8")
        if content.strip():
            return content, age
    except Exception:
        pass
    return None, None

def save_tle_cache(content: str) -> None:
    """Saves raw TLE content to local cache."""
    try:
        settings.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(content, encoding="utf-8")
    except Exception:
        pass

def load_fixture_data() -> str:
    """Loads validated offline fixture data from data/fixtures/celestrak_snapshot.txt."""
    fixture_path = settings.CELESTRAK_FIXTURE_PATH
    if fixture_path.exists():
        return fixture_path.read_text(encoding="utf-8")
    raise FileNotFoundError(f"Fixture not found at {fixture_path}")

import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "TRAJACTRA"
    PROJECT_DESCRIPTOR: str = "Orbital Intelligence & Conjunction Analysis"
    API_V1_PREFIX: str = "/api/v1"
    
    # Network and server ports
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "3000"))
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Offline and demonstration mode
    OFFLINE_MODE: bool = os.getenv("OFFLINE_MODE", "false").lower() in ("true", "1", "yes")
    HTTP_TIMEOUT_SECONDS: float = 2.5
    
    # Astrodynamics & Conjunction Screening parameters
    SCREENING_THRESHOLD_KM: float = float(os.getenv("SCREENING_THRESHOLD_KM", "50.0"))
    COARSE_PROXIMITY_TRIGGER_KM: float = float(os.getenv("COARSE_PROXIMITY_TRIGGER_KM", "500.0"))
    SCREENING_WINDOW_HOURS: int = int(os.getenv("SCREENING_WINDOW_HOURS", "24"))
    COARSE_STEP_SECONDS: int = int(os.getenv("COARSE_STEP_SECONDS", "60"))
    FINE_TOLERANCE_SECONDS: float = 1.0
    STAGE1_RADIAL_MARGIN_KM: float = 20.0
    MAX_LEO_RELATIVE_VELOCITY_KM_S: float = 15.0
    
    # Directory paths
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = ROOT_DIR / "data"
    CACHE_DIR: Path = DATA_DIR / "cache"
    FIXTURES_DIR: Path = DATA_DIR / "fixtures"
    
    # Upstream data URLs
    CELESTRAK_STATIONS_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    CELESTRAK_ACTIVE_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
    SWPC_KP_URL: str = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
    SWPC_F107_URL: str = "https://services.swpc.noaa.gov/json/f107_cm_flux.json"
    
    # Local fallback file paths
    CELESTRAK_FIXTURE_PATH: Path = FIXTURES_DIR / "celestrak_snapshot.txt"
    SWPC_FIXTURE_PATH: Path = FIXTURES_DIR / "swpc_snapshot.json"
    SYNTHETIC_FIXTURE_PATH: Path = FIXTURES_DIR / "synthetic_close_pair.tle"
    SYNTHETIC_METADATA_PATH: Path = FIXTURES_DIR / "synthetic_close_pair_metadata.json"

settings = Settings()

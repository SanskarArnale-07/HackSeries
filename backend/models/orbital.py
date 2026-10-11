from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

class OrbitalParameters(BaseModel):
    inclination_deg: float = Field(..., ge=0.0, le=180.0)
    raan_deg: float | None = Field(default=None, ge=0.0, lt=360.0)
    eccentricity: float = Field(..., ge=0.0, lt=1.0)
    arg_perigee_deg: float | None = Field(default=None, ge=0.0, lt=360.0)
    mean_anomaly_deg: float | None = Field(default=None, ge=0.0, lt=360.0)
    mean_motion_rev_day: float | None = Field(default=None, gt=0.0)
    bstar_drag: float | None = None
    semi_major_axis_km: float
    perigee_altitude_km: float
    apogee_altitude_km: float
    period_minutes: float

class OrbitalObject(BaseModel):
    norad_id: int = Field(..., ge=1, le=999999)
    name: str
    intl_des: str
    object_type: Literal["PAYLOAD", "DEBRIS", "ROCKET_BODY", "UNKNOWN"] = "PAYLOAD"
    epoch_utc: datetime
    element_age_days: float
    is_stale: bool
    orbital_parameters: OrbitalParameters
    line1: str
    line2: str

class CatalogSummary(BaseModel):
    total_objects_loaded: int = 0
    valid_objects: int = 0
    stale_objects: int = 0
    rejected_records: int = 0
    last_ingested_utc: str | None = None

from typing import Literal
from pydantic import BaseModel
from .ephemeris import CartesianVector3D, VelocityVector3D

class ConjunctionObjectSummary(BaseModel):
    norad_id: int
    name: str
    type: str

class ConjunctionLocation(BaseModel):
    latitude_deg: float
    longitude_deg: float
    altitude_km: float

class ConjunctionEventDto(BaseModel):
    event_id: str
    primary_object: ConjunctionObjectSummary
    secondary_object: ConjunctionObjectSummary
    tca_utc: str
    miss_distance_km: float
    relative_speed_km_s: float
    relative_velocity_vector_teme: VelocityVector3D
    relative_velocity_vector_ecef: VelocityVector3D
    primary_position_teme_km: CartesianVector3D
    encounter_location_wgs84: ConjunctionLocation
    coordinate_notes: dict[str, str]
    screening_tier: Literal["CRITICAL", "WARNING", "WATCH", "MONITOR", "CLEAR"]
    scientific_disclaimer: str

class ScreeningMetadata(BaseModel):
    evaluation_timestamp_utc: str
    screening_window_hours: int
    threshold_km: float
    total_pairs_screened: int
    events_count: int
    status: Literal["CONJUNCTIONS_DETECTED", "CLEAR", "ERROR"]

class ConjunctionsResponseDto(BaseModel):
    screening_metadata: ScreeningMetadata
    events: list[ConjunctionEventDto]

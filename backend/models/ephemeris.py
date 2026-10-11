from pydantic import BaseModel

class CartesianVector3D(BaseModel):
    x: float
    y: float
    z: float

class VelocityVector3D(BaseModel):
    vx: float
    vy: float
    vz: float

class EphemerisPointDto(BaseModel):
    time_utc: str
    is_valid: bool = True
    propagation_status: str = "VALID"
    lat_deg: float | None = None
    lon_deg: float | None = None
    alt_km: float | None = None
    ecef_km: CartesianVector3D | None = None
    teme_km: CartesianVector3D | None = None
    velocity_teme_km_s: VelocityVector3D | None = None
    velocity_ecef_km_s: VelocityVector3D | None = None

class EphemerisTrajectoryDto(BaseModel):
    norad_id: int
    name: str
    reference_frame: str = "WGS84_CARTOGRAPHIC_AND_ECEF"
    epoch_start_utc: str
    epoch_end_utc: str
    step_seconds: int
    total_points: int
    points: list[EphemerisPointDto]

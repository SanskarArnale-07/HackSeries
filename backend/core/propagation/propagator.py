import math
from datetime import datetime, timezone, timedelta
from typing import List, Tuple
import numpy as np
from sgp4.api import Satrec, jday
from backend.models.orbital import OrbitalObject
from backend.models.ephemeris import (
    CartesianVector3D,
    VelocityVector3D,
    EphemerisPointDto,
    EphemerisTrajectoryDto
)
from backend.core.propagation.transforms import (
    compute_gmst,
    teme_to_ecef,
    teme_to_ecef_velocity,
    ecef_to_geodetic
)

SGP4_ERROR_MAP = {
    0: "VALID",
    1: "MEAN_ELEMENTS_OUT_OF_RANGE",
    2: "MEAN_MOTION_NEGATIVE",
    3: "PERTURBED_ECCENTRICITY_OUT_OF_BOUNDS",
    4: "SEMI_LATUS_RECTUM_NEGATIVE",
    5: "EPOCH_ELEMENTS_SUBORBITAL",
    6: "DECAYED"
}

class SGP4Propagator:
    """Analytical SGP4/SDP4 propagation engine adhering strictly to aerospace standards."""
    
    @staticmethod
    def create_satrec(line1: str, line2: str) -> Satrec:
        """Initializes a sgp4 Satrec object from validated TLE lines."""
        return Satrec.twoline2rv(line1, line2)

    @staticmethod
    def datetime_to_jd(dt: datetime) -> Tuple[float, float]:
        """Converts timezone-aware UTC datetime to Julian Date components (jd, fr)."""
        dt_utc = dt.astimezone(timezone.utc)
        micro_day = dt_utc.microsecond / 86400000000.0
        sec_frac = dt_utc.second + micro_day
        jd, fr = jday(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour, dt_utc.minute, sec_frac)
        return jd, fr

    @classmethod
    def propagate_point(cls, satrec: Satrec, target_dt: datetime) -> EphemerisPointDto:
        """Propagates a satellite to a single timestamp.
        
        Preserves propagation errors and explicitly distinguishes TEME and ECEF frames.
        Never substitutes [0, 0, 0] for decayed or invalid orbits.
        """
        jd, fr = cls.datetime_to_jd(target_dt)
        err_code, r_teme, v_teme = satrec.sgp4(jd, fr)
        time_iso = target_dt.astimezone(timezone.utc).isoformat()
        
        if err_code != 0:
            status = SGP4_ERROR_MAP.get(err_code, f"SGP4_ERROR_{err_code}")
            return EphemerisPointDto(
                time_utc=time_iso,
                is_valid=False,
                propagation_status=status,
                lat_deg=None,
                lon_deg=None,
                alt_km=None,
                ecef_km=None,
                teme_km=None,
                velocity_teme_km_s=None,
                velocity_ecef_km_s=None
            )
            
        r_teme_arr = np.array(r_teme, dtype=float)
        v_teme_arr = np.array(v_teme, dtype=float)
        
        # Astronomical frame transformations
        gmst_rad = compute_gmst(jd, fr)
        r_ecef_arr = teme_to_ecef(r_teme_arr, gmst_rad)
        v_ecef_arr = teme_to_ecef_velocity(v_teme_arr, r_ecef_arr, gmst_rad)
        lat_deg, lon_deg, alt_km = ecef_to_geodetic(r_ecef_arr)
        
        return EphemerisPointDto(
            time_utc=time_iso,
            is_valid=True,
            propagation_status="VALID",
            lat_deg=lat_deg,
            lon_deg=lon_deg,
            alt_km=alt_km,
            teme_km=CartesianVector3D(x=round(r_teme_arr[0], 3), y=round(r_teme_arr[1], 3), z=round(r_teme_arr[2], 3)),
            ecef_km=CartesianVector3D(x=round(r_ecef_arr[0], 3), y=round(r_ecef_arr[1], 3), z=round(r_ecef_arr[2], 3)),
            velocity_teme_km_s=VelocityVector3D(vx=round(v_teme_arr[0], 5), vy=round(v_teme_arr[1], 5), vz=round(v_teme_arr[2], 5)),
            velocity_ecef_km_s=VelocityVector3D(vx=round(v_ecef_arr[0], 5), vy=round(v_ecef_arr[1], 5), vz=round(v_ecef_arr[2], 5))
        )

    @classmethod
    def propagate_trajectory(
        cls,
        sat_obj: OrbitalObject,
        start_utc: datetime,
        end_utc: datetime,
        step_seconds: int = 60
    ) -> EphemerisTrajectoryDto:
        """Generates an ephemeris trajectory time series for frontend visualization."""
        satrec = cls.create_satrec(sat_obj.line1, sat_obj.line2)
        total_seconds = int((end_utc - start_utc).total_seconds())
        if total_seconds <= 0:
            raise ValueError("end_utc must be strictly after start_utc")
            
        current_dt = start_utc
        points: List[EphemerisPointDto] = []
        
        while current_dt <= end_utc:
            pt = cls.propagate_point(satrec, current_dt)
            points.append(pt)
            current_dt += timedelta(seconds=step_seconds)
            
        return EphemerisTrajectoryDto(
            norad_id=sat_obj.norad_id,
            name=sat_obj.name,
            reference_frame="WGS84_CARTOGRAPHIC_AND_ECEF",
            epoch_start_utc=start_utc.astimezone(timezone.utc).isoformat(),
            epoch_end_utc=end_utc.astimezone(timezone.utc).isoformat(),
            step_seconds=step_seconds,
            total_points=len(points),
            points=points
        )

    @classmethod
    def propagate_state_vectors(
        cls,
        satrec: Satrec,
        timestamps_dt: List[datetime]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """High-performance batch propagation returning raw TEME numpy arrays and validity mask.
        
        Returns:
            positions_teme: shape (N, 3) in km
            velocities_teme: shape (N, 3) in km/s
            valid_mask: shape (N,) boolean
        """
        N = len(timestamps_dt)
        pos = np.zeros((N, 3), dtype=np.float64)
        vel = np.zeros((N, 3), dtype=np.float64)
        valid = np.zeros(N, dtype=bool)
        
        for i, dt in enumerate(timestamps_dt):
            jd, fr = cls.datetime_to_jd(dt)
            err, r, v = satrec.sgp4(jd, fr)
            if err == 0:
                pos[i] = r
                vel[i] = v
                valid[i] = True
            else:
                # Retain NaN/zeros in scratch buffer, but mark valid[i] as False
                valid[i] = False
                
        return pos, vel, valid

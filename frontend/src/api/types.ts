export interface HealthResponse {
  status: string;
  service: string;
  timestamp_utc: string;
  catalog_size: number;
  screening_engine_status: string;
  data_source: string;
  is_offline_mode: boolean;
  events_screened: number;
}

export interface OrbitalParameters {
  inclination_deg: number;
  raan_deg: number | null;
  eccentricity: number;
  arg_perigee_deg: number | null;
  mean_anomaly_deg: number | null;
  mean_motion_rev_day: number | null;
  bstar_drag: number | null;
  semi_major_axis_km: number;
  perigee_altitude_km: number;
  apogee_altitude_km: number;
  period_minutes: number;
}

export interface OrbitalObject {
  norad_id: number;
  name: string;
  intl_des: string;
  object_type: 'PAYLOAD' | 'DEBRIS' | 'ROCKET_BODY' | 'UNKNOWN';
  epoch_utc: string;
  element_age_days: number;
  is_stale: boolean;
  orbital_parameters: OrbitalParameters;
  line1: string;
  line2: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface VelocityVector3D {
  vx: number;
  vy: number;
  vz: number;
}

export interface ConjunctionObjectSummary {
  norad_id: number;
  name: string;
  type: string;
}

export interface ConjunctionLocation {
  latitude_deg: number;
  longitude_deg: number;
  altitude_km: number;
}

export interface ConjunctionEvent {
  event_id: string;
  primary_object: ConjunctionObjectSummary;
  secondary_object: ConjunctionObjectSummary;
  tca_utc: string;
  miss_distance_km: number;
  relative_speed_km_s: number;
  relative_velocity_vector_teme: VelocityVector3D;
  relative_velocity_vector_ecef: VelocityVector3D;
  primary_position_teme_km: Vector3D;
  encounter_location_wgs84: ConjunctionLocation;
  coordinate_notes: Record<string, string>;
  screening_tier: 'CRITICAL' | 'WARNING' | 'WATCH' | 'MONITOR' | 'CLEAR';
  scientific_disclaimer: string;
}

export interface ScreeningMetadata {
  evaluation_timestamp_utc: string;
  screening_window_hours: number;
  threshold_km: number;
  total_pairs_screened: number;
  events_count: number;
  status: 'CONJUNCTIONS_DETECTED' | 'CLEAR' | 'ERROR';
}

export interface ConjunctionsResponse {
  screening_metadata: ScreeningMetadata;
  events: ConjunctionEvent[];
}

export interface EphemerisPoint {
  time_utc: string;
  is_valid: boolean;
  propagation_status: string;
  lat_deg: number | null;
  lon_deg: number | null;
  alt_km: number | null;
  ecef_km: Vector3D | null;
  teme_km: Vector3D | null;
  velocity_teme_km_s: VelocityVector3D | null;
  velocity_ecef_km_s: VelocityVector3D | null;
}

export interface EphemerisTrajectory {
  norad_id: number;
  name: string;
  reference_frame: string;
  epoch_start_utc: string;
  epoch_end_utc: string;
  step_seconds: number;
  total_points: number;
  points: EphemerisPoint[];
}

export interface SpaceWeatherState {
  source: string;
  timestamp_utc: string;
  is_cached: boolean;
  planetary_k_index: {
    time_tag?: string;
    kp_index?: number;
    estimated_kp?: number;
  };
  solar_radio_flux_f107: {
    time_tag?: string;
    flux?: number;
  };
  geomagnetic_storm_status: string;
  contextual_notes: Record<string, string>;
}

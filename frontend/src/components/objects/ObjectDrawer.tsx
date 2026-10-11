import React, { useState } from 'react';
import type { ConjunctionEvent, OrbitalObject } from '../../api/types';
import { X, ChevronDown, ChevronRight, Globe, Navigation, Orbit, ShieldAlert, AlertTriangle } from 'lucide-react';
import {
  formatRelativeSpeed,
  formatUtcTimestamp,
  isSyntheticEvent,
  isSyntheticObject,
  formatVectorComponent,
  formatDegree,
  formatKm
} from '../../api/formatters';

interface ObjectDrawerProps {
  event: ConjunctionEvent | null;
  primaryObject?: OrbitalObject | null;
  secondaryObject?: OrbitalObject | null;
  selectedCatalogObject?: OrbitalObject | null;
  onClose: () => void;
}

export const ObjectDrawer: React.FC<ObjectDrawerProps> = ({
  event,
  primaryObject,
  secondaryObject,
  selectedCatalogObject,
  onClose
}) => {
  // Advanced orbital telemetry collapsed by default to prevent telemetry wall
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!event && !selectedCatalogObject) return null;

  const getTierDetails = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          desc: 'Geometric separation < 5.0 km',
          badge: 'text-red-300 bg-red-950/80 border-red-500/50'
        };
      case 'WARNING':
        return {
          label: 'WARNING',
          desc: 'Geometric separation 5.0 - 15.0 km',
          badge: 'text-amber-300 bg-amber-950/80 border-amber-500/50'
        };
      case 'WATCH':
        return {
          label: 'WATCH',
          desc: 'Geometric separation 15.0 - 30.0 km',
          badge: 'text-yellow-300 bg-yellow-950/80 border-yellow-500/50'
        };
      default:
        return {
          label: 'MONITOR',
          desc: 'Geometric separation 30.0 - 50.0 km',
          badge: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50'
        };
    }
  };

<<<<<<< HEAD
  const isSimulated = event ? isSyntheticEvent(event) : isSyntheticObject(selectedCatalogObject);

  // Check if primary and secondary objects are co-orbital
  const isCoOrbitalPair = Boolean(
    primaryObject &&
      secondaryObject &&
      Math.abs(primaryObject.orbital_parameters.inclination_deg - secondaryObject.orbital_parameters.inclination_deg) < 0.05 &&
      Math.abs(primaryObject.orbital_parameters.eccentricity - secondaryObject.orbital_parameters.eccentricity) < 0.001 &&
      Math.abs(primaryObject.orbital_parameters.perigee_altitude_km - secondaryObject.orbital_parameters.perigee_altitude_km) < 1.0
  );
=======


>>>>>>> 15183ce08edcd8d13d9bdbba3bd0cb7ff47e1d58

  return (
    <aside className="w-84 md:w-96 bg-[#080d18] border-l border-[#141f33] flex flex-col select-none overflow-y-auto h-full flex-shrink-0 z-20 font-sans">
      {/* Inspector Header */}
      <div className="p-4 border-b border-[#141f33] bg-[#0a101f] flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] block">
            {event ? 'Encounter Telemetry' : 'Catalog Object Details'}
          </span>
          <span className="text-xs font-mono font-bold text-[#f1f5f9] truncate block mt-0.5">
            {event ? event.event_id : selectedCatalogObject?.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-[#142036] text-[#64748b] hover:text-[#f1f5f9] transition-colors cursor-pointer flex-shrink-0"
          title="Close details"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Visible simulation banner if synthetic benchmark target */}
        {isSimulated && (
          <div className="p-3 rounded bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="font-bold font-mono text-[11px] text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>SIMULATED BENCHMARK TARGET</span>
            </div>
            <p className="text-[10px] text-amber-300/80 leading-relaxed font-sans">
              Analytical test scenario generated from benchmark TLEs (NORAD #99001 / #99002) for screening verification. Not a verified real-world conjunction.
            </p>
          </div>
        )}

        {/* If Conjunction Encounter is Selected */}
        {event && (
          <>
            {/* 1. HERO PROXIMITY CARD: Geometric Miss Distance & Screening Priority */}
            {(() => {
              const tierInfo = getTierDetails(event.screening_tier);
              return (
                <div className="p-4 rounded bg-[#0b1222] border border-[#16233b] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94a3b8] font-medium flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#38bdf8]" />
                      Screening Priority
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${tierInfo.badge}`}
                    >
                      {tierInfo.label}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] block">
                      Geometric Miss Distance
                    </span>
                    <div className="text-3xl font-mono font-extrabold text-[#f8fafc] tracking-tight mt-0.5">
                      {event.miss_distance_km.toFixed(3)}
                      <span className="text-sm font-normal text-[#94a3b8] ml-1.5 font-sans">km</span>
                    </div>
                    <span className="text-[11px] text-[#94a3b8] block mt-1">
                      {tierInfo.desc}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 2. CORE ENCOUNTER KINEMATICS & TIMING */}
            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#64748b] block">
                Kinematics &amp; Timing
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-[#64748b] block">Relative Velocity (v<sub>rel</sub>)</span>
                  <span className="text-sm font-mono font-bold text-[#f1f5f9] block mt-0.5">
                    {formatRelativeSpeed(event.relative_speed_km_s)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] block">TCA Epoch</span>
                  <span className="text-xs font-mono font-semibold text-[#f1f5f9] block mt-0.5 truncate" title={formatUtcTimestamp(event.tca_utc)}>
                    {event.tca_utc.replace('T', ' ').substring(0, 16)} UTC
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#141f33] text-[11px] font-mono text-[#94a3b8] flex items-center justify-between">
                <span>Exact TCA:</span>
                <span className="text-[#f1f5f9] font-medium">{formatUtcTimestamp(event.tca_utc)}</span>
              </div>
            </div>

            {/* 3. TRACKED INTERCEPT PAIR */}
            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#64748b] block">
                Intercept Pair Identities
              </span>

              {/* Primary Object */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#141f33]">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-[#f1f5f9] block truncate" title={event.primary_object.name}>
                    {event.primary_object.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b]">
                    NORAD #{event.primary_object.norad_id} &bull; {event.primary_object.type || 'PAYLOAD'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#38bdf8] px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex-shrink-0">
                  PRIMARY
                </span>
              </div>

              {/* Secondary Object */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#141f33]">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-[#cbd5e1] block truncate" title={event.secondary_object.name}>
                    {event.secondary_object.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b]">
                    NORAD #{event.secondary_object.norad_id} &bull; {event.secondary_object.type || 'OBJECT'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#f59e0b] px-2 py-0.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex-shrink-0">
                  CHASER
                </span>
              </div>
            </div>

            {/* 4. EXPANDABLE "ADVANCED DETAILS" (Collapsed by Default) */}
            <div className="pt-1">
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full py-2.5 px-3 rounded bg-[#0b1222] hover:bg-[#101a30] border border-[#16233b] flex items-center justify-between text-left text-xs transition-all cursor-pointer group"
                aria-expanded={showAdvanced}
              >
                <div className="flex items-center gap-2">
                  <Orbit className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="font-medium text-xs text-[#cbd5e1] group-hover:text-white transition-colors">
                    Advanced Details
                  </span>
                </div>
                {showAdvanced ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748b]" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 space-y-2.5 font-mono text-xs">
                  {/* Encounter Coordinates & Astrodynamics Reference Frames */}
                  <div className="p-3 rounded bg-[#080d1a] border border-[#141f33] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#38bdf8] text-[11px] font-sans font-semibold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Encounter Coordinates (WGS-84)</span>
                    </div>
                    <div className="text-[11px] text-[#cbd5e1]">
                      Lat: {formatDegree(event.encounter_location_wgs84?.latitude_deg, 4)} &bull; Lon: {formatDegree(event.encounter_location_wgs84?.longitude_deg, 4)}
                    </div>
                    <div className="text-[11px] text-[#cbd5e1]">
                      Geodetic Alt: {formatKm(event.encounter_location_wgs84?.altitude_km, 2)}
                    </div>
                    <div className="text-[10px] text-[#64748b] pt-1 border-t border-[#121b2c] leading-relaxed">
                      Frames: TEME Inertial &bull; ECEF (with Coriolis compensation) &bull; WGS-84 (Bowring)
                    </div>
                  </div>

                  {/* Relative Velocity Vector Decomposition (Safely Formatted, Never Substituting 0) */}
                  <div className="p-3 rounded bg-[#080d1a] border border-[#141f33] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-sans font-semibold">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Relative Velocity Vectors (km/s)</span>
                    </div>
                    <div className="text-[11px] text-[#cbd5e1]">
                      TEME: [{formatVectorComponent(event.relative_velocity_vector_teme?.vx)}, {formatVectorComponent(event.relative_velocity_vector_teme?.vy)}, {formatVectorComponent(event.relative_velocity_vector_teme?.vz)}]
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      ECEF: [{formatVectorComponent(event.relative_velocity_vector_ecef?.vx)}, {formatVectorComponent(event.relative_velocity_vector_ecef?.vy)}, {formatVectorComponent(event.relative_velocity_vector_ecef?.vz)}]
                    </div>
                  </div>

<<<<<<< HEAD
                  {/* Primary Keplerian Orbital Elements */}
                  {primaryObject && (
                    <div className="p-3 rounded bg-[#080d1a] border border-[#141f33] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#38bdf8] text-[11px] font-sans font-semibold">
                          <Orbit className="w-3.5 h-3.5" />
                          <span>Primary Orbital Elements</span>
                        </div>
                        <span className="text-[10px] text-[#64748b]">#{primaryObject.norad_id}</span>
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Inc: {formatDegree(primaryObject.orbital_parameters.inclination_deg, 4)} &bull; Ecc: {formatVectorComponent(primaryObject.orbital_parameters.eccentricity, 5)}
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Perigee: {formatKm(primaryObject.orbital_parameters.perigee_altitude_km, 1)} &bull; Apogee: {formatKm(primaryObject.orbital_parameters.apogee_altitude_km, 1)}
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">
                        RAAN (&Omega;): {formatDegree(primaryObject.orbital_parameters.raan_deg, 4)} &bull; Mean Anomaly: {formatDegree(primaryObject.orbital_parameters.mean_anomaly_deg, 4)}
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        Period: {primaryObject.orbital_parameters.period_minutes ? `${primaryObject.orbital_parameters.period_minutes.toFixed(2)} min` : 'N/A'} &bull; SMA: {formatKm(primaryObject.orbital_parameters.semi_major_axis_km, 1)}
                      </div>
                    </div>
                  )}

                  {/* Secondary Keplerian Orbital Elements */}
                  {secondaryObject && (
                    <div className="p-3 rounded bg-[#080d1a] border border-[#141f33] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-sans font-semibold">
                          <Orbit className="w-3.5 h-3.5" />
                          <span>Secondary Orbital Elements</span>
                        </div>
                        <span className="text-[10px] text-[#64748b]">#{secondaryObject.norad_id}</span>
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Inc: {formatDegree(secondaryObject.orbital_parameters.inclination_deg, 4)} &bull; Ecc: {formatVectorComponent(secondaryObject.orbital_parameters.eccentricity, 5)}
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Perigee: {formatKm(secondaryObject.orbital_parameters.perigee_altitude_km, 1)} &bull; Apogee: {formatKm(secondaryObject.orbital_parameters.apogee_altitude_km, 1)}
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">
                        RAAN (&Omega;): {formatDegree(secondaryObject.orbital_parameters.raan_deg, 4)} &bull; Mean Anomaly: {formatDegree(secondaryObject.orbital_parameters.mean_anomaly_deg, 4)}
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        Period: {secondaryObject.orbital_parameters.period_minutes ? `${secondaryObject.orbital_parameters.period_minutes.toFixed(2)} min` : 'N/A'} &bull; SMA: {formatKm(secondaryObject.orbital_parameters.semi_major_axis_km, 1)}
                      </div>
                    </div>
                  )}

                  {/* Differential Co-Orbital Astrodynamics Note */}
                  {primaryObject && secondaryObject && (
                    <div className="p-2.5 rounded bg-[#09101c] border border-[#162238] text-[10px] font-mono text-[#94a3b8] leading-relaxed">
                      <strong className="text-[#38bdf8]">Differential Geometry:</strong>{' '}
                      &Delta;Inc: {(Math.abs((primaryObject.orbital_parameters.inclination_deg ?? 0) - (secondaryObject.orbital_parameters.inclination_deg ?? 0))).toFixed(4)}&deg; &bull;{' '}
                      &Delta;RAAN: {(Math.abs((primaryObject.orbital_parameters.raan_deg ?? 0) - (secondaryObject.orbital_parameters.raan_deg ?? 0))).toFixed(4)}&deg; &bull;{' '}
                      &Delta;Anomaly: {(Math.abs((primaryObject.orbital_parameters.mean_anomaly_deg ?? 0) - (secondaryObject.orbital_parameters.mean_anomaly_deg ?? 0))).toFixed(4)}&deg;
                      {isCoOrbitalPair && (
                        <span className="block mt-1 text-[#64748b]">
                          (Co-planar orbit with minor differential node &amp; phase offset causing close approach)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
=======
<<<<<<< HEAD
                  {/* Primary Object Card */}
                  <div className="p-3 rounded bg-[#0e1218] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[#00f0ff] font-semibold text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Orbit className="w-3.5 h-3.5" />
                        PRIMARY OBJECT
                      </div>
                      <span className="text-[10px] text-[#8a99ad]">
                        NORAD {event.primary_object.norad_id}
                      </span>
                    </div>
                    <div className="font-bold text-[#f0f4f8] text-xs">{event.primary_object.name}</div>
                    <div className="text-[10px] text-[#8a99ad]">TYPE: {event.primary_object.type}</div>

                    {primaryObject ? (
                      <div className="grid grid-cols-2 gap-1 text-[10px] pt-1.5 border-t border-white/5 text-[#8a99ad]">
                        <div>Inc: {primaryObject.orbital_parameters.inclination_deg}&deg;</div>
                        <div>Ecc: {primaryObject.orbital_parameters.eccentricity}</div>
                        <div>Perigee: {primaryObject.orbital_parameters.perigee_altitude_km} km</div>
                        <div>Apogee: {primaryObject.orbital_parameters.apogee_altitude_km} km</div>
                        <div className="col-span-2 text-[9px] text-emerald-400/90 pt-0.5 font-semibold">
                          ✓ SGP4 Propagated Trajectory Active on Globe
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-400/80 pt-1 border-t border-white/5">
                        Accurate geodetic position unavailable (unpropagated)
                      </div>
                    )}
                  </div>

                  {/* Secondary Object Card */}
                  <div className="p-3 rounded bg-[#0e1218] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[#94a3b8] font-semibold text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Orbit className="w-3.5 h-3.5" />
                        SECONDARY OBJECT
                      </div>
                      <span className="text-[10px] text-[#8a99ad]">
                        NORAD {event.secondary_object.norad_id}
                      </span>
                    </div>
                    <div className="font-bold text-[#f0f4f8] text-xs">{event.secondary_object.name}</div>
                    <div className="text-[10px] text-[#8a99ad]">TYPE: {event.secondary_object.type}</div>

                    {secondaryObject ? (
                      <div className="grid grid-cols-2 gap-1 text-[10px] pt-1.5 border-t border-white/5 text-[#8a99ad]">
                        <div>Inc: {secondaryObject.orbital_parameters.inclination_deg}&deg;</div>
                        <div>Ecc: {secondaryObject.orbital_parameters.eccentricity}</div>
                        <div>Perigee: {secondaryObject.orbital_parameters.perigee_altitude_km} km</div>
                        <div>Apogee: {secondaryObject.orbital_parameters.apogee_altitude_km} km</div>
                        <div className="col-span-2 text-[9px] text-emerald-400/90 pt-0.5 font-semibold">
                          ✓ SGP4 Propagated Trajectory Active on Globe
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-400/80 pt-1 border-t border-white/5">
                        Accurate geodetic position unavailable (unpropagated)
                      </div>
                    )}
                  </div>

                  {/* Scientific Rule 2 Adherence Notice */}
                  <div className="p-2 rounded bg-[#080d16] border border-[#152033] text-[10px] font-mono text-[#64748b] leading-relaxed">
                    Analytical SGP4 / TEME distance screening. No collision probability (P<sub>c</sub>) claimed without covariance.
                  </div>
                </div>
              )}
            </div>
          </>
=======
                  {/* Primary Keplerian Orbital Elements */}
                  {primaryObject && (
                    <div className="p-2.5 rounded bg-[#070b14] border border-[#172236] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#00e5ff] text-[11px] font-sans font-semibold">
                          <Orbit className="w-3.5 h-3.5" />
                          <span>Primary Orbital Elements</span>
                        </div>
                        <span className="text-[10px] text-[#64748b]">#{primaryObject.norad_id}</span>
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Inc: {primaryObject.orbital_parameters.inclination_deg}&deg; &bull; Ecc: {primaryObject.orbital_parameters.eccentricity}
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Perigee: {primaryObject.orbital_parameters.perigee_altitude_km.toFixed(1)} km &bull; Apogee: {primaryObject.orbital_parameters.apogee_altitude_km.toFixed(1)} km
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">
                        RAAN (&Omega;): {primaryObject.orbital_parameters.raan_deg ?? 0}&deg; &bull; Mean Anomaly (M): {primaryObject.orbital_parameters.mean_anomaly_deg ?? 0}&deg;
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        Period: {primaryObject.orbital_parameters.period_minutes.toFixed(2)} min &bull; SMA: {primaryObject.orbital_parameters.semi_major_axis_km.toFixed(1)} km
                      </div>
                    </div>
                  )}

                  {/* Secondary Keplerian Orbital Elements */}
                  {secondaryObject && (
                    <div className="p-2.5 rounded bg-[#070b14] border border-[#172236] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-sans font-semibold">
                          <Orbit className="w-3.5 h-3.5" />
                          <span>Secondary Orbital Elements</span>
                        </div>
                        <span className="text-[10px] text-[#64748b]">#{secondaryObject.norad_id}</span>
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Inc: {secondaryObject.orbital_parameters.inclination_deg}&deg; &bull; Ecc: {secondaryObject.orbital_parameters.eccentricity}
                      </div>
                      <div className="text-[11px] text-[#cbd5e1]">
                        Perigee: {secondaryObject.orbital_parameters.perigee_altitude_km.toFixed(1)} km &bull; Apogee: {secondaryObject.orbital_parameters.apogee_altitude_km.toFixed(1)} km
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">
                        RAAN (&Omega;): {secondaryObject.orbital_parameters.raan_deg ?? 0}&deg; &bull; Mean Anomaly (M): {secondaryObject.orbital_parameters.mean_anomaly_deg ?? 0}&deg;
                      </div>
                      <div className="text-[10px] text-[#64748b]">
                        Period: {secondaryObject.orbital_parameters.period_minutes.toFixed(2)} min &bull; SMA: {secondaryObject.orbital_parameters.semi_major_axis_km.toFixed(1)} km
                      </div>
                    </div>
                  )}

                  {/* Co-Orbital Synthetic Intercept Diagnostics Note */}
                  {isCoOrbitalPair && (
                    <div className="p-2 rounded bg-[#0c1524] border border-[#1d2b42] text-[10px] font-mono text-[#94a3b8] leading-relaxed">
                      <strong className="text-[#00e5ff]">Astrodynamics Analysis:</strong> Shared orbital plane (Inc {primaryObject?.orbital_parameters.inclination_deg}&deg;, Alt ~413-420 km) with differential RAAN (&Delta;&Omega; = 0.02&deg;) and true anomaly phase offset (&Delta;M = 0.015&deg;), resulting in close-approach intercept.
                    </div>
                  )}
                </div>
              )}
            </div>
>>>>>>> 15183ce08edcd8d13d9bdbba3bd0cb7ff47e1d58

            {/* Scientific Rule 2 Adherence Notice */}
            <div className="p-2.5 rounded bg-[#070b16] border border-[#121b2c] text-[10px] font-mono text-[#64748b] leading-relaxed">
              Analytical SGP4 / TEME distance screening. No collision probability (P<sub>c</sub>) claimed without covariance.
            </div>
          </>
        )}

        {/* If Single Catalog Satellite is Selected */}
        {!event && selectedCatalogObject && (
          <div className="space-y-3 text-xs">
<<<<<<< HEAD
            {/* Overview Metadata */}
            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#64748b] block mb-1">
                Satellite Overview
              </span>
              <div className="flex justify-between items-center py-1 border-b border-[#141f33]">
                <span className="text-[#94a3b8]">NORAD ID</span>
                <span className="font-mono text-[#38bdf8] font-semibold">#{selectedCatalogObject.norad_id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#141f33]">
                <span className="text-[#94a3b8]">Intl Designator</span>
                <span className="font-mono text-[#f8fafc]">{selectedCatalogObject.intl_des || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#141f33]">
                <span className="text-[#94a3b8]">Object Type</span>
                <span className="font-mono text-[#f8fafc]">{selectedCatalogObject.object_type}</span>
              </div>
              <div className="flex justify-between items-center py-1">
=======
            <div className="p-3 rounded bg-[#0d1424] border border-[#172236] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">NORAD ID</span>
                <span className="font-mono text-[#00e5ff] font-semibold">#{selectedCatalogObject.norad_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Intl Designator</span>
                <span className="font-mono text-[#f8fafc]">{selectedCatalogObject.intl_des}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Object Type</span>
                <span className="font-mono text-[#f8fafc]">{selectedCatalogObject.object_type}</span>
              </div>
              <div className="flex justify-between">
>>>>>>> 15183ce08edcd8d13d9bdbba3bd0cb7ff47e1d58
                <span className="text-[#94a3b8]">TLE Epoch Age</span>
                <span className="font-mono text-[#94a3b8]">{selectedCatalogObject.element_age_days.toFixed(1)} days</span>
              </div>
            </div>

<<<<<<< HEAD
            {/* Collapsible Advanced Keplerian Parameters */}
            <div className="pt-1">
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full py-2.5 px-3 rounded bg-[#0b1222] hover:bg-[#101a30] border border-[#16233b] flex items-center justify-between text-left text-xs transition-all cursor-pointer group"
                aria-expanded={showAdvanced}
              >
                <div className="flex items-center gap-2">
                  <Orbit className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span className="font-medium text-xs text-[#cbd5e1] group-hover:text-white transition-colors">
                    Advanced Orbital Elements
                  </span>
                </div>
                {showAdvanced ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748b]" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3 rounded bg-[#080d1a] border border-[#141f33] space-y-1.5 font-mono text-xs">
                  <div className="text-[11px] font-sans font-semibold text-[#38bdf8] mb-1">
                    Keplerian Parameters
                  </div>
                  <div className="text-[#cbd5e1]">
                    Inclination: {formatDegree(selectedCatalogObject.orbital_parameters.inclination_deg)}
                  </div>
                  <div className="text-[#cbd5e1]">
                    Eccentricity: {formatVectorComponent(selectedCatalogObject.orbital_parameters.eccentricity, 5)}
                  </div>
                  <div className="text-[#cbd5e1]">
                    Perigee: {formatKm(selectedCatalogObject.orbital_parameters.perigee_altitude_km, 1)} &bull; Apogee: {formatKm(selectedCatalogObject.orbital_parameters.apogee_altitude_km, 1)}
                  </div>
                  <div className="text-[#94a3b8]">
                    Semi-Major Axis: {formatKm(selectedCatalogObject.orbital_parameters.semi_major_axis_km, 1)}
                  </div>
                  <div className="text-[#94a3b8]">
                    Period: {selectedCatalogObject.orbital_parameters.period_minutes ? `${selectedCatalogObject.orbital_parameters.period_minutes.toFixed(2)} min` : 'N/A'}
                  </div>
                  <div className="text-[#94a3b8]">
                    RAAN (&Omega;): {formatDegree(selectedCatalogObject.orbital_parameters.raan_deg)} &bull; Mean Anomaly: {formatDegree(selectedCatalogObject.orbital_parameters.mean_anomaly_deg)}
                  </div>
                </div>
              )}
            </div>
          </div>
=======
            <div className="p-3 rounded bg-[#0d1424] border border-[#172236] space-y-1.5 font-mono text-xs">
              <div className="text-[11px] font-sans font-semibold text-[#00e5ff] mb-1">
                Keplerian Parameters
              </div>
              <div className="text-[#cbd5e1]">Inclination: {selectedCatalogObject.orbital_parameters.inclination_deg}&deg;</div>
              <div className="text-[#cbd5e1]">Eccentricity: {selectedCatalogObject.orbital_parameters.eccentricity}</div>
              <div className="text-[#94a3b8]">Perigee: {selectedCatalogObject.orbital_parameters.perigee_altitude_km} km</div>
              <div className="text-[#94a3b8]">Apogee: {selectedCatalogObject.orbital_parameters.apogee_altitude_km} km</div>
              <div className="text-[#94a3b8]">RAAN (&Omega;): {selectedCatalogObject.orbital_parameters.raan_deg ?? 'N/A'}&deg;</div>
              <div className="text-[#94a3b8]">Period: {selectedCatalogObject.orbital_parameters.period_minutes} min</div>
            </div>
          </div>
>>>>>>> 6d564b1c7fe16037100977f25912959226d2d713
>>>>>>> 15183ce08edcd8d13d9bdbba3bd0cb7ff47e1d58
        )}
      </div>
    </aside>
  );
};

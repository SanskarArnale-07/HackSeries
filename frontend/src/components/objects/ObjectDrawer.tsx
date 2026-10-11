import React, { useState } from 'react';
import type { ConjunctionEvent, OrbitalObject } from '../../api/types';
import { X, ChevronDown, ChevronRight, Globe, Navigation, Orbit, ShieldAlert } from 'lucide-react';
import { formatRelativeSpeed, formatUtcTimestamp } from '../../api/formatters';

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
  // Advanced orbital telemetry collapsed by default as required
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!event && !selectedCatalogObject) return null;

  const getTierDetails = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          desc: 'Geometric separation < 5.0 km',
          badge: 'text-red-400 bg-red-950/80 border-red-500/50'
        };
      case 'WARNING':
        return {
          label: 'WARNING',
          desc: 'Geometric separation 5.0 - 15.0 km',
          badge: 'text-amber-400 bg-amber-950/80 border-amber-500/50'
        };
      case 'WATCH':
        return {
          label: 'WATCH',
          desc: 'Geometric separation 15.0 - 30.0 km',
          badge: 'text-yellow-400 bg-yellow-950/80 border-yellow-500/50'
        };
      default:
        return {
          label: 'MONITOR',
          desc: 'Geometric separation 30.0 - 50.0 km',
          badge: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50'
        };
    }
  };




  return (
    <aside className="w-84 md:w-96 bg-[#0a0f1a] border-l border-[#172236] flex flex-col select-none overflow-y-auto h-full flex-shrink-0 z-20">
      {/* Inspector Header */}
      <div className="p-3.5 border-b border-[#172236] bg-[#0c1220] flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-[#00e5ff] uppercase block">
            {event ? 'Encounter Details' : 'Object Telemetry'}
          </span>
          <span className="text-xs font-mono font-bold text-[#f8fafc] truncate block">
            {event ? event.event_id : selectedCatalogObject?.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-[#141e30] text-[#64748b] hover:text-[#f8fafc] transition-colors cursor-pointer flex-shrink-0"
          title="Close details"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* If Conjunction Encounter is Selected */}
        {event && (
          <>
            {/* 1. HERO METRIC: Geometric Miss Distance & Screening Tier (Visible by default) */}
            {(() => {
              const tierInfo = getTierDetails(event.screening_tier);
              return (
                <div className="p-3.5 rounded bg-[#0d1424] border border-[#1a263c] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#94a3b8] font-medium flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#00e5ff]" />
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
                    <div className="text-2xl font-mono font-extrabold text-[#f8fafc] tracking-tight mt-0.5">
                      {event.miss_distance_km.toFixed(3)}
                      <span className="text-sm font-normal text-[#94a3b8] ml-1.5">km</span>
                    </div>
                    <span className="text-[10px] text-[#64748b] font-mono block mt-0.5">
                      {tierInfo.desc}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 2. CORE ENCOUNTER KINEMATICS (Visible by default) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Relative Velocity (Consistent across entire application) */}
              <div className="p-2.5 rounded bg-[#0d1424] border border-[#172236]">
                <span className="text-[10px] text-[#64748b] block font-medium">
                  Relative Velocity (v<sub>rel</sub>)
                </span>
                <span className="text-sm font-mono font-bold text-[#00e5ff] block mt-0.5">
                  {formatRelativeSpeed(event.relative_speed_km_s)}
                </span>
              </div>

              {/* Time of Closest Approach (TCA) */}
              <div className="p-2.5 rounded bg-[#0d1424] border border-[#172236]">
                <span className="text-[10px] text-[#64748b] block font-medium">
                  TCA (UTC)
                </span>
                <span className="text-xs font-mono font-semibold text-[#f8fafc] block mt-0.5 truncate" title={formatUtcTimestamp(event.tca_utc)}>
                  {event.tca_utc.replace('T', ' ').substring(0, 16)} UTC
                </span>
              </div>
            </div>

            {/* Full Formatted TCA String */}
            <div className="px-3 py-2 rounded bg-[#0d1424] border border-[#172236] text-[11px] font-mono text-[#cbd5e1] flex items-center justify-between">
              <span className="text-[#64748b]">TCA Epoch:</span>
              <span className="font-semibold text-[#f8fafc]">{formatUtcTimestamp(event.tca_utc)}</span>
            </div>

            {/* 3. TRACKED INTERCEPT PAIR (Visible by default) */}
            <div className="p-3 rounded bg-[#0d1424] border border-[#172236] space-y-2.5">
              <span className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-wider block">
                Intercept Pair Identities
              </span>

              {/* Primary Object */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#141e30]">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-[#00e5ff] block truncate" title={event.primary_object.name}>
                    {event.primary_object.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b]">
                    NORAD #{event.primary_object.norad_id} &bull; {event.primary_object.type || 'PAYLOAD'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#00e5ff] px-1.5 py-0.5 rounded bg-[#00e5ff]/10 border border-[#00e5ff]/25 flex-shrink-0">
                  PRIMARY
                </span>
              </div>

              {/* Secondary Object */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#141e30]">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-[#cbd5e1] block truncate" title={event.secondary_object.name}>
                    {event.secondary_object.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b]">
                    NORAD #{event.secondary_object.norad_id} &bull; {event.secondary_object.type || 'OBJECT'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] px-1.5 py-0.5 rounded bg-[#162234] border border-[#22324b] flex-shrink-0">
                  SECONDARY
                </span>
              </div>
            </div>

            {/* 4. EXPANDABLE "ADVANCED ORBITAL TELEMETRY" (Collapsed by default) */}
            <div className="pt-1 border-t border-[#172236]">
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full py-2.5 px-3 rounded bg-[#0d1424] hover:bg-[#121c30] border border-[#1a263c] flex items-center justify-between text-left text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Orbit className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span className="font-mono text-[11px] font-semibold text-[#f8fafc] group-hover:text-[#00e5ff] transition-colors">
                    Advanced Orbital Telemetry
                  </span>
                </div>
                {showAdvanced ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#00e5ff]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748b]" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 space-y-2.5 font-mono text-xs">
                  {/* WGS-84 Coordinates & Astrodynamics Reference Frames */}
                  <div className="p-2.5 rounded bg-[#070b14] border border-[#172236] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#00e5ff] text-[11px] font-sans font-semibold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Encounter Coordinates &amp; Reference Frames</span>
                    </div>
                    <div className="text-[11px] text-[#cbd5e1]">
                      Lat: {event.encounter_location_wgs84?.latitude_deg?.toFixed(4) ?? 'N/A'}&deg; &bull; Lon: {event.encounter_location_wgs84?.longitude_deg?.toFixed(4) ?? 'N/A'}&deg;
                    </div>
                    <div className="text-[11px] text-[#cbd5e1]">
                      Geodetic Alt: {event.encounter_location_wgs84?.altitude_km?.toFixed(2) ?? 'N/A'} km
                    </div>
                    <div className="text-[10px] text-[#64748b] pt-1 border-t border-[#121b2c] leading-relaxed">
                      Frames: TEME Inertial &bull; ECEF (with Coriolis compensation) &bull; WGS-84 (Bowring)
                    </div>
                  </div>

                  {/* Relative Velocity Vector Decomposition */}
                  <div className="p-2.5 rounded bg-[#070b14] border border-[#172236] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-sans font-semibold">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Relative Velocity Vectors (km/s)</span>
                    </div>
                    <div className="text-[11px] text-[#cbd5e1]">
                      TEME: [{event.relative_velocity_vector_teme?.vx?.toFixed(4) ?? 0}, {event.relative_velocity_vector_teme?.vy?.toFixed(4) ?? 0}, {event.relative_velocity_vector_teme?.vz?.toFixed(4) ?? 0}]
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      ECEF: [{event.relative_velocity_vector_ecef?.vx?.toFixed(4) ?? 0}, {event.relative_velocity_vector_ecef?.vy?.toFixed(4) ?? 0}, {event.relative_velocity_vector_ecef?.vz?.toFixed(4) ?? 0}]
                    </div>
                  </div>

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
        )}
      </div>
    </aside>
  );
};

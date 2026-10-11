import React, { useState } from 'react';
import type { ConjunctionEvent, OrbitalObject } from '../../api/types';
import { X, ChevronDown, ChevronRight, Globe, Navigation, Orbit } from 'lucide-react';

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!event && !selectedCatalogObject) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/80 border-red-500/40';
      case 'WARNING':
        return 'text-amber-400 bg-amber-950/80 border-amber-500/40';
      case 'WATCH':
        return 'text-yellow-400 bg-yellow-950/80 border-yellow-500/40';
      default:
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    }
  };

  return (
    <aside className="w-80 md:w-96 bg-[#080b10]/95 backdrop-blur-md border-l border-[#141a26] flex flex-col select-none overflow-y-auto h-full shadow-2xl z-30">
      {/* Header */}
      <div className="p-4 border-b border-[#141a26] flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#64748b] uppercase tracking-wider block font-medium">
            {event ? 'Encounter Details' : 'Satellite Telemetry'}
          </span>
          <span className="text-xs font-mono font-semibold text-[#f8fafc]">
            {event ? event.event_id : selectedCatalogObject?.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#121824] text-[#64748b] hover:text-[#f8fafc] transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* If Encounter Event is Selected */}
        {event && (
          <>
            {/* Primary Metrics (Always Visible Initially) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8]">Screening Priority</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border ${getTierColor(
                    event.screening_tier
                  )}`}
                >
                  {event.screening_tier}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8]">Miss Distance</span>
                <span className="text-sm font-mono font-bold text-[#f8fafc]">
                  {event.miss_distance_km.toFixed(3)} km
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8]">Relative Speed</span>
                <span className="text-xs font-mono font-semibold text-[#00e5ff]">
                  {event.relative_speed_km_s.toFixed(2)} km/s
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8]">TCA (UTC)</span>
                <span className="text-xs font-mono text-[#cbd5e1]">
                  {event.tca_utc}
                </span>
              </div>

              {/* Spacecraft Pair */}
              <div className="pt-2 border-t border-[#141a26] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Primary:</span>
                  <span className="font-medium text-[#00e5ff] truncate max-w-[180px]">
                    {event.primary_object.name} (#{event.primary_object.norad_id})
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Secondary:</span>
                  <span className="font-medium text-[#cbd5e1] truncate max-w-[180px]">
                    {event.secondary_object.name} (#{event.secondary_object.norad_id})
                  </span>
                </div>
              </div>
            </div>

            {/* Expandable Section for Advanced Technical Telemetry */}
            <div className="pt-2 border-t border-[#141a26]">
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full py-2 flex items-center justify-between text-left text-xs font-medium text-[#64748b] hover:text-[#00e5ff] transition-colors"
              >
                <span>Advanced Astrodynamics Telemetry</span>
                {showAdvanced ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {showAdvanced && (
                <div className="pt-3 space-y-3 font-mono text-xs">
                  {/* WGS-84 Geodesy */}
                  <div className="p-2.5 rounded bg-[#06080c] border border-[#141a26] space-y-1">
                    <div className="flex items-center gap-1.5 text-[#00e5ff] text-[11px] font-sans font-semibold">
                      <Globe className="w-3.5 h-3.5" />
                      <span>WGS-84 Encounter Coordinates</span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      Lat: {event.encounter_location_wgs84.latitude_deg.toFixed(4)}&deg; | Lon: {event.encounter_location_wgs84.longitude_deg.toFixed(4)}&deg;
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      Altitude: {event.encounter_location_wgs84.altitude_km.toFixed(2)} km
                    </div>
                  </div>

                  {/* Relative Velocity Decomposition */}
                  <div className="p-2.5 rounded bg-[#06080c] border border-[#141a26] space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-sans font-semibold">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Relative Velocity Vectors</span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      TEME Inertial: [{event.relative_velocity_vector_teme.vx.toFixed(2)}, {event.relative_velocity_vector_teme.vy.toFixed(2)}, {event.relative_velocity_vector_teme.vz.toFixed(2)}] km/s
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      ECEF (Coriolis): [{event.relative_velocity_vector_ecef.vx.toFixed(2)}, {event.relative_velocity_vector_ecef.vy.toFixed(2)}, {event.relative_velocity_vector_ecef.vz.toFixed(2)}] km/s
                    </div>
                  </div>

                  {/* Orbital Parameters */}
                  {primaryObject && (
                    <div className="p-2.5 rounded bg-[#06080c] border border-[#141a26] space-y-1">
                      <div className="flex items-center gap-1.5 text-[#00e5ff] text-[11px] font-sans font-semibold">
                        <Orbit className="w-3.5 h-3.5" />
                        <span>Primary Orbital Elements</span>
                      </div>
                      <div className="text-[11px] text-[#94a3b8]">
                        Inc: {primaryObject.orbital_parameters.inclination_deg}&deg; | Ecc: {primaryObject.orbital_parameters.eccentricity}
                      </div>
                      <div className="text-[11px] text-[#94a3b8]">
                        Perigee: {primaryObject.orbital_parameters.perigee_altitude_km} km | Apogee: {primaryObject.orbital_parameters.apogee_altitude_km} km
                      </div>
                    </div>
                  )}

                  {secondaryObject && (
                    <div className="p-2.5 rounded bg-[#06080c] border border-[#141a26] space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-sans font-semibold">
                        <Orbit className="w-3.5 h-3.5" />
                        <span>Secondary Orbital Elements</span>
                      </div>
                      <div className="text-[11px] text-[#94a3b8]">
                        Inc: {secondaryObject.orbital_parameters.inclination_deg}&deg; | Ecc: {secondaryObject.orbital_parameters.eccentricity}
                      </div>
                      <div className="text-[11px] text-[#94a3b8]">
                        Perigee: {secondaryObject.orbital_parameters.perigee_altitude_km} km | Apogee: {secondaryObject.orbital_parameters.apogee_altitude_km} km
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* If Single Catalog Satellite is Selected */}
        {!event && selectedCatalogObject && (
          <div className="space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">NORAD ID</span>
                <span className="font-mono text-[#00e5ff]">#{selectedCatalogObject.norad_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">International Des</span>
                <span className="font-mono text-[#f8fafc]">{selectedCatalogObject.intl_des}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">Type</span>
                <span className="font-mono text-[#f8fafc]">{selectedCatalogObject.object_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">TLE Age</span>
                <span className="font-mono text-[#94a3b8]">{selectedCatalogObject.element_age_days.toFixed(1)} days</span>
              </div>
            </div>

            <div className="p-3 rounded bg-[#06080c] border border-[#141a26] space-y-1.5 font-mono text-xs">
              <div className="text-[11px] font-sans font-semibold text-[#00e5ff] mb-1">
                Keplerian Parameters
              </div>
              <div className="text-[#94a3b8]">Inclination: {selectedCatalogObject.orbital_parameters.inclination_deg}&deg;</div>
              <div className="text-[#94a3b8]">Eccentricity: {selectedCatalogObject.orbital_parameters.eccentricity}</div>
              <div className="text-[#94a3b8]">Perigee: {selectedCatalogObject.orbital_parameters.perigee_altitude_km} km</div>
              <div className="text-[#94a3b8]">Apogee: {selectedCatalogObject.orbital_parameters.apogee_altitude_km} km</div>
              <div className="text-[#94a3b8]">Period: {selectedCatalogObject.orbital_parameters.period_minutes} min</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

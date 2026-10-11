import React, { useState } from 'react';
import type { ConjunctionEvent, OrbitalObject } from '../../api/types';
import {
  X,
  Globe,
  Navigation,
  Orbit,
  Cpu,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

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
  // Collapsible section states for advanced technical details
  const [showGeodesy, setShowGeodesy] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showPrimaryDetails, setShowPrimaryDetails] = useState(false);
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false);

  if (!event && !selectedCatalogObject) return null;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-red-950/90 text-red-400 border border-red-500/50">
            CRITICAL (&lt;5km)
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-amber-950/90 text-amber-400 border border-amber-500/50">
            WARNING (5-15km)
          </span>
        );
      case 'WATCH':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-yellow-950/90 text-yellow-400 border border-yellow-500/50">
            WATCH (15-30km)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-emerald-950/90 text-emerald-400 border border-emerald-500/50">
            MONITOR (30-50km)
          </span>
        );
    }
  };

  return (
    <aside className="w-80 md:w-96 h-full bg-[#080b10]/95 backdrop-blur-md border-l border-[#1c2436] flex flex-col select-none overflow-y-auto shadow-2xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-[#1c2436] flex items-center justify-between bg-[#0a0d14]">
        <div>
          <span className="text-xs text-[#94a3b8] uppercase tracking-wider block font-medium">
            {event ? 'Encounter Telemetry' : 'Catalog Satellite Telemetry'}
          </span>
          <span className="text-sm font-mono font-bold text-[#f8fafc]">
            {event ? event.event_id : selectedCatalogObject?.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-[#141b27] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
          title="Close telemetry inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* If Encounter Event is Selected */}
        {event && (
          <>
            {/* Primary Encounter Summary Card */}
            <div className="p-3.5 rounded-md bg-[#0c1017] border border-[#1c2436] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8] font-medium">SCREENING TIER</span>
                {getTierBadge(event.screening_tier)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8] font-medium">GEOMETRIC MISS DISTANCE</span>
                <span className="text-base font-bold font-mono text-[#f8fafc]">
                  {event.miss_distance_km.toFixed(3)}{' '}
                  <span className="text-xs font-normal text-[#94a3b8]">km</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8] font-medium">RELATIVE SPEED (v<sub>rel</sub>)</span>
                <span className="text-sm font-bold font-mono text-[#00e5ff]">
                  {event.relative_speed_km_s.toFixed(4)} km/s
                </span>
              </div>

              <div className="text-xs font-mono text-[#94a3b8] pt-2 border-t border-[#1c2436] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                <span>TCA: {event.tca_utc}</span>
              </div>
            </div>

            {/* Expandable Section 1: Encounter Geodesy (WGS-84) */}
            <div className="rounded-md bg-[#0c1017] border border-[#1c2436] overflow-hidden">
              <button
                onClick={() => setShowGeodesy((prev) => !prev)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-[#121824] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00e5ff]">
                  <Globe className="w-4 h-4" />
                  <span>WGS-84 ENCOUNTER GEODESY</span>
                </div>
                {showGeodesy ? (
                  <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
                )}
              </button>

              {showGeodesy && (
                <div className="p-3 pt-0 border-t border-[#141a27] grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                    <span className="text-[#64748b] text-xs block mb-0.5">LATITUDE</span>
                    <span className="text-[#f8fafc] text-xs">
                      {event.encounter_location_wgs84.latitude_deg.toFixed(4)}&deg;
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                    <span className="text-[#64748b] text-xs block mb-0.5">LONGITUDE</span>
                    <span className="text-[#f8fafc] text-xs">
                      {event.encounter_location_wgs84.longitude_deg.toFixed(4)}&deg;
                    </span>
                  </div>
                  <div className="col-span-2 p-2 rounded bg-[#06080c] border border-[#141a27]">
                    <span className="text-[#64748b] text-xs block mb-0.5">GEODETIC ALTITUDE</span>
                    <span className="text-[#f8fafc] text-xs">
                      {event.encounter_location_wgs84.altitude_km.toFixed(2)} km
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Section 2: Relative Velocity Decomposition */}
            <div className="rounded-md bg-[#0c1017] border border-[#1c2436] overflow-hidden">
              <button
                onClick={() => setShowVectors((prev) => !prev)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-[#121824] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Navigation className="w-4 h-4" />
                  <span>VELOCITY DECOMPOSITION</span>
                </div>
                {showVectors ? (
                  <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
                )}
              </button>

              {showVectors && (
                <div className="p-3 pt-0 border-t border-[#141a27] space-y-2 text-xs font-mono">
                  <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                    <div className="text-[#94a3b8] text-xs font-medium mb-1">
                      TEME Inertial Vector (km/s)
                    </div>
                    <div className="text-[#f8fafc] text-xs">
                      [{event.relative_velocity_vector_teme.vx.toFixed(4)},{' '}
                      {event.relative_velocity_vector_teme.vy.toFixed(4)},{' '}
                      {event.relative_velocity_vector_teme.vz.toFixed(4)}]
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                    <div className="text-[#94a3b8] text-xs font-medium mb-1">
                      ECEF Earth-Fixed (Coriolis corrected)
                    </div>
                    <div className="text-[#00e5ff] text-xs">
                      [{event.relative_velocity_vector_ecef.vx.toFixed(4)},{' '}
                      {event.relative_velocity_vector_ecef.vy.toFixed(4)},{' '}
                      {event.relative_velocity_vector_ecef.vz.toFixed(4)}]
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Section 3: Primary Spacecraft */}
            <div className="rounded-md bg-[#0c1017] border border-[#1c2436] overflow-hidden">
              <button
                onClick={() => setShowPrimaryDetails((prev) => !prev)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-[#121824] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00e5ff]">
                  <Orbit className="w-4 h-4" />
                  <span>PRIMARY: {event.primary_object.name}</span>
                </div>
                {showPrimaryDetails ? (
                  <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
                )}
              </button>

              {showPrimaryDetails && (
                <div className="p-3 pt-0 border-t border-[#141a27] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>NORAD ID:</span>
                    <span className="font-mono text-[#f8fafc]">#{event.primary_object.norad_id}</span>
                  </div>
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>CLASSIFICATION:</span>
                    <span className="font-mono text-[#f8fafc]">{event.primary_object.type}</span>
                  </div>
                  {primaryObject && (
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#141a27] font-mono text-xs text-[#94a3b8]">
                      <div>Inc: {primaryObject.orbital_parameters.inclination_deg}&deg;</div>
                      <div>Ecc: {primaryObject.orbital_parameters.eccentricity}</div>
                      <div>Perigee: {primaryObject.orbital_parameters.perigee_altitude_km} km</div>
                      <div>Apogee: {primaryObject.orbital_parameters.apogee_altitude_km} km</div>
                      <div className="col-span-2">Period: {primaryObject.orbital_parameters.period_minutes} min</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Expandable Section 4: Secondary Spacecraft */}
            <div className="rounded-md bg-[#0c1017] border border-[#1c2436] overflow-hidden">
              <button
                onClick={() => setShowSecondaryDetails((prev) => !prev)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-[#121824] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Cpu className="w-4 h-4" />
                  <span>SECONDARY: {event.secondary_object.name}</span>
                </div>
                {showSecondaryDetails ? (
                  <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
                )}
              </button>

              {showSecondaryDetails && (
                <div className="p-3 pt-0 border-t border-[#141a27] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>NORAD ID:</span>
                    <span className="font-mono text-[#f8fafc]">#{event.secondary_object.norad_id}</span>
                  </div>
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>CLASSIFICATION:</span>
                    <span className="font-mono text-[#f8fafc]">{event.secondary_object.type}</span>
                  </div>
                  {secondaryObject && (
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#141a27] font-mono text-xs text-[#94a3b8]">
                      <div>Inc: {secondaryObject.orbital_parameters.inclination_deg}&deg;</div>
                      <div>Ecc: {secondaryObject.orbital_parameters.eccentricity}</div>
                      <div>Perigee: {secondaryObject.orbital_parameters.perigee_altitude_km} km</div>
                      <div>Apogee: {secondaryObject.orbital_parameters.apogee_altitude_km} km</div>
                      <div className="col-span-2">Period: {secondaryObject.orbital_parameters.period_minutes} min</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* If Solo Catalog Object is Selected */}
        {!event && selectedCatalogObject && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-md bg-[#0c1017] border border-[#1c2436] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">CATALOG ID:</span>
                <span className="font-mono font-bold text-[#00e5ff]">
                  NORAD #{selectedCatalogObject.norad_id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">INTERNATIONAL DES:</span>
                <span className="font-mono text-[#f8fafc]">
                  {selectedCatalogObject.intl_des}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">TYPE:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-[#06080c] border border-[#1c2436] text-[#f8fafc]">
                  {selectedCatalogObject.object_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8]">TLE AGE:</span>
                <span className="font-mono text-[#94a3b8]">
                  {selectedCatalogObject.element_age_days.toFixed(2)} days
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-[#0c1017] border border-[#1c2436] space-y-2">
              <div className="flex items-center gap-2 text-[#00e5ff] font-semibold text-xs mb-1">
                <Orbit className="w-4 h-4" />
                <span>KEPLERIAN ORBITAL PARAMETERS</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                  <span className="text-[#64748b] block mb-0.5">INCLINATION</span>
                  <span className="text-[#f8fafc]">
                    {selectedCatalogObject.orbital_parameters.inclination_deg}&deg;
                  </span>
                </div>
                <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                  <span className="text-[#64748b] block mb-0.5">ECCENTRICITY</span>
                  <span className="text-[#f8fafc]">
                    {selectedCatalogObject.orbital_parameters.eccentricity}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                  <span className="text-[#64748b] block mb-0.5">PERIGEE ALTITUDE</span>
                  <span className="text-[#f8fafc]">
                    {selectedCatalogObject.orbital_parameters.perigee_altitude_km} km
                  </span>
                </div>
                <div className="p-2 rounded bg-[#06080c] border border-[#141a27]">
                  <span className="text-[#64748b] block mb-0.5">APOGEE ALTITUDE</span>
                  <span className="text-[#f8fafc]">
                    {selectedCatalogObject.orbital_parameters.apogee_altitude_km} km
                  </span>
                </div>
                <div className="col-span-2 p-2 rounded bg-[#06080c] border border-[#141a27]">
                  <span className="text-[#64748b] block mb-0.5">ORBITAL PERIOD</span>
                  <span className="text-[#f8fafc]">
                    {selectedCatalogObject.orbital_parameters.period_minutes} min
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

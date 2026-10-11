import React from 'react';
import type { ConjunctionEvent, OrbitalObject } from '../../api/types';
import { X, Globe, Navigation, Orbit, Cpu } from 'lucide-react';

interface ObjectDrawerProps {
  event: ConjunctionEvent | null;
  primaryObject?: OrbitalObject | null;
  secondaryObject?: OrbitalObject | null;
  onClose: () => void;
}

export const ObjectDrawer: React.FC<ObjectDrawerProps> = ({
  event,
  primaryObject,
  secondaryObject,
  onClose
}) => {
  if (!event) return null;

  return (
    <div className="w-96 h-full bg-[#080a0f] border-l border-white/10 flex flex-col font-mono text-xs select-none overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0b0e14]">
        <div>
          <span className="text-[10px] text-[#8a99ad] uppercase tracking-wider block">
            Selected Encounter
          </span>
          <span className="text-xs font-bold text-[#f0f4f8]">{event.event_id}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-[#8a99ad] hover:text-[#f0f4f8] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Tier & Miss Distance Summary Card */}
        <div className="p-3 rounded bg-[#0e1218] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8a99ad]">ALERT TIER</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                event.screening_tier === 'CRITICAL'
                  ? 'bg-red-950 text-red-400 border border-red-500/40'
                  : event.screening_tier === 'WARNING'
                  ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                  : 'bg-yellow-950 text-yellow-400 border border-yellow-500/40'
              }`}
            >
              {event.screening_tier}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8a99ad]">GEOMETRIC MISS DISTANCE</span>
            <span className="text-base font-bold text-[#f0f4f8]">
              {event.miss_distance_km.toFixed(3)} km
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8a99ad]">RELATIVE SPEED</span>
            <span className="text-sm font-semibold text-[#00f0ff]">
              {event.relative_speed_km_s.toFixed(4)} km/s
            </span>
          </div>

          <div className="text-[10px] text-[#8a99ad] pt-1 border-t border-white/5">
            TCA (UTC): {event.tca_utc}
          </div>
        </div>

        {/* WGS-84 Encounter Coordinates */}
        <div className="p-3 rounded bg-[#0e1218] border border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-[#00f0ff] font-semibold text-[11px]">
            <Globe className="w-3.5 h-3.5" />
            WGS-84 ENCOUNTER GEODESY
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#8a99ad] block">Latitude</span>
              <span className="text-[#f0f4f8]">
                {event.encounter_location_wgs84.latitude_deg.toFixed(4)}&deg;
              </span>
            </div>
            <div>
              <span className="text-[#8a99ad] block">Longitude</span>
              <span className="text-[#f0f4f8]">
                {event.encounter_location_wgs84.longitude_deg.toFixed(4)}&deg;
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[#8a99ad] block">Geodetic Altitude</span>
              <span className="text-[#f0f4f8]">
                {event.encounter_location_wgs84.altitude_km.toFixed(2)} km
              </span>
            </div>
          </div>
        </div>

        {/* Coordinate Frames & Coriolis Velocity Vectors */}
        <div className="p-3 rounded bg-[#0e1218] border border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
            <Navigation className="w-3.5 h-3.5" />
            AEROSPACE RELATIVE VELOCITY
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <div className="text-[#8a99ad] text-[10px]">TEME Inertial Frame (km/s)</div>
              <div className="text-[#f0f4f8]">
                [{event.relative_velocity_vector_teme.vx.toFixed(4)},{' '}
                {event.relative_velocity_vector_teme.vy.toFixed(4)},{' '}
                {event.relative_velocity_vector_teme.vz.toFixed(4)}]
              </div>
            </div>

            <div>
              <div className="text-[#8a99ad] text-[10px]">
                ECEF Earth-Fixed Frame (with -&omega; &times; r Coriolis)
              </div>
              <div className="text-[#00f0ff]">
                [{event.relative_velocity_vector_ecef.vx.toFixed(4)},{' '}
                {event.relative_velocity_vector_ecef.vy.toFixed(4)},{' '}
                {event.relative_velocity_vector_ecef.vz.toFixed(4)}]
              </div>
            </div>
          </div>
        </div>

        {/* Object A Card */}
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

          {primaryObject && (
            <div className="grid grid-cols-2 gap-1 text-[10px] pt-1.5 border-t border-white/5 text-[#8a99ad]">
              <div>Inc: {primaryObject.orbital_parameters.inclination_deg}&deg;</div>
              <div>Ecc: {primaryObject.orbital_parameters.eccentricity}</div>
              <div>Perigee: {primaryObject.orbital_parameters.perigee_altitude_km} km</div>
              <div>Apogee: {primaryObject.orbital_parameters.apogee_altitude_km} km</div>
            </div>
          )}
        </div>

        {/* Object B Card */}
        <div className="p-3 rounded bg-[#0e1218] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[#ff9500] font-semibold text-[11px]">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              SECONDARY OBJECT
            </div>
            <span className="text-[10px] text-[#8a99ad]">
              NORAD {event.secondary_object.norad_id}
            </span>
          </div>
          <div className="font-bold text-[#f0f4f8] text-xs">{event.secondary_object.name}</div>
          <div className="text-[10px] text-[#8a99ad]">TYPE: {event.secondary_object.type}</div>

          {secondaryObject && (
            <div className="grid grid-cols-2 gap-1 text-[10px] pt-1.5 border-t border-white/5 text-[#8a99ad]">
              <div>Inc: {secondaryObject.orbital_parameters.inclination_deg}&deg;</div>
              <div>Ecc: {secondaryObject.orbital_parameters.eccentricity}</div>
              <div>Perigee: {secondaryObject.orbital_parameters.perigee_altitude_km} km</div>
              <div>Apogee: {secondaryObject.orbital_parameters.apogee_altitude_km} km</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

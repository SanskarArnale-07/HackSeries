/**
 * GlobeView.tsx
 *
 * Bridge component connecting OrbitGuard real astrodynamics telemetry to TacticalGlobe3D.
 * Consumes:
 *   - Conjunction events (real WGS-84 encounter locations)
 *   - SGP4 orbital ephemeris trajectories (lat/lon time-series)
 *   - Primary & Secondary object real instantaneous positions
 *   - Strict aerospace compliance: never treats Keplerian angles as lat/lon.
 */

import React, { useMemo } from 'react';
import { TacticalGlobe3D } from './TacticalGlobe3D';
import type { TacticalGlobeMarker, TacticalTrajectory } from './TacticalGlobe3D';
import type { ConjunctionEvent, EphemerisTrajectory } from '../../api/types';
import { Compass } from 'lucide-react';

export interface GlobeViewProps {
  selectedEvent: ConjunctionEvent | null;
  primaryTrajectory: EphemerisTrajectory | null;
  secondaryTrajectory: EphemerisTrajectory | null;
  events?: ConjunctionEvent[];
  onSelectEvent?: (event: ConjunctionEvent) => void;
  showOutlines?: boolean;
  showOrbits?: boolean;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  selectedEvent,
  primaryTrajectory,
  secondaryTrajectory,
  events = [],
  onSelectEvent,
  showOutlines = true,
  showOrbits = true
}) => {
  // Convert SGP4 trajectories into TacticalGlobe format
  const trajectories: TacticalTrajectory[] = useMemo(() => {
    const list: TacticalTrajectory[] = [];
    if (!showOrbits) return list;

    if (primaryTrajectory && primaryTrajectory.points) {
      const validPoints = primaryTrajectory.points
        .filter((p) => p.is_valid && p.lat_deg !== null && p.lon_deg !== null)
        .map((p) => ({ lat: p.lat_deg as number, lon: p.lon_deg as number }));

      if (validPoints.length >= 2) {
        list.push({
          id: `traj-primary-${primaryTrajectory.norad_id}`,
          name: `${primaryTrajectory.name} Orbit`,
          color: '#00f0ff',
          opacity: 0.9,
          strokeWidth: 1.6,
          points: validPoints
        });
      }
    }

    if (secondaryTrajectory && secondaryTrajectory.points) {
      const validPoints = secondaryTrajectory.points
        .filter((p) => p.is_valid && p.lat_deg !== null && p.lon_deg !== null)
        .map((p) => ({ lat: p.lat_deg as number, lon: p.lon_deg as number }));

      if (validPoints.length >= 2) {
        const tierCol =
          selectedEvent?.screening_tier === 'CRITICAL'
            ? '#ff3b30'
            : selectedEvent?.screening_tier === 'WARNING'
            ? '#ff9500'
            : '#eab308';

        list.push({
          id: `traj-secondary-${secondaryTrajectory.norad_id}`,
          name: `${secondaryTrajectory.name} Orbit`,
          color: tierCol,
          opacity: 0.85,
          strokeWidth: 1.4,
          dashArray: '3,3',
          points: validPoints
        });
      }
    }

    return list;
  }, [primaryTrajectory, secondaryTrajectory, selectedEvent, showOrbits]);

  // Construct real markers from verified backend coordinates
  const markers: TacticalGlobeMarker[] = useMemo(() => {
    const list: TacticalGlobeMarker[] = [];

    // 1. Encounter beacon markers for all screened conjunction events
    for (const ev of events) {
      const isSelected = selectedEvent?.event_id === ev.event_id;
      const tierColor =
        ev.screening_tier === 'CRITICAL'
          ? '#ff3b30'
          : ev.screening_tier === 'WARNING'
          ? '#ff9500'
          : ev.screening_tier === 'WATCH'
          ? '#eab308'
          : '#10b981';

      list.push({
        id: `event-${ev.event_id}`,
        label: isSelected
          ? `TCA: ${ev.primary_object.name}`
          : `${ev.primary_object.name} / ${ev.secondary_object.name}`,
        description: `Miss: ${ev.miss_distance_km.toFixed(3)} km\nRel Speed: ${ev.relative_speed_km_s.toFixed(2)} km/s\nAlt: ${ev.encounter_location_wgs84.altitude_km.toFixed(1)} km\nTCA: ${ev.tca_utc}`,
        latitude: ev.encounter_location_wgs84.latitude_deg,
        longitude: ev.encounter_location_wgs84.longitude_deg,
        color: tierColor,
        size: isSelected ? 7 : 4.5,
        isPulsing: isSelected || ev.screening_tier === 'CRITICAL',
        objectType: 'CONJUNCTION',
        badge: `${ev.screening_tier} TCA`,
        onClick: () => onSelectEvent && onSelectEvent(ev)
      });
    }

    // 2. Real instantaneous position of Selected Primary Object (from real SGP4 ephemeris)
    if (primaryTrajectory && primaryTrajectory.points && primaryTrajectory.points.length > 0) {
      const p0 = primaryTrajectory.points[0];
      if (p0.is_valid && p0.lat_deg !== null && p0.lon_deg !== null) {
        list.push({
          id: `sat-primary-${primaryTrajectory.norad_id}`,
          label: `${primaryTrajectory.name}`,
          description: `NORAD ID: ${primaryTrajectory.norad_id}\nPropagated Lat: ${p0.lat_deg.toFixed(2)}°\nLon: ${p0.lon_deg.toFixed(2)}°\nAlt: ${p0.alt_km?.toFixed(1) ?? 'N/A'} km\nStatus: SGP4 VALID`,
          latitude: p0.lat_deg,
          longitude: p0.lon_deg,
          color: '#00f0ff',
          size: 5.5,
          isPulsing: true,
          objectType: 'PAYLOAD',
          badge: 'PRIMARY PAYLOAD (NOW)'
        });
      }
    }

    // 3. Real instantaneous position of Selected Secondary Object (from real SGP4 ephemeris)
    if (secondaryTrajectory && secondaryTrajectory.points && secondaryTrajectory.points.length > 0) {
      const p0 = secondaryTrajectory.points[0];
      if (p0.is_valid && p0.lat_deg !== null && p0.lon_deg !== null) {
        const secType = selectedEvent?.secondary_object.type ?? 'UNKNOWN';
        const typeCol =
          secType === 'DEBRIS'
            ? '#ef4444'
            : secType === 'ROCKET_BODY'
            ? '#f59e0b'
            : '#a855f7';

        list.push({
          id: `sat-secondary-${secondaryTrajectory.norad_id}`,
          label: `${secondaryTrajectory.name}`,
          description: `NORAD ID: ${secondaryTrajectory.norad_id}\nType: ${secType}\nPropagated Lat: ${p0.lat_deg.toFixed(2)}°\nLon: ${p0.lon_deg.toFixed(2)}°\nAlt: ${p0.alt_km?.toFixed(1) ?? 'N/A'} km\nStatus: SGP4 VALID`,
          latitude: p0.lat_deg,
          longitude: p0.lon_deg,
          color: typeCol,
          size: 5.5,
          isPulsing: true,
          objectType: secType as any,
          badge: `CHASER ${secType} (NOW)`
        });
      }
    }

    return list;
  }, [events, selectedEvent, primaryTrajectory, secondaryTrajectory, onSelectEvent]);

  return (
    <div className="w-full h-full relative bg-[#000000]">
      {/* Tactical SVG 3D Orthographic Globe */}
      <TacticalGlobe3D
        markers={markers}
        trajectories={trajectories}
        showOutlines={showOutlines}
        showOrbits={showOrbits}
        showGrid={true}
        showStars={true}
        autoRotate={true}
        autoRotateSpeed={3.0}
        rotateY={18}
        glowColor="#00f0ff"
        glowIntensity={0.35}
        oceanColor="#04070c"
        landFill="#0b1017"
        landStroke="#1e293b"
        strokeWidth={0.65}
        hoverColor="#13273e"
        className="w-full h-full"
      />

      {/* Floating Viewport Legend & Aerospace Provenance */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 text-xs font-mono bg-black/75 p-3 rounded border border-white/10 backdrop-blur-md shadow-2xl z-20 max-w-xs">
        <div className="flex items-center gap-1.5 text-[#00f0ff] text-[10px] tracking-wider uppercase font-bold border-b border-white/10 pb-1">
          <Compass className="w-3.5 h-3.5" />
          Tactical Orthographic Globe (WGS-84)
        </div>

        {/* Legend Item: Primary */}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] ring-1 ring-[#00f0ff]/50" />
          <span className="text-[#f0f4f8] text-[11px]">Primary Payload (Instantaneous)</span>
        </div>

        {/* Legend Item: Chaser / Encounter */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500] ring-1 ring-[#ff9500]/50" />
          <span className="text-[#f0f4f8] text-[11px]">Secondary Object / Chaser</span>
        </div>

        {/* Legend Item: Critical TCA Beacon */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] animate-ping" />
          <span className="text-[#f0f4f8] text-[11px]">Critical Conjunction TCA</span>
        </div>

        {/* Legend Item: Coastlines & Grid */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-0.5 bg-[#1e293b]" />
          <span className="text-[#8a99ad] text-[10px]">Natural Earth Vector Coastlines</span>
        </div>

        {/* Provenance Indicator */}
        <div className="mt-1 pt-1.5 border-t border-white/10 text-[9px] text-[#8a99ad] leading-tight">
          <div className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Real SGP4 Propagated Geodesy
          </div>
          <div className="opacity-75 pt-0.5">
            Angles (RAAN/MA) never coerced into lat/lon. Backside markers auto-culled.
          </div>
        </div>
      </div>
    </div>
  );
};

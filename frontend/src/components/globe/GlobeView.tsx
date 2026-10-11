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

export interface GlobeViewProps {
  selectedEvent: ConjunctionEvent | null;
  primaryTrajectory: EphemerisTrajectory | null;
  secondaryTrajectory: EphemerisTrajectory | null;
  events?: ConjunctionEvent[];
  onSelectEvent?: (event: ConjunctionEvent) => void;
  showOutlines?: boolean;
  showOrbits?: boolean;
  allSatellites?: Array<{
    norad_id: number;
    name: string;
    lat: number;
    lon: number;
    alt: number;
  }>;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  selectedEvent,
  primaryTrajectory,
  secondaryTrajectory,
  events = [],
  onSelectEvent,
  showOutlines = true,
  showOrbits = true,
  allSatellites = []
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
          color: '#38bdf8',
          opacity: 0.9,
          strokeWidth: 1.2,
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
            ? '#ef4444'
            : selectedEvent?.screening_tier === 'WARNING'
            ? '#f59e0b'
            : '#eab308';

        list.push({
          id: `traj-secondary-${secondaryTrajectory.norad_id}`,
          name: `${secondaryTrajectory.name} Orbit`,
          color: tierCol,
          opacity: 0.85,
          strokeWidth: 1.2,
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
          ? '#ef4444'
          : ev.screening_tier === 'WARNING'
          ? '#f59e0b'
          : ev.screening_tier === 'WATCH'
          ? '#eab308'
          : '#10b981';

      list.push({
        id: `event-${ev.event_id}`,
        label: isSelected
          ? `TCA: ${ev.primary_object.name}`
          : `${ev.primary_object.name} / ${ev.secondary_object.name}`,
        showLabel: isSelected, // Only show text label for the active selected encounter
        description: `Miss Distance: ${ev.miss_distance_km.toFixed(3)} km\nRel Speed: ${ev.relative_speed_km_s.toFixed(2)} km/s\nAlt: ${ev.encounter_location_wgs84.altitude_km.toFixed(1)} km\nTCA: ${ev.tca_utc}`,
        latitude: ev.encounter_location_wgs84.latitude_deg,
        longitude: ev.encounter_location_wgs84.longitude_deg,
        color: tierColor,
        size: isSelected ? 6 : 4,
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
          showLabel: true,
          description: `NORAD ID: ${primaryTrajectory.norad_id}\nPropagated Lat: ${p0.lat_deg.toFixed(2)}°\nLon: ${p0.lon_deg.toFixed(2)}°\nAlt: ${p0.alt_km?.toFixed(1) ?? 'N/A'} km\nStatus: SGP4 VALID`,
          latitude: p0.lat_deg,
          longitude: p0.lon_deg,
          color: '#38bdf8',
          size: 4.8,
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
          showLabel: true,
          description: `NORAD ID: ${secondaryTrajectory.norad_id}\nType: ${secType}\nPropagated Lat: ${p0.lat_deg.toFixed(2)}°\nLon: ${p0.lon_deg.toFixed(2)}°\nAlt: ${p0.alt_km?.toFixed(1) ?? 'N/A'} km\nStatus: SGP4 VALID`,
          latitude: p0.lat_deg,
          longitude: p0.lon_deg,
          color: typeCol,
          size: 4.8,
          isPulsing: true,
          objectType: secType as any,
          badge: `CHASER ${secType} (NOW)`
        });
      }
    }

    // 4. Background satellite catalog markers (unselected — no permanent labels to avoid clutter)
    for (const sat of allSatellites) {
      if (
        sat.norad_id === primaryTrajectory?.norad_id ||
        sat.norad_id === secondaryTrajectory?.norad_id
      ) {
        continue;
      }
      list.push({
        id: `catalog-${sat.norad_id}`,
        label: sat.name,
        showLabel: false, // Hidden by default, visible on hover tooltip
        description: `NORAD: ${sat.norad_id}\nLat: ${sat.lat.toFixed(2)}°\nLon: ${sat.lon.toFixed(2)}°\nAlt: ${sat.alt.toFixed(0)} km`,
        latitude: sat.lat,
        longitude: sat.lon,
        color: '#475569',
        size: 2.2,
        isPulsing: false,
        objectType: 'PAYLOAD',
        badge: 'CATALOG SATELLITE'
      });
    }

    return list;
  }, [events, selectedEvent, primaryTrajectory, secondaryTrajectory, onSelectEvent, allSatellites]);

  return (
    <div className="w-full h-full relative bg-[#05080e]">
      {/* Tactical SVG 3D Orthographic Globe */}
      <TacticalGlobe3D
        markers={markers}
        trajectories={trajectories}
        showOutlines={showOutlines}
        showOrbits={showOrbits}
        showGrid={true}
        showStars={true}
        autoRotate={true}
        autoRotateSpeed={2.5}
        rotateY={18}
        glowColor="#2563eb"
        glowIntensity={0.22}
        oceanColor="#06090e"
        landFill="#0c1219"
        landStroke="#1e293b"
        strokeWidth={0.55}
        hoverColor="#17253b"
        className="w-full h-full"
      />

      {/* Discreet Unobtrusive Bottom Legend & Status Bar */}
      <div className="absolute bottom-3 left-4 pointer-events-none flex items-center gap-3.5 text-[11px] font-mono bg-[#090e18]/85 px-3 py-1.5 rounded border border-[#172236]/80 backdrop-blur-md shadow-lg z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
          <span className="text-[#cbd5e1] text-[10px]">Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-[#cbd5e1] text-[10px]">Secondary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[#cbd5e1] text-[10px]">Conjunction TCA</span>
        </div>
        <span className="text-[#334155]">•</span>
        <span className="text-[#64748b] text-[10px]">WGS-84 / TEME SGP4</span>
      </div>
    </div>
  );
};

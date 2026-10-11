/**
 * GlobeView.tsx
 *
 * Hardware-accelerated 3D WebGL Earth visualization powered by Three.js & React Three Fiber.
 * Features:
 *   - Zero CPU polygon re-projection jitter (rendered directly via GPU VBOs at 60 FPS)
 *   - Perfectly framed camera positioning to prevent clipping on 1600x900 & laptop viewports
 *   - Real WGS-84 Natural Earth vector coastlines
 *   - SGP4 ephemeris trajectories for Primary (Cyan) and Secondary (Amber/Red) interceptors
 *   - Pulsing encounter beacon at Time of Closest Approach (TCA)
 *   - Selective satellite markers with zero label collision
 *   - OrbitControls with smooth damping and bounded zoom
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import worldLandData from '../../assets/world-land.json';
import type { ConjunctionEvent, EphemerisTrajectory } from '../../api/types';

const SPHERE_RADIUS = 2.0;

/**
 * Maps geodetic WGS-84 (lat, lon, alt) coordinates to Cartesian 3D Sphere Vector.
 */
function latLonToVector3(
  latDeg: number,
  lonDeg: number,
  altKm = 400,
  radiusBase = SPHERE_RADIUS
): THREE.Vector3 {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  // Scale LEO altitude gently for clear visual separation without clipping
  const r = radiusBase + Math.min(0.55, (altKm / 2000) * 0.4);

  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Custom line primitive component
function ThreeLine({
  points,
  color,
  opacity = 0.85
}: {
  points: THREE.Vector3[];
  color: string;
  opacity?: number;
}) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: opacity < 1.0,
      opacity,
      linewidth: 1
    });
    return new THREE.Line(geometry, material);
  }, [points, color, opacity]);

  return <primitive object={lineObj} />;
}

// Hardware-accelerated Earth sphere with Natural Earth vector coastlines
function TacticalEarth({ showOutlines = true }: { showOutlines?: boolean }) {
  const earthRef = useRef<THREE.Group>(null);

  const lineSegments = useMemo(() => {
    const segments: THREE.Vector3[][] = [];
    if (!worldLandData || !worldLandData.features) return segments;

    for (const feature of worldLandData.features as any[]) {
      const geom = feature.geometry;
      if (!geom) continue;

      if (geom.type === 'LineString') {
        const pts: THREE.Vector3[] = geom.coordinates.map((c: [number, number]) =>
          latLonToVector3(c[1], c[0], 0, SPHERE_RADIUS * 1.001)
        );
        segments.push(pts);
      } else if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates) {
          const pts: THREE.Vector3[] = line.map((c: [number, number]) =>
            latLonToVector3(c[1], c[0], 0, SPHERE_RADIUS * 1.001)
          );
          segments.push(pts);
        }
      } else if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) {
          const pts: THREE.Vector3[] = ring.map((c: [number, number]) =>
            latLonToVector3(c[1], c[0], 0, SPHERE_RADIUS * 1.001)
          );
          segments.push(pts);
        }
      }
    }
    return segments;
  }, []);

  return (
    <group ref={earthRef}>
      {/* 1. Deep-space Navy Earth Core */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#070c16" />
      </mesh>

      {/* 2. Equator reference ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SPHERE_RADIUS * 1.001, SPHERE_RADIUS * 1.003, 64]} />
        <meshBasicMaterial color="#16253b" side={THREE.DoubleSide} />
      </mesh>

      {/* 3. Subtle Latitude/Longitude Graticule */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS * 1.0015, 24, 16]} />
        <meshBasicMaterial color="#132035" wireframe transparent opacity={0.3} />
      </mesh>

      {/* 4. Natural Earth continental coastlines */}
      {showOutlines &&
        lineSegments.map((pts, i) => (
          <ThreeLine
            key={`coastline-${i}`}
            points={pts}
            color="#2a3f5a"
            opacity={0.8}
          />
        ))}
    </group>
  );
}

// 3D SGP4 Orbital Ephemeris Trajectory
function TrajectoryLine({
  trajectory,
  color,
  opacity = 0.9
}: {
  trajectory: EphemerisTrajectory;
  color: string;
  opacity?: number;
}) {
  const linePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    if (!trajectory || !trajectory.points) return pts;
    for (const pt of trajectory.points) {
      if (pt.is_valid && pt.lat_deg !== null && pt.lon_deg !== null) {
        pts.push(latLonToVector3(pt.lat_deg, pt.lon_deg, pt.alt_km || 400));
      }
    }
    return pts;
  }, [trajectory]);

  if (linePoints.length < 2) return null;
  return <ThreeLine points={linePoints} color={color} opacity={opacity} />;
}

// Instantaneous Satellite Position Marker (No text collision)
function SatelliteMarker({
  lat,
  lon,
  altKm,
  color,
  size = 0.038,
  isHighlighted = false
}: {
  lat: number;
  lon: number;
  altKm: number;
  color: string;
  size?: number;
  isHighlighted?: boolean;
}) {
  const pos = useMemo(() => latLonToVector3(lat, lon, altKm), [lat, lon, altKm]);

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Soft luminous halo */}
      <mesh>
        <sphereGeometry args={[size * (isHighlighted ? 2.0 : 1.4), 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlighted ? 0.45 : 0.2}
        />
      </mesh>
    </group>
  );
}

// Encounter Beacon at Time of Closest Approach (TCA)
function EncounterBeacon({
  lat,
  lon,
  altKm,
  tier
}: {
  lat: number;
  lon: number;
  altKm: number;
  tier: string;
}) {
  const pos = useMemo(() => latLonToVector3(lat, lon, altKm), [lat, lon, altKm]);
  const ringRef = useRef<THREE.Mesh>(null);

  const beaconColor =
    tier === 'CRITICAL'
      ? '#ef4444'
      : tier === 'WARNING'
      ? '#f59e0b'
      : tier === 'WATCH'
      ? '#eab308'
      : '#10b981';

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const scale = 1.0 + Math.sin(clock.getElapsedTime() * 3.5) * 0.35;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      {/* Core beacon dot */}
      <mesh>
        <sphereGeometry args={[0.048, 16, 16]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>
      {/* Pulsing encounter proximity shell */}
      <mesh ref={ringRef}>
        <sphereGeometry args={[0.095, 16, 16]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={0.35} wireframe />
      </mesh>
    </group>
  );
}

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
  const secondaryColor = useMemo(() => {
    if (!selectedEvent) return '#f59e0b';
    switch (selectedEvent.screening_tier) {
      case 'CRITICAL':
        return '#ef4444';
      case 'WARNING':
        return '#f59e0b';
      case 'WATCH':
        return '#eab308';
      default:
        return '#10b981';
    }
  }, [selectedEvent]);

  // Extract instantaneous position for primary object from ephemeris
  const primaryP0 = primaryTrajectory?.points?.[0];
  // Extract instantaneous position for secondary object from ephemeris
  const secondaryP0 = secondaryTrajectory?.points?.[0];

  return (
    <div className="w-full h-full relative bg-[#05080e] overflow-hidden select-none">
      {/* 3D WebGL Canvas — Hardware-accelerated, responsive, zero clipping */}
      <Canvas
        camera={{ position: [0, 1.25, 4.0], fov: 40 }}
        style={{ width: '100%', height: '100%', background: '#05080e' }}
      >
        <color attach="background" args={['#05080e']} />
        <ambientLight intensity={0.5} />

        {/* Earth Sphere with WGS-84 Coastlines */}
        <TacticalEarth showOutlines={showOutlines} />

        {/* Background Constellation Satellites (Rendered as tiny discrete dots without text collisions) */}
        {allSatellites.map((sat) => {
          const isPrimary = selectedEvent?.primary_object.norad_id === sat.norad_id;
          const isSecondary = selectedEvent?.secondary_object.norad_id === sat.norad_id;
          if (isPrimary || isSecondary) return null; // Rendered with higher fidelity below

          return (
            <SatelliteMarker
              key={`cat-sat-${sat.norad_id}`}
              lat={sat.lat}
              lon={sat.lon}
              altKm={sat.alt}
              color="#334155"
              size={0.016}
              isHighlighted={false}
            />
          );
        })}

        {/* Candidate Encounter Beacons on the Globe */}
        {events.map((ev) => {
          const isSelected = selectedEvent?.event_id === ev.event_id;
          if (isSelected) return null; // Rendered with pulsing shell below
          if (!ev.encounter_location_wgs84) return null;
          return (
            <group
              key={`enc-${ev.event_id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectEvent) onSelectEvent(ev);
              }}
            >
              <SatelliteMarker
                lat={ev.encounter_location_wgs84.latitude_deg}
                lon={ev.encounter_location_wgs84.longitude_deg}
                altKm={ev.encounter_location_wgs84.altitude_km}
                color={
                  ev.screening_tier === 'CRITICAL'
                    ? '#ef4444'
                    : ev.screening_tier === 'WARNING'
                    ? '#f59e0b'
                    : '#eab308'
                }
                size={0.03}
                isHighlighted={false}
              />
            </group>
          );
        })}

        {/* Selected Primary Object Instantaneous Position Marker */}
        {primaryP0 && primaryP0.is_valid && primaryP0.lat_deg !== null && primaryP0.lon_deg !== null && (
          <SatelliteMarker
            lat={primaryP0.lat_deg}
            lon={primaryP0.lon_deg}
            altKm={primaryP0.alt_km || 400}
            color="#00e5ff"
            size={0.045}
            isHighlighted={true}
          />
        )}

        {/* Selected Secondary Object Instantaneous Position Marker */}
        {secondaryP0 && secondaryP0.is_valid && secondaryP0.lat_deg !== null && secondaryP0.lon_deg !== null && (
          <SatelliteMarker
            lat={secondaryP0.lat_deg}
            lon={secondaryP0.lon_deg}
            altKm={secondaryP0.alt_km || 400}
            color={secondaryColor}
            size={0.045}
            isHighlighted={true}
          />
        )}

        {/* Primary SGP4 Orbital Trajectory (Cyan) */}
        {showOrbits && primaryTrajectory && (
          <TrajectoryLine
            trajectory={primaryTrajectory}
            color="#00e5ff"
            opacity={0.9}
          />
        )}

        {/* Secondary SGP4 Orbital Trajectory (Amber / Red) */}
        {showOrbits && secondaryTrajectory && (
          <TrajectoryLine
            trajectory={secondaryTrajectory}
            color={secondaryColor}
            opacity={0.85}
          />
        )}

        {/* Pulsing Encounter Beacon at Time of Closest Approach (TCA) */}
        {selectedEvent && selectedEvent.encounter_location_wgs84 && (
          <EncounterBeacon
            lat={selectedEvent.encounter_location_wgs84.latitude_deg}
            lon={selectedEvent.encounter_location_wgs84.longitude_deg}
            altKm={selectedEvent.encounter_location_wgs84.altitude_km}
            tier={selectedEvent.screening_tier}
          />
        )}

        {/* Smooth OrbitControls with Damping & Bounded Zoom */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.65}
          minDistance={2.6}
          maxDistance={8.5}
        />
      </Canvas>

      {/* Discrete, Compact Status & Astrodynamics Legend Bar (Bottom-Left) */}
      <div className="absolute bottom-3.5 left-4 pointer-events-none flex items-center gap-3.5 text-[11px] font-mono bg-[#090e18]/85 px-3 py-1.5 rounded border border-[#172236]/80 backdrop-blur-md shadow-lg z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00e5ff]" />
          <span className="text-[#cbd5e1] text-[10px]">Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-[#cbd5e1] text-[10px]">Secondary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[#cbd5e1] text-[10px]">TCA Beacon</span>
        </div>
        <span className="text-[#334155]">&bull;</span>
        <span className="text-[#64748b] text-[10px]">TEME Inertial &bull; WGS-84 Coastlines</span>
      </div>
    </div>
  );
};

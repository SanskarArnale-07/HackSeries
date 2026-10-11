import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import worldLandData from '../../assets/world-land.json';
import type { ConjunctionEvent, EphemerisTrajectory } from '../../api/types';

const EARTH_RADIUS_KM = 6378.137;
const SPHERE_RADIUS = 2.25;

function latLonToVector3(lat: number, lon: number, altKm = 0, radiusBase = SPHERE_RADIUS): THREE.Vector3 {
  const r = radiusBase * (1.0 + altKm / EARTH_RADIUS_KM);
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Custom line primitive component to prevent collision with SVG <line>
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

// Pure-black Earth sphere with subtle dark-gray continent outlines
function PureBlackEarth({ showOutlines = true }: { showOutlines?: boolean }) {
  const lineSegments = useMemo(() => {
    const segments: THREE.Vector3[][] = [];
    if (!worldLandData || !worldLandData.features) return segments;

    for (const feature of worldLandData.features as any[]) {
      const geom = feature.geometry;
      if (!geom) continue;

      if (geom.type === 'LineString') {
        const pts: THREE.Vector3[] = geom.coordinates.map((c: [number, number]) =>
          latLonToVector3(c[1], c[0], 2.0)
        );
        segments.push(pts);
      } else if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates) {
          const pts: THREE.Vector3[] = line.map((c: [number, number]) =>
            latLonToVector3(c[1], c[0], 2.0)
          );
          segments.push(pts);
        }
      } else if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) {
          const pts: THREE.Vector3[] = ring.map((c: [number, number]) =>
            latLonToVector3(c[1], c[0], 2.0)
          );
          segments.push(pts);
        }
      }
    }
    return segments;
  }, []);

  return (
    <group>
      {/* 1. Pure-black Earth Core (no daytime imagery, no atmospheric glow) */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Equator reference ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SPHERE_RADIUS * 1.001, SPHERE_RADIUS * 1.0025, 64]} />
        <meshBasicMaterial color="#141f33" side={THREE.DoubleSide} />
      </mesh>

      {/* 3. Subtle dark-gray continent outlines from Natural Earth vector */}
      {showOutlines &&
        lineSegments.map((pts, i) => (
          <ThreeLine
            key={`coastline-${i}`}
            points={pts}
            color="#2f3d52"
            opacity={0.85}
          />
        ))}
    </group>
  );
}

// Orbit spline trajectory rendered from backend SGP4 ephemeris
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
    for (const pt of trajectory.points) {
      if (pt.is_valid && pt.lat_deg !== null && pt.lon_deg !== null && pt.alt_km !== null) {
        pts.push(latLonToVector3(pt.lat_deg, pt.lon_deg, pt.alt_km));
      }
    }
    return pts;
  }, [trajectory]);

  if (linePoints.length < 2) return null;
  return <ThreeLine points={linePoints} color={color} opacity={opacity} />;
}

// Satellite marker dot
function SatelliteMarker({
  lat,
  lon,
  altKm,
  color,
  size = 0.024,
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
      {/* Restrained soft halo */}
      <mesh>
        <sphereGeometry args={[size * (isHighlighted ? 2.0 : 1.4), 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlighted ? 0.35 : 0.12}
        />
      </mesh>
    </group>
  );
}

// Encounter Beacon Pulse at Time of Closest Approach (TCA)
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
      const scale = 1.0 + Math.sin(clock.getElapsedTime() * 3.0) * 0.25;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={0.3} wireframe />
      </mesh>
    </group>
  );
}

export interface GlobeViewProps {
  selectedEvent: ConjunctionEvent | null;
  primaryTrajectory: EphemerisTrajectory | null;
  secondaryTrajectory: EphemerisTrajectory | null;
  allSatellites?: Array<{ norad_id: number; lat: number; lon: number; alt: number; name: string }>;
  showOutlines?: boolean;
  showOrbits?: boolean;
}

export function GlobeView({
  selectedEvent,
  primaryTrajectory,
  secondaryTrajectory,
  allSatellites = [],
  showOutlines = true,
  showOrbits = true
}: GlobeViewProps) {
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

  return (
    <div className="w-full h-full relative bg-[#070b14]">
      <Canvas
        camera={{ position: [0, 0.7, 3.5], fov: 38 }}
        style={{ background: '#070b14' }}
      >
        <color attach="background" args={['#070b14']} />
        <ambientLight intensity={0.45} />

        {/* Pure-black Earth globe with vector continent outlines */}
        <PureBlackEarth showOutlines={showOutlines} />

        {/* Background constellation satellites */}
        {allSatellites.map((sat) => {
          const isPrimary = selectedEvent?.primary_object.norad_id === sat.norad_id;
          const isSecondary = selectedEvent?.secondary_object.norad_id === sat.norad_id;
          const color = isPrimary
            ? '#00e5ff'
            : isSecondary
            ? secondaryColor
            : '#38bdf8';

          return (
            <SatelliteMarker
              key={`sat-${sat.norad_id}`}
              lat={sat.lat}
              lon={sat.lon}
              altKm={sat.alt}
              color={color}
              size={isPrimary || isSecondary ? 0.038 : 0.02}
              isHighlighted={isPrimary || isSecondary}
            />
          );
        })}

        {/* Selected conjunction event trajectories */}
        {showOrbits && primaryTrajectory && (
          <TrajectoryLine
            trajectory={primaryTrajectory}
            color="#00e5ff"
            opacity={0.92}
          />
        )}
        {showOrbits && secondaryTrajectory && (
          <TrajectoryLine
            trajectory={secondaryTrajectory}
            color={secondaryColor}
            opacity={0.88}
          />
        )}

        {/* Selected encounter beacon at TCA */}
        {selectedEvent && (
          <EncounterBeacon
            lat={selectedEvent.encounter_location_wgs84.latitude_deg}
            lon={selectedEvent.encounter_location_wgs84.longitude_deg}
            altKm={selectedEvent.encounter_location_wgs84.altitude_km}
            tier={selectedEvent.screening_tier}
          />
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.7}
          minDistance={2.5}
          maxDistance={8.5}
        />
      </Canvas>

      {/* Discreet Coordinate Frame Identifier */}
      <div className="absolute top-3.5 left-4 pointer-events-none text-[11px] font-mono text-[#64748b] bg-[#090e18]/85 px-2.5 py-1 rounded backdrop-blur-md border border-[#172236]">
        TEME Inertial Frame &bull; WGS-84 Coastlines
      </div>
    </div>
  );
}

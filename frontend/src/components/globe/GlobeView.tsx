import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import worldLandData from '../../assets/world-land.json';
import type { ConjunctionEvent, EphemerisTrajectory } from '../../api/types';

const EARTH_RADIUS_KM = 6378.137;
const SPHERE_RADIUS = 2.0;

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
  // Parse GeoJSON coastline geometries into Three.js line segments
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
      {/* 1. Pure-black Earth Core (No daytime textures, no blue oceans) */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Subtle equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SPHERE_RADIUS * 1.001, SPHERE_RADIUS * 1.003, 64]} />
        <meshBasicMaterial color="#1a1f29" side={THREE.DoubleSide} />
      </mesh>

      {/* 3. Subtle dark-gray continent outlines from Natural Earth vector */}
      {showOutlines &&
        lineSegments.map((pts, i) => (
          <ThreeLine
            key={`coastline-${i}`}
            points={pts}
            color="#363c48"
            opacity={0.8}
          />
        ))}
    </group>
  );
}

// Orbit spline trajectory rendered from backend ephemeris
function TrajectoryLine({
  trajectory,
  color,
  opacity = 0.85
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
  size = 0.04
}: {
  lat: number;
  lon: number;
  altKm: number;
  color: string;
  size?: number;
}) {
  const pos = useMemo(() => latLonToVector3(lat, lon, altKm), [lat, lon, altKm]);

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[size * 1.8, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Encounter Beacon Pulse
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

  const beaconColor = tier === 'CRITICAL' ? '#ff3b30' : tier === 'WARNING' ? '#ff9500' : '#ffd60a';

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const scale = 1.0 + Math.sin(clock.getElapsedTime() * 4.0) * 0.4;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={0.4} wireframe />
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
  return (
    <div className="w-full h-full relative bg-[#000000]">
      <Canvas
        camera={{ position: [0, 2.5, 5.0], fov: 45 }}
        style={{ background: '#000000' }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.4} />

        {/* Pure-black globe with legitimate continent outlines */}
        <PureBlackEarth showOutlines={showOutlines} />

        {/* Background constellation satellites */}
        {allSatellites.map((sat) => (
          <SatelliteMarker
            key={`sat-${sat.norad_id}`}
            lat={sat.lat}
            lon={sat.lon}
            altKm={sat.alt}
            color="#00f0ff"
            size={0.025}
          />
        ))}

        {/* Selected conjunction event trajectories */}
        {showOrbits && primaryTrajectory && (
          <TrajectoryLine trajectory={primaryTrajectory} color="#00f0ff" opacity={0.9} />
        )}
        {showOrbits && secondaryTrajectory && (
          <TrajectoryLine
            trajectory={secondaryTrajectory}
            color={selectedEvent?.screening_tier === 'CRITICAL' ? '#ff3b30' : '#ff9500'}
            opacity={0.9}
          />
        )}

        {/* Selected conjunction encounter marker */}
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
          rotateSpeed={0.6}
          minDistance={2.5}
          maxDistance={12.0}
        />
      </Canvas>

      {/* Floating Viewport Legend */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 text-xs font-mono bg-black/60 p-2.5 rounded border border-white/10 backdrop-blur-sm">
        <div className="text-[#8a99ad] text-[10px] tracking-wider uppercase mb-1">
          3D Inertial Reference (WGS-84 / ECEF)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
          <span className="text-[#f0f4f8]">Catalog Satellite / Primary Orbit</span>
        </div>
        {selectedEvent && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedEvent.screening_tier === 'CRITICAL' ? 'bg-[#ff3b30]' : 'bg-[#ff9500]'
              }`}
            />
            <span className="text-[#f0f4f8]">
              Chaser Trajectory ({selectedEvent.screening_tier})
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-2 h-0.5 bg-[#363c48]" />
          <span className="text-[#8a99ad]">Natural Earth 110m Coastlines</span>
        </div>
      </div>
    </div>
  );
}

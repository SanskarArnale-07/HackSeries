import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import worldLandData from '../../assets/world-land.json';

const EARTH_RADIUS_KM = 6378.137;
const SPHERE_RADIUS = 2.45;

function latLonToVector3(lat: number, lon: number, altKm = 0, radiusBase = SPHERE_RADIUS): THREE.Vector3 {
  const r = radiusBase * (1.0 + altKm / EARTH_RADIUS_KM);
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -r * Math.sin(phi) * Math.cos(theta);
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

// Pure-black Earth sphere with dark-gray continent outlines from Natural Earth
function LandingEarth() {
  const earthRef = useRef<THREE.Group>(null);

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

  // Gentle, smooth axial rotation to give Earth realistic depth
  useFrame(({ clock }) => {
    if (earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.025;
    }
  });

  return (
    <group ref={earthRef}>
      {/* Pure-black Earth core (no daytime imagery, no atmospheric glow) */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Discreet equator reference ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SPHERE_RADIUS * 1.001, SPHERE_RADIUS * 1.003, 64]} />
        <meshBasicMaterial color="#141a24" side={THREE.DoubleSide} />
      </mesh>

      {/* Subtle dark-gray continent outlines */}
      {lineSegments.map((pts, i) => (
        <ThreeLine
          key={`landing-coast-${i}`}
          points={pts}
          color="#2d3748"
          opacity={0.75}
        />
      ))}
    </group>
  );
}

// Compute 3D point on an inclined circular orbit
function getOrbitalPoint(radius: number, incRad: number, raanRad: number, theta: number): THREE.Vector3 {
  // Perifocal coordinates in the orbital plane
  const xOrb = radius * Math.cos(theta);
  const zOrb = radius * Math.sin(theta);

  // Rotate by inclination around X
  const x1 = xOrb;
  const y1 = -zOrb * Math.sin(incRad);
  const z1 = zOrb * Math.cos(incRad);

  // Rotate by RAAN around Y
  const x = x1 * Math.cos(raanRad) + z1 * Math.sin(raanRad);
  const y = y1;
  const z = -x1 * Math.sin(raanRad) + z1 * Math.cos(raanRad);

  return new THREE.Vector3(x, y, z);
}

interface OrbitConfig {
  radius: number;
  inclinationDeg: number;
  raanDeg: number;
  periodSeconds: number;
  initialPhase: number;
  color: string;
  name: string;
}

// Animated orbital path with a glowing satellite and subtle tapering light trail
function AnimatedOrbit({ config }: { config: OrbitConfig }) {
  const incRad = (config.inclinationDeg * Math.PI) / 180;
  const raanRad = (config.raanDeg * Math.PI) / 180;
  const TRAIL_STEPS = 20;
  const TRAIL_ARC = 0.55; // Radians behind the satellite

  // Static orbital spline curve
  const orbitCurvePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 120;
    for (let i = 0; i <= count; i++) {
      const theta = (i / count) * Math.PI * 2;
      pts.push(getOrbitalPoint(config.radius, incRad, raanRad, theta));
    }
    return pts;
  }, [config.radius, incRad, raanRad]);

  const satMeshRef = useRef<THREE.Group>(null);

  // Dynamic trailing light trail primitive using Three.Line to avoid SVG <line> tag collision
  const trailLineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAIL_STEPS * 3), 3)
    );
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: 0.7,
      linewidth: 1
    });
    return new THREE.Line(geom, mat);
  }, [config.color]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const currentTheta = (t / config.periodSeconds) * Math.PI * 2 + config.initialPhase;

    // 1. Update satellite position
    const satPos = getOrbitalPoint(config.radius, incRad, raanRad, currentTheta);
    if (satMeshRef.current) {
      satMeshRef.current.position.copy(satPos);
    }

    // 2. Update trailing light trail
    const posAttr = trailLineObj.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < TRAIL_STEPS; i++) {
      const frac = i / (TRAIL_STEPS - 1);
      const theta = currentTheta - (1 - frac) * TRAIL_ARC;
      const pt = getOrbitalPoint(config.radius, incRad, raanRad, theta);
      arr[i * 3] = pt.x;
      arr[i * 3 + 1] = pt.y;
      arr[i * 3 + 2] = pt.z;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Static orbital path line (restrained, thin) */}
      <ThreeLine points={orbitCurvePoints} color={config.color} opacity={0.2} />

      {/* Dynamic trailing light trail */}
      <primitive object={trailLineObj} />

      {/* Animated luminous satellite marker */}
      <group ref={satMeshRef}>
        {/* Core point */}
        <mesh>
          <sphereGeometry args={[0.024, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Luminous glow halo */}
        <mesh>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

export function LandingGlobe() {
  // Diverse illustrative LEO orbital configurations (varying inclinations, altitudes, and speeds)
  const orbits: OrbitConfig[] = useMemo(
    () => [
      {
        radius: SPHERE_RADIUS * 1.14,
        inclinationDeg: 51.6, // ISS / Crew Dragon inclination
        raanDeg: 45,
        periodSeconds: 28,
        initialPhase: 0,
        color: '#00e5ff',
        name: 'ISS-type LEO'
      },
      {
        radius: SPHERE_RADIUS * 1.22,
        inclinationDeg: 97.8, // Sun-synchronous orbit
        raanDeg: 160,
        periodSeconds: 38,
        initialPhase: 1.8,
        color: '#38bdf8',
        name: 'Sun-synchronous'
      },
      {
        radius: SPHERE_RADIUS * 1.18,
        inclinationDeg: 28.5, // Cape Canaveral low inclination
        raanDeg: 280,
        periodSeconds: 32,
        initialPhase: 3.4,
        color: '#22d3ee',
        name: 'Equatorial LEO'
      },
      {
        radius: SPHERE_RADIUS * 1.28,
        inclinationDeg: 72.0, // Constellation polar mesh
        raanDeg: 80,
        periodSeconds: 44,
        initialPhase: 0.9,
        color: '#00f0ff',
        name: 'High-Inclination'
      },
      {
        radius: SPHERE_RADIUS * 1.35,
        inclinationDeg: 63.4, // Critical inclination
        raanDeg: 210,
        periodSeconds: 50,
        initialPhase: 4.2,
        color: '#bae6fd',
        name: 'Upper LEO'
      }
    ],
    []
  );

  return (
    <div className="w-full h-full absolute inset-0 bg-[#000000]">
      <Canvas
        camera={{ position: [2.0, 1.4, 4.4], fov: 38 }}
        style={{ background: '#000000' }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />

        {/* Pure-black Earth sphere with continent vector outlines */}
        <LandingEarth />

        {/* Dynamic illustrative orbital light trails */}
        {orbits.map((orb, i) => (
          <AnimatedOrbit key={`orbit-${i}`} config={orb} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.6}
          minDistance={2.8}
          maxDistance={9.5}
        />
      </Canvas>

      {/* Honest Scientific Provenance Tag */}
      <div className="absolute bottom-4 right-6 pointer-events-none text-[11px] font-mono text-[#64748b] bg-[#06080c]/80 px-3 py-1.5 rounded backdrop-blur-sm border border-[#141a26]/80 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
        <span>Illustrative LEO Orbits &bull; TEME Geometry &bull; Pure Offline Engine</span>
      </div>
    </div>
  );
}

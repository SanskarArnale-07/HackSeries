import type {
  HealthResponse,
  OrbitalObject,
  ConjunctionsResponse,
  ConjunctionEvent,
  EphemerisTrajectory,
  SpaceWeatherState
} from './types';

const BASE_URL = '';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchObjects(limit = 100, offset = 0, search = ''): Promise<{
  summary: any;
  total_matched: number;
  objects: OrbitalObject[];
}> {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  if (search) params.append('search', search);
  const res = await fetch(`${BASE_URL}/api/v1/objects?${params.toString()}`);
  if (!res.ok) throw new Error(`Objects fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchObject(noradId: number): Promise<OrbitalObject> {
  const res = await fetch(`${BASE_URL}/api/v1/objects/${noradId}`);
  if (!res.ok) throw new Error(`Object ${noradId} fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchConjunctions(tier?: string, maxMissKm?: number): Promise<ConjunctionsResponse> {
  const params = new URLSearchParams();
  if (tier) params.append('tier', tier);
  if (maxMissKm) params.append('max_miss_km', maxMissKm.toString());
  const res = await fetch(`${BASE_URL}/api/v1/conjunctions?${params.toString()}`);
  if (!res.ok) throw new Error(`Conjunctions fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchConjunctionEvent(eventId: string): Promise<ConjunctionEvent> {
  const res = await fetch(`${BASE_URL}/api/v1/conjunctions/${eventId}`);
  if (!res.ok) throw new Error(`Conjunction ${eventId} fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchEphemeris(noradId: number, stepSeconds = 60, durationHours = 2): Promise<EphemerisTrajectory> {
  const params = new URLSearchParams({
    step_seconds: stepSeconds.toString(),
    duration_hours: durationHours.toString()
  });
  const res = await fetch(`${BASE_URL}/api/v1/ephemeris/${noradId}?${params.toString()}`);
  if (!res.ok) throw new Error(`Ephemeris for NORAD ${noradId} failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherState> {
  const res = await fetch(`${BASE_URL}/api/v1/weather/current`);
  if (!res.ok) throw new Error(`Space weather fetch failed: ${res.statusText}`);
  return res.json();
}

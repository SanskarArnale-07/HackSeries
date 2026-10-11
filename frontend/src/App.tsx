import { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardPage } from './components/dashboard/DashboardPage';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [events, setEvents] = useState<ConjunctionEvent[]>([]);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [weather, setWeather] = useState<SpaceWeatherState | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConjunctionEvent | null>(null);
  const [primaryTrajectory, setPrimaryTrajectory] = useState<EphemerisTrajectory | null>(null);
  const [secondaryTrajectory, setSecondaryTrajectory] = useState<EphemerisTrajectory | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutlines, setShowOutlines] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);

  // When an event is selected, fetch ephemeris trajectories for both objects
  const handleSelectEvent = async (event: ConjunctionEvent) => {
    setSelectedEvent(event);
    try {
      const [primaryTraj, secondaryTraj] = await Promise.all([
        fetchEphemeris(event.primary_object.norad_id, 60, 2).catch(() => null),
        fetchEphemeris(event.secondary_object.norad_id, 60, 2).catch(() => null)
      ]);
      setPrimaryTrajectory(primaryTraj);
      setSecondaryTrajectory(secondaryTraj);
    } catch (err) {
      console.error('Failed to load ephemeris for selected event', err);
    }
  };

  // Load telemetry, catalog, screened conjunctions, and space weather
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [healthData, conjData, objData, weatherData] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchConjunctions().catch(() => ({ screening_metadata: {} as any, events: [] })),
        fetchObjects(100).catch(() => ({ objects: [], summary: {}, total_matched: 0 })),
        fetchSpaceWeather().catch(() => null)
      ]);

      if (healthData) setHealth(healthData);
      if (weatherData) setWeather(weatherData);
      if (objData && objData.objects) setObjects(objData.objects);

      const loadedEvents = conjData.events || [];
      setEvents(loadedEvents);

      // Auto-select the closest encounter event if available
      if (loadedEvents.length > 0 && !selectedEvent) {
        handleSelectEvent(loadedEvents[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with TRAJACTRA backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primaryObj = objects.find((o) => o.norad_id === selectedEvent?.primary_object.norad_id);
  const secondaryObj = objects.find((o) => o.norad_id === selectedEvent?.secondary_object.norad_id);

  return (
    <div className="w-full h-full flex flex-col bg-[#000000] text-[#f0f4f8] overflow-hidden select-none">
      {/* Top Header */}
      <Header
        health={health}
        weather={weather}
        totalObjects={objects.length}
        totalConjunctions={events.length}
      />

      {/* Error notification banner if any */}
      {error && (
        <div className="bg-red-950/80 border-b border-red-500/40 px-4 py-2 text-xs font-mono text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>Connection Notice: {error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2 py-0.5 rounded bg-red-900 hover:bg-red-800 text-white text-[10px] uppercase font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Conjunction Alert Triage Table */}
        <div className="w-80 md:w-96 flex-shrink-0 h-full border-r border-white/10 z-10">
          <AlertTable
            events={events}
            selectedEventId={selectedEvent?.event_id || null}
            onSelectEvent={handleSelectEvent}
            isLoading={isLoading}
          />
        </div>

        {/* Center: Tactical 3D Orthographic Vector Globe */}
        <div className="flex-1 h-full relative">
          <GlobeView
            selectedEvent={selectedEvent}
            primaryTrajectory={primaryTrajectory}
            secondaryTrajectory={secondaryTrajectory}
            events={events}
            onSelectEvent={handleSelectEvent}
            showOutlines={showOutlines}
            showOrbits={showOrbits}
          />

          {/* Floating Controls Bar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <button
              onClick={() => setShowOutlines((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded text-xs font-mono border backdrop-blur-sm transition-colors flex items-center gap-1.5 ${
                showOutlines
                  ? 'bg-white/10 border-white/20 text-[#f0f4f8]'
                  : 'bg-black/60 border-white/5 text-[#8a99ad]'
              }`}
              title="Toggle continent vector outlines"
            >
              <Eye className="w-3.5 h-3.5" />
              Coastlines
            </button>

            <button
              onClick={() => setShowOrbits((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded text-xs font-mono border backdrop-blur-sm transition-colors flex items-center gap-1.5 ${
                showOrbits
                  ? 'bg-white/10 border-white/20 text-[#00f0ff]'
                  : 'bg-black/60 border-white/5 text-[#8a99ad]'
              }`}
              title="Toggle calculated orbit trajectories"
            >
              <Orbit className="w-3.5 h-3.5" />
              Orbits
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded text-xs font-mono border border-white/10 bg-black/60 hover:bg-white/10 text-[#f0f4f8] backdrop-blur-sm transition-colors flex items-center gap-1.5"
              title="Re-query API & refresh screening"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Right Column: Object & Telemetry Inspector Drawer */}
        {selectedEvent && (
          <div className="flex-shrink-0 h-full z-10">
            <ObjectDrawer
              event={selectedEvent}
              primaryObject={primaryObj}
              secondaryObject={secondaryObj}
              onClose={() => setSelectedEvent(null)}
            />
          </div>
        )}
      </div>

      {/* Persistent Aerospace Disclaimer Banner */}
      <DisclaimerBanner />
    </div>
  );
}

export default App;

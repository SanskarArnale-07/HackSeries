import { useState, useEffect } from 'react';
import { Header, type DashboardTab } from './components/dashboard/Header';
import { MetricsBar } from './components/dashboard/MetricsBar';
import { AlertTable } from './components/alerts/AlertTable';
import { CatalogView } from './components/objects/CatalogView';
import { ObjectDrawer } from './components/objects/ObjectDrawer';
import { GlobeView } from './components/globe/GlobeView';
import { DisclaimerBanner } from './components/dashboard/DisclaimerBanner';
import {
  fetchHealth,
  fetchConjunctions,
  fetchObjects,
  fetchSpaceWeather,
  fetchEphemeris
} from './api/client';
import type {
  HealthResponse,
  ConjunctionEvent,
  ConjunctionsResponse,
  OrbitalObject,
  SpaceWeatherState,
  EphemerisTrajectory
} from './api/types';
import { Eye, Orbit, AlertCircle, Sliders, ArrowRightLeft, Clock, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [conjunctionsData, setConjunctionsData] = useState<ConjunctionsResponse | null>(null);
  const [events, setEvents] = useState<ConjunctionEvent[]>([]);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);
  const [weather, setWeather] = useState<SpaceWeatherState | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<ConjunctionEvent | null>(null);
  const [selectedCatalogObject, setSelectedCatalogObject] = useState<OrbitalObject | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const [primaryTrajectory, setPrimaryTrajectory] = useState<EphemerisTrajectory | null>(null);
  const [secondaryTrajectory, setSecondaryTrajectory] = useState<EphemerisTrajectory | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutlines, setShowOutlines] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);

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

      if (conjData) {
        setConjunctionsData(conjData);
        const loadedEvents = conjData.events || [];
        setEvents(loadedEvents);

        // Auto-select the closest encounter event if available and none selected
        if (loadedEvents.length > 0 && !selectedEvent && !selectedCatalogObject) {
          handleSelectEvent(loadedEvents[0]);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with TRAJACTRA backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When an event is selected, fetch ephemeris trajectories for both objects
  const handleSelectEvent = async (event: ConjunctionEvent) => {
    setSelectedEvent(event);
    setSelectedCatalogObject(null);
    try {
      const [primaryTraj, secondaryTraj] = await Promise.all([
        fetchEphemeris(event.primary_object.norad_id, 60, 2).catch(() => null),
        fetchEphemeris(event.secondary_object.norad_id, 60, 2).catch(() => null)
      ]);
      setPrimaryTrajectory(primaryTraj);
      setSecondaryTrajectory(secondaryTraj);
    } catch (err) {
      console.error('Failed to load ephemeris for selected encounter', err);
    }
  };

  // When a catalog satellite is selected, fetch its orbital trajectory
  const handleSelectCatalogObject = async (obj: OrbitalObject) => {
    setSelectedCatalogObject(obj);
    setSelectedEvent(null);
    try {
      const traj = await fetchEphemeris(obj.norad_id, 60, 2).catch(() => null);
      setPrimaryTrajectory(traj);
      setSecondaryTrajectory(null);
    } catch (err) {
      console.error('Failed to load ephemeris for catalog satellite', err);
    }
  };

  const handleCloseInspector = () => {
    setIsInspectorOpen(false);
  };

  const handleDeselect = () => {
    setSelectedEvent(null);
    setSelectedCatalogObject(null);
    setIsInspectorOpen(false);
    setPrimaryTrajectory(null);
    setSecondaryTrajectory(null);
  };

  // Map background constellation satellites for 3D globe visualization
  const allSatellites = objects.slice(0, 50).map((obj) => {
    const raan = obj.orbital_parameters.raan_deg ?? 0;
    const ma = obj.orbital_parameters.mean_anomaly_deg ?? 0;
    const inc = obj.orbital_parameters.inclination_deg;
    const lat = Math.sin((ma * Math.PI) / 180) * inc;
    const lon = ((raan + ma) % 360) - 180;
    return {
      norad_id: obj.norad_id,
      name: obj.name,
      lat,
      lon,
      alt: obj.orbital_parameters.perigee_altitude_km
    };
  });

  const primaryObj = objects.find(
    (o) => o.norad_id === selectedEvent?.primary_object.norad_id
  );
  const secondaryObj = objects.find(
    (o) => o.norad_id === selectedEvent?.secondary_object.norad_id
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#06080c] text-[#f8fafc] overflow-hidden select-none font-sans">
      {/* 1. Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        health={health}
        weather={weather}
        onRefresh={loadData}
        isRefreshing={isLoading}
        totalEvents={events.length}
        totalObjects={objects.length}
      />

      {/* 2. Overview Metrics Bar */}
      <MetricsBar
        totalObjects={objects.length}
        conjunctionsData={conjunctionsData}
      />

      {/* Error notification banner if any */}
      {error && (
        <div className="bg-red-950/90 border-b border-red-500/40 px-4 py-2 text-xs font-mono text-red-300 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>Connection Notice: {error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-xs uppercase font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Main Workspace: Strict Two-Panel Layout (Left 32% | Right Globe 68%) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Close Approach Triage OR Catalog View */}
        <div className="w-80 lg:w-[360px] flex-shrink-0 h-full border-r border-[#1c2436] z-10 flex flex-col bg-[#080b10]">
          {activeTab === 'catalog' ? (
            <CatalogView
              objects={objects}
              selectedNoradId={selectedCatalogObject?.norad_id || null}
              onSelectObject={handleSelectCatalogObject}
              isLoading={isLoading}
            />
          ) : (
            <AlertTable
              events={events}
              selectedEventId={selectedEvent?.event_id || null}
              onSelectEvent={handleSelectEvent}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Right Area: Interactive 3D Globe Canvas (Dominates ~68% of width at all times) */}
        <div className="flex-1 h-full relative bg-[#000000]">
          <GlobeView
            selectedEvent={selectedEvent}
            primaryTrajectory={primaryTrajectory}
            secondaryTrajectory={secondaryTrajectory}
            allSatellites={allSatellites}
            showOutlines={showOutlines}
            showOrbits={showOrbits}
          />

          {/* Floating Canvas Controls Toolbar (Top-Right) */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <button
              onClick={() => setShowOutlines((prev) => !prev)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm ${
                showOutlines
                  ? 'bg-[#141b27]/90 border-[#00e5ff]/30 text-[#f8fafc]'
                  : 'bg-[#080b10]/85 border-[#1c2436] text-[#94a3b8]'
              }`}
              title="Toggle Natural Earth 110m continent vector coastlines"
            >
              <Eye className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Coastlines</span>
            </button>

            <button
              onClick={() => setShowOrbits((prev) => !prev)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm ${
                showOrbits
                  ? 'bg-[#141b27]/90 border-[#00e5ff]/30 text-[#00e5ff]'
                  : 'bg-[#080b10]/85 border-[#1c2436] text-[#94a3b8]'
              }`}
              title="Toggle SGP4 orbit trajectory splines"
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Orbits</span>
            </button>

            {/* Inspector Toggle Button */}
            {(selectedEvent || selectedCatalogObject) && (
              <button
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm ${
                  isInspectorOpen
                    ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff]'
                    : 'bg-[#141b27]/90 border-[#1c2436] text-[#f8fafc] hover:border-[#00e5ff]/40'
                }`}
                title="Toggle detailed telemetry inspector"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Telemetry {isInspectorOpen ? 'Open' : 'Inspector'}</span>
              </button>
            )}
          </div>

          {/* Floating Compact Bottom Encounter Strip (Over Globe Bottom) */}
          {selectedEvent && (
            <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto max-w-2xl bg-[#080b10]/90 backdrop-blur-md border border-[#1c2436] rounded-md p-3 flex items-center justify-between gap-4 z-20 shadow-2xl">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                      selectedEvent.screening_tier === 'CRITICAL'
                        ? 'bg-red-950 text-red-400 border border-red-500/50'
                        : selectedEvent.screening_tier === 'WARNING'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/50'
                        : selectedEvent.screening_tier === 'WATCH'
                        ? 'bg-yellow-950 text-yellow-400 border border-yellow-500/50'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                    }`}
                  >
                    {selectedEvent.screening_tier}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#f8fafc]">
                    <span className="text-[#00e5ff]">{selectedEvent.primary_object.name}</span>
                    <ArrowRightLeft className="w-3 h-3 text-[#64748b]" />
                    <span className="text-[#f1f5f9]">{selectedEvent.secondary_object.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[#64748b] mr-1">Miss:</span>
                    <span className="font-bold text-[#f8fafc]">
                      {selectedEvent.miss_distance_km.toFixed(3)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748b] mr-1">v<sub>rel</sub>:</span>
                    <span className="text-[#38bdf8]">
                      {selectedEvent.relative_speed_km_s.toFixed(2)} km/s
                    </span>
                  </div>
                  <div className="hidden lg:flex items-center gap-1 text-[#94a3b8]">
                    <Clock className="w-3 h-3 text-[#64748b]" />
                    <span>{selectedEvent.tca_utc.replace('T', ' ').substring(0, 16)} UTC</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsInspectorOpen((prev) => !prev)}
                  className="px-2.5 py-1 rounded bg-[#141b27] hover:bg-[#1e2638] border border-[#00e5ff]/30 text-xs font-medium text-[#00e5ff] transition-colors"
                >
                  {isInspectorOpen ? 'Hide Details' : 'Full Telemetry →'}
                </button>
                <button
                  onClick={handleDeselect}
                  className="p-1 rounded hover:bg-[#141b27] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
                  title="Deselect encounter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Floating Collapsible Telemetry Inspector Drawer (Overlay on right side of globe) */}
          {isInspectorOpen && (selectedEvent || selectedCatalogObject) && (
            <div className="absolute top-0 right-0 bottom-0 z-30 shadow-2xl">
              <ObjectDrawer
                event={selectedEvent}
                primaryObject={primaryObj}
                secondaryObject={secondaryObj}
                selectedCatalogObject={selectedCatalogObject}
                onClose={handleCloseInspector}
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Scientific Disclaimer Footer */}
      <DisclaimerBanner />
    </div>
  );
}

export default App;

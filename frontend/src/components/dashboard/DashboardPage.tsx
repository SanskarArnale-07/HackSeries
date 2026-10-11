import React, { useState, useEffect } from 'react';
import { Header, type DashboardTab } from './Header';
import { MetricsBar } from './MetricsBar';
import { AlertTable } from '../alerts/AlertTable';
import { CatalogView } from '../objects/CatalogView';
import { ObjectDrawer } from '../objects/ObjectDrawer';
import { GlobeView } from '../globe/GlobeView';
import { DisclaimerBanner } from './DisclaimerBanner';
import {
  fetchHealth,
  fetchConjunctions,
  fetchObjects,
  fetchEphemeris
} from '../../api/client';
import type {
  HealthResponse,
  ConjunctionEvent,
  ConjunctionsResponse,
  OrbitalObject,
  EphemerisTrajectory
} from '../../api/types';
import { Eye, Orbit, AlertCircle, ArrowRightLeft, Clock, X } from 'lucide-react';

interface DashboardPageProps {
  onNavigateHome?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [conjunctionsData, setConjunctionsData] = useState<ConjunctionsResponse | null>(null);
  const [events, setEvents] = useState<ConjunctionEvent[]>([]);
  const [objects, setObjects] = useState<OrbitalObject[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<ConjunctionEvent | null>(null);
  const [selectedCatalogObject, setSelectedCatalogObject] = useState<OrbitalObject | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const [primaryTrajectory, setPrimaryTrajectory] = useState<EphemerisTrajectory | null>(null);
  const [secondaryTrajectory, setSecondaryTrajectory] = useState<EphemerisTrajectory | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutlines, setShowOutlines] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);

  // Load telemetry, catalog, and screened conjunctions from real backend APIs
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [healthData, conjData, objData] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchConjunctions().catch(() => ({ screening_metadata: {} as any, events: [] })),
        fetchObjects(100).catch(() => ({ objects: [], summary: {}, total_matched: 0 }))
      ]);

      if (healthData) setHealth(healthData);
      if (objData && objData.objects) setObjects(objData.objects);

      if (conjData) {
        setConjunctionsData(conjData);
        const loadedEvents = conjData.events || [];
        setEvents(loadedEvents);

        // Auto-select the closest encounter event on initial load if available
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
    setIsInspectorOpen(true);
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
      {/* 1. Header: Branding, Overview/Catalog navigation, Status dot, Refresh */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        health={health}
        onRefresh={loadData}
        isRefreshing={isLoading}
        onNavigateHome={onNavigateHome}
      />

      {/* 2. Compact One-Row Summary (Tracked Objects • Screened Close Approaches • Next TCA) */}
      <MetricsBar
        totalObjects={objects.length}
        conjunctionsData={conjunctionsData}
      />

      {/* Connection Notice banner if backend error */}
      {error && (
        <div className="bg-red-950/90 border-b border-red-500/40 px-6 py-2 text-xs font-mono text-red-300 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>Connection Notice: {error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2 py-0.5 rounded bg-red-900 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Main Workspace: Two-Column Layout (Left ~30% | Right Globe ~70%) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Close Approaches List OR Catalog Explorer */}
        <div className="w-72 lg:w-80 flex-shrink-0 h-full border-r border-[#141a26] z-10 flex flex-col bg-[#06080c]">
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

        {/* Right Area: Large Interactive 3D Globe Canvas (~70% of main workspace) */}
        <div className="flex-1 h-full relative bg-[#000000]">
          <GlobeView
            selectedEvent={selectedEvent}
            primaryTrajectory={primaryTrajectory}
            secondaryTrajectory={secondaryTrajectory}
            allSatellites={allSatellites}
            showOutlines={showOutlines}
            showOrbits={showOrbits}
          />

          {/* Minimal Floating Canvas Controls Toolbar (Top-Right) */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setShowOutlines((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs transition-colors border backdrop-blur-md cursor-pointer ${
                showOutlines
                  ? 'bg-[#101622]/90 border-[#00e5ff]/30 text-[#f8fafc]'
                  : 'bg-[#06080c]/80 border-[#141a26] text-[#64748b]'
              }`}
              title="Toggle coastlines"
            >
              <Eye className="w-3.5 h-3.5 inline mr-1 text-[#00e5ff]" />
              <span>Coastlines</span>
            </button>

            <button
              onClick={() => setShowOrbits((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs transition-colors border backdrop-blur-md cursor-pointer ${
                showOrbits
                  ? 'bg-[#101622]/90 border-[#00e5ff]/30 text-[#00e5ff]'
                  : 'bg-[#06080c]/80 border-[#141a26] text-[#64748b]'
              }`}
              title="Toggle orbital splines"
            >
              <Orbit className="w-3.5 h-3.5 inline mr-1" />
              <span>Orbits</span>
            </button>
          </div>

          {/* Compact Bottom Encounter Strip (Only when encounter is selected) */}
          {selectedEvent && (
            <div className="absolute bottom-4 left-6 right-6 md:right-auto md:min-w-[480px] bg-[#080b10]/95 backdrop-blur-md border border-[#141a26] rounded-md px-4 py-2.5 flex items-center justify-between gap-4 z-20 shadow-xl">
              <div className="flex items-center gap-4 text-xs">
                {/* Object Pair */}
                <div className="flex items-center gap-1.5 font-medium text-[#f8fafc]">
                  <span className="text-[#00e5ff]">{selectedEvent.primary_object.name}</span>
                  <ArrowRightLeft className="w-3 h-3 text-[#64748b]" />
                  <span>{selectedEvent.secondary_object.name}</span>
                </div>

                <span className="text-[#2a3447]">&bull;</span>

                {/* Miss Distance */}
                <div className="font-mono">
                  <span className="text-[#64748b] mr-1">Miss:</span>
                  <span className="font-semibold text-[#f8fafc]">
                    {selectedEvent.miss_distance_km.toFixed(2)} km
                  </span>
                </div>

                <span className="text-[#2a3447] hidden sm:inline">&bull;</span>

                {/* TCA */}
                <div className="font-mono text-[#94a3b8] hidden sm:flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#64748b]" />
                  <span>{selectedEvent.tca_utc.replace('T', ' ').substring(0, 16)} UTC</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsInspectorOpen((prev) => !prev)}
                  className="px-2.5 py-1 rounded bg-[#0e1420] hover:bg-[#141c2c] border border-[#00e5ff]/30 text-xs text-[#00e5ff] transition-colors cursor-pointer"
                >
                  {isInspectorOpen ? 'Close' : 'Details &rarr;'}
                </button>
                <button
                  onClick={handleDeselect}
                  className="p-1 rounded hover:bg-[#141b27] text-[#64748b] hover:text-[#f8fafc] transition-colors cursor-pointer"
                  title="Deselect encounter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Telemetry Inspector Drawer (Overlay on the right side of globe) */}
          {isInspectorOpen && (selectedEvent || selectedCatalogObject) && (
            <div className="absolute top-0 right-0 bottom-0 z-30">
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
};

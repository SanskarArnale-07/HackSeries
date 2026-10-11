import React, { useState, useEffect } from 'react';
import { Header, type DashboardTab } from './Header';
import { MetricsBar } from './MetricsBar';
import { AlertTable } from '../alerts/AlertTable';
import { CatalogView } from '../objects/CatalogView';
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
import { SpaceWeatherView } from '../weather/SpaceWeatherView';
import { ModelMonitorView } from './ModelMonitorView';
import { ReportsView } from './ReportsView';
import { Eye, Orbit, AlertCircle } from 'lucide-react';

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
  const [isWeatherOpen, setIsWeatherOpen] = useState<boolean>(false);
  const [isModelOpen, setIsModelOpen] = useState<boolean>(false);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);

  const [primaryTrajectory, setPrimaryTrajectory] = useState<EphemerisTrajectory | null>(null);
  const [secondaryTrajectory, setSecondaryTrajectory] = useState<EphemerisTrajectory | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutlines, setShowOutlines] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);

  // When an encounter event is selected, fetch ephemeris trajectories for both objects
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

  // Load telemetry, catalog, and screened conjunctions from backend
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="w-full h-full flex flex-col bg-[#070b14] text-[#f8fafc] overflow-hidden select-none font-sans">
      {/* 1. Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenWeather={() => setIsWeatherOpen(true)}
        onOpenModel={() => setIsModelOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        health={health}
        onRefresh={loadData}
        isRefreshing={isLoading}
        onNavigateHome={onNavigateHome}
      />

      {/* 2. Compact Horizontal Telemetry Summary Strip */}
      <MetricsBar
        totalObjects={objects.length}
        conjunctionsData={conjunctionsData}
      />

      {/* Connection Notice if backend communication fails */}
      {error && (
        <div className="bg-red-950/90 border-b border-red-500/40 px-5 py-2 text-xs font-mono text-red-300 flex items-center justify-between z-30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>Connection Notice: {error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-0.5 rounded bg-red-900 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 3. Main Aerospace Operations Console (3-Pane Balanced Workspace) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Screened Close Approaches or Catalog Explorer */}
        <div className="w-80 lg:w-88 flex-shrink-0 h-full flex flex-col z-10 border-r border-[#141f33]">
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
              error={error}
            />
          )}
        </div>

        {/* Center Stage: Interactive 3D Earth Globe Visualizer */}
        <div className="flex-1 h-full relative bg-[#05080e] overflow-hidden">
          <GlobeView
            selectedEvent={selectedEvent}
            primaryTrajectory={primaryTrajectory}
            secondaryTrajectory={secondaryTrajectory}
            events={events}
            onSelectEvent={handleSelectEvent}
            showOutlines={showOutlines}
            showOrbits={showOrbits}
          />

          {/* Minimal Floating Canvas Controls Toolbar (Top-Right of Globe) */}
          <div className="absolute top-3.5 right-4 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setShowOutlines((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs transition-colors border backdrop-blur-md cursor-pointer ${showOutlines
                  ? 'bg-[#0f1728]/90 border-[#38bdf8]/40 text-[#f1f5f9]'
                  : 'bg-[#090e18]/80 border-[#141f33] text-[#64748b] hover:text-[#94a3b8]'
                }`}
              title="Toggle continental landmass outlines"
            >
              <Eye className="w-3.5 h-3.5 inline mr-1 text-[#38bdf8]" />
              <span>Coastlines</span>
            </button>

            <button
              onClick={() => setShowOrbits((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs transition-colors border backdrop-blur-md cursor-pointer ${showOrbits
                  ? 'bg-[#0f1728]/90 border-[#38bdf8]/40 text-[#38bdf8]'
                  : 'bg-[#090e18]/80 border-[#141f33] text-[#64748b] hover:text-[#94a3b8]'
                }`}
              title="Toggle orbital splines"
            >
              <Orbit className="w-3.5 h-3.5 inline mr-1" />
              <span>Orbits</span>
            </button>

          </div>
        </div>
      </div>

      {/* 4. Aerospace Scientific Disclaimer Footer */}
      <DisclaimerBanner />

      {/* 5. Space Weather Diagnostics Modal */}
      {isWeatherOpen && <SpaceWeatherView onClose={() => setIsWeatherOpen(false)} />}

      {/* 6. SGP4 Astrodynamics Architecture Modal */}
      {isModelOpen && <ModelMonitorView onClose={() => setIsModelOpen(false)} />}

      {/* 7. Conjunction Screening Audit Reports Modal */}
      {isReportsOpen && (
        <ReportsView
          conjunctionsData={conjunctionsData}
          totalObjects={objects.length}
          onClose={() => setIsReportsOpen(false)}
        />
      )}
    </div>
  );
};

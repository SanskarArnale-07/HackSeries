import React from 'react';
import { Satellite, RefreshCw, Layers, Radio, Globe, Sun } from 'lucide-react';
import type { HealthResponse, SpaceWeatherState } from '../../api/types';

export type DashboardTab = 'overview' | 'conjunctions' | 'catalog';

interface HeaderProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  health: HealthResponse | null;
  weather: SpaceWeatherState | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalEvents: number;
  totalObjects: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  health,
  weather,
  onRefresh,
  isRefreshing,
  totalEvents,
  totalObjects
}) => {
  const isLive = health?.data_source?.includes('LIVE') ?? false;
  const rawSource = health?.data_source || 'INITIALIZING';
  const sourceLabel = isLive ? 'Live orbital data' : 'Cached snapshot';

  const kp = weather?.planetary_k_index?.kp_index ?? weather?.planetary_k_index?.estimated_kp ?? 2.0;
  const stormStatus = weather?.geomagnetic_storm_status ?? 'QUIET';

  return (
    <header className="h-14 border-b border-[#1c2436] bg-[#06080c] px-4 flex items-center justify-between select-none z-20">
      {/* Brand & Descriptor */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff]">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-base text-[#f8fafc]">
                TRAJACTRA
              </span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#101522] border border-[#222c42] text-[#00e5ff]">
                SSA
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] font-normal -mt-0.5">
              Orbital Intelligence
            </p>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-[#1c2436] hidden md:block" />

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#121826] text-[#00e5ff] border border-[#00e5ff]/30 shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#0c1017]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => onTabChange('conjunctions')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'conjunctions'
                ? 'bg-[#121826] text-[#00e5ff] border border-[#00e5ff]/30 shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#0c1017]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Conjunctions</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-mono bg-[#1c2436] text-[#94a3b8]">
              {totalEvents}
            </span>
          </button>

          <button
            onClick={() => onTabChange('catalog')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-[#121826] text-[#00e5ff] border border-[#00e5ff]/30 shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#0c1017]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Orbital Catalog</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-mono bg-[#1c2436] text-[#94a3b8]">
              {totalObjects}
            </span>
          </button>
        </nav>
      </div>

      {/* Right Controls: Provenance, Space Weather, Refresh */}
      <div className="flex items-center gap-2.5">
        {/* Space Weather Status */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1017] border border-[#1c2436] text-xs text-[#94a3b8]"
          title={`Space Weather (NOAA SWPC): Kp ${kp.toFixed(1)} | Storm Status: ${stormStatus}`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Kp {kp.toFixed(1)}</span>
          <span className="text-[#64748b]">&bull;</span>
          <span className={stormStatus === 'QUIET' ? 'text-emerald-400' : 'text-amber-400'}>
            {stormStatus}
          </span>
        </div>

        {/* Data Source Provenance indicator */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0c1017] border border-[#1c2436] text-xs"
          title={`Data Provenance: ${rawSource}\nTimeout: 2.5s | Offline Fallback: data/fixtures/celestrak_snapshot.txt`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isLive ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[#f8fafc] font-medium">
            {sourceLabel}
          </span>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-md text-xs font-medium border border-[#1c2436] bg-[#0c1017] hover:bg-[#121826] hover:border-[#00e5ff]/40 text-[#f8fafc] transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          title="Re-run screening pipeline & refresh telemetry"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#00e5ff] ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};

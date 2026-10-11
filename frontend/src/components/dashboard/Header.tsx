import React from 'react';
import { Satellite, RefreshCw, Compass, Database } from 'lucide-react';
import type { HealthResponse } from '../../api/types';

export type DashboardTab = 'overview' | 'catalog';

interface HeaderProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  health: HealthResponse | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  health,
  onRefresh,
  isRefreshing,
  onNavigateHome
}) => {
  const isLive = health?.data_source?.includes('LIVE') ?? false;
  const isOffline = health?.is_offline_mode ?? false;
  const rawSource = health?.data_source || 'INITIALIZING';
  const sourceLabel = isLive && !isOffline ? 'Live CelesTrak' : 'Local Snapshot';

  return (
    <header className="h-13 border-b border-[#172236] bg-[#090e18] px-5 flex items-center justify-between select-none z-20 flex-shrink-0">
      {/* Left: Brand Identity & Navigation */}
      <div className="flex items-center gap-7">
        <div
          onClick={onNavigateHome}
          className={`flex items-center gap-2.5 ${
            onNavigateHome ? 'cursor-pointer group' : ''
          }`}
          title={onNavigateHome ? 'Return to Cinematic Landing' : undefined}
        >
          <div className="w-7 h-7 rounded bg-[#10192a] border border-[#1b283f] flex items-center justify-center transition-colors group-hover:border-[#00e5ff]/40">
            <Satellite className="w-3.5 h-3.5 text-[#00e5ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-sm text-[#f8fafc] group-hover:text-white transition-colors">
                TRAJACTRA
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/25 font-semibold">
                SSA
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-[#1a253a] hidden sm:block" />

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'text-[#00e5ff] bg-[#121c2e] border border-[#00e5ff]/30 shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#0e1626] border border-transparent'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => onTabChange('catalog')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-[#00e5ff] bg-[#121c2e] border border-[#00e5ff]/30 shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#0e1626] border border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </button>
        </nav>
      </div>

      {/* Right: Data Feed Status & Pipeline Action */}
      <div className="flex items-center gap-3">
        {/* Aerospace Data Status Pill */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d1422] border border-[#1a263c] text-xs cursor-help"
          title={`Active Data Feed: ${rawSource}\nTimeout: 2.5s | Fallback: data/fixtures/celestrak_snapshot.txt`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive && !isOffline
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
            }`}
          />
          <span className="text-[11px] font-mono text-[#cbd5e1] font-medium tracking-tight">
            {sourceLabel}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded bg-[#0d1422] hover:bg-[#141f33] border border-[#1a263c] hover:border-[#00e5ff]/30 text-[#94a3b8] hover:text-[#00e5ff] transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh screening pipeline"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00e5ff]' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};

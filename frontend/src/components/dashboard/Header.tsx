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
    <header className="h-12 border-b border-[#141f33] bg-[#070b16] px-6 flex items-center justify-between select-none z-20 flex-shrink-0">
      {/* Left: Brand Identity & Navigation */}
      <div className="flex items-center gap-7">
        <div
          onClick={onNavigateHome}
          className={`flex items-center gap-2.5 ${
            onNavigateHome ? 'cursor-pointer group' : ''
          }`}
          title={onNavigateHome ? 'Return to Cinematic Landing' : undefined}
        >
          <div className="w-6.5 h-6.5 rounded bg-[#0f1728] border border-[#1b2842] flex items-center justify-center transition-colors group-hover:border-[#38bdf8]/50">
            <Satellite className="w-3.5 h-3.5 text-[#38bdf8]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-sm text-[#f1f5f9] group-hover:text-white transition-colors">
              TRAJACTRA
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#131d2e] text-[#94a3b8] border border-[#1b283f] font-semibold">
              SSA
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-[#162238] hidden sm:block" />

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'text-[#f1f5f9] bg-[#10192a] border border-[#1e2d48]'
                : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#0c1220] border border-transparent'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => onTabChange('catalog')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-[#f1f5f9] bg-[#10192a] border border-[#1e2d48]'
                : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#0c1220] border border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Catalog</span>
          </button>
        </nav>
      </div>

      {/* Right: Data Feed Status & Pipeline Action */}
      <div className="flex items-center gap-3">
        {/* Aerospace Data Status Pill */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0b101c] border border-[#152238] text-xs cursor-help"
          title={`Active Data Feed: ${rawSource}\nTimeout: 2.5s | Fallback: data/fixtures/celestrak_snapshot.txt`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive && !isOffline
                ? 'bg-emerald-400'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] font-mono text-[#94a3b8] font-medium tracking-tight">
            {sourceLabel}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded bg-[#0b101c] hover:bg-[#121c2e] border border-[#152238] hover:border-[#38bdf8]/40 text-[#94a3b8] hover:text-[#f1f5f9] transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh screening pipeline"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#38bdf8]' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};

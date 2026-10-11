import React from 'react';
import { Satellite, RefreshCw } from 'lucide-react';
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
  const rawSource = health?.data_source || 'INITIALIZING';
  const sourceLabel = isLive ? 'Live data' : 'Cached snapshot';

  return (
    <header className="h-14 border-b border-[#141a26] bg-[#06080c] px-6 flex items-center justify-between select-none z-20">
      {/* Brand & Minimal Navigation */}
      <div className="flex items-center gap-8">
        <div
          onClick={onNavigateHome}
          className={`flex items-center gap-2.5 ${
            onNavigateHome ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
          title={onNavigateHome ? 'Return to Cinematic Landing Page' : undefined}
        >
          <Satellite className="w-4 h-4 text-[#00e5ff]" />
          <span className="font-mono font-bold tracking-wider text-sm text-[#f8fafc]">
            TRAJACTRA
          </span>
          <span className="text-xs text-[#64748b] hidden sm:inline">&bull;</span>
          <span className="text-xs text-[#94a3b8] hidden sm:inline">
            Orbital Intelligence
          </span>
        </div>

        {/* Clean, calm navigation */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-[#00e5ff] bg-[#0e131d]'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('catalog')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'catalog'
                ? 'text-[#00e5ff] bg-[#0e131d]'
                : 'text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Catalog
          </button>
        </nav>
      </div>

      {/* Right Controls: Truthful Status & Minimal Refresh Icon */}
      <div className="flex items-center gap-4">
        {/* Compact data status */}
        <div
          className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-help"
          title={`Data source: ${rawSource}\nTimeout: 2.5s | Fallback: data/fixtures/celestrak_snapshot.txt`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium text-[#cbd5e1]">{sourceLabel}</span>
        </div>

        {/* Minimal refresh icon button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded hover:bg-[#121824] text-[#94a3b8] hover:text-[#00e5ff] transition-colors disabled:opacity-50"
          title="Refresh screening pipeline"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00e5ff]' : ''}`}
          />
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { ShieldAlert, Orbit, Activity, Compass } from 'lucide-react';
import type { ConjunctionsResponse } from '../../api/types';

interface MetricsBarProps {
  totalObjects: number;
  conjunctionsData: ConjunctionsResponse | null;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalObjects,
  conjunctionsData
}) => {
  const events = conjunctionsData?.events || [];
  const meta = conjunctionsData?.screening_metadata;
  const pairsScreened = meta?.total_pairs_screened ?? (totalObjects > 1 ? (totalObjects * (totalObjects - 1)) / 2 : 0);

  const criticalCount = events.filter((e) => e.screening_tier === 'CRITICAL').length;
  const warningCount = events.filter((e) => e.screening_tier === 'WARNING').length;
  const watchCount = events.filter((e) => e.screening_tier === 'WATCH').length;
  const monitorCount = events.filter((e) => e.screening_tier === 'MONITOR').length;

  const minMissKm = events.length > 0
    ? Math.min(...events.map((e) => e.miss_distance_km))
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-2.5 bg-[#080b10] border-b border-[#1c2436] select-none">
      {/* 1. Tracked Objects */}
      <div className="flex flex-col p-3 rounded-md bg-[#0c1017] border border-[#1c2436]">
        <div className="flex items-center justify-between text-[#94a3b8] text-xs font-medium mb-1">
          <span>TRACKED CATALOG</span>
          <Orbit className="w-4 h-4 text-[#00e5ff]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-[#f8fafc]">
            {totalObjects}
          </span>
          <span className="text-xs text-[#94a3b8]">LEO Satellites</span>
        </div>
        <span className="text-xs text-[#64748b] truncate mt-0.5">
          Analytical SGP4 / SDP4 ephemeris
        </span>
      </div>

      {/* 2. Candidate Pairs Screened */}
      <div className="flex flex-col p-3 rounded-md bg-[#0c1017] border border-[#1c2436]">
        <div className="flex items-center justify-between text-[#94a3b8] text-xs font-medium mb-1">
          <span>CANDIDATE PAIRS</span>
          <Activity className="w-4 h-4 text-[#38bdf8]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-[#f8fafc]">
            {pairsScreened.toLocaleString()}
          </span>
          <span className="text-xs text-[#94a3b8]">Pairs</span>
        </div>
        <span className="text-xs text-[#64748b] truncate mt-0.5">
          {meta?.screening_window_hours ?? 24}h lookahead &bull; 60s coarse step
        </span>
      </div>

      {/* 3. Screened Close Encounters */}
      <div className="flex flex-col p-3 rounded-md bg-[#0c1017] border border-[#1c2436]">
        <div className="flex items-center justify-between text-[#94a3b8] text-xs font-medium mb-1">
          <span>SCREENED APPROACHES</span>
          <ShieldAlert className={`w-4 h-4 ${events.length > 0 ? 'text-[#f59e0b]' : 'text-emerald-400'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-[#f8fafc]">
            {events.length}
          </span>
          <span className="text-xs text-[#94a3b8]">
            &le; {meta?.threshold_km ?? 50.0} km
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#94a3b8] mt-0.5">
          {criticalCount > 0 && (
            <span className="text-red-400 font-semibold">{criticalCount} Critical</span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-400 font-semibold">{warningCount} Warning</span>
          )}
          <span className="text-yellow-400">{watchCount} Watch</span>
          <span>&bull;</span>
          <span className="text-emerald-400">{monitorCount} Monitor</span>
        </div>
      </div>

      {/* 4. Minimum Miss Distance */}
      <div className="flex flex-col p-3 rounded-md bg-[#0c1017] border border-[#1c2436]">
        <div className="flex items-center justify-between text-[#94a3b8] text-xs font-medium mb-1">
          <span>MINIMUM SEPARATION</span>
          <Compass className="w-4 h-4 text-[#00e5ff]" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono text-[#f8fafc]">
            {minMissKm !== null ? minMissKm.toFixed(3) : 'None'}
          </span>
          {minMissKm !== null && <span className="text-xs text-[#94a3b8]">km</span>}
        </div>
        <span className="text-xs text-[#64748b] truncate mt-0.5">
          Closest geometric miss distance
        </span>
      </div>
    </div>
  );
};

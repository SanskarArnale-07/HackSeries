import React, { useMemo } from 'react';
import type { ConjunctionsResponse } from '../../api/types';
import { ShieldAlert, Clock, Satellite, Activity } from 'lucide-react';

interface MetricsBarProps {
  totalObjects: number;
  conjunctionsData: ConjunctionsResponse | null;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalObjects,
  conjunctionsData
}) => {
  const events = conjunctionsData?.events || [];

  // Earliest TCA from real event data
  const nextTcaUtc = useMemo(() => {
    if (events.length === 0) return null;
    const sorted = [...events].sort(
      (a, b) => new Date(a.tca_utc).getTime() - new Date(b.tca_utc).getTime()
    );
    try {
      const d = new Date(sorted[0].tca_utc);
      const iso = d.toISOString();
      return `${iso.substring(0, 10)} ${iso.substring(11, 16)} UTC`;
    } catch {
      return sorted[0].tca_utc;
    }
  }, [events]);

  // Highest-priority encounter from real event data
  const highestPriorityEncounter = useMemo(() => {
    if (events.length === 0) return null;
    const tierWeight: Record<string, number> = {
      CRITICAL: 4,
      WARNING: 3,
      WATCH: 2,
      MONITOR: 1
    };
    const sorted = [...events].sort((a, b) => {
      const wDiff = (tierWeight[b.screening_tier] || 0) - (tierWeight[a.screening_tier] || 0);
      if (wDiff !== 0) return wDiff;
      return a.miss_distance_km - b.miss_distance_km;
    });
    return sorted[0];
  }, [events]);

  return (
    <div className="h-9.5 px-5 bg-[#0b101c] border-b border-[#172236] flex items-center justify-between text-xs text-[#94a3b8] select-none flex-shrink-0">
      <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar">
        {/* 1. Tracked Objects */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Satellite className="w-3.5 h-3.5 text-[#64748b]" />
          <span>Tracked Objects:</span>
          <span className="font-mono font-semibold text-[#f8fafc]">
            {totalObjects}
          </span>
        </div>

        <span className="text-[#1e2a40]">&bull;</span>

        {/* 2. Screened Close Approaches */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Activity className="w-3.5 h-3.5 text-[#64748b]" />
          <span>Screened Close Approaches:</span>
          <span className="font-mono font-semibold text-[#f8fafc]">
            {events.length}
          </span>
          <span className="text-[11px] font-mono text-[#64748b]">(&le;50 km)</span>
        </div>

        <span className="text-[#1e2a40]">&bull;</span>

        {/* 3. Highest Priority Encounter */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 text-[#64748b]" />
          <span>Highest Priority:</span>
          {highestPriorityEncounter ? (
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  highestPriorityEncounter.screening_tier === 'CRITICAL'
                    ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                    : highestPriorityEncounter.screening_tier === 'WARNING'
                    ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                    : 'bg-yellow-950/80 text-yellow-400 border border-yellow-500/40'
                }`}
              >
                {highestPriorityEncounter.screening_tier}
              </span>
              <span className="text-[#f8fafc] font-semibold">
                {highestPriorityEncounter.miss_distance_km.toFixed(2)} km
              </span>
              <span className="text-[#64748b] text-[11px] hidden md:inline truncate max-w-[140px]" title={`${highestPriorityEncounter.primary_object.name} ↔ ${highestPriorityEncounter.secondary_object.name}`}>
                ({highestPriorityEncounter.primary_object.name} &harr; {highestPriorityEncounter.secondary_object.name})
              </span>
            </div>
          ) : (
            <span className="text-[#10b981] font-mono text-[11px] font-medium">
              NOMINAL (No alerts)
            </span>
          )}
        </div>

        <span className="text-[#1e2a40] hidden lg:inline">&bull;</span>

        {/* 4. Next TCA */}
        <div className="hidden lg:flex items-center gap-2 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-[#64748b]" />
          <span>Next TCA:</span>
          <span className="font-mono font-semibold text-[#00e5ff]">
            {nextTcaUtc || 'None within 24h'}
          </span>
        </div>
      </div>
    </div>
  );
};

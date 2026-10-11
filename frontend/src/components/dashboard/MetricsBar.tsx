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
    <div className="h-13 px-6 bg-[#080d18] border-b border-[#141f33] flex items-center justify-between text-xs select-none flex-shrink-0 z-10">
      <div className="flex items-center gap-7 sm:gap-9 overflow-x-auto no-scrollbar py-1">
        {/* 1. Tracked Objects */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#0f1728] border border-[#1b2842] flex items-center justify-center flex-shrink-0">
            <Satellite className="w-3.5 h-3.5 text-[#94a3b8]" />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748b] block leading-none mb-1">
              Tracked Catalog
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-mono font-bold text-[#f1f5f9] leading-none">
                {totalObjects}
              </span>
              <span className="text-[10px] text-[#64748b] font-mono leading-none">objects</span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#152238] flex-shrink-0" />

        {/* 2. Screened Close Approaches */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#0f1728] border border-[#1b2842] flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-[#94a3b8]" />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748b] block leading-none mb-1">
              Close Approaches (&le;50 km)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-mono font-bold text-[#f1f5f9] leading-none">
                {events.length}
              </span>
              <span className="text-[10px] text-[#64748b] font-mono leading-none">screened</span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#152238] flex-shrink-0" />

        {/* 3. Highest Priority Encounter */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#0f1728] border border-[#1b2842] flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-[#94a3b8]" />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748b] block leading-none mb-1">
              Closest Approach
            </span>
            {highestPriorityEncounter ? (
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none ${
                    highestPriorityEncounter.screening_tier === 'CRITICAL'
                      ? 'bg-red-950/70 text-red-400 border border-red-500/40'
                      : highestPriorityEncounter.screening_tier === 'WARNING'
                      ? 'bg-amber-950/70 text-amber-400 border border-amber-500/40'
                      : 'bg-yellow-950/70 text-yellow-400 border border-yellow-500/40'
                  }`}
                >
                  {highestPriorityEncounter.screening_tier}
                </span>
                <span className="text-sm font-mono font-bold text-[#f1f5f9] leading-none">
                  {highestPriorityEncounter.miss_distance_km.toFixed(2)} km
                </span>
                <span className="text-[11px] text-[#64748b] hidden xl:inline leading-none truncate max-w-[160px]" title={`${highestPriorityEncounter.primary_object.name} ↔ ${highestPriorityEncounter.secondary_object.name}`}>
                  ({highestPriorityEncounter.primary_object.name} &harr; {highestPriorityEncounter.secondary_object.name})
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-[#10b981] font-semibold leading-none">
                NOMINAL (No Close Approaches)
              </span>
            )}
          </div>
        </div>

        <div className="h-6 w-px bg-[#152238] hidden md:block flex-shrink-0" />

        {/* 4. Next TCA */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#0f1728] border border-[#1b2842] flex items-center justify-center flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748b] block leading-none mb-1">
              Earliest TCA (UTC)
            </span>
            <span className="text-xs font-mono font-semibold text-[#cbd5e1] leading-none block">
              {nextTcaUtc || 'None within 24h'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

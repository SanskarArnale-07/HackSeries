import React, { useState, useMemo } from 'react';
import type { ConjunctionEvent } from '../../api/types';
import { Search, X } from 'lucide-react';
import { formatRelativeSpeed, formatUtcShort, isSyntheticEvent } from '../../api/formatters';

interface AlertTableProps {
  events: ConjunctionEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: ConjunctionEvent) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  isLoading = false,
  error = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const hasSyntheticEvents = useMemo(() => {
    return events.some((ev) => isSyntheticEvent(ev));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return events;
    const q = searchTerm.toLowerCase();
    return events.filter(
      (ev) =>
        ev.primary_object.name.toLowerCase().includes(q) ||
        ev.secondary_object.name.toLowerCase().includes(q) ||
        ev.primary_object.norad_id.toString().includes(q) ||
        ev.secondary_object.norad_id.toString().includes(q) ||
        ev.screening_tier.toLowerCase().includes(q)
    );
  }, [events, searchTerm]);


  return (
    <div className="flex flex-col h-full bg-[#0a0f1a] select-none border-r border-[#172236]">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#172236] bg-[#0c1220] space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#f8fafc]">
              Close Approaches
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[#131d2e] text-[#94a3b8] border border-[#1b283f]">
              {filteredEvents.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#64748b]">
            Threshold: &le;50 km
          </span>
        </div>

        {/* Compact Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search object, NORAD, or tier..."
            className="w-full bg-[#070b14] border border-[#172236] focus:border-[#00e5ff]/50 rounded pl-8 pr-7 py-1.5 text-xs text-[#f8fafc] placeholder-[#64748b] outline-none transition-colors font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#f8fafc] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Simulated Scenario Alert Notice if Synthetic Objects Injected */}
        {hasSyntheticEvents && (
          <div className="px-3.5 py-2 bg-amber-950/40 border-t border-amber-500/20 text-[10px] font-mono text-amber-300/90 flex items-start gap-1.5 flex-shrink-0">
            <span className="font-bold text-amber-400 flex-shrink-0">[SIMULATION]</span>
            <span>Benchmarking synthetic test pair (NORAD #99001 / #99002). Not a verified real-world conjunction.</span>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#131d2e]">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#64748b] flex flex-col items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
            <span>Screening orbit catalog over 24h window...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-400 space-y-2">
            <p className="font-semibold text-red-300">Screening Data Unavailable</p>
            <p className="text-[11px] leading-relaxed text-red-400/80">
              {error}
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs space-y-2">
            <p className="text-emerald-400 font-semibold text-xs font-mono">
              SCREENING COMPLETE // ZERO CLOSE APPROACHES
            </p>
            <p className="text-[11px] leading-relaxed text-[#94a3b8]">
              All object pairs maintain &gt;50 km Euclidean separation throughout the 24-hour evaluation interval.
            </p>
          </div>
        ) : (
          <>
            {filteredEvents.map((ev) => {
              const isSelected = ev.event_id === selectedEventId;
              const isSimulated = isSyntheticEvent(ev);

              return (
                <div
                  key={ev.event_id}
                  onClick={() => onSelectEvent(ev)}
                  className={`p-3.5 cursor-pointer transition-all border-l-2 ${
                    isSelected
                      ? 'bg-[#111929] border-[#38bdf8]'
                      : 'hover:bg-[#0d1422] border-transparent'
                  }`}
                >
                  {/* Header: Screening Priority Badge, Simulation Tag & Miss Distance */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          ev.screening_tier === 'CRITICAL'
                            ? 'bg-red-950/70 text-red-300 border border-red-500/40'
                            : ev.screening_tier === 'WARNING'
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                            : 'bg-yellow-950/70 text-yellow-300 border border-yellow-500/40'
                        }`}
                      >
                        {ev.screening_tier}
                      </span>
                      {isSimulated && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 leading-none">
                          SIMULATED
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold text-[#f1f5f9]">
                      {ev.miss_distance_km.toFixed(3)}
                      <span className="text-[10px] text-[#94a3b8] font-normal ml-1">km</span>
                    </div>
                  </div>

                  {/* Object Identities (2-row layout with complete names) */}
                  <div className="space-y-1 mb-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#f1f5f9] font-medium truncate max-w-[210px]" title={ev.primary_object.name}>
                        {ev.primary_object.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#64748b]">
                        #{ev.primary_object.norad_id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94a3b8] truncate max-w-[210px]" title={ev.secondary_object.name}>
                        {ev.secondary_object.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#64748b]">
                        #{ev.secondary_object.norad_id}
                      </span>
                    </div>
                  </div>

                  {/* Footer: TCA and Relative Speed */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748b] pt-2 border-t border-[#141f33]">
                    <span>{formatUtcShort(ev.tca_utc)}</span>
                    <span className="text-[#cbd5e1] font-medium">{formatRelativeSpeed(ev.relative_speed_km_s)}</span>
                  </div>
                </div>
              );
            })}

            {/* Operational Screening Status Note */}
            {filteredEvents.length > 0 && (
              <div className="p-3 m-3 rounded bg-[#090d18] border border-[#141f33] space-y-1 text-[11px] text-[#64748b] font-mono">
                <div className="text-[#94a3b8] font-semibold text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>SGP4 Screening Active</span>
                </div>
                <p className="leading-relaxed text-[10px] text-[#64748b]">
                  {hasSyntheticEvents
                    ? '24h lookahead window screened across catalog with benchmark targets included.'
                    : '24h lookahead window screened across catalog. All other pairs maintain >50 km clearance.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

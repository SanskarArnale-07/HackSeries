import React, { useState, useMemo } from 'react';
import type { ConjunctionEvent } from '../../api/types';
import { Search, ArrowRightLeft, X } from 'lucide-react';
import { formatRelativeSpeed, formatUtcShort } from '../../api/formatters';

interface AlertTableProps {
  events: ConjunctionEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: ConjunctionEvent) => void;
  isLoading?: boolean;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return (
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)] flex-shrink-0" />
        );
      case 'WARNING':
        return (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] flex-shrink-0" />
        );
      case 'WATCH':
        return (
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
        );
      default:
        return (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        );
    }
  };


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
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#131d2e]">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#64748b] flex flex-col items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>Screening orbit catalog...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748b] space-y-1.5">
            <p className="text-[#94a3b8] font-medium">No candidate close approaches</p>
            <p className="text-[11px] leading-relaxed text-[#64748b]">
              All object pairs maintain &gt;50 km Euclidean separation across the active screening window.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isSelected = ev.event_id === selectedEventId;

            return (
              <div
                key={ev.event_id}
                onClick={() => onSelectEvent(ev)}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121c2e] border-l-2 border-[#00e5ff] shadow-[inset_0_0_15px_rgba(0,229,255,0.05)]'
                    : 'hover:bg-[#0e1625] border-l-2 border-transparent'
                }`}
              >
                {/* Row 1: Status Dot, Object Pair, Miss Distance */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {getTierBadge(ev.screening_tier)}
                    <span
                      className="text-xs font-medium text-[#f8fafc] truncate"
                      title={`${ev.primary_object.name} (#${ev.primary_object.norad_id})`}
                    >
                      {ev.primary_object.name}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-[#475569] flex-shrink-0" />
                    <span
                      className="text-xs text-[#94a3b8] truncate"
                      title={`${ev.secondary_object.name} (#${ev.secondary_object.norad_id})`}
                    >
                      {ev.secondary_object.name}
                    </span>
                  </div>

                  {/* Miss Distance Tag */}
                  <span
                    className={`font-mono font-bold text-xs flex-shrink-0 ml-1 ${
                      ev.screening_tier === 'CRITICAL'
                        ? 'text-red-400'
                        : ev.screening_tier === 'WARNING'
                        ? 'text-amber-400'
                        : 'text-[#f8fafc]'
                    }`}
                  >
                    {ev.miss_distance_km.toFixed(2)} km
                  </span>
                </div>

                {/* Row 2: TCA Timestamp & Relative Speed */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#64748b] pl-3">
                  <span className="text-[#94a3b8]">{formatUtcShort(ev.tca_utc)}</span>
                  <span className="text-[#00e5ff] font-medium">{formatRelativeSpeed(ev.relative_speed_km_s)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import type { ConjunctionEvent } from '../../api/types';
import { Search, ArrowRightLeft } from 'lucide-react';

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
        ev.secondary_object.norad_id.toString().includes(q)
    );
  }, [events, searchTerm]);

  const getPriorityDot = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Priority: Critical (<5km)" />;
      case 'WARNING':
        return <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Priority: Warning (5-15km)" />;
      case 'WATCH':
        return <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" title="Priority: Watch (15-30km)" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Priority: Monitor (30-50km)" />;
    }
  };

  const formatTCA = (iso: string) => {
    try {
      const d = new Date(iso);
      const parts = d.toISOString().split('T');
      const datePart = parts[0];
      const timePart = parts[1]?.substring(0, 5) || '';
      return `${datePart} ${timePart} UTC`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#06080c] select-none">
      {/* List Header */}
      <div className="p-4 border-b border-[#141a26] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-[#f8fafc]">
            Close Approaches
          </h2>
          <span className="text-xs font-mono text-[#64748b]">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Compact search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name or NORAD..."
            className="w-full bg-[#0a0e14] border border-[#141a26] rounded pl-8 pr-3 py-1.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#00e5ff]/40 transition-colors"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#10141e]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#64748b] flex flex-col items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>Screening catalog proximity...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748b] space-y-1">
            <p className="text-[#94a3b8] font-medium">No candidate encounters</p>
            <p className="text-xs leading-relaxed">
              All tracked pairs maintain nominal separation across the lookahead window.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isSelected = ev.event_id === selectedEventId;

            return (
              <div
                key={ev.event_id}
                onClick={() => onSelectEvent(ev)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#0e1420] border-l-2 border-[#00e5ff]'
                    : 'hover:bg-[#090d14]'
                }`}
              >
                {/* Line 1: Priority dot, Objects, Miss distance */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    {getPriorityDot(ev.screening_tier)}
                    <span className="text-xs font-medium text-[#00e5ff] truncate max-w-[90px]" title={ev.primary_object.name}>
                      {ev.primary_object.name}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-[#475569] flex-shrink-0" />
                    <span className="text-xs text-[#cbd5e1] truncate max-w-[90px]" title={ev.secondary_object.name}>
                      {ev.secondary_object.name}
                    </span>
                  </div>

                  <span className="font-mono font-semibold text-xs text-[#f8fafc] flex-shrink-0">
                    {ev.miss_distance_km.toFixed(2)} km
                  </span>
                </div>

                {/* Line 2: TCA & Relative Speed */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#64748b] pl-4">
                  <span>{formatTCA(ev.tca_utc)}</span>
                  <span>{ev.relative_speed_km_s.toFixed(1)} km/s</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

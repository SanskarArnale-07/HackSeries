import React, { useState, useMemo } from 'react';
import type { ConjunctionEvent } from '../../api/types';
import { Radio, Search, ShieldCheck, ArrowRightLeft, Clock, Gauge } from 'lucide-react';

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
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        ev.primary_object.name.toLowerCase().includes(q) ||
        ev.secondary_object.name.toLowerCase().includes(q) ||
        ev.primary_object.norad_id.toString().includes(q) ||
        ev.secondary_object.norad_id.toString().includes(q) ||
        ev.event_id.toLowerCase().includes(q);
      const matchesTier = tierFilter === 'ALL' || ev.screening_tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [events, searchTerm, tierFilter]);

  const tierCounts = useMemo(() => {
    return {
      ALL: events.length,
      CRITICAL: events.filter((e) => e.screening_tier === 'CRITICAL').length,
      WARNING: events.filter((e) => e.screening_tier === 'WARNING').length,
      WATCH: events.filter((e) => e.screening_tier === 'WATCH').length,
      MONITOR: events.filter((e) => e.screening_tier === 'MONITOR').length
    };
  }, [events]);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase bg-red-950/80 text-red-400 border border-red-500/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-500/50">
            WARNING
          </span>
        );
      case 'WATCH':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase bg-yellow-950/80 text-yellow-400 border border-yellow-500/50">
            WATCH
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/50">
            MONITOR
          </span>
        );
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
    <div className="flex flex-col h-full bg-[#080b10] border-r border-[#1c2436] select-none">
      {/* Top Header & Search Controls */}
      <div className="p-3.5 border-b border-[#1c2436] bg-[#0a0d14] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00e5ff]" />
            <h2 className="text-xs font-semibold text-[#f8fafc] tracking-wider uppercase">
              Close Approach Triage
            </h2>
          </div>
          <span className="text-xs font-mono text-[#94a3b8]">
            {filteredEvents.length} / {events.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search satellite or NORAD ID..."
            className="w-full bg-[#06080c] border border-[#1c2436] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#00e5ff]/50 transition-colors"
          />
        </div>

        {/* Tier Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(['ALL', 'CRITICAL', 'WARNING', 'WATCH', 'MONITOR'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                tierFilter === t
                  ? 'bg-[#141b27] text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm'
                  : 'bg-[#06080c] text-[#94a3b8] hover:text-[#f8fafc] border border-transparent'
              }`}
            >
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()} ({tierCounts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#141a27]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>Screening close approaches via SGP4 propagation...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <span className="font-semibold text-sm text-[#f8fafc]">No Proximity Encounters</span>
            <span className="text-xs text-[#64748b] max-w-xs leading-relaxed">
              All candidate satellite pairs maintain nominal separation across the 24-hour lookahead window.
            </span>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isSelected = ev.event_id === selectedEventId;
            const isSynthetic =
              ev.event_id.toLowerCase().includes('synth') ||
              ev.primary_object.name.toLowerCase().includes('synth') ||
              ev.secondary_object.name.toLowerCase().includes('synth');

            return (
              <div
                key={ev.event_id}
                onClick={() => onSelectEvent(ev)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121826] border-l-4 border-[#00e5ff]'
                    : 'hover:bg-[#0c1017]'
                }`}
              >
                {/* Line 1: Tier Badge & Miss Distance */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTierBadge(ev.screening_tier)}
                    {isSynthetic && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-mono uppercase bg-purple-950/80 text-purple-300 border border-purple-500/40">
                        Synthetic
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-base text-[#f8fafc]">
                      {ev.miss_distance_km.toFixed(3)}
                    </span>
                    <span className="text-xs font-normal text-[#94a3b8] ml-1">km</span>
                  </div>
                </div>

                {/* Line 2: Satellite Pair */}
                <div className="flex items-center gap-2 text-xs text-[#f8fafc] mb-2 font-medium">
                  <span
                    className="truncate max-w-[130px] text-[#00e5ff]"
                    title={`${ev.primary_object.name} (NORAD ${ev.primary_object.norad_id})`}
                  >
                    {ev.primary_object.name}
                  </span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#64748b] flex-shrink-0" />
                  <span
                    className="truncate max-w-[130px] text-[#e2e8f0]"
                    title={`${ev.secondary_object.name} (NORAD ${ev.secondary_object.norad_id})`}
                  >
                    {ev.secondary_object.name}
                  </span>
                </div>

                {/* Line 3: TCA & Relative Velocity */}
                <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>{formatTCA(ev.tca_utc)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#38bdf8]">
                    <Gauge className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>{ev.relative_speed_km_s.toFixed(2)} km/s</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

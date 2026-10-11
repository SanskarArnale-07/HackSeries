import React from 'react';
import type { ConjunctionEvent } from '../../api/types';
import { AlertTriangle, Clock, ArrowRightLeft, Radio } from 'lucide-react';

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
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-red-950/90 text-red-400 border border-red-500/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            CRITICAL (&lt;5km)
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-950/90 text-amber-400 border border-amber-500/50">
            WARNING (5-15km)
          </span>
        );
      case 'WATCH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-yellow-950/90 text-yellow-400 border border-yellow-500/50">
            WATCH (15-30km)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-950/90 text-emerald-400 border border-emerald-500/50">
            MONITOR (30-50km)
          </span>
        );
    }
  };

  const formatTCA = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toUTCString().replace('GMT', 'UTC');
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080a0f] border-r border-white/10 select-none">
      {/* Table Header Controls */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0b0e14]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#00f0ff]" />
          <h2 className="text-xs font-mono font-bold text-[#f0f4f8] tracking-wider uppercase">
            Conjunction Triage Stream
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[#8a99ad]">
          {events.length} Screened Events
        </span>
      </div>

      {/* Events List / Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-[#8a99ad] flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin" />
            Propagating trajectories & screening proximity intervals...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#8a99ad] flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-emerald-400" />
            <span>No close approaches detected within 50 km lookahead window.</span>
            <span className="text-[10px] text-[#4e5b6e]">
              Coarse trigger at 500 km evaluated across catalog.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((ev) => {
              const isSelected = ev.event_id === selectedEventId;
              return (
                <div
                  key={ev.event_id}
                  onClick={() => onSelectEvent(ev)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#151c28] border-l-2 border-[#00f0ff]'
                      : 'hover:bg-[#0e121a]'
                  }`}
                >
                  {/* Top line: Tier & Miss Distance */}
                  <div className="flex items-center justify-between mb-1.5">
                    {getTierBadge(ev.screening_tier)}
                    <span className="font-mono font-bold text-sm text-[#f0f4f8]">
                      {ev.miss_distance_km.toFixed(3)}{' '}
                      <span className="text-xs font-normal text-[#8a99ad]">km</span>
                    </span>
                  </div>

                  {/* Primary & Secondary Objects */}
                  <div className="flex items-center gap-2 text-xs font-mono text-[#f0f4f8] mb-1">
                    <span className="font-semibold truncate max-w-[140px]" title={ev.primary_object.name}>
                      {ev.primary_object.name}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-[#4e5b6e] flex-shrink-0" />
                    <span className="text-[#8a99ad] truncate max-w-[140px]" title={ev.secondary_object.name}>
                      {ev.secondary_object.name}
                    </span>
                  </div>

                  {/* TCA Timestamp & Relative Velocity */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8a99ad]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#4e5b6e]" />
                      <span>{formatTCA(ev.tca_utc)}</span>
                    </div>
                    <span className="text-[#00f0ff]">
                      v<sub>rel</sub>: {ev.relative_speed_km_s.toFixed(2)} km/s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
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

  // Earliest TCA from real event data
  const nextTcaUtc = React.useMemo(() => {
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

  return (
    <div className="h-9 px-6 bg-[#080b10] border-b border-[#141a26] flex items-center justify-between text-xs text-[#94a3b8] select-none">
      <div className="flex items-center gap-6">
        <div>
          <span>Tracked objects: </span>
          <span className="font-mono font-semibold text-[#f8fafc]">
            {totalObjects}
          </span>
        </div>

        <span className="text-[#2a3447]">&bull;</span>

        <div>
          <span>Screened close approaches: </span>
          <span className="font-mono font-semibold text-[#f8fafc]">
            {events.length}
          </span>
          <span className="text-[#64748b] ml-1">(&le; 50 km)</span>
        </div>

        <span className="text-[#2a3447]">&bull;</span>

        <div>
          <span>Next TCA: </span>
          <span className="font-mono font-semibold text-[#00e5ff]">
            {nextTcaUtc || 'None within 24h window'}
          </span>
        </div>
      </div>
    </div>
  );
};

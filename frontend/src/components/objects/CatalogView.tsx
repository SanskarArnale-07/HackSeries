import React, { useState, useMemo } from 'react';
import type { OrbitalObject } from '../../api/types';
import { Search, Satellite, Filter } from 'lucide-react';

interface CatalogViewProps {
  objects: OrbitalObject[];
  selectedNoradId: number | null;
  onSelectObject: (obj: OrbitalObject) => void;
  isLoading?: boolean;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  objects,
  selectedNoradId,
  onSelectObject,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        obj.name.toLowerCase().includes(q) ||
        obj.norad_id.toString().includes(q) ||
        obj.intl_des.toLowerCase().includes(q);
      const matchesType = typeFilter === 'ALL' || obj.object_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [objects, searchTerm, typeFilter]);

  const typeCounts = useMemo(() => {
    return {
      ALL: objects.length,
      PAYLOAD: objects.filter((o) => o.object_type === 'PAYLOAD').length,
      DEBRIS: objects.filter((o) => o.object_type === 'DEBRIS').length,
      ROCKET_BODY: objects.filter((o) => o.object_type === 'ROCKET_BODY').length
    };
  }, [objects]);

  return (
    <div className="flex flex-col h-full bg-[#080b10] border-r border-[#1c2436] select-none">
      {/* Top Search & Filter Bar */}
      <div className="p-3.5 border-b border-[#1c2436] bg-[#0a0d14] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-[#00e5ff]" />
            <h2 className="text-xs font-semibold text-[#f8fafc] tracking-wider uppercase">
              LEO Orbital Catalog
            </h2>
          </div>
          <span className="text-xs font-mono text-[#94a3b8]">
            {filteredObjects.length} / {objects.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search satellite name or NORAD ID..."
            className="w-full bg-[#06080c] border border-[#1c2436] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#00e5ff]/50 transition-colors"
          />
        </div>

        {/* Object Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(['ALL', 'PAYLOAD', 'DEBRIS', 'ROCKET_BODY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-[#141b27] text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm'
                  : 'bg-[#06080c] text-[#94a3b8] hover:text-[#f8fafc] border border-transparent'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'ROCKET_BODY' ? 'Rocket Body' : t.charAt(0) + t.slice(1).toLowerCase()} ({typeCounts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Objects List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#141a27]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>Loading satellite catalog...</span>
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2.5">
            <Filter className="w-6 h-6 text-[#64748b]" />
            <span>No satellites match filter criteria.</span>
          </div>
        ) : (
          filteredObjects.map((obj) => {
            const isSelected = obj.norad_id === selectedNoradId;
            return (
              <div
                key={obj.norad_id}
                onClick={() => onSelectObject(obj)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121826] border-l-4 border-[#00e5ff]'
                    : 'hover:bg-[#0c1017]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-[#f8fafc] truncate max-w-[200px]" title={obj.name}>
                    {obj.name}
                  </span>
                  <span className="font-mono text-xs text-[#00e5ff]">
                    #{obj.norad_id}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2">
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-[#06080c] border border-[#1c2436]">
                    {obj.object_type}
                  </span>
                  <span className="font-mono text-xs text-[#64748b]">
                    Age: {obj.element_age_days.toFixed(1)}d
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono text-[#94a3b8] pt-1.5 border-t border-[#141a27]">
                  <div>
                    <span className="text-[#64748b] block text-[11px]">Inc:</span>
                    <span>{obj.orbital_parameters.inclination_deg}&deg;</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[11px]">Perigee:</span>
                    <span>{obj.orbital_parameters.perigee_altitude_km} km</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block text-[11px]">Apogee:</span>
                    <span>{obj.orbital_parameters.apogee_altitude_km} km</span>
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

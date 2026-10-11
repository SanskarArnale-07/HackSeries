import React, { useState, useMemo } from 'react';
import type { OrbitalObject } from '../../api/types';
import { Search, X } from 'lucide-react';

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

  const filteredObjects = useMemo(() => {
    if (!searchTerm.trim()) return objects;
    const q = searchTerm.toLowerCase();
    return objects.filter(
      (obj) =>
        obj.name.toLowerCase().includes(q) ||
        obj.norad_id.toString().includes(q) ||
        obj.intl_des.toLowerCase().includes(q)
    );
  }, [objects, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1a] select-none border-r border-[#172236]">
      {/* Search Header */}
      <div className="p-3.5 border-b border-[#172236] bg-[#0c1220] space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#f8fafc]">
              Catalog Objects
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[#131d2e] text-[#94a3b8] border border-[#1b283f]">
              {filteredObjects.length} / {objects.length}
            </span>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search satellite name or NORAD..."
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

      {/* Catalog List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#131d2e]">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#64748b] flex flex-col items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>Loading satellite catalog...</span>
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748b]">
            No tracked satellites match search.
          </div>
        ) : (
          filteredObjects.map((obj) => {
            const isSelected = obj.norad_id === selectedNoradId;

            return (
              <div
                key={obj.norad_id}
                onClick={() => onSelectObject(obj)}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121c2e] border-l-2 border-[#00e5ff] shadow-[inset_0_0_15px_rgba(0,229,255,0.05)]'
                    : 'hover:bg-[#0e1625] border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-[#f8fafc] truncate max-w-[200px]" title={obj.name}>
                    {obj.name}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#00e5ff]">
                    #{obj.norad_id}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] font-mono">
                  <span>{obj.object_type}</span>
                  <span>Inc: {obj.orbital_parameters.inclination_deg}&deg; &bull; Alt: {obj.orbital_parameters.perigee_altitude_km} km</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

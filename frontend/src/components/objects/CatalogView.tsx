import React, { useState, useMemo } from 'react';
import type { OrbitalObject } from '../../api/types';
import { Search } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-[#06080c] select-none">
      {/* Search Header */}
      <div className="p-4 border-b border-[#141a26] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-[#f8fafc]">
            Orbital Catalog
          </h2>
          <span className="text-xs font-mono text-[#64748b]">
            {filteredObjects.length} / {objects.length}
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search satellite or NORAD..."
            className="w-full bg-[#0a0e14] border border-[#141a26] rounded pl-8 pr-3 py-1.5 text-xs text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#00e5ff]/40 transition-colors"
          />
        </div>
      </div>

      {/* Catalog List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#10141e]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#64748b] flex flex-col items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
            <span>Loading satellite catalog...</span>
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748b]">
            No satellites match search.
          </div>
        ) : (
          filteredObjects.map((obj) => {
            const isSelected = obj.norad_id === selectedNoradId;

            return (
              <div
                key={obj.norad_id}
                onClick={() => onSelectObject(obj)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#0e1420] border-l-2 border-[#00e5ff]'
                    : 'hover:bg-[#090d14]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-[#f8fafc] truncate max-w-[200px]" title={obj.name}>
                    {obj.name}
                  </span>
                  <span className="font-mono text-xs text-[#00e5ff]">
                    #{obj.norad_id}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#64748b] font-mono">
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

import React from 'react';
import { Info } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <footer className="h-8 border-t border-white/10 bg-[#05070a] px-4 flex items-center justify-between text-[11px] font-mono text-[#8a99ad] select-none">
      <div className="flex items-center gap-2 truncate">
        <Info className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
        <span className="truncate">
          <strong className="text-[#f0f4f8]">SCIENTIFIC DISCLAIMER:</strong> TRAJACTRA is a
          research and demonstration prototype. Screened close approaches and miss-distance tiers
          are heuristic indicators, not validated collision probabilities or operational
          collision-avoidance advice.
        </span>
      </div>
      <div className="text-[10px] text-[#4e5b6e] flex-shrink-0 pl-4">
        SGP4/SDP4 Analytical Propagation &bull; TEME/ECEF Decoupled
      </div>
    </footer>
  );
};

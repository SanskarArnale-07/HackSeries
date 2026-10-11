import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <footer className="h-8 border-t border-[#1c2436] bg-[#05070a] px-4 flex items-center justify-between text-xs select-none z-20">
      <div className="flex items-center gap-2 truncate">
        <ShieldAlert className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
        <span className="truncate text-xs text-[#94a3b8]">
          <strong className="text-[#f8fafc] font-semibold">SCIENTIFIC DISCLAIMER:</strong> TRAJACTRA
          screens geometric proximity using analytical SGP4. Minimum separation distances are heuristic screening metrics, not collision probabilities (P<sub>c</sub>) or operational maneuver mandates.
        </span>
      </div>
      <div className="text-xs text-[#64748b] flex-shrink-0 pl-4 hidden md:block">
        TEME Inertial / WGS-84 Earth-Fixed &bull; Zero External Credentials
      </div>
    </footer>
  );
};

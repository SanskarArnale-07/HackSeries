import React from 'react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <footer className="h-7 border-t border-[#141a26] bg-[#05070a] px-6 flex items-center justify-between text-xs select-none z-20">
      <div className="flex items-center gap-2 truncate">
        <span className="truncate text-xs text-[#64748b]">
          <strong className="text-[#94a3b8] font-medium">SCIENTIFIC DISCLAIMER:</strong> TRAJACTRA
          screens geometric proximity using analytical SGP4. Minimum separation distances are heuristic screening metrics, not collision probabilities (P<sub>c</sub>).
        </span>
      </div>
      <div className="text-xs text-[#475569] flex-shrink-0 pl-4 hidden md:block">
        TEME Inertial / WGS-84 &bull; Zero Credentials
      </div>
    </footer>
  );
};

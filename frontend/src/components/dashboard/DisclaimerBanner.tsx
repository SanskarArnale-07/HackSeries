import React from 'react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <footer className="h-6.5 border-t border-[#172236] bg-[#070b14] px-5 flex items-center justify-between text-[11px] select-none z-20 flex-shrink-0">
      <div className="flex items-center gap-2 truncate">
        <span className="truncate text-[#64748b]">
          <strong className="text-[#94a3b8] font-semibold">SCIENTIFIC DISCLAIMER:</strong> Screened close approaches represent geometric miss distance under analytical SGP4. Public TLEs do not contain covariance matrices; metrics are heuristic screening indicators, not collision probabilities (P<sub>c</sub>).
        </span>
      </div>
      <div className="text-[#475569] font-mono text-[10px] flex-shrink-0 pl-4 hidden md:block">
        TEME &bull; ECEF &bull; WGS-84 &bull; Offline Architecture
      </div>
    </footer>
  );
};

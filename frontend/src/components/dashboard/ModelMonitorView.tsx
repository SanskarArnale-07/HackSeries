import React from 'react';
import { Cpu, ShieldCheck, Layers, GitBranch, X } from 'lucide-react';

interface ModelMonitorViewProps {
  onClose: () => void;
}

export const ModelMonitorView: React.FC<ModelMonitorViewProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#090e1a] border border-[#17253b] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#141f33] bg-[#0c1322] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-[#00e5ff]" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Astrodynamics Engine Architecture &amp; Verification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748b] hover:text-white hover:bg-[#142036] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Engine Parameters Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                Propagation Model
              </span>
              <div className="text-base font-mono font-bold text-white">
                SGP4 / SDP4 Analytical
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                Official sgp4 library &bull; WGS-72 Earth constants
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                Machine Learning Inference
              </span>
              <div className="text-base font-mono font-bold text-emerald-400">
                0% (100% Deterministic)
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8]">
                Strict Rule 1 Aerospace Adherence
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                Screening Pipeline
              </span>
              <div className="text-base font-mono font-bold text-white">
                3-Stage Hierarchical
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8]">
                Radial Filter &rarr; 60s Grid &rarr; Golden Search (1.0s tol)
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                Coordinate Standards
              </span>
              <div className="text-base font-mono font-bold text-white">
                TEME &bull; ECEF &bull; WGS-84
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8]">
                GMST rotation with Coriolis velocity compensation
              </span>
            </div>
          </div>

          {/* Theoretical Breakdown */}
          <div className="p-4 rounded bg-[#080d18] border border-[#141f33] space-y-2 text-xs text-[#94a3b8] leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Layers className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Euclidean Separation vs Collision Probability (Rule 2)</span>
            </div>
            <p>
              Two-Line Element (TLE) sets do not contain 3D position covariance matrices (&mathbf;P). Generating synthetic covariance distributions introduces arbitrary mathematical assumptions that violate aerospace engineering standards. TRAJACTRA strictly calculates and reports <strong>Geometric Miss Distance</strong> in kilometers and screening tiers, without asserting unvalidated collision probabilities (P<sub>c</sub>).
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#080d18] border border-[#141f33] space-y-1.5 text-xs text-[#94a3b8]">
            <div className="flex items-center gap-2 font-semibold text-white">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>Screening Thresholds</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#cbd5e1] pt-1">
              <div>CRITICAL: Separation &lt; 5.0 km</div>
              <div>WARNING: Separation 5.0 – 15.0 km</div>
              <div>WATCH: Separation 15.0 – 30.0 km</div>
              <div>MONITOR: Separation 30.0 – 50.0 km</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
            <span>Validated against verified NORAD analytical ephemeris baselines.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

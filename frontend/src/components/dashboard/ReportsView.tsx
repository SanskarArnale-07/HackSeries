import React from 'react';
import type { ConjunctionsResponse } from '../../api/types';
import { FileText, Download, ShieldCheck, X } from 'lucide-react';

interface ReportsViewProps {
  conjunctionsData: ConjunctionsResponse | null;
  totalObjects: number;
  onClose: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  conjunctionsData,
  totalObjects,
  onClose
}) => {
  const events = conjunctionsData?.events || [];
  const meta = conjunctionsData?.screening_metadata;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#090e1a] border border-[#17253b] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#141f33] bg-[#0c1322] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Conjunction Screening Audit &amp; Assessment Report
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
          {/* Audit Metadata Summary Card */}
          <div className="p-4 rounded bg-[#0b1222] border border-[#16233b] font-mono text-xs space-y-2 text-[#cbd5e1]">
            <div className="flex justify-between items-center text-[#94a3b8] pb-2 border-b border-[#141f33]">
              <span>REPORT DESIGNATION:</span>
              <span className="text-[#00e5ff] font-bold">RPT-LEO-CONJ-24H</span>
            </div>
            <div className="flex justify-between items-center">
              <span>EVALUATION EPOCH (UTC):</span>
              <span className="text-white">{meta?.evaluation_timestamp_utc || new Date().toISOString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>LOOKAHEAD SCREENING WINDOW:</span>
              <span className="text-white">24.0 Hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span>TRACKED CATALOG INGESTION:</span>
              <span className="text-white">{totalObjects} Bounded LEO Objects</span>
            </div>
            <div className="flex justify-between items-center">
              <span>PAIRWISE COMBINATIONS EVALUATED:</span>
              <span className="text-white">{meta?.total_pairs_screened || 0} Pairs</span>
            </div>
            <div className="flex justify-between items-center">
              <span>SCREENING DISTANCE THRESHOLD:</span>
              <span className="text-white">&le; 50.0 km Euclidean Radius</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#141f33]">
              <span>QUALIFYING CLOSE APPROACHES:</span>
              <span className="text-emerald-400 font-bold">{events.length} Candidate Events</span>
            </div>
          </div>

          {/* Qualified Encounters Table */}
          {events.length > 0 ? (
            <div className="border border-[#141f33] rounded overflow-hidden">
              <div className="bg-[#0c1322] px-3 py-2 text-[11px] font-mono font-semibold text-[#94a3b8] border-b border-[#141f33]">
                DETECTED CLOSE-APPROACH MANIFEST
              </div>
              <div className="divide-y divide-[#131d2e] max-h-48 overflow-y-auto font-mono text-xs">
                {events.map((ev, i) => (
                  <div key={ev.event_id} className="p-2.5 flex items-center justify-between bg-[#080d18]">
                    <div>
                      <span className="text-white font-medium">{i + 1}. {ev.primary_object.name} &harr; {ev.secondary_object.name}</span>
                      <span className="text-[10px] text-[#64748b] block mt-0.5">TCA: {ev.tca_utc}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#00e5ff] font-bold">{ev.miss_distance_km.toFixed(3)} km</span>
                      <span className={`text-[10px] block mt-0.5 font-bold ${ev.screening_tier === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                        {ev.screening_tier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-emerald-400 bg-[#080d18] border border-[#141f33] rounded">
              SCREENING AUDIT CLEAR: ZERO CLOSE APPROACHES &le; 50 KM DETECTED OVER 24H WINDOW.
            </div>
          )}

          {/* Action to Download or Export Text */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => {
                const textData = JSON.stringify({ meta, events, totalObjects }, null, 2);
                const blob = new Blob([textData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trajactra_screening_report_${Date.now()}.json`;
                a.click();
              }}
              className="px-3.5 py-2 rounded bg-[#0f1728] hover:bg-[#142036] border border-[#1b2842] text-xs font-mono text-white flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Export Audit Manifest (JSON)</span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748b]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deterministic SGP4 Traceability</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

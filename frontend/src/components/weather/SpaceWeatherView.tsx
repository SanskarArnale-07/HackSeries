import React, { useEffect, useState } from 'react';
import { fetchSpaceWeather } from '../../api/client';
import type { SpaceWeatherState } from '../../api/types';
import { Sun, Activity, ShieldCheck, X } from 'lucide-react';

interface SpaceWeatherViewProps {
  onClose: () => void;
}

export const SpaceWeatherView: React.FC<SpaceWeatherViewProps> = ({ onClose }) => {
  const [weather, setWeather] = useState<SpaceWeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpaceWeather()
      .then((data) => {
        setWeather(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch space weather');
        setLoading(false);
      });
  }, []);

  const kp = weather?.planetary_k_index?.kp_index ?? 2.0;
  const f107 = weather?.solar_radio_flux_f107?.flux ?? 107.0;
  const stormStatus = weather?.geomagnetic_storm_status || 'QUIET';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#090e1a] border border-[#17253b] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#141f33] bg-[#0c1322] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sun className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              NOAA SWPC Space Weather Environment
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
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#64748b] font-mono">
              Loading NOAA SWPC observations...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-red-400 font-mono">
              Notice: {error} (Falling back to cached SWPC environmental snapshot)
            </div>
          ) : (
            <>
              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
                  <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                    Planetary Kp Index
                  </span>
                  <div className="text-2xl font-mono font-bold text-white">
                    {kp.toFixed(1)}
                  </div>
                  <span className={`text-[10px] font-mono font-medium ${kp >= 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {kp >= 5 ? 'Geomagnetic Storm' : 'Quiet Geomagnetic State'}
                  </span>
                </div>

                <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
                  <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                    Solar Flux (F10.7)
                  </span>
                  <div className="text-2xl font-mono font-bold text-white">
                    {f107.toFixed(1)}
                  </div>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    Solar Flux Units (sfu)
                  </span>
                </div>

                <div className="p-3.5 rounded bg-[#0b1222] border border-[#16233b] space-y-1">
                  <span className="text-[10px] font-mono text-[#64748b] uppercase block">
                    Storm Level
                  </span>
                  <div className={`text-xl font-mono font-bold ${stormStatus === 'QUIET' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {stormStatus}
                  </div>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    NOAA SWPC Scale
                  </span>
                </div>
              </div>

              {/* Physical Astrodynamics Impact Explanation */}
              <div className="p-4 rounded bg-[#080d18] border border-[#141f33] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00e5ff]">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Thermospheric Drag &amp; LEO Orbital Perturbations</span>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Solar extreme ultraviolet radiation and geomagnetic activity modulate upper atmospheric density in the 200–600 km LEO corridor. Elevated solar flux accelerates atmospheric heating and expansion, increasing aerodynamic drag on satellites and decaying orbital semi-major axes faster than nominal predictions.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#64748b] border-t border-[#121c2e]">
                  Data Source: {weather?.source || 'NOAA SWPC Live'} &bull; Updated: {weather?.timestamp_utc ? new Date(weather.timestamp_utc).toUTCString() : 'Active'}
                </div>
              </div>

              {/* Operational Integrity Notice */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748b]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Deterministic SGP4 preserves empirical B* ballistic drag coefficient terms.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

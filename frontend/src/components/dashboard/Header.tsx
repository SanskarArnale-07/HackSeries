import React from 'react';
import { ShieldAlert, Activity, Wifi, WifiOff, Sun, Satellite } from 'lucide-react';
import type { HealthResponse, SpaceWeatherState } from '../../api/types';

interface HeaderProps {
  health: HealthResponse | null;
  weather: SpaceWeatherState | null;
  totalObjects: number;
  totalConjunctions: number;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  weather,
  totalObjects,
  totalConjunctions
}) => {
  const isOnline = health?.data_source?.includes('LIVE');
  const kp = weather?.planetary_k_index?.kp_index ?? weather?.planetary_k_index?.estimated_kp ?? 3.0;
  const f107 = weather?.solar_radio_flux_f107?.flux ?? 150.0;
  const stormStatus = weather?.geomagnetic_storm_status ?? 'QUIET';

  return (
    <header className="h-14 border-b border-white/10 bg-[#06080b] px-4 flex items-center justify-between select-none">
      {/* Brand title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded border border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]">
          <Satellite className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-base text-[#f0f4f8]">
              TRAJACTRA
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#8a99ad]">
              v1.0-MVP
            </span>
          </div>
          <p className="text-[11px] text-[#8a99ad] tracking-wide">
            Orbital Intelligence & Conjunction Analysis
          </p>
        </div>
      </div>

      {/* Telemetry & System Status Badges */}
      <div className="flex items-center gap-3 text-xs font-mono">
        {/* Source provenance */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1218] border border-white/5">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="text-[#8a99ad]">SOURCE:</span>
          <span className="text-[#f0f4f8] font-semibold">
            {health?.data_source || 'INITIALIZING'}
          </span>
        </div>

        {/* Catalog Count */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1218] border border-white/5">
          <Activity className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span className="text-[#8a99ad]">CATALOG:</span>
          <span className="text-[#00f0ff] font-semibold">{totalObjects}</span>
          <span className="text-[#4e5b6e]">LEO</span>
        </div>

        {/* Screened Encounters */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1218] border border-white/5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#ff9500]" />
          <span className="text-[#8a99ad]">ALERTS (&le;50km):</span>
          <span className={`font-semibold ${totalConjunctions > 0 ? 'text-[#ff3b30]' : 'text-emerald-400'}`}>
            {totalConjunctions}
          </span>
        </div>

        {/* Space Weather Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1218] border border-white/5">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[#8a99ad]">SWPC:</span>
          <span className="text-[#f0f4f8]">
            Kp {kp.toFixed(1)} / {f107.toFixed(0)} sfu
          </span>
          <span className={`text-[10px] px-1 rounded ${stormStatus === 'QUIET' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
            {stormStatus}
          </span>
        </div>
      </div>
    </header>
  );
};

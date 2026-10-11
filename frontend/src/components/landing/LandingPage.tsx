import React from 'react';
import { LandingGlobe } from './LandingGlobe';
import { ArrowRight, Satellite, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  return (
    <div className="relative w-screen h-screen bg-[#000000] text-[#f8fafc] overflow-hidden select-none font-sans">
      {/* 1. Full-Screen Cinematic 3D Globe with Orbital Light Trails */}
      <LandingGlobe />

      {/* 2. Minimalist Top Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 h-16 px-8 md:px-14 flex items-center justify-between z-20 pointer-events-none">
        {/* Brand */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 rounded-full bg-[#0a0f18] border border-[#141e2e] flex items-center justify-center">
            <Satellite className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <span className="font-mono font-bold tracking-widest text-base text-[#f8fafc]">
            TRAJACTRA
          </span>
        </div>

        {/* Unobtrusive Direct Access */}
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            onClick={onEnterDashboard}
            className="px-4 py-2 rounded text-xs font-medium text-[#94a3b8] hover:text-[#00e5ff] bg-[#06080c]/80 hover:bg-[#0c121d] border border-[#141a26] hover:border-[#00e5ff]/30 transition-all flex items-center gap-1.5 backdrop-blur-md"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00e5ff]" />
          </button>
        </div>
      </header>

      {/* 3. Hero Content Overlay with Generous Negative Space */}
      <main className="absolute inset-0 flex items-center px-8 md:px-14 lg:px-20 pointer-events-none z-10">
        <div className="max-w-xl pointer-events-auto space-y-6">
          {/* Eyebrow / Domain Definition */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#080d16]/90 border border-[#141e2e] text-[#00e5ff] text-[11px] font-mono tracking-wider backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
            <span>ORBITAL INTELLIGENCE &amp; CONJUNCTION ANALYSIS</span>
          </div>

          {/* Main Title & Tagline */}
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-none font-sans">
              TRAJACTRA
            </h1>
            <p className="text-lg md:text-xl text-[#cbd5e1] font-light italic">
              &ldquo;See the orbits. Understand the encounters.&rdquo;
            </p>
          </div>

          {/* Concise Product Description */}
          <p className="text-sm md:text-base text-[#94a3b8] leading-relaxed max-w-lg font-normal">
            Explore Earth&apos;s orbital environment and investigate potentially
            close approaches between tracked objects with high-precision analytical
            screening.
          </p>

          {/* Primary Call to Action & Subtle Secondary Navigation */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={onEnterDashboard}
              className="px-7 py-3.5 rounded bg-[#00e5ff] hover:bg-[#38bdf8] text-[#05080e] font-semibold text-sm transition-all shadow-[0_0_30px_rgba(0,229,255,0.25)] hover:shadow-[0_0_45px_rgba(0,229,255,0.45)] flex items-center gap-3 group cursor-pointer"
            >
              <span>Enter Dashboard</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                alert('TRAJACTRA Architecture: Bounded LEO catalog (100 objects) screened over a 24h lookahead window via analytical SGP4 propagation and golden-section search. Strict Rule 1 (0% ML) and Rule 2 (No Pc claims) compliance.');
              }}
              className="px-4 py-3 rounded text-xs font-mono text-[#94a3b8] hover:text-[#00e5ff] border border-[#141e2e] hover:border-[#00e5ff]/30 bg-[#080d16]/60 backdrop-blur-md transition-all cursor-pointer"
            >
              Platform Overview
            </a>
          </div>

          {/* Scientific Integrity Reassurance */}
          <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-[#64748b]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff]/70 flex-shrink-0" />
            <span>Analytical SGP4 / TEME vectors &bull; Zero synthetic covariance claims</span>
          </div>
        </div>
      </main>

      {/* 4. Minimalist Bottom Footer Notice */}
      <footer className="absolute bottom-4 left-8 md:left-14 pointer-events-none z-10 text-[11px] font-mono text-[#475569]">
        <span>LEO Conjunction Risk Engine &bull; Version 1.0</span>
      </footer>
    </div>
  );
};

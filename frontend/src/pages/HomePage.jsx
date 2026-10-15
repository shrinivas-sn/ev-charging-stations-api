import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const [copied, setCopied] = useState(false);
  const sampleCurl = 'curl -s https://ev-charging-stations-api.vercel.app/v1/stations/near?lat=12.9716&lng=77.5946&radius=10';

  const copyCode = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-20 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          27,248 Public Stations Across 36 States & UTs
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          India Public <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">EV Charging</span> Station API
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Free, keyless, open REST API providing developer access to India's electric vehicle charging network. GPS coordinates, connector types (CCS-2, Type-2, Bharat DC), and spatial proximity search.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            to="/playground"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-slate-950 font-bold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
          >
            Launch Live Playground
          </Link>
          <Link
            to="/docs"
            className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold hover:bg-slate-800 transition-colors"
          >
            Read API Documentation
          </Link>
        </div>

        {/* Quick cURL Bar */}
        <div className="pt-6 max-w-2xl mx-auto text-left">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-xs sm:text-sm text-slate-300 shadow-xl">
            <span className="truncate pr-4 text-emerald-400">$ {sampleCurl}</span>
            <button
              onClick={copyCode}
              className="shrink-0 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Spatial Proximity Search</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Find chargers within a radius (1–100 km) around any coordinate in India using sub-4ms Haversine calculations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Connector & Power Specs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Filter by CCS-2, Type-2 AC, or Bharat DC-001 plugs and filter by minimum power ratings (kW) for fast-charging road trips.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Zero-Auth & Open CORS</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No developer signups, credit cards, or API keys required. Plug it straight into frontend web apps, React Native, or Python scripts.
            </p>
          </div>
        </div>
      </section>

      {/* Core Endpoints List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Core Endpoints</h2>
          <div className="divide-y divide-slate-800 bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden font-mono text-sm">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">GET</span>
                <span className="text-slate-200">/v1/stations</span>
              </div>
              <span className="text-xs text-slate-400 font-sans">List public stations with state, city, operator, and power filters.</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">GET</span>
                <span className="text-slate-200">/v1/stations/near</span>
              </div>
              <span className="text-xs text-slate-400 font-sans">Find nearest stations sorted by km distance around (lat, lng).</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">GET</span>
                <span className="text-slate-200">/v1/stations/:id</span>
              </div>
              <span className="text-xs text-slate-400 font-sans">Detailed connector breakdown and location specs for a station.</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">GET</span>
                <span className="text-slate-200">/v1/states</span>
              </div>
              <span className="text-xs text-slate-400 font-sans">State-wise station counts and market leader CPO distribution.</span>
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">GET</span>
                <span className="text-slate-200">/v1/connectors</span>
              </div>
              <span className="text-xs text-slate-400 font-sans">Dictionary of Indian charging standards (CCS-2, Type-2, Bharat DC).</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

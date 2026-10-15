import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#060a12] border-t border-slate-800 text-slate-400 text-xs font-mono mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">NATIONAL EV DIRECTORY // OPEN API</span>
              <span className="text-[10px] text-emerald-400 border border-emerald-800/80 px-1 py-0.5 rounded bg-emerald-950/40">
                GODL-INDIA
              </span>
            </div>
            <p className="text-slate-400 font-sans text-xs leading-relaxed max-w-md">
              Keyless public REST API indexing 27,248 electric vehicle charging stations across India. Maintained for developers, route optimization tools, and municipal fleet systems.
            </p>
            <p className="text-[11px] text-slate-500 font-sans">
              Source: Ministry of Power &amp; Bureau of Energy Efficiency (BEE) via Open Government Data (<a href="https://data.gov.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">data.gov.in</a>).
            </p>
          </div>

          <div>
            <div className="font-bold text-white text-xs mb-2 uppercase">RESOURCES</div>
            <ul className="space-y-1.5 text-xs font-mono text-slate-400">
              <li><Link to="/docs" className="hover:text-white">DOCS_INDEX</Link></li>
              <li><Link to="/playground" className="hover:text-white">COORDINATE_WORKBENCH</Link></li>
              <li><Link to="/guides" className="hover:text-white">INTEGRATION_GUIDES</Link></li>
              <li><Link to="/status" className="hover:text-white">NETWORK_TELEMETRY</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-xs mb-2 uppercase">INDEXED_ENDPOINTS</div>
            <ul className="space-y-1.5 text-xs font-mono text-slate-400">
              <li><a href="/v1/stations" className="hover:text-blue-400">GET /v1/stations</a></li>
              <li><a href="/v1/stations/near?lat=12.97&lng=77.59" className="hover:text-blue-400">GET /v1/stations/near</a></li>
              <li><a href="/v1/states" className="hover:text-blue-400">GET /v1/states</a></li>
              <li><a href="/v1/connectors" className="hover:text-blue-400">GET /v1/connectors</a></li>
              <li><a href="/health" className="hover:text-blue-400">GET /health</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-500">
          <div>Open Government Data License (GODL-India) // Free &amp; Unrestricted Commercial/Non-Commercial Use</div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400">27,248 STATIONS ACTIVE</span>
            <span>ZERO AUTH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

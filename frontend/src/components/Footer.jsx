import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">India EV Charging Directory API</span>
              <span className="text-xs text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                Open Access
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-md">
              Free, keyless, developer-facing REST API providing programmatic access to 27,000+ public electric vehicle charging stations across India.
            </p>
            <p className="text-xs text-slate-400">
              Data source: Ministry of Power / Bureau of Energy Efficiency (BEE) via Open Government Data (<a href="https://data.gov.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">data.gov.in</a>). Licensed under GODL-India.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-3">API Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/docs" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
              <li><Link to="/playground" className="hover:text-emerald-400 transition-colors">Interactive Playground</Link></li>
              <li><Link to="/guides" className="hover:text-emerald-400 transition-colors">Integration Guides</Link></li>
              <li><Link to="/status" className="hover:text-emerald-400 transition-colors">Service Status & Parity</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Endpoints</h4>
            <ul className="space-y-2 font-mono text-xs text-slate-400">
              <li><a href="/v1/stations" className="hover:text-emerald-400">GET /v1/stations</a></li>
              <li><a href="/v1/stations/near?lat=12.97&lng=77.59" className="hover:text-emerald-400">GET /v1/stations/near</a></li>
              <li><a href="/v1/states" className="hover:text-emerald-400">GET /v1/states</a></li>
              <li><a href="/v1/connectors" className="hover:text-emerald-400">GET /v1/connectors</a></li>
              <li><a href="/health" className="hover:text-emerald-400">GET /health</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© 2026 India EV Charging Station Directory. Open Government Data License (GODL-India).</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              27,248 Stations Indexed
            </span>
            <span>Zero API Keys Required</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

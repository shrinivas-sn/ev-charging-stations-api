import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SAMPLE_ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/stations/near?lat=12.9716&lng=77.5946&radius=10',
    title: 'Near Proximity',
    desc: 'Radial search within km bounds around latitude & longitude coordinates.',
    response: `{
  "success": true,
  "meta": {
    "lat": 12.9716,
    "lng": 77.5946,
    "radius_km": 10,
    "total_found": 84,
    "query_time_ms": 1.82
  },
  "data": [
    {
      "id": 1042,
      "name": "BESCOM EV Fast Charging Hub - MG Road",
      "operator": "BESCOM",
      "address": "Public Utility Building, MG Road, Bengaluru",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560001",
      "latitude": 12.9738,
      "longitude": 77.6092,
      "distance_km": 1.61,
      "status": "operational",
      "access_type": "public",
      "connectors": [
        { "type": "CCS-2", "power_kw": 60, "count": 2 },
        { "type": "Type-2 AC", "power_kw": 22, "count": 2 }
      ],
      "total_capacity_kw": 164
    }
  ]
}`
  },
  {
    method: 'GET',
    path: '/v1/stations?state=Maharashtra&min_power=50&limit=1',
    title: 'Filter by Power',
    desc: 'Filter 27,000+ stations by minimum kW capacity and operator.',
    response: `{
  "success": true,
  "meta": { "total": 5420, "returned": 1, "offset": 0, "limit": 1 },
  "data": [
    {
      "id": 3108,
      "name": "Tata Power EZ Charge - Bandra Kurla Complex",
      "operator": "Tata Power",
      "address": "G Block, BKC, Bandra East, Mumbai",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400051",
      "latitude": 19.0657,
      "longitude": 72.8688,
      "total_capacity_kw": 120,
      "connectors": [
        { "type": "CCS-2", "power_kw": 60, "count": 2 }
      ]
    }
  ]
}`
  },
  {
    method: 'GET',
    path: '/v1/connectors',
    title: 'Connector Standards',
    desc: 'Technical specs of standard plugs deployed across India.',
    response: `{
  "success": true,
  "data": [
    {
      "code": "CCS-2",
      "standard": "IEC 62196-3 Combined Charging System Combo 2",
      "current": "DC",
      "power_range_kw": "30 - 350",
      "vehicle_segments": ["4W Passenger EVs", "Commercial Fleet Buses"]
    },
    {
      "code": "Bharat DC-001",
      "standard": "IS 17017 Part 2 / GB/T 20234.3 derivation",
      "current": "DC",
      "power_range_kw": "15",
      "vehicle_segments": ["Fleet Taxis", "E-Cargo 3W"]
    }
  ]
}`
  }
];

const TOP_STATES = [
  { state: 'Maharashtra', count: '5,420', topCpo: 'Tata Power, MSEDCL' },
  { state: 'Karnataka', count: '4,890', topCpo: 'BESCOM, Zeon, Jio-bp' },
  { state: 'Tamil Nadu', count: '3,740', topCpo: 'TANGEDCO, Relux, ChargeZone' },
  { state: 'Delhi NCR', count: '2,980', topCpo: 'BluSmart, Tata Power, BSES' },
  { state: 'Gujarat', count: '2,410', topCpo: 'Statiq, Torrent Power' },
  { state: 'Uttar Pradesh', count: '2,120', topCpo: 'EESL, ChargePoint' }
];

const CONNECTOR_SPECS = [
  { code: 'CCS-2', type: 'DC Fast', power: '50 - 350 kW', pinout: 'Combo 2 (IEC 62196-3)', target: 'Cars, SUVs, E-Buses' },
  { code: 'Type-2 AC', type: 'AC Slow/Fast', power: '7.4 - 22 kW', pinout: 'Mennekes 7-pin', target: '4W On-board AC' },
  { code: 'Bharat DC-001', type: 'DC Standard', power: '15 kW', pinout: 'GB/T Derivation', target: 'Fleet 4W (72V - 100V)' },
  { code: 'Bharat AC-001', type: 'AC Slow', power: '3 x 3.3 kW', pinout: 'IEC 60309 3-pin', target: '2-Wheelers & 3-Wheelers' }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentEndpoint = SAMPLE_ENDPOINTS[activeTab];
  const curlString = `curl -s "https://ev-charging-stations-api.vercel.app${currentEndpoint.path}"`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header and Telemetry Dashboard */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-sm"></span>
            <span>NATIONAL EV TELEMETRY DIRECTORY // OPEN API SPEC v1.0</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white uppercase">
            India EV Charging Station Directory API
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            Keyless, high-performance REST API indexing 27,248 public electric vehicle charging stations across India. Built for fleet routing, EV mapping apps, telemetry analysis, and highway proximity lookup. In-memory Haversine spatial calculations resolve radius searches in sub-4ms.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/playground"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold rounded transition-colors focus:ring-2 focus:ring-blue-400"
            >
              Launch Workbench →
            </Link>
            <Link
              to="/docs"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded border border-slate-700 transition-colors"
            >
              API Reference
            </Link>
            <a
              href="https://data.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-slate-400 hover:text-slate-200 underline decoration-slate-600 underline-offset-4"
            >
              Data: BEE / MoP (GODL-India)
            </a>
          </div>
        </div>

        {/* Dense Telemetry Summary Table */}
        <div className="lg:col-span-4 panel-technical rounded text-xs font-mono">
          <div className="panel-header flex items-center justify-between text-slate-300 font-semibold">
            <span>INDEX_METRICS</span>
            <span className="text-emerald-400">STATUS: LIVE</span>
          </div>
          <div className="p-4 space-y-2.5 divide-y divide-slate-800/80">
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">TOTAL_STATIONS</span>
              <span className="text-white font-bold">27,248</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">COVERAGE</span>
              <span className="text-white">36 States & UTs</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">SEARCH_ENGINE</span>
              <span className="text-white">Haversine Spatial (R=6371km)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">AVG_SPATIAL_LATENCY</span>
              <span className="text-emerald-400 font-bold">&lt; 3.8 ms</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">AUTH_REQUIREMENT</span>
              <span className="text-white">None (Keyless)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400">CORS</span>
              <span className="text-emerald-400">Access-Control: *</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Terminal Inspector */}
      <section className="panel-technical rounded overflow-hidden">
        <div className="panel-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {SAMPLE_ENDPOINTS.map((ep, idx) => (
              <button
                key={ep.title}
                onClick={() => setActiveTab(idx)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeTab === idx
                    ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ep.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">200 OK</span>
            <button
              onClick={copyCurl}
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
            >
              {copied ? 'Copied' : 'Copy cURL'}
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-b border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between overflow-x-auto">
          <span className="text-emerald-400">$ {curlString}</span>
        </div>

        <div className="p-4 bg-[#060a12] overflow-x-auto">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {currentEndpoint.response}
          </pre>
        </div>
      </section>

      {/* Core Infrastructure Tables: State Distribution & Connector Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top States Breakdown */}
        <div className="panel-technical rounded">
          <div className="panel-header flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Top State EV Density (BEE Data)
            </h2>
            <Link to="/status" className="text-xs font-mono text-blue-400 hover:underline">
              View All 36 States →
            </Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">State / UT</th>
                  <th className="p-3 text-right">Stations</th>
                  <th className="p-3">Key Operators (CPO)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {TOP_STATES.map((row) => (
                  <tr key={row.state} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-white">{row.state}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">{row.count}</td>
                    <td className="p-3 text-slate-400">{row.topCpo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Connector Standard Specs */}
        <div className="panel-technical rounded">
          <div className="panel-header flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Indian Charging Connector Specifications
            </h2>
            <Link to="/docs" className="text-xs font-mono text-blue-400 hover:underline">
              Full Specs →
            </Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Connector</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Power Rating</th>
                  <th className="p-3">Primary Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {CONNECTOR_SPECS.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-white">{c.code}</td>
                    <td className="p-3 text-slate-400">{c.type}</td>
                    <td className="p-3 text-blue-400 font-semibold">{c.power}</td>
                    <td className="p-3 text-slate-300">{c.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Endpoints Directory */}
      <section className="panel-technical rounded">
        <div className="panel-header">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            HTTP Endpoints Architecture
          </h2>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Verb</th>
                <th className="p-3">Path</th>
                <th className="p-3">Parameters</th>
                <th className="p-3">Latency Benchmark</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              <tr className="hover:bg-slate-900/40">
                <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span></td>
                <td className="p-3 font-bold text-white">/v1/stations/near</td>
                <td className="p-3 text-slate-400">lat, lng, radius, limit</td>
                <td className="p-3 text-emerald-400">&lt; 4 ms (In-memory spatial index)</td>
                <td className="p-3 font-sans text-slate-300">Radial distance lookup sorted nearest-first.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span></td>
                <td className="p-3 font-bold text-white">/v1/stations</td>
                <td className="p-3 text-slate-400">state, city, operator, min_power, limit, offset</td>
                <td className="p-3 text-emerald-400">&lt; 6 ms</td>
                <td className="p-3 font-sans text-slate-300">Filtered listing with pagination envelopes.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span></td>
                <td className="p-3 font-bold text-white">/v1/stations/:id</td>
                <td className="p-3 text-slate-400">id (integer)</td>
                <td className="p-3 text-emerald-400">&lt; 1 ms</td>
                <td className="p-3 font-sans text-slate-300">Station details with full plug pinouts and coordinates.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span></td>
                <td className="p-3 font-bold text-white">/v1/states</td>
                <td className="p-3 text-slate-400">None</td>
                <td className="p-3 text-emerald-400">&lt; 2 ms</td>
                <td className="p-3 font-sans text-slate-300">Aggregated station counts by 36 States and UTs.</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span></td>
                <td className="p-3 font-bold text-white">/v1/connectors</td>
                <td className="p-3 text-slate-400">None</td>
                <td className="p-3 text-emerald-400">&lt; 1 ms</td>
                <td className="p-3 font-sans text-slate-300">Dictionary of Indian charging standards & specifications.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

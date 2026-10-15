import React from 'react';

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-mono font-bold text-white uppercase tracking-tight">
          API Technical Reference &amp; Specifications
        </h1>
        <p className="text-slate-400 text-xs font-mono mt-0.5">
          Standard REST contracts, query parameters, error envelopes, and data models.
        </p>
      </div>

      {/* Conventions & Auth Banner */}
      <div className="panel-technical rounded">
        <div className="panel-header font-mono text-xs font-bold text-white uppercase">
          GLOBAL_PROTOCOL_INVARIANTS
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
          <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded">
            <span className="text-blue-400 font-bold block mb-1">AUTHENTICATION:</span>
            <span className="text-slate-300">None. Zero API keys, headers, or registration needed.</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded">
            <span className="text-blue-400 font-bold block mb-1">CORS_POLICY:</span>
            <span className="text-slate-300">Access-Control-Allow-Origin: * on all routes.</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded">
            <span className="text-blue-400 font-bold block mb-1">RATE_LIMIT:</span>
            <span className="text-slate-300">100 requests per 15 minutes per origin IP.</span>
          </div>
          <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded">
            <span className="text-blue-400 font-bold block mb-1">BASE_URL:</span>
            <span className="text-emerald-400">https://ev-charging-stations-api.vercel.app</span>
          </div>
        </div>
      </div>

      {/* Endpoint 1: GET /v1/stations/near */}
      <section className="panel-technical rounded">
        <div className="panel-header flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span>
            <span className="text-white font-bold">/v1/stations/near</span>
          </div>
          <span className="text-slate-400">SPATIAL_RADIUS_LOOKUP</span>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-slate-300 text-xs font-sans leading-relaxed">
            Performs great-circle spatial proximity search to find public EV stations within a specified kilometer radius around a given latitude and longitude. Results are sorted nearest-first.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Parameter</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Required</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">lat</td>
                  <td className="p-2.5">float</td>
                  <td className="p-2.5 text-amber-400">Yes</td>
                  <td className="p-2.5 font-sans">Target latitude coordinate (-90 to 90).</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">lng</td>
                  <td className="p-2.5">float</td>
                  <td className="p-2.5 text-amber-400">Yes</td>
                  <td className="p-2.5 font-sans">Target longitude coordinate (-180 to 180).</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300 font-bold">radius</td>
                  <td className="p-2.5">float</td>
                  <td className="p-2.5 text-slate-500">No</td>
                  <td className="p-2.5 font-sans">Search radius in km. Default: 10, Maximum: 100.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300 font-bold">limit</td>
                  <td className="p-2.5">integer</td>
                  <td className="p-2.5 text-slate-500">No</td>
                  <td className="p-2.5 font-sans">Maximum stations returned. Default: 25, Maximum: 100.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-[#060a12] border border-slate-800 rounded p-3 font-mono text-xs text-slate-300 overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": 1042,
      "name": "Tata Power EZ Charge - Bengaluru Commercial Tech Park #12",
      "operator": "Tata Power EZ Charge",
      "state": "Karnataka",
      "state_code": "KA",
      "district": "Bengaluru Urban",
      "city": "Bengaluru",
      "latitude": 12.9782,
      "longitude": 77.5991,
      "connectors": [
        { "type": "CCS-2", "power_kw": 60, "count": 2 },
        { "type": "Type-2 AC", "power_kw": 22, "count": 1 }
      ],
      "total_capacity_kw": 142,
      "distance_km": 0.88
    }
  ],
  "meta": {
    "center": { "lat": 12.9716, "lng": 77.5946 },
    "radius_km": 10,
    "count": 1,
    "total_found": 18
  }
}`}
          </div>
        </div>
      </section>

      {/* Endpoint 2: GET /v1/stations */}
      <section className="panel-technical rounded">
        <div className="panel-header flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span>
            <span className="text-white font-bold">/v1/stations</span>
          </div>
          <span className="text-slate-400">PAGINATED_INDEX</span>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-slate-300 text-xs font-sans leading-relaxed">
            Paginated list of all public charging stations with state, city, operator, connector type, and minimum power filtering.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Parameter</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">state</td>
                  <td className="p-2.5">string</td>
                  <td className="p-2.5 font-sans">Full state name (e.g. `Karnataka`) or 2-letter state code (`KA`).</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">city</td>
                  <td className="p-2.5">string</td>
                  <td className="p-2.5 font-sans">City name (e.g. `Mumbai`, `Bengaluru`, `Delhi`).</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">operator</td>
                  <td className="p-2.5">string</td>
                  <td className="p-2.5 font-sans">Filter by CPO name (e.g. `Tata Power`, `Jio-bp`, `Statiq`).</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">connector</td>
                  <td className="p-2.5">string</td>
                  <td className="p-2.5 font-sans">Filter by plug type: `CCS-2`, `Type-2 AC`, `Bharat DC-001`.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-blue-400 font-bold">min_power_kw</td>
                  <td className="p-2.5">number</td>
                  <td className="p-2.5 font-sans">Filter for stations with at least this total power capacity in kW.</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-300 font-bold">page / limit</td>
                  <td className="p-2.5">integer</td>
                  <td className="p-2.5 font-sans">Pagination controls (page defaults to 1; limit defaults to 25, max 100).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Endpoint 3 & 4 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="panel-technical rounded p-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span>
            <span className="text-white font-bold">/v1/states</span>
          </div>
          <p className="text-slate-400 font-sans text-xs">
            Aggregated station counts across 36 Indian states and union territories with leading operator market share.
          </p>
        </div>

        <div className="panel-technical rounded p-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded font-bold">GET</span>
            <span className="text-white font-bold">/v1/connectors</span>
          </div>
          <p className="text-slate-400 font-sans text-xs">
            Standard specifications for CCS-2, Type-2 AC, Bharat DC-001, and Bharat AC-001 plugs.
          </p>
        </div>
      </section>
    </div>
  );
}

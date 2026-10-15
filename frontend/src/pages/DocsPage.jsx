import React from 'react';

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold text-white">API Reference & Documentation</h1>
        <p className="text-slate-400 text-base">
          Complete specifications, query parameters, error envelopes, and JSON response models for the India EV Charging Station Directory API.
        </p>
      </div>

      {/* Conventions & Auth Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white">Global Protocol Invariants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-white">Authentication:</strong> None. Zero API keys, tokens, or signups required.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-white">CORS:</strong> Enabled (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded">Access-Control-Allow-Origin: *</code>) on all routes.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-white">Rate Limit:</strong> 100 requests per 15 minutes per IP address.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-white">Base URL:</strong> <code className="text-xs text-emerald-400 font-mono">https://ev-charging-stations-api.vercel.app</code>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint 1: GET /v1/stations/near */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">GET</span>
          <h3 className="text-xl font-mono text-white font-bold">/v1/stations/near</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Performs great-circle spatial proximity search to find public EV stations within a specified kilometer radius around a given latitude and longitude.
        </p>

        <h4 className="text-sm font-semibold text-slate-200">Query Parameters</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-lg">
            <thead className="bg-slate-900 text-slate-400 font-mono">
              <tr>
                <th className="p-3">Parameter</th>
                <th className="p-3">Type</th>
                <th className="p-3">Required</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              <tr>
                <td className="p-3 text-emerald-400 font-bold">lat</td>
                <td className="p-3">float</td>
                <td className="p-3 text-amber-400">Yes</td>
                <td className="p-3 font-sans">Target latitude coordinate (-90 to 90).</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400 font-bold">lng</td>
                <td className="p-3">float</td>
                <td className="p-3 text-amber-400">Yes</td>
                <td className="p-3 font-sans">Target longitude coordinate (-180 to 180).</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">radius</td>
                <td className="p-3">float</td>
                <td className="p-3 text-slate-400">No</td>
                <td className="p-3 font-sans">Search radius in kilometers. Default is 10 km (max 100 km).</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">limit</td>
                <td className="p-3">integer</td>
                <td className="p-3 text-slate-400">No</td>
                <td className="p-3 font-sans">Maximum results returned. Default is 25 (max 100).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-semibold text-slate-200 pt-2">Sample Response</h4>
        <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
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
      "address": "Commercial Tech Park, Sector 14, Bengaluru, Karnataka - India",
      "latitude": 12.9782,
      "longitude": 77.5991,
      "connectors": [
        { "type": "CCS-2", "power_kw": 60, "count": 2 },
        { "type": "Type-2 AC", "power_kw": 22, "count": 1 }
      ],
      "total_capacity_kw": 142,
      "access_type": "Public",
      "status": "Operational",
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
        </pre>
      </section>

      {/* Endpoint 2: GET /v1/stations */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">GET</span>
          <h3 className="text-xl font-mono text-white font-bold">/v1/stations</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Paginated list of all public charging stations with state, city, operator, connector type, and minimum power filtering.
        </p>

        <h4 className="text-sm font-semibold text-slate-200">Query Parameters</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-lg">
            <thead className="bg-slate-900 text-slate-400 font-mono">
              <tr>
                <th className="p-3">Parameter</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              <tr>
                <td className="p-3 text-emerald-400">state</td>
                <td className="p-3">string</td>
                <td className="p-3 font-sans">Full state name (e.g. `Karnataka`) or 2-letter state code (`KA`).</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">city</td>
                <td className="p-3">string</td>
                <td className="p-3 font-sans">City name (e.g. `Mumbai`, `Bengaluru`, `Delhi`).</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">operator</td>
                <td className="p-3">string</td>
                <td className="p-3 font-sans">Filter by CPO name (e.g. `Tata Power`, `Jio-bp`, `Statiq`).</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">connector</td>
                <td className="p-3">string</td>
                <td className="p-3 font-sans">Filter by plug type: `CCS-2`, `Type-2 AC`, `Bharat DC-001`.</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">min_power_kw</td>
                <td className="p-3">number</td>
                <td className="p-3 font-sans">Filter for stations with at least this total power capacity in kW.</td>
              </tr>
              <tr>
                <td className="p-3 text-emerald-400">page / limit</td>
                <td className="p-3">integer</td>
                <td className="p-3 font-sans">Pagination controls (page defaults to 1; limit defaults to 25, max 100).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Endpoint 3: GET /v1/states */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">GET</span>
          <h3 className="text-xl font-mono text-white font-bold">/v1/states</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Returns aggregated public charging station totals across Indian states and union territories along with dominant operators.
        </p>
      </section>

      {/* Endpoint 4: GET /v1/connectors */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">GET</span>
          <h3 className="text-xl font-mono text-white font-bold">/v1/connectors</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Reference catalog detailing IS/IEC/AIS standards, typical power levels, and compatible Indian vehicle types for every connector.
        </p>
      </section>
    </div>
  );
}

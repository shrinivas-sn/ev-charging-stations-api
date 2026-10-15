import React, { useState, useEffect } from 'react';

const CITIES = [
  { name: 'Bengaluru (MG Road)', lat: 12.9716, lng: 77.5946 },
  { name: 'New Delhi (Connaught Place)', lat: 28.6315, lng: 77.2167 },
  { name: 'Mumbai (BKC)', lat: 19.0657, lng: 72.8688 },
  { name: 'Hyderabad (Hitec City)', lat: 17.4435, lng: 78.3772 },
  { name: 'Chennai (Guindy)', lat: 13.0067, lng: 80.2024 },
  { name: 'Pune (Shivajinagar)', lat: 18.5314, lng: 73.8446 },
  { name: 'Ahmedabad (SG Highway)', lat: 23.0338, lng: 72.5085 },
  { name: 'Kolkata (Salt Lake)', lat: 22.5804, lng: 88.4237 }
];

export default function PlaygroundPage() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [lat, setLat] = useState(CITIES[0].lat.toString());
  const [lng, setLng] = useState(CITIES[0].lng.toString());
  const [radius, setRadius] = useState('15');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleCitySelect = (e) => {
    const city = CITIES.find((c) => c.name === e.target.value);
    if (city) {
      setSelectedCity(city);
      setLat(city.lat.toString());
      setLng(city.lng.toString());
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLng(pos.coords.longitude.toFixed(4));
        setSelectedCity(null);
      },
      (err) => {
        alert(`Location access denied: ${err.message}`);
      }
    );
  };

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/v1/stations/near?lat=${lat}&lng=${lng}&radius=${radius}&limit=15`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to fetch stations');
      }
      setResponse(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery();
  }, [lat, lng, radius]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white uppercase tracking-tight">
            Spatial Proximity Workbench
          </h1>
          <p className="text-slate-400 text-xs font-mono mt-0.5">
            Real-time Haversine distance search across 27,248 indexed Indian EV charging hubs.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          <span>ENDPOINT: </span>
          <span className="text-blue-400 font-bold">GET /v1/stations/near</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Query Controls Column */}
        <div className="lg:col-span-4 panel-technical rounded text-xs font-mono space-y-4">
          <div className="panel-header font-bold text-white uppercase">
            PARAMETER_CONTROLS
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold block">METRO_PRESET</label>
              <select
                value={selectedCity ? selectedCity.name : ''}
                onChange={handleCitySelect}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="" disabled>Select metro area</option>
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">LATITUDE</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">LONGITUDE</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleUseMyLocation}
              className="w-full py-1.5 px-3 text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
            >
              LOCATE: USE CURRENT GPS COORDS
            </button>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">SEARCH_RADIUS</span>
                <span className="text-blue-400 font-bold">{radius} km</span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full accent-blue-600"
              />
            </div>

            <button
              onClick={runQuery}
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded disabled:opacity-50 transition-colors"
            >
              {loading ? 'CALCULATING_PROXIMITY...' : 'DISPATCH QUERY'}
            </button>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-normal">
              Haversine formula computes great-circle distance between coordinate pairs (r = 6,371 km).
            </div>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="panel-technical rounded">
            <div className="panel-header flex items-center justify-between font-mono text-xs">
              <span className="text-white font-bold">
                PROXIMITY_RESULTS {response && `(${response.data.length})`}
              </span>
              {response && (
                <span className="text-slate-400">
                  TOTAL_IN_RADIUS: <strong className="text-emerald-400">{response.meta.total_found}</strong>
                </span>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-950/40 border-b border-red-800 text-red-200 text-xs font-mono">
                QUERY_ERROR: {error}
              </div>
            )}

            {response && (
              <div className="divide-y divide-slate-800">
                {response.data.map((st) => (
                  <div key={st.id} className="p-4 space-y-2 hover:bg-slate-900/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 font-mono">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{st.name}</span>
                          <span className="text-[10px] text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded bg-slate-900">
                            ID: {st.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-sans mt-0.5">{st.address}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {st.city}, {st.state} • CPO: {st.operator}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-bold font-mono bg-blue-950 text-blue-300 border border-blue-800 rounded">
                          {st.distance_km} km away
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs font-mono">
                      <span className="text-slate-400">PLUGS:</span>
                      {st.connectors.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-800/80 text-slate-300 border border-slate-700 rounded text-[11px]">
                          {c.type} • {c.power_kw}kW ({c.count}x)
                        </span>
                      ))}
                      <span className="text-emerald-400 text-[11px] ml-auto">
                        TOTAL: {st.total_capacity_kw} kW
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

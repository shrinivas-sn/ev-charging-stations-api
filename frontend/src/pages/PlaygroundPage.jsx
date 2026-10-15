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
  const [connector, setConnector] = useState('');
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
      let url = `/v1/stations/near?lat=${lat}&lng=${lng}&radius=${radius}&limit=15`;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Interactive Station Playground</h1>
        <p className="text-slate-400 text-sm mt-1">
          Test the live Indian EV Charging API in your browser using coordinates or preset metro hubs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Query Controls Column */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5 h-fit">
          <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs text-emerald-400">
            Search Parameters
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Quick Metro Preset</label>
            <select
              value={selectedCity ? selectedCity.name : ''}
              onChange={handleCitySelect}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Select a city</option>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Latitude</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Longitude</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleUseMyLocation}
            className="w-full py-2 px-3 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Use My Current Location
          </button>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span>Radius (km)</span>
              <span className="text-emerald-400 font-mono">{radius} km</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full accent-emerald-500"
            />
          </div>

          <button
            onClick={runQuery}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-slate-950 font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Searching Stations...' : 'Execute /v1/stations/near'}
          </button>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Nearby Charging Stations {response && `(${response.data.length})`}
            </h3>
            {response && (
              <span className="text-xs text-slate-400 font-mono">
                Total in area: {response.meta.total_found}
              </span>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm">
              Error: {error}
            </div>
          )}

          {response && (
            <div className="space-y-3">
              {response.data.map((st) => (
                <div key={st.id} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-base">{st.name}</h4>
                      <p className="text-xs text-slate-400">{st.address}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {st.distance_km} km away
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
                    <span className="text-xs font-medium text-slate-400">Connectors:</span>
                    {st.connectors.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                        {c.type} • {c.power_kw}kW ({c.count}x)
                      </span>
                    ))}
                    <span className="text-xs text-cyan-400 font-mono ml-auto">
                      {st.total_capacity_kw} kW Total Capacity
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

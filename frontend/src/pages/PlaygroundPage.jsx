import React, { useState, useEffect } from 'react';
import StationMap from '../components/StationMap';

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

const CONNECTOR_FILTERS = [
  { label: 'ALL PLUGS', value: '' },
  { label: 'CCS-2 (DC)', value: 'CCS-2' },
  { label: 'TYPE-2 (AC)', value: 'Type-2 AC' },
  { label: 'BHARAT DC', value: 'Bharat DC-001' }
];

export default function PlaygroundPage() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [lat, setLat] = useState(CITIES[0].lat.toString());
  const [lng, setLng] = useState(CITIES[0].lng.toString());
  const [radius, setRadius] = useState('15');
  const [connectorFilter, setConnectorFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);

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
        const userLat = Number(pos.coords.latitude.toFixed(4));
        const userLng = Number(pos.coords.longitude.toFixed(4));
        setLat(userLat.toString());
        setLng(userLng.toString());
        setSelectedCity(null);
      },
      (err) => {
        alert(`Location access denied or unavailable: ${err.message}`);
      }
    );
  };

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/v1/stations/near?lat=${lat}&lng=${lng}&radius=${radius}&limit=25`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to query nearby stations');
      }
      setResponse(json);
      if (json.data && json.data.length > 0) {
        setSelectedStationId(json.data[0].id);
      } else {
        setSelectedStationId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery();
  }, [lat, lng, radius]);

  // Client-side connector filtering
  const allStations = response?.data || [];
  const filteredStations = connectorFilter
    ? allStations.filter((st) =>
        st.connectors?.some((c) => c.type.toLowerCase().includes(connectorFilter.toLowerCase()))
      )
    : allStations;

  const centerCoords = {
    lat: parseFloat(lat) || 12.9716,
    lng: parseFloat(lng) || 77.5946
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white uppercase tracking-tight">
            Spatial Proximity &amp; Mapping Workbench
          </h1>
          <p className="text-slate-400 text-xs font-mono mt-0.5">
            Interactive Haversine spatial lookup &amp; live OpenStreetMap telemetry across 27,248 stations.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">DATA_ENGINE:</span>
          <span className="text-emerald-400 font-bold">HAVERSINE_SPATIAL_V1</span>
        </div>
      </div>

      {/* Main Workbench Layout: Controls + List (Left) & Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Query Parameters & Stations Feed (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Box */}
          <div className="panel-technical rounded text-xs font-mono">
            <div className="panel-header flex items-center justify-between">
              <span className="font-bold text-white uppercase">SEARCH_PARAMETERS</span>
              <span className="text-slate-400">RADIUS: {radius} KM</span>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="space-y-1">
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
                className="w-full py-1.5 px-3 text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>LOCATE: USE CURRENT GPS COORDS</span>
              </button>

              <div className="space-y-1">
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

              {/* Plug Filter Tabs */}
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <label className="text-slate-400 text-[11px] block">CONNECTOR_FILTER</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {CONNECTOR_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setConnectorFilter(f.value)}
                      className={`px-1.5 py-1 text-[10px] font-mono rounded border transition-colors ${
                        connectorFilter === f.value
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={runQuery}
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded disabled:opacity-50 transition-colors"
              >
                {loading ? 'CALCULATING_PROXIMITY...' : 'EXECUTE /v1/stations/near'}
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="panel-technical rounded">
            <div className="panel-header flex items-center justify-between font-mono text-xs">
              <span className="text-white font-bold">
                NEARBY_STATIONS ({filteredStations.length})
              </span>
              {response && (
                <span className="text-slate-400 text-[11px]">
                  TOTAL_IN_RADIUS: <strong className="text-emerald-400">{response.meta.total_found}</strong>
                </span>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border-b border-red-800 text-red-200 text-xs font-mono">
                QUERY_ERROR: {error}
              </div>
            )}

            <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto">
              {filteredStations.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500">
                  NO STATIONS FOUND WITHIN {radius} KM. TRY EXPANDING RADIUS SLIDER.
                </div>
              ) : (
                filteredStations.map((st) => {
                  const isSelected = selectedStationId === st.id;
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStationId(st.id)}
                      className={`p-3.5 space-y-1.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-800/70 border-l-2 border-blue-500' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 font-mono text-xs">
                        <div>
                          <div className="text-white font-bold text-xs line-clamp-1">{st.name}</div>
                          <div className="text-slate-400 text-[11px] font-sans line-clamp-1">{st.address}</div>
                        </div>
                        <span className="shrink-0 px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-bold text-[11px]">
                          {st.distance_km} km
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <span>CPO: {st.operator}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{st.total_capacity_kw} kW</span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${st.latitude},${st.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto text-blue-400 hover:underline"
                        >
                          Directions ↗
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Leaflet OpenStreetMap Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-20">
          <div className="panel-technical rounded">
            <div className="panel-header flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-white font-bold">LIVE_TELEMETRY_MAP</span>
              </div>
              <span className="text-slate-400">CARTO_DARK_MATTER // OSM</span>
            </div>

            <div className="p-3">
              <StationMap
                center={centerCoords}
                radiusKm={Number(radius) || 15}
                stations={filteredStations}
                selectedStationId={selectedStationId}
                onSelectStation={(id) => setSelectedStationId(id)}
              />
            </div>

            <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0d9488]"></span>
                  <span>DC Fast (&ge;50kW)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                  <span>Standard AC / Fleet</span>
                </span>
              </div>
              <div>Click any pin or list item to pan &amp; view telemetry</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

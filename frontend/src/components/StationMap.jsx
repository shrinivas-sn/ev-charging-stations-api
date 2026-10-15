import React, { useState, useEffect, useRef } from 'react';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

export default function StationMap({
  center,
  radiusKm,
  stations = [],
  selectedStationId,
  onSelectStation
}) {
  const [isDark, setIsDark] = useState(true);
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const circleRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const markersMapRef = useRef(new Map());

  // Initialize map once client mounts
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !containerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: radiusKm > 30 ? 10 : radiusKm > 15 ? 11 : 12,
        zoomControl: true,
      });

      // 100% Free, Keyless, OpenStreetMap Standard Tiles (Zero API Key, Zero Watermarks)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      updateCenterAndRadius(L, map, center, radiusKm);
      renderStationMarkers(L, layerGroup, stations, selectedStationId, onSelectStation);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center & search radius circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((mod) => {
      const L = mod.default;
      updateCenterAndRadius(L, mapInstanceRef.current, center, radiusKm);
    });
  }, [center.lat, center.lng, radiusKm]);

  // Update markers when stations list changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    import('leaflet').then((mod) => {
      const L = mod.default;
      renderStationMarkers(L, layerGroupRef.current, stations, selectedStationId, onSelectStation);
    });
  }, [stations]);

  // Focus station marker on user click
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStationId) return;
    const marker = markersMapRef.current.get(selectedStationId);
    if (marker) {
      marker.openPopup();
      mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true, duration: 0.4 });
    }
  }, [selectedStationId]);

  function updateCenterAndRadius(L, map, centerCoords, radius) {
    if (!map) return;
    const zoomLevel = radius > 30 ? 10 : radius > 15 ? 11 : 12;
    map.setView([centerCoords.lat, centerCoords.lng], zoomLevel);

    if (circleRef.current) {
      circleRef.current.remove();
    }
    const circle = L.circle([centerCoords.lat, centerCoords.lng], {
      radius: radius * 1000,
      color: '#3b82f6',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
    }).addTo(map);
    circleRef.current = circle;

    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
    }
    const centerIcon = L.divIcon({
      className: 'custom-center-marker',
      html: `<div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
        <span style="position:absolute; width:20px; height:20px; border-radius:50%; background:rgba(59,130,246,0.3); border:1px solid #3b82f6;"></span>
        <span style="width:8px; height:8px; border-radius:50%; background:#60a5fa; box-shadow:0 0 6px #3b82f6;"></span>
      </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const centerMarker = L.marker([centerCoords.lat, centerCoords.lng], { icon: centerIcon })
      .bindTooltip('Origin Coordinate', { permanent: false, direction: 'top' })
      .addTo(map);
    centerMarkerRef.current = centerMarker;
  }

  function renderStationMarkers(L, layerGroup, stationList, activeId, selectFn) {
    layerGroup.clearLayers();
    markersMapRef.current.clear();

    stationList.forEach((st) => {
      const isFast = st.total_capacity_kw >= 50;
      const markerColor = isFast ? '#0d9488' : '#3b82f6';
      const markerLabel = isFast ? `${st.total_capacity_kw}kW` : `${st.connectors?.length || 1} plugs`;

      const stationIcon = L.divIcon({
        className: 'station-tech-marker',
        html: `<div style="background:#0e1526; border:1px solid ${markerColor}; color:#f1f5f9; font-family:ui-monospace, monospace; font-size:10px; font-weight:700; padding:2px 5px; border-radius:3px; display:inline-flex; align-items:center; gap:3px; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          <span style="width:5px; height:5px; border-radius:50%; background:${markerColor};"></span>
          <span>${markerLabel}</span>
        </div>`,
        iconSize: [52, 22],
        iconAnchor: [26, 11],
        popupAnchor: [0, -12],
      });

      const connectorsHtml = (st.connectors || [])
        .map((c) => `<span style="background:#1b263b; color:#94a3b8; padding:1px 4px; border-radius:2px; font-size:9px; margin-right:3px;">${c.type} ${c.power_kw}kW</span>`)
        .join('');

      const popupContent = `
        <div style="font-family:ui-monospace, monospace; color:#f1f5f9; background:#080c14; padding:8px 10px; border:1px solid #1b263b; border-radius:4px; min-width:220px; max-width:260px; font-size:11px;">
          <div style="font-weight:700; color:#fff; font-size:12px; margin-bottom:2px; line-height:1.2;">${escapeHtml(st.name)}</div>
          <div style="color:#94a3b8; font-size:10px; font-family:sans-serif; margin-bottom:6px; line-height:1.3;">${escapeHtml(st.address || '')}</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:3px; border-top:1px solid #1b263b; padding-top:4px;">
            <span style="color:#64748b;">Distance:</span>
            <span style="color:#60a5fa; font-weight:700;">${st.distance_km || 0} km</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span style="color:#64748b;">Capacity:</span>
            <span style="color:#34d399; font-weight:700;">${st.total_capacity_kw || 0} kW</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#64748b;">Operator:</span>
            <span style="color:#cbd5e1;">${escapeHtml(st.operator || 'Independent')}</span>
          </div>
          <div style="margin-bottom:8px; line-height:1.4;">
            ${connectorsHtml}
          </div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${st.latitude},${st.longitude}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; background:#1e293b; color:#60a5fa; padding:4px 6px; border-radius:3px; text-decoration:none; font-weight:600; border:1px solid #334155;">
            Navigate via Google Maps ↗
          </a>
        </div>
      `;

      const marker = L.marker([st.latitude, st.longitude], { icon: stationIcon })
        .bindPopup(popupContent, { className: 'custom-leaflet-popup' });

      marker.on('click', () => {
        if (selectFn) selectFn(st.id);
      });

      marker.addTo(layerGroup);
      markersMapRef.current.set(st.id, marker);
    });
  }

  return (
    <div className={`relative w-full h-full min-h-[400px] sm:min-h-[480px] bg-[#060a12] border border-slate-800 rounded overflow-hidden ${isDark ? 'dark-tiles' : ''}`}>
      {/* Light / Dark Mode Map Toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center bg-[#0e1526]/90 border border-slate-700/80 rounded p-1 text-[10px] font-mono shadow-md backdrop-blur">
        <button
          onClick={() => setIsDark(true)}
          className={`px-2 py-0.5 rounded transition-colors ${
            isDark ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          DARK
        </button>
        <button
          onClick={() => setIsDark(false)}
          className={`px-2 py-0.5 rounded transition-colors ${
            !isDark ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          LIGHT
        </button>
      </div>

      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '480px' }} />
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { isFastDc, mappableStations, standardLabel, vehicleLabel } from '../lib/stations';
import { mapColors, palette } from '../lib/palette';

/**
 * Interactive radius map.
 *
 * Basemap: OpenFreeMap public instance (https://openfreemap.org) — OpenStreetMap
 * data as vector tiles, no API key, no registration and no request limits.
 * Attribution is rendered by MapLibre and must stay visible.
 *
 * MapLibre is imported dynamically so it never runs during static rendering, and
 * the whole page degrades to the station list if WebGL is unavailable.
 */

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const SOURCE_STATIONS = 'stations';
const SOURCE_SELECTED = 'station-selected';
const SOURCE_RADIUS = 'search-radius';
const LAYER_RADIUS_FILL = 'search-radius-fill';
const LAYER_RADIUS_LINE = 'search-radius-line';
const LAYER_STATION_HALO = 'station-halo';
const LAYER_STATION_DOT = 'station-dot';
const LAYER_SELECTED = 'station-selected-ring';

const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> © <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · Data <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}

/** Ring of coordinates at a given radius, used to draw the search radius. */
function radiusPolygon(lat, lng, radiusKm, steps = 96) {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    points.push([lng + longitudeDelta * Math.cos(angle), latitudeDelta * Math.sin(angle) + lat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [points] } };
}

function stationsFeatureCollection(stations) {
  return {
    type: 'FeatureCollection',
    features: mappableStations(stations).map((station) => ({
      type: 'Feature',
      id: station.id,
      properties: {
        id: station.id,
        operator: station.operator || 'Unknown operator',
        address: station.address || '',
        city: station.city || '',
        state: station.state || '',
        max_power_kw: station.max_power_kw || 0,
        distance_km: station.distance_km,
        vehicles: typeof station.vehicles === 'string' ? station.vehicles : vehicleLabel(station.vehicle_classes),
        chargers: station.total_chargers || station.chargers || 0,
        is_fast_dc: typeof station.is_fast_dc === 'number' ? station.is_fast_dc : (isFastDc(station) ? 1 : 0),
        connectors: station.connectors || Object.entries(station.max_kw_by_standard || {})
          .map(([id, kw]) => `${standardLabel(id)} ${kw} kW`)
          .join(' · '),
        latitude: station.latitude,
        longitude: station.longitude,
      },
      geometry: { type: 'Point', coordinates: [station.longitude, station.latitude] },
    })),
  };
}

function popupHtml(properties) {
  const distance =
    typeof properties.distance_km === 'number' ? `${properties.distance_km} km away` : null;
  const connectors = properties.connectors ? properties.connectors.split(' · ') : [];

  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:10px 12px;min-width:220px;max-width:270px;box-sizing:border-box;">
      <div style="font-size:14px;font-weight:600;color:${palette.ink};line-height:1.3;padding-right:18px;">${escapeHtml(
        properties.operator
      )}${properties.city ? ` · ${escapeHtml(properties.city)}` : ''}</div>
      <div style="margin-top:2px;font-size:12px;color:${palette.muted};line-height:1.35;max-height:34px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(
        properties.address
      )}</div>
      <dl style="margin:8px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:12px;line-height:1.35;color:${palette.muted};">
        <dt style="color:${palette.muted};">Power</dt><dd style="margin:0;color:${palette.ink};">up to ${escapeHtml(
          properties.max_power_kw
        )} kW</dd>
        <dt style="color:${palette.muted};">Vehicles</dt><dd style="margin:0;color:${palette.ink};">${escapeHtml(
          properties.vehicles
        )}</dd>
        <dt style="color:${palette.muted};">Chargers</dt><dd style="margin:0;color:${palette.ink};">${escapeHtml(
          properties.chargers
        )}</dd>
        ${
          distance
            ? `<dt style="color:${palette.muted};">Distance</dt><dd style="margin:0;color:${palette.ink};font-weight:600;">${distance}</dd>`
            : ''
        }
      </dl>
      ${
        connectors.length
          ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px;">${connectors
              .slice(0, 4)
              .map(
                (connector) =>
                  `<span style="border:1px solid ${palette.line};background:${palette.subtle};border-radius:4px;padding:1px 4px;font-size:11px;color:${palette.ink};">${escapeHtml(
                    connector
                  )}</span>`
              )
              .join('')}${
              connectors.length > 4
                ? `<span style="font-size:11px;color:${palette.muted};padding:1px 2px;">+${connectors.length - 4} more</span>`
                : ''
            }</div>`
        : ''
      }
      <a href="https://www.google.com/maps?q=${properties.latitude},${properties.longitude}"
         target="_blank" rel="noopener noreferrer"
         style="display:block;margin-top:8px;text-align:center;background:${palette.accent};color:${palette.ink};padding:6px 8px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:600;">
        Open in Google Maps
      </a>
    </div>`;
}

export default function StationMap({ center, radiusKm, stations = [], selectedStationId, onSelectStation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const libRef = useRef(null);
  const popupRef = useRef(null);
  const selectionRef = useRef(onSelectStation);
  const stationsRef = useRef(stations);
  const openPopupRef = useRef(null);
  const [status, setStatus] = useState('loading');

  selectionRef.current = onSelectStation;
  stationsRef.current = stations;

  // Create the map exactly once, on the client.
  useEffect(() => {
    let cancelled = false;
    let map;

    async function init() {
      if (typeof window === 'undefined' || !containerRef.current) return;

      let maplibregl;
      try {
        maplibregl = await import('maplibre-gl');
      } catch {
        if (!cancelled) setStatus('unavailable');
        return;
      }
      if (cancelled || !containerRef.current) return;

      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style: STYLE_URL,
          center: [center.lng, center.lat],
          zoom: 11,
          attributionControl: { compact: true },
        });
      } catch {
        if (!cancelled) setStatus('unavailable');
        return;
      }

      mapRef.current = map;
      libRef.current = maplibregl;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => {
        if (cancelled) return;
        setStatus('ready');
      });

      map.on('error', () => {
        if (!cancelled && !map.loaded()) setStatus('unavailable');
      });

      map.on('click', LAYER_STATION_DOT, (event) => {
        const feature = event.features && event.features[0];
        if (feature) {
          const id = String(feature.properties.id);
          if (selectionRef.current) selectionRef.current(id);
          if (openPopupRef.current) openPopupRef.current(id);
        }
      });

      map.on('mouseenter', LAYER_STATION_DOT, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', LAYER_STATION_DOT, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    init();

    return () => {
      cancelled = true;
      if (popupRef.current) popupRef.current.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)draw sources and layers whenever the data or the search window changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    const windowFeature = radiusPolygon(center.lat, center.lng, radiusKm);

    if (!map.getSource(SOURCE_RADIUS)) {
      map.addSource(SOURCE_RADIUS, { type: 'geojson', data: windowFeature });
      map.addLayer({
        id: LAYER_RADIUS_FILL,
        type: 'fill',
        source: SOURCE_RADIUS,
        paint: { 'fill-color': mapColors.radiusFill, 'fill-opacity': 0.05 },
      });
      map.addLayer({
        id: LAYER_RADIUS_LINE,
        type: 'line',
        source: SOURCE_RADIUS,
        paint: { 'line-color': mapColors.radiusLine, 'line-width': 1, 'line-dasharray': [3, 3] },
      });
    } else {
      map.getSource(SOURCE_RADIUS).setData(windowFeature);
    }

    if (!map.getSource(SOURCE_STATIONS)) {
      map.addSource(SOURCE_STATIONS, {
        type: 'geojson',
        data: stationsFeatureCollection(stations),
      });

      map.addLayer({
        id: LAYER_STATION_HALO,
        type: 'circle',
        source: SOURCE_STATIONS,
        paint: {
          'circle-radius': 9,
          'circle-color': mapColors.selected,
          'circle-opacity': 0.12,
        },
      });

      map.addLayer({
        id: LAYER_STATION_DOT,
        type: 'circle',
        source: SOURCE_STATIONS,
        paint: {
          'circle-radius': 5,
          'circle-color': ['case', ['==', ['get', 'is_fast_dc'], 1], mapColors.fastFill, mapColors.otherFill],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['case', ['==', ['get', 'is_fast_dc'], 1], mapColors.fastStroke, mapColors.otherStroke],
        },
      });
    } else {
      map.getSource(SOURCE_STATIONS).setData(stationsFeatureCollection(stations));
    }

    if (!map.getSource(SOURCE_SELECTED)) {
      map.addSource(SOURCE_SELECTED, { type: 'geojson', data: stationsFeatureCollection([]) });
      map.addLayer({
        id: LAYER_SELECTED,
        type: 'circle',
        source: SOURCE_SELECTED,
        paint: {
          'circle-radius': 11,
          'circle-color': 'transparent',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': mapColors.selected,
        },
      });
    }

    const latSpan = radiusKm / 111.32;
    const lngSpan = radiusKm / (111.32 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
    map.fitBounds(
      [
        [center.lng - lngSpan, center.lat - latSpan],
        [center.lng + lngSpan, center.lat + latSpan],
      ],
      { padding: 36, duration: 0 }
    );
  }, [center.lat, center.lng, radiusKm, stations, status]);

  const openStationPopup = (stationId) => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || status !== 'ready') return;

    const selected = stationsRef.current.find((station) => String(station.id) === String(stationId));
    const selectedSource = map.getSource(SOURCE_SELECTED);

    if (!selected || !selectedSource) {
      if (selectedSource) selectedSource.setData(stationsFeatureCollection([]));
      if (popupRef.current) popupRef.current.remove();
      return;
    }

    selectedSource.setData(stationsFeatureCollection([selected]));
    map.easeTo({
      center: [selected.longitude, selected.latitude],
      offset: [0, 80],
      duration: 300,
    });

    if (popupRef.current) popupRef.current.remove();
    // focusAfterOpen: false — focusing the popup made the browser scroll the page to the map on load.
    popupRef.current = new lib.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 12,
      focusAfterOpen: false,
      maxWidth: '280px',
    })
      .setLngLat([selected.longitude, selected.latitude])
      .setHTML(
        popupHtml({
          ...stationsFeatureCollection([selected]).features[0].properties,
          latitude: selected.latitude,
          longitude: selected.longitude,
        })
      )
      .addTo(map);
  };
  openPopupRef.current = openStationPopup;

  // Focus the selected station and show its popup without reopening the popup on
  // every unrelated re-render of the parent list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    if (!selectedStationId) {
      const selectedSource = map.getSource(SOURCE_SELECTED);
      if (selectedSource) selectedSource.setData(stationsFeatureCollection([]));
      if (popupRef.current) popupRef.current.remove();
      return;
    }

    openStationPopup(selectedStationId);
  }, [selectedStationId, status]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        data-testid="station-map"
        className="h-[420px] w-full overflow-hidden rounded-md border border-line bg-subtle sm:h-[500px]"
      />
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-surface/70 text-sm text-ink-dim">
          Loading map…
        </div>
      )}
      {status === 'unavailable' && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-md border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          The map could not start in this browser. The station list still works.
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StationMap from '../components/StationMap';
import { ApiError, apiGet, buildNearQuery } from '../lib/api';
import { formatCount, useDataset } from '../lib/dataset';
import { isFastDc, standardLabel, vehicleLabel } from '../lib/stations';

const PRESETS = [
  { label: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
  { label: 'New Delhi', lat: 28.6139, lng: 77.209 },
  { label: 'Mumbai, Maharashtra', lat: 19.076, lng: 72.8777 },
  { label: 'Hyderabad, Telangana', lat: 17.385, lng: 78.4867 },
  { label: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { label: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
  { label: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
  { label: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639 },
];

const VEHICLE_OPTIONS = [
  { value: '', label: 'Any vehicle' },
  { value: 'car', label: 'Car (4W)' },
  { value: 'two_three_wheeler', label: 'Two/three-wheeler' },
];

const CURRENT_OPTIONS = [
  { value: '', label: 'AC or DC' },
  { value: 'ac', label: 'AC only' },
  { value: 'dc', label: 'DC only' },
];

// Power one gun delivers to one vehicle, not the charger's total.
const POWER_OPTIONS = [
  { value: '', label: 'Any power' },
  { value: '7', label: '7 kW and above' },
  { value: '22', label: '22 kW and above' },
  { value: '50', label: '50 kW and above (fast)' },
  { value: '100', label: '100 kW and above' },
];

const DEBOUNCE_MS = 450;
const RESULT_LIMIT = 25;

function parseCoordinate(text, bound) {
  const trimmed = String(text).trim();
  if (trimmed === '') return { ok: false, message: 'Required' };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, message: 'Enter a number' };
  if (value < -bound || value > bound) {
    return { ok: false, message: `Must be between -${bound} and ${bound}` };
  }
  return { ok: true, value };
}

function formatRetry(seconds) {
  if (seconds === null || seconds === undefined) return null;
  if (seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}

export default function PlaygroundPage() {
  const dataset = useDataset();

  const [presetIndex, setPresetIndex] = useState(0);
  const [latText, setLatText] = useState(String(PRESETS[0].lat));
  const [lngText, setLngText] = useState(String(PRESETS[0].lng));
  const [radiusKm, setRadiusKm] = useState(15);
  const [connector, setConnector] = useState('');
  const [current, setCurrent] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [minPowerKw, setMinPowerKw] = useState('');
  const [connectorOptions, setConnectorOptions] = useState({ status: 'loading', items: [] });
  const [extraPages, setExtraPages] = useState({ page: 1, items: [], loading: false });

  const [coords, setCoords] = useState({ lat: PRESETS[0].lat, lng: PRESETS[0].lng });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [coordsDirty, setCoordsDirty] = useState(false);

  const [geoState, setGeoState] = useState({ status: 'idle', message: null });
  const [retryAfter, setRetryAfter] = useState(0);

  const abortRef = useRef(null);
  const latValidation = parseCoordinate(latText, 90);
  const lngValidation = parseCoordinate(lngText, 180);

  // Commit typed coordinates only once the user pauses, so a request is never
  // fired for a half-typed latitude.
  useEffect(() => {
    if (!coordsDirty) return undefined;
    const timer = setTimeout(() => {
      if (latValidation.ok && lngValidation.ok) {
        setCoords({ lat: latValidation.value, lng: lngValidation.value });
        setPresetIndex(-1);
        setCoordsDirty(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [latText, lngText, coordsDirty, latValidation.ok, lngValidation.ok]);

  // Fetch on every committed parameter change, cancelling the previous request.
  useEffect(() => {
    if (retryAfter > 0) return undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setExtraPages({ page: 1, items: [], loading: false });
    apiGet(
      buildNearQuery({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
        limit: RESULT_LIMIT,
        connector,
        current,
        vehicle,
        minPowerKw,
      }),
      { signal: controller.signal }
    )
      .then((body) => {
        setResult(body);
        setError(null);
        setSelectedStationId((current) => {
          if (current && body.data.some((station) => station.id === current)) return current;
          return body.data.length > 0 ? body.data[0].id : null;
        });
      })
      .catch((caught) => {
        if (caught.name === 'AbortError') return;
        setError(caught);
        if (caught instanceof ApiError && caught.isRateLimited && caught.retryAfterSeconds) {
          setRetryAfter(caught.retryAfterSeconds);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [coords.lat, coords.lng, radiusKm, connector, current, vehicle, minPowerKw, refreshKey, retryAfter]);

  // Connector choices come from the API, so the list always matches the data.
  useEffect(() => {
    const controller = new AbortController();
    apiGet('/v1/connectors', { signal: controller.signal })
      .then((body) => setConnectorOptions({ status: 'ready', items: body.data }))
      .catch((caught) => {
        if (caught.name !== 'AbortError') setConnectorOptions({ status: 'error', items: [] });
      });
    return () => controller.abort();
  }, []);

  const loadMoreRef = useRef(null);
  const loadMore = useCallback(() => {
    if (!result || extraPages.loading) return;
    const nextPage = extraPages.page + 1;
    const controller = new AbortController();
    loadMoreRef.current = controller;
    setExtraPages((state) => ({ ...state, loading: true }));
    apiGet(
      buildNearQuery({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
        limit: RESULT_LIMIT,
        connector,
        current,
        vehicle,
        minPowerKw,
        page: nextPage,
      }),
      { signal: controller.signal }
    )
      .then((body) =>
        setExtraPages((state) => ({ page: nextPage, items: [...state.items, ...body.data], loading: false }))
      )
      .catch((caught) => {
        if (caught.name === 'AbortError') return;
        setExtraPages((state) => ({ ...state, loading: false }));
        setError(caught);
        if (caught instanceof ApiError && caught.isRateLimited && caught.retryAfterSeconds) {
          setRetryAfter(caught.retryAfterSeconds);
        }
      });
  }, [result, extraPages, coords.lat, coords.lng, radiusKm, connector, current, vehicle, minPowerKw]);

  // A new search makes any pending "load more" obsolete.
  useEffect(
    () => () => {
      if (loadMoreRef.current) loadMoreRef.current.abort();
    },
    [coords.lat, coords.lng, radiusKm, connector, current, vehicle, minPowerKw, refreshKey]
  );

  // Count the rate-limit window down so the user knows when to retry.
  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const timer = setInterval(() => {
      setRetryAfter((seconds) => {
        if (seconds <= 1) {
          setError(null);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const applyPreset = (event) => {
    const index = Number(event.target.value);
    setPresetIndex(index);
    if (index >= 0) {
      const preset = PRESETS[index];
      setLatText(String(preset.lat));
      setLngText(String(preset.lng));
      setCoords({ lat: preset.lat, lng: preset.lng });
      setCoordsDirty(false);
      setGeoState({ status: 'idle', message: null });
    }
  };

  const useMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState({
        status: 'error',
        message: 'This browser does not expose a location API. Enter coordinates manually.',
      });
      return;
    }

    setGeoState({ status: 'locating', message: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        setLatText(String(lat));
        setLngText(String(lng));
        setCoords({ lat, lng });
        setPresetIndex(-1);
        setCoordsDirty(false);
        setGeoState({ status: 'ready', message: `Using your position ${lat}, ${lng}` });
      },
      (positionError) => {
        const messages = {
          1: 'Location permission was denied. Enter coordinates or pick a city instead.',
          2: 'Your position is unavailable right now. Enter coordinates or pick a city instead.',
          3: 'Locating timed out. Try again, or enter coordinates manually.',
        };
        setGeoState({
          status: 'error',
          message: messages[positionError.code] || 'Could not read your location.',
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const stations = result ? [...result.data, ...extraPages.items] : [];
  const totalPages = result ? result.meta.total_pages : 0;
  const mapCenter = coords;

  const errorKind = useMemo(() => {
    if (!error) return null;
    if (error instanceof ApiError && error.isRateLimited) return 'rate-limit';
    if (error instanceof ApiError && error.status === 0) return 'network';
    if (error instanceof ApiError && error.isValidation) return 'validation';
    return 'server';
  }, [error]);

  const isStale = Boolean(error && result);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Radius search playground
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Query <code className="text-xs">/v1/stations/near</code> against{' '}
          {formatCount(dataset.totalStations)} public charging stations from BEE&apos;s list (
          {dataset.snapshotLabel}). Vehicle, current, standard and power filters are applied by
          the API, to one charging gun at a time.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="space-y-4 lg:col-span-5">
          <section className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-ink">Search parameters</h2>
              <span className="hint">
                {radiusKm} km radius · {RESULT_LIMIT} max results
              </span>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="label" htmlFor="preset">
                  City preset
                </label>
                <select
                  autoComplete="off"
                  id="preset"
                  className="field mt-1.5"
                  value={presetIndex}
                  onChange={applyPreset}
                >
                  <option value={-1}>Custom coordinates</option>
                  {PRESETS.map((preset, index) => (
                    <option key={preset.label} value={index}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="lat">
                    Latitude
                  </label>
                  <input
                    id="lat"
                    className={`field mt-1.5 font-mono ${
                      coordsDirty && !latValidation.ok ? 'border-danger' : ''
                    }`}
                    value={latText}
                    onChange={(event) => {
                      setLatText(event.target.value);
                      setCoordsDirty(true);
                    }}
                    inputMode="decimal"
                    autoComplete="off"
                    aria-invalid={coordsDirty && !latValidation.ok}
                    aria-describedby="lat-error"
                  />
                  <p id="lat-error" className="mt-1 text-xs text-danger" role="status">
                    {coordsDirty && !latValidation.ok ? latValidation.message : ''}
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="lng">
                    Longitude
                  </label>
                  <input
                    id="lng"
                    className={`field mt-1.5 font-mono ${
                      coordsDirty && !lngValidation.ok ? 'border-danger' : ''
                    }`}
                    value={lngText}
                    onChange={(event) => {
                      setLngText(event.target.value);
                      setCoordsDirty(true);
                    }}
                    inputMode="decimal"
                    autoComplete="off"
                    aria-invalid={coordsDirty && !lngValidation.ok}
                    aria-describedby="lng-error"
                  />
                  <p id="lng-error" className="mt-1 text-xs text-danger" role="status">
                    {coordsDirty && !lngValidation.ok ? lngValidation.message : ''}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={geoState.status === 'locating'}
                  className="btn-secondary w-full"
                >
                  {geoState.status === 'locating' ? 'Reading your location…' : 'Use my location'}
                </button>
                {geoState.message && (
                  <p
                    className={`mt-2 rounded-md border px-2.5 py-1.5 text-xs ${
                      geoState.status === 'error'
                        ? 'border-danger bg-danger-soft text-danger'
                        : 'border-line bg-subtle text-ink-muted'
                    }`}
                    role={geoState.status === 'error' ? 'alert' : undefined}
                  >
                    {geoState.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="label" htmlFor="radius">
                    Radius
                  </label>
                  <span className="text-sm font-medium text-ink">{radiusKm} km</span>
                </div>
                <input
                  id="radius"
                  type="range"
                  autoComplete="off"
                  min="1"
                  max="100"
                  step="1"
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  className="mt-2 w-full accent-ink"
                />
                <div className="mt-1 flex justify-between text-xs text-ink-dim">
                  <span>1 km</span>
                  <span>API maximum 100 km</span>
                </div>
              </div>

              <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="vehicle">
                    Vehicle
                  </label>
                  <select
                    autoComplete="off"
                    id="vehicle"
                    className="field mt-1.5"
                    value={vehicle}
                    onChange={(event) => setVehicle(event.target.value)}
                  >
                    {VEHICLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="current">
                    Current
                  </label>
                  <select
                    autoComplete="off"
                    id="current"
                    className="field mt-1.5"
                    value={current}
                    onChange={(event) => setCurrent(event.target.value)}
                  >
                    {CURRENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="connector">
                    Standard
                  </label>
                  <select
                    autoComplete="off"
                    id="connector"
                    className="field mt-1.5"
                    value={connector}
                    onChange={(event) => setConnector(event.target.value)}
                    disabled={connectorOptions.status !== 'ready'}
                  >
                    <option value="">Any standard</option>
                    {connectorOptions.items.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {connectorOptions.status === 'error' && (
                    <p className="mt-1 text-xs text-danger" role="status">
                      Could not load the standards list; other filters still work.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="power">
                    Minimum power per gun
                  </label>
                  <select
                    autoComplete="off"
                    id="power"
                    className="field mt-1.5"
                    value={minPowerKw}
                    onChange={(event) => setMinPowerKw(event.target.value)}
                  >
                    {POWER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  disabled={loading || retryAfter > 0}
                >
                  {retryAfter > 0 ? `Rate limited — retry in ${formatRetry(retryAfter)}` : 'Run query'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setConnector('');
                    setCurrent('');
                    setVehicle('');
                    setMinPowerKw('');
                    setRadiusKm(15);
                  }}
                >
                  Reset filters
                </button>
                <span className="hint" aria-live="polite">
                  {loading ? 'Querying…' : 'Up to date'}
                </span>
              </div>
            </div>
          </section>

          {/* Results */}
          <section className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-ink">
                Nearby stations
                <span className="ml-2 font-normal text-ink-dim">
                  {formatCount(result ? result.meta.total_found : null)} within {radiusKm} km
                </span>
              </h2>
            </div>

            {error && (
              <div
                className={`border-b border-line px-4 py-3 text-sm ${
                  errorKind === 'rate-limit'
                    ? 'bg-warn-soft text-ink'
                    : 'bg-danger-soft text-danger'
                }`}
                role="alert"
              >
                <p className="font-medium">
                  {errorKind === 'rate-limit'
                    ? 'Rate limit reached'
                    : errorKind === 'network'
                      ? 'Network error'
                      : errorKind === 'validation'
                        ? 'Invalid query'
                        : 'Request failed'}
                </p>
                <p className="mt-0.5 text-ink-muted">
                  {error.message}
                  {retryAfter > 0 && ` Retrying is possible in ${formatRetry(retryAfter)}.`}
                  {isStale && ' The results below are from the previous successful query.'}
                </p>
                {retryAfter === 0 && (
                  <button
                    type="button"
                    className="btn-secondary mt-2"
                    onClick={() => setRefreshKey((key) => key + 1)}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            <ul className={`divide-y divide-line ${isStale ? 'opacity-60' : ''}`}>
              {stations.length === 0 && !loading && !error && (
                <li className="px-4 py-10 text-center text-sm text-ink-muted">
                  No stations matched. Try a larger radius, or clear the vehicle, current, standard
                  and power filters.
                </li>
              )}
              {stations.length === 0 && loading && (
                <li className="px-4 py-10 text-center text-sm text-ink-dim">
                  Searching within {radiusKm} km…
                </li>
              )}
              {stations.map((station) => {
                const isSelected = station.id === selectedStationId;
                return (
                  <li key={station.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedStationId(station.id)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-accent-soft' : 'hover:bg-subtle'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-medium leading-snug text-ink">
                          {station.operator}
                          <span className="ml-1.5 font-normal text-ink-dim">· {station.city}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-ink">
                          {station.distance_km} km
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-xs leading-relaxed text-ink-dim">{station.address}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span className="font-medium text-ink">up to {station.max_power_kw} kW</span>
                        {isFastDc(station) && <span className="chip-accent">DC fast</span>}
                        <span>{vehicleLabel(station.vehicle_classes)}</span>
                        <span>
                          {station.total_chargers} {station.total_chargers === 1 ? 'charger' : 'chargers'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(station.max_kw_by_standard).map(([id, kw]) => (
                          <span key={id} className="chip">
                            {standardLabel(id)} {kw} kW
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {result && extraPages.page < totalPages && (
              <div className="border-t border-line px-4 py-3">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={loadMore}
                  disabled={extraPages.loading || retryAfter > 0}
                >
                  {extraPages.loading
                    ? 'Loading…'
                    : `Load more (${formatCount(stations.length)} of ${formatCount(result.meta.total_found)})`}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Map */}
        <div className="lg:col-span-7 lg:sticky lg:top-20">
          <section className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-ink">Map</h2>
              <a
                className="hint underline hover:text-ink"
                href={`https://www.openstreetmap.org/#map=13/${mapCenter.lat}/${mapCenter.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open area in OpenStreetMap
              </a>
            </div>
            <div className="p-3">
              <StationMap
                center={mapCenter}
                radiusKm={radiusKm}
                stations={stations}
                selectedStationId={selectedStationId}
                onSelectStation={setSelectedStationId}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent ring-1 ring-ink" aria-hidden="true" />
                Car DC fast (CCS2/CHAdeMO ≥ 50 kW)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ink-dim" aria-hidden="true" />
                Other chargers
              </span>
              <span>Basemap: OpenFreeMap · data © OpenStreetMap contributors</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

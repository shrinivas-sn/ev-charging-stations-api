import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const backendData = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend', 'data');

function readJson(...parts) {
  return JSON.parse(readFileSync(path.join(backendData, ...parts), 'utf8'));
}

const FAST_DC_KW = 50;

/**
 * Builds the small dataset summary the UI renders.
 *
 * Everything here is derived from backend/data so the site can never advertise a
 * number the API does not serve. The result is injected at build time (vite `define`)
 * and is identical for static rendering and the browser bundle.
 */
export function buildDatasetSummary({ apiBaseUrl = null, topStates = 6 } = {}) {
  const stations = readJson('stations.json');
  const meta = readJson('meta.json');
  const statesRef = readJson('reference', 'states.json').states;
  const standardsRef = readJson('reference', 'connector-standards.json').standards;
  const standardById = new Map(standardsRef.map((s) => [s.id, s]));

  const stateCounts = new Map();
  const operatorCounts = new Map();
  const standardCounts = new Map(standardsRef.map((s) => [s.id, 0]));
  const cityKeys = new Set();
  let carStations = 0;
  let carFastDcStations = 0;
  let twoThreeWheelerOnlyStations = 0;

  for (const station of stations) {
    stateCounts.set(station.state_code, (stateCounts.get(station.state_code) || 0) + 1);
    operatorCounts.set(station.operator, (operatorCounts.get(station.operator) || 0) + 1);
    cityKeys.add(`${station.state_code}|${station.city.toLowerCase()}`);
    for (const id of station.standards) standardCounts.set(id, standardCounts.get(id) + 1);
    if (station.vehicle_classes.includes('car')) carStations += 1;
    if (station.vehicle_classes.length === 1 && station.vehicle_classes[0] === 'two_three_wheeler') {
      twoThreeWheelerOnlyStations += 1;
    }
    const fast = Object.entries(station.max_kw_by_standard).some(([id, kw]) => {
      const standard = standardById.get(id);
      return standard.current === 'DC' && standard.vehicle_classes.includes('car') && kw >= FAST_DC_KW;
    });
    if (fast) carFastDcStations += 1;
  }

  const exampleStation =
    stations.find((s) => s.location_quality === 'ok' && (s.max_kw_by_standard.CCS2 || 0) >= 60 && s.state_code === 'KA') ||
    stations.find((s) => s.location_quality === 'ok');

  return {
    totalStations: meta.counts.stations,
    totalChargers: meta.counts.chargers,
    totalStates: meta.counts.states,
    totalCities: cityKeys.size,
    totalOperators: meta.counts.operators,
    suspectLocations: meta.counts.suspect_locations,
    carStations,
    carFastDcStations,
    twoThreeWheelerOnlyStations,
    snapshotLabel: meta.source.snapshot_label,
    pdfCreated: meta.source.pdf_created,
    sourceTitle: meta.source.title,
    sourcePublisher: meta.source.publisher,
    sourceUrl: meta.source.url,
    sourcePageUrl: meta.source.page_url,
    dataNotesUrl: meta.data_notes,
    attribution: meta.attribution,
    apiBaseUrl,
    topStates: [...stateCounts.entries()]
      .map(([code, count]) => ({ code, name: statesRef.find((s) => s.code === code).name, stations: count }))
      .sort((a, b) => b.stations - a.stations || a.name.localeCompare(b.name))
      .slice(0, topStates),
    topOperators: [...operatorCounts.entries()]
      .map(([operator, count]) => ({ operator, stations: count }))
      .sort((a, b) => b.stations - a.stations || a.operator.localeCompare(b.operator))
      .slice(0, 8),
    connectors: standardsRef.map((s) => ({
      id: s.id,
      name: s.name,
      current: s.current,
      vehicle_classes: s.vehicle_classes,
      stations: standardCounts.get(s.id),
    })),
    exampleStation,
  };
}

/**
 * Example requests and the exact JSON the API returns for them, produced by running
 * the backend's own parser and service at build time. The docs can therefore never
 * show a field, count or error the API does not produce.
 */
export function buildDocExamples() {
  const { SPECS, parseQuery } = require('../../backend/src/lib/params.js');
  const { ApiError } = require('../../backend/src/lib/errors.js');
  const service = require('../../backend/src/services/stations-service.js');

  const run = (pathAndQuery, spec, call) => {
    const query = Object.fromEntries(new URL(pathAndQuery, 'http://x').searchParams);
    try {
      const result = call(parseQuery(query, spec));
      return { request: pathAndQuery, status: 200, response: { success: true, data: result.data, meta: result.meta } };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      const body = { success: false, error: { code: error.code, message: error.message } };
      if (error.details) body.error.details = error.details;
      return { request: pathAndQuery, status: error.status, response: body };
    }
  };

  const near = run('/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50&limit=1', SPECS.near, service.getNearbyStations);
  const stations = run('/v1/stations?state=KA&connector=CCS2&min_power_kw=50&limit=1', SPECS.stations, service.getStations);
  const firstId = near.response.data[0].id;
  const station = {
    request: `/v1/stations/${firstId}`,
    status: 200,
    response: { success: true, data: service.getStationById(firstId), meta: service.sourceMeta() },
  };
  const error = run('/v1/stations?min_power=50', SPECS.stations, service.getStations);
  const cities = run('/v1/cities?state=GA', SPECS.cities, service.getCities);
  cities.response.data = cities.response.data.slice(0, 3);
  return { near, stations, station, error, cities };
}

/**
 * Resolves the canonical site origin for this build.
 *
 * Returns null when nothing is configured, in which case the build emits no
 * canonical tags, no sitemap and no robots.txt rather than pointing crawlers at
 * a host that is not serving the site.
 */
export function resolveSiteUrl(env = process.env, fileEnv = {}) {
  const candidate =
    env.SITE_URL ||
    fileEnv.SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : null);

  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    throw new Error(
      `SITE_URL is not a valid absolute URL: '${candidate}'. Expected something like https://example.com`
    );
  }
}

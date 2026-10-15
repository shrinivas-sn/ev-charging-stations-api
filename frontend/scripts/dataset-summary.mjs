import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'backend',
  'data'
);

function readJson(name) {
  return JSON.parse(readFileSync(path.join(dataDir, name), 'utf8'));
}

/**
 * Builds the small dataset summary that the UI renders.
 *
 * Everything here is derived from backend/data/*.json so the site can never
 * advertise a number the API does not actually serve. The result is injected at
 * build time (vite `define`) and is identical for static rendering and the
 * browser bundle.
 */
export function buildDatasetSummary({ apiBaseUrl = null, topStates = 6 } = {}) {
  const stations = readJson('stations.json');
  const states = readJson('states.json');
  const connectors = readJson('connectors.json');
  const meta = readJson('meta.json');

  const connectorCounts = new Map();
  const operatorCounts = new Map();
  const cityKeys = new Set();

  for (const station of stations) {
    operatorCounts.set(station.operator, (operatorCounts.get(station.operator) || 0) + 1);
    cityKeys.add(station.city);
    for (const connector of station.connectors) {
      connectorCounts.set(connector.type, (connectorCounts.get(connector.type) || 0) + 1);
    }
  }

  const exampleStation =
    stations.find(
      (station) =>
        station.total_capacity_kw === 284 &&
        station.connectors.some((connector) => connector.type === 'CCS-2')
    ) || stations[0];

  return {
    totalStations: stations.length,
    totalStates: states.length,
    totalCities: cityKeys.size,
    totalOperators: operatorCounts.size,
    snapshotDate: meta.snapshot_date || null,
    datasetStatus: meta.dataset_status || null,
    datasetLabel: meta.dataset_name || null,
    isOfficial: Boolean(meta.provenance && meta.provenance.is_official),
    apiBaseUrl,
    topStates: [...states]
      .sort((a, b) => b.total_stations - a.total_stations)
      .slice(0, topStates),
    topOperators: [...operatorCounts.entries()]
      .map(([operator, totalStations]) => ({ operator, total_stations: totalStations }))
      .sort((a, b) => b.total_stations - a.total_stations)
      .slice(0, 8),
    connectors: connectors.map((connector) => ({
      id: connector.id,
      name: connector.name,
      standard: connector.standard,
      dataset_type: connector.dataset_type,
      current_type: connector.current_type,
      typical_power_kw: connector.typical_power_kw,
      max_power_kw: connector.max_power_kw,
      stations_with_this_connector: connector.dataset_type
        ? connectorCounts.get(connector.dataset_type) || 0
        : 0,
    })),
    exampleStation,
  };
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
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);

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

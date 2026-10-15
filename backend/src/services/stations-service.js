"use strict";

const path = require("node:path");
const { performance } = require("node:perf_hooks");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const MAX_RADIUS_KM = 100;

let cachedStations = null;
let cachedStates = null;
let cachedConnectors = null;
let cachedMeta = null;
let derivedIndex = null;

/**
 * A query parameter that failed validation. Routes turn this into a 400 with a
 * stable machine-readable code.
 */
class ValidationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Collapses punctuation and case so `CCS-2`, `ccs 2` and `CCS2` are the same
 * token. Used for connector types and city/state lookup keys.
 */
function compactToken(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function trim(value) {
  return typeof value === "string" ? value.trim() : value;
}

/** Accepted spellings for each connector type present in the dataset. */
const CONNECTOR_ALIASES = {
  ccs2: "CCS-2",
  ccs: "CCS-2",
  ccs2dc: "CCS-2",
  combotype2: "CCS-2",
  type2: "Type-2 AC",
  type2ac: "Type-2 AC",
  mennekes: "Type-2 AC",
  ac: "Type-2 AC",
  bharatdc001: "Bharat DC-001",
  bharatdc: "Bharat DC-001",
  dc001: "Bharat DC-001",
  bharatac001: "Bharat AC-001",
  bharatac: "Bharat AC-001",
  ac001: "Bharat AC-001",
};

/** Colloquial and historical city names mapped onto dataset spellings. */
const CITY_ALIASES = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  calcutta: "kolkata",
  cochin: "kochi",
  ernakulam: "kochi",
  gurgaon: "gurugram",
  mysore: "mysuru",
  trivandrum: "thiruvananthapuram",
  trichur: "thrissur",
  trichy: "tiruchirappalli",
  mangalore: "mangaluru",
  belgaum: "belagavi",
  hubli: "hubballi",
  baroda: "vadodara",
  panjim: "panaji",
  pondicherry: "puducherry",
  simla: "shimla",
  prayagraj: "allahabad",
  delhi: "newdelhi",
  newdelhi: "newdelhi",
};

// ---------------------------------------------------------------------------
// Dataset loading
// ---------------------------------------------------------------------------

function loadData() {
  if (cachedStations) return;

  cachedStations = require(path.join(DATA_DIR, "stations.json"));
  cachedStates = require(path.join(DATA_DIR, "states.json"));
  cachedConnectors = require(path.join(DATA_DIR, "connectors.json"));
  cachedMeta = require(path.join(DATA_DIR, "meta.json"));

  // Lookup tables so filters resolve a human token to a canonical value once,
  // then compare against a pre-computed key per station.
  const stateByKey = new Map();
  const cityByKey = new Map();
  const connectorByKey = new Map();

  for (const station of cachedStations) {
    station._stateKey = compactToken(station.state);
    station._stateCodeKey = compactToken(station.state_code);
    station._cityKey = compactToken(station.city);
    station._operatorKey = String(station.operator).toLowerCase();
    station._connectorKeys = station.connectors.map((c) => compactToken(c.type));

    stateByKey.set(station._stateKey, station.state);
    stateByKey.set(station._stateCodeKey, station.state);
    cityByKey.set(station._cityKey, station.city);
    for (const key of station._connectorKeys) connectorByKey.set(key, key);
  }

  const operatorCounts = new Map();
  const connectorCounts = new Map();
  const cityCounts = new Map();
  let totalCapacityKw = 0;

  for (const station of cachedStations) {
    operatorCounts.set(station.operator, (operatorCounts.get(station.operator) || 0) + 1);
    cityCounts.set(station.city, (cityCounts.get(station.city) || 0) + 1);
    totalCapacityKw += station.total_capacity_kw || 0;
    for (const connector of station.connectors) {
      connectorCounts.set(connector.type, (connectorCounts.get(connector.type) || 0) + 1);
    }
  }

  const operators = [...operatorCounts.keys()].sort();

  derivedIndex = {
    stateByKey,
    cityByKey,
    operatorCounts,
    connectorCounts,
    operators,
    operatorLabels: new Map(operators.map((o) => [o.toLowerCase(), o])),
    cities: [...cityCounts.keys()].sort(),
    districts: [...new Set(cachedStations.map((s) => s.district))].sort(),
    totalStations: cachedStations.length,
    totalCapacityKw: Number(totalCapacityKw.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// Parameter validation
// ---------------------------------------------------------------------------

function parseIntParam(name, raw, { min, max, fallback }) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(String(raw).trim());
  if (!Number.isInteger(value)) {
    throw new ValidationError(
      "INVALID_PARAMETER",
      `'${name}' must be an integer, received '${raw}'.`,
      { parameter: name, received: raw, expected: `integer between ${min} and ${max}` }
    );
  }
  if (value < min || value > max) {
    throw new ValidationError(
      "INVALID_PARAMETER",
      `'${name}' must be between ${min} and ${max}, received ${value}.`,
      { parameter: name, received: raw, expected: `integer between ${min} and ${max}` }
    );
  }
  return value;
}

function parseNumberParam(name, raw, { min, max, fallback }) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value)) {
    throw new ValidationError(
      "INVALID_PARAMETER",
      `'${name}' must be a number, received '${raw}'.`,
      { parameter: name, received: raw, expected: "number" }
    );
  }
  if (min !== undefined && value < min) {
    throw new ValidationError(
      "INVALID_PARAMETER",
      `'${name}' must be at least ${min}, received ${value}.`,
      { parameter: name, received: raw, expected: `number >= ${min}` }
    );
  }
  if (max !== undefined && value > max) {
    throw new ValidationError(
      "INVALID_PARAMETER",
      `'${name}' must be at most ${max}, received ${value}.`,
      { parameter: name, received: raw, expected: `number <= ${max}` }
    );
  }
  return value;
}

function parseLatitude(raw) {
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new ValidationError(
      "INVALID_LATITUDE",
      `'lat' must be a number between -90 and 90, received '${raw}'.`,
      { parameter: "lat", received: raw, expected: "number between -90 and 90" }
    );
  }
  return value;
}

function parseLongitude(raw) {
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new ValidationError(
      "INVALID_LONGITUDE",
      `'lng' must be a number between -180 and 180, received '${raw}'.`,
      { parameter: "lng", received: raw, expected: "number between -180 and 180" }
    );
  }
  return value;
}

/**
 * Every resolver returns a matched index `key` plus the dataset's `label` for
 * that value. Filtering compares keys; metadata reports labels.
 */
function resolveState(raw) {
  if (raw === undefined || trim(raw) === "") return null;
  const input = trim(raw);
  const label = derivedIndex.stateByKey.get(compactToken(input));
  if (!label) {
    throw new ValidationError(
      "UNKNOWN_STATE",
      `'state' does not match any state or union territory in this dataset: '${input}'.`,
      {
        parameter: "state",
        received: input,
        expected: "a state name or state code, e.g. 'Karnataka' or 'KA'",
      }
    );
  }
  return { key: compactToken(label), label };
}

function resolveCity(raw) {
  if (raw === undefined || trim(raw) === "") return null;
  const input = trim(raw);
  const key = compactToken(input);
  const label = derivedIndex.cityByKey.get(CITY_ALIASES[key] || key);
  if (!label) {
    throw new ValidationError(
      "UNKNOWN_CITY",
      `'city' does not match any city in this dataset: '${input}'.`,
      {
        parameter: "city",
        received: input,
        expected: "a city name present in this dataset, e.g. 'Bengaluru'",
      }
    );
  }
  return { key: compactToken(label), label };
}

function resolveConnector(raw) {
  if (raw === undefined || trim(raw) === "") return null;
  const input = trim(raw);
  const label = CONNECTOR_ALIASES[compactToken(input)];
  if (!label) {
    throw new ValidationError(
      "UNKNOWN_CONNECTOR",
      `'connector' does not match a known charging standard: '${input}'.`,
      {
        parameter: "connector",
        received: input,
        expected: [...new Set(Object.values(CONNECTOR_ALIASES))],
      }
    );
  }
  return { key: compactToken(label), label };
}

function resolveOperator(raw) {
  if (raw === undefined || trim(raw) === "") return null;
  const input = trim(raw).toLowerCase();
  const exactLabel = derivedIndex.operatorLabels.get(input);
  return exactLabel ? { key: input, label: exactLabel } : { partial: input };
}

// ---------------------------------------------------------------------------
// Spatial maths
// ---------------------------------------------------------------------------

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/** Public shape of a station. Internal index keys are never exposed. */
function projectStation(station) {
  return {
    id: station.id,
    name: station.name,
    operator: station.operator,
    state: station.state,
    state_code: station.state_code,
    district: station.district,
    city: station.city,
    address: station.address,
    latitude: station.latitude,
    longitude: station.longitude,
    connectors: station.connectors,
    total_capacity_kw: station.total_capacity_kw,
    availability: station.availability,
    access_type: station.access_type,
    status: station.status,
  };
}

function matchesFilters(station, filters) {
  if (filters.stateKey && station._stateKey !== filters.stateKey) return false;
  if (filters.cityKey && station._cityKey !== filters.cityKey) return false;
  if (filters.operatorKey && station._operatorKey !== filters.operatorKey) return false;
  if (filters.operatorPartial && !station._operatorKey.includes(filters.operatorPartial)) return false;
  if (filters.minPowerKw !== null && station.total_capacity_kw < filters.minPowerKw) return false;
  if (filters.connectorKey && !station._connectorKeys.includes(filters.connectorKey)) return false;
  return true;
}

function buildFilterSet(query) {
  const state = resolveState(query.state);
  const city = resolveCity(query.city);
  const connector = resolveConnector(query.connector);
  const operator = resolveOperator(query.operator);

  return {
    stateKey: state ? state.key : null,
    cityKey: city ? city.key : null,
    connectorKey: connector ? connector.key : null,
    operatorKey: operator && operator.key ? operator.key : null,
    operatorPartial: operator && operator.partial ? operator.partial : null,
    minPowerKw: parseNumberParam("min_power_kw", query.min_power_kw, {
      min: 0,
      max: 100000,
      fallback: null,
    }),
    labels: {
      state: state ? state.label : null,
      city: city ? city.label : null,
      connector: connector ? connector.label : null,
      operator: operator ? operator.label || operator.partial : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Paginated directory listing with optional state/city/operator/connector and
 * minimum-power filtering. Every supplied filter is validated, so an invalid
 * value is a 400 rather than a silently unfiltered result.
 */
function getStations(query = {}) {
  const startedAt = performance.now();
  loadData();

  const filters = buildFilterSet(query);
  const page = parseIntParam("page", query.page, { min: 1, max: 100000, fallback: 1 });
  const limit = parseIntParam("limit", query.limit, { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT });

  const matched = cachedStations.filter((station) => matchesFilters(station, filters));
  const total = matched.length;
  const startIndex = (page - 1) * limit;

  return {
    data: matched.slice(startIndex, startIndex + limit).map(projectStation),
    meta: {
      total,
      page,
      limit,
      count: Math.min(limit, Math.max(0, total - startIndex)),
      total_pages: Math.ceil(total / limit),
      filters_applied: {
        state: filters.labels.state,
        city: filters.labels.city,
        operator: filters.labels.operator,
        connector: filters.labels.connector,
        min_power_kw: filters.minPowerKw,
      },
      took_ms: Number((performance.now() - startedAt).toFixed(2)),
    },
  };
}

/**
 * Great-circle proximity search around a coordinate, nearest first. Accepts the
 * same operator/connector/min_power_kw filters as the directory listing so
 * callers never need to filter a truncated page client side.
 */
function getNearbyStations(query = {}) {
  const startedAt = performance.now();
  loadData();

  if (query.lat === undefined || trim(query.lat) === "") {
    throw new ValidationError("MISSING_COORDINATES", "'lat' query parameter is required.", {
      parameter: "lat",
    });
  }
  if (query.lng === undefined || trim(query.lng) === "") {
    throw new ValidationError("MISSING_COORDINATES", "'lng' query parameter is required.", {
      parameter: "lng",
    });
  }

  const userLat = parseLatitude(query.lat);
  const userLng = parseLongitude(query.lng);
  const radius = parseNumberParam("radius", query.radius, {
    min: 0.1,
    max: MAX_RADIUS_KM,
    fallback: 10,
  });
  const limit = parseIntParam("limit", query.limit, {
    min: 1,
    max: MAX_LIMIT,
    fallback: DEFAULT_LIMIT,
  });
  const filters = buildFilterSet(query);

  const latDelta = radius / 111.0;
  const cosLat = Math.cos(userLat * (Math.PI / 180));
  const lngDelta = radius / (111.0 * Math.max(cosLat, 0.01));

  const nearby = [];
  for (const station of cachedStations) {
    if (
      station.latitude < userLat - latDelta ||
      station.latitude > userLat + latDelta ||
      station.longitude < userLng - lngDelta ||
      station.longitude > userLng + lngDelta
    ) {
      continue;
    }
    if (!matchesFilters(station, filters)) continue;

    const distance = calculateDistance(userLat, userLng, station.latitude, station.longitude);
    if (distance <= radius) {
      nearby.push({ ...projectStation(station), distance_km: distance });
    }
  }

  nearby.sort((a, b) => a.distance_km - b.distance_km);
  const page = nearby.slice(0, limit);

  return {
    data: page,
    meta: {
      center: { lat: userLat, lng: userLng },
      radius_km: radius,
      count: page.length,
      total_found: nearby.length,
      limit,
      filters_applied: {
        operator: filters.labels.operator,
        connector: filters.labels.connector,
        min_power_kw: filters.minPowerKw,
      },
      took_ms: Number((performance.now() - startedAt).toFixed(2)),
    },
  };
}

function getStationById(rawId) {
  const startedAt = performance.now();
  loadData();

  const id = String(rawId).trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError(
      "INVALID_STATION_ID",
      `'${rawId}' is not a valid station id. Ids are positive integers.`,
      { parameter: "id", received: rawId, expected: "positive integer" }
    );
  }

  const station = cachedStations.find((s) => s.id === Number(id));
  if (!station) return { station: null, took_ms: Number((performance.now() - startedAt).toFixed(2)) };

  return {
    station: projectStation(station),
    took_ms: Number((performance.now() - startedAt).toFixed(2)),
  };
}

function getStatesSummary() {
  const startedAt = performance.now();
  loadData();

  return {
    data: cachedStates,
    meta: {
      count: cachedStates.length,
      total_stations: cachedStations.length,
      total_capacity_kw: derivedIndex.totalCapacityKw,
      took_ms: Number((performance.now() - startedAt).toFixed(2)),
    },
  };
}

function getOperators() {
  const startedAt = performance.now();
  loadData();

  const data = [...derivedIndex.operatorCounts.entries()]
    .map(([name, totalStations]) => ({ operator: name, total_stations: totalStations }))
    .sort((a, b) => b.total_stations - a.total_stations || a.operator.localeCompare(b.operator));

  return {
    data,
    meta: {
      count: data.length,
      total_stations: cachedStations.length,
      took_ms: Number((performance.now() - startedAt).toFixed(2)),
    },
  };
}

function getConnectors() {
  const startedAt = performance.now();
  loadData();

  const counts = derivedIndex.connectorCounts;

  const data = cachedConnectors.map((connector) => ({
    ...connector,
    // How many stations in the current dataset expose this connector. Zero for
    // standards that are documented but absent from the data (see `dataset_type`).
    stations_with_this_connector: connector.dataset_type
      ? counts.get(connector.dataset_type) || 0
      : 0,
  }));

  return {
    data,
    meta: {
      count: data.length,
      took_ms: Number((performance.now() - startedAt).toFixed(2)),
    },
  };
}

/**
 * Dataset provenance and coverage. Counts are derived from the loaded data so
 * they cannot drift from what the endpoints actually serve.
 */
function getDatasetMeta() {
  const startedAt = performance.now();
  loadData();

  return {
    ...cachedMeta,
    total_stations: derivedIndex.totalStations,
    total_states: cachedStates.length,
    total_cities: derivedIndex.cities.length,
    total_districts: derivedIndex.districts.length,
    total_operators: derivedIndex.operators.length,
    total_capacity_kw: derivedIndex.totalCapacityKw,
    took_ms: Number((performance.now() - startedAt).toFixed(2)),
  };
}

module.exports = {
  ValidationError,
  getStations,
  getNearbyStations,
  getStationById,
  getStatesSummary,
  getOperators,
  getConnectors,
  getDatasetMeta,
  MAX_LIMIT,
  MAX_RADIUS_KM,
};

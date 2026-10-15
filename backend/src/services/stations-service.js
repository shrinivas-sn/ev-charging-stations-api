"use strict";

/**
 * Read-only queries over the committed BEE dataset (backend/data/stations.json).
 * The data is loaded and indexed once per process; it only changes on deploy.
 */

const path = require("node:path");
const reference = require("../lib/reference");
const { ApiError } = require("../lib/errors");

const STATION_ID = /^evs_[0-9a-f]{10}$/;
const VEHICLES = ["car", "two_three_wheeler"];
const OWNERSHIPS = ["govt", "private"];
const CURRENTS = ["ac", "dc"];
const LOCATION_QUALITIES = ["ok", "suspect", "any"];

/** Colloquial or former names; a query matches whichever spellings the data uses. */
const CITY_ALIAS_PAIRS = [
  ["bangalore", "bengaluru"],
  ["bombay", "mumbai"],
  ["calcutta", "kolkata"],
  ["madras", "chennai"],
  ["gurgaon", "gurugram"],
  ["mysore", "mysuru"],
  ["mangalore", "mangaluru"],
  ["belgaum", "belagavi"],
  ["hubli", "hubballi"],
  ["trivandrum", "thiruvananthapuram"],
  ["cochin", "kochi"],
  ["baroda", "vadodara"],
  ["poona", "pune"],
  ["allahabad", "prayagraj"],
  ["pondicherry", "puducherry"],
  ["simla", "shimla"],
  ["trichy", "tiruchirappalli"],
  ["vizag", "visakhapatnam"],
  ["panjim", "panaji"],
  ["benares", "varanasi"],
];
const CITY_ALIASES = new Map();
for (const [a, b] of CITY_ALIAS_PAIRS) {
  CITY_ALIASES.set(a, b);
  CITY_ALIASES.set(b, a);
}

const DATA_DIR = path.join(__dirname, "..", "..", "data");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const MAX_RADIUS_KM = 100;
const FAST_DC_KW = 50;

let data = null;
let loads = 0;

function load() {
  if (data) return data;
  loads += 1;

  const stations = require(path.join(DATA_DIR, "stations.json"));
  const meta = require(path.join(DATA_DIR, "meta.json"));
  const byId = new Map();

  for (const station of stations) {
    byId.set(station.id, station);
    // Internal lookup keys; projectStation never exposes them.
    station._cityKey = reference.compactKey(station.city);
    station._districtKey = reference.compactKey(station.district);
    station._guns = station.chargers.flatMap((charger) =>
      charger.guns.map((gun) => {
        const standard = reference.standard(gun.standard);
        return { standard: gun.standard, kw: gun.kw, current: standard.current, classes: standard.vehicle_classes };
      })
    );
    station._carFastDc = station._guns.some(
      (g) => g.current === "DC" && g.classes.includes("car") && g.kw >= FAST_DC_KW
    );
  }

  data = { stations, meta, byId };
  return data;
}

/** Public shape of a station; `withSource` adds the PDF page range (detail endpoint only). */
function projectStation(station, { withSource = false } = {}) {
  const out = {};
  for (const [key, value] of Object.entries(station)) {
    if (key.startsWith("_")) continue;
    if (key === "source" && !withSource) continue;
    out[key] = value;
  }
  return out;
}

function sourceMeta() {
  const { meta } = load();
  return {
    source: { name: meta.source.title, publisher: meta.source.publisher, url: meta.source.url, snapshot_label: meta.source.snapshot_label },
    attribution: meta.attribution,
  };
}

function paginate(items, page, limit) {
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    slice,
    meta: { total: items.length, page, limit, count: slice.length, total_pages: Math.ceil(items.length / limit) },
  };
}

function unknownValue(param, received, validValues, extra = {}) {
  const code = `UNKNOWN_${param.toUpperCase()}`;
  return new ApiError(404, code, `No ${param.replace(/_/g, " ")} matches '${received}'.`, {
    parameter: param,
    received,
    ...(validValues ? { valid_values: validValues } : {}),
    ...extra,
  });
}

function pickEnum(param, raw, values) {
  if (raw === null) return null;
  const value = raw.toLowerCase();
  if (!values.includes(value)) throw unknownValue(param, raw, values);
  return value;
}

/**
 * Turns parsed text values into filter terms. An unknown value is a 404 that lists the
 * valid values (or, for cities and districts, points at /v1/cities).
 */
function resolveFilters(values) {
  const { stations } = load();
  const filters = { labels: {} };

  if (values.state !== null && values.state !== undefined) {
    const state = reference.resolveStateQuery(values.state);
    if (!state) throw unknownValue("state", values.state, reference.states().map((s) => s.name));
    filters.stateCode = state.code;
    filters.labels.state = state.name;
  }

  const inState = (s) => !filters.stateCode || s.state_code === filters.stateCode;
  const hint = `/v1/cities${filters.stateCode ? `?state=${filters.stateCode}` : ""}`;

  if (values.district !== null && values.district !== undefined) {
    const key = reference.compactKey(values.district);
    const match = stations.find((s) => s._districtKey === key && inState(s));
    if (!match) throw unknownValue("district", values.district, null, { hint });
    filters.districtKey = key;
    filters.labels.district = match.district;
  }

  if (values.city !== null && values.city !== undefined) {
    const key = reference.compactKey(values.city);
    const keys = [key, CITY_ALIASES.get(key)].filter(Boolean);
    const matches = stations.filter((s) => keys.includes(s._cityKey) && inState(s));
    if (matches.length === 0) throw unknownValue("city", values.city, null, { hint });
    filters.cityKeys = keys;
    filters.labels.city = [...new Set(matches.map((s) => s.city))].sort();
    const states = [...new Set(matches.map((s) => s.state_code))].sort();
    if (states.length > 1) filters.labels.city_ambiguous_states = states;
  }

  if (values.operator !== null && values.operator !== undefined) {
    const operator = reference.resolveOperatorQuery(values.operator);
    if (!operator) throw unknownValue("operator", values.operator, reference.operators().map((o) => o.canonical).sort());
    filters.operator = operator.canonical;
    filters.labels.operator = operator.canonical;
  }

  filters.ownership = pickEnum("ownership", values.ownership ?? null, OWNERSHIPS);
  filters.vehicle = pickEnum("vehicle", values.vehicle ?? null, VEHICLES);
  const current = pickEnum("current", values.current ?? null, CURRENTS);
  filters.current = current ? current.toUpperCase() : null;

  if (values.connector !== null && values.connector !== undefined) {
    const id = reference.resolveStandardQuery(values.connector);
    if (!id) throw unknownValue("connector", values.connector, reference.standards().map((s) => s.id));
    filters.connector = id;
  }

  filters.minPowerKw = values.min_power_kw ?? null;
  filters.locationQuality = pickEnum("location_quality", values.location_quality ?? null, LOCATION_QUALITIES) || "any";
  return filters;
}

function getStations(values = {}) {
  const { stations } = load();
  const filters = resolveFilters(values);
  const page = values.page || 1;
  const limit = values.limit || DEFAULT_LIMIT;
  const { slice, meta } = paginate(stations, page, limit);
  return { data: slice.map((s) => projectStation(s)), meta: { ...meta, filters_applied: filters.labels, ...sourceMeta() } };
}

function getStationById(id) {
  if (!STATION_ID.test(id)) {
    throw new ApiError(400, "INVALID_STATION_ID", `'${id}' is not a station id. Ids look like evs_1a2b3c4d5e.`, {
      parameter: "id",
      received: id,
      expected: "evs_ followed by 10 lowercase hex digits",
    });
  }
  const station = load().byId.get(id);
  return station ? projectStation(station, { withSource: true }) : null;
}

function getStatesSummary() {
  const { stations } = load();
  const rows = new Map(
    reference.states().map((s) => [
      s.code,
      { name: s.name, code: s.code, iso: s.iso, type: s.type, stations: 0, chargers: 0, dc_stations: 0, car_fast_dc_stations: 0 },
    ])
  );
  for (const station of stations) {
    const row = rows.get(station.state_code);
    row.stations += 1;
    row.chargers += station.total_chargers;
    if (station.currents.includes("DC")) row.dc_stations += 1;
    if (station._carFastDc) row.car_fast_dc_stations += 1;
  }
  const data = [...rows.values()].sort((a, b) => b.stations - a.stations || a.name.localeCompare(b.name));
  return { data, meta: { count: data.length, total_stations: stations.length, ...sourceMeta() } };
}

function getDatasetMeta() {
  return load().meta;
}

module.exports = {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  MAX_RADIUS_KM,
  getStations,
  getStationById,
  getStatesSummary,
  getDatasetMeta,
  sourceMeta,
  loadCount: () => loads,
};

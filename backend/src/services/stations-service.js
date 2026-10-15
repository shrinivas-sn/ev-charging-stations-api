"use strict";

/**
 * Read-only queries over the committed BEE dataset (backend/data/stations.json).
 * The data is loaded and indexed once per process; it only changes on deploy.
 */

const path = require("node:path");
const reference = require("../lib/reference");

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

function getStations(query = {}) {
  const { stations } = load();
  const page = query.page || 1;
  const limit = query.limit || DEFAULT_LIMIT;
  const { slice, meta } = paginate(stations, page, limit);
  return { data: slice.map((s) => projectStation(s)), meta: { ...meta, ...sourceMeta() } };
}

function getStationById(id) {
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

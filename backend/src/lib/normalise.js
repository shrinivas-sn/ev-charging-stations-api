"use strict";

/**
 * Turns raw rows extracted from the BEE PDF (one row per charger) into stations.
 * Pure functions only: the build script handles files, so every rule here is unit-tested.
 */

const crypto = require("node:crypto");
const reference = require("./reference");

const SOURCE = {
  publisher: "Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India",
  title: "EV Public Charging Stations Data till 26th October 2025",
  url: "http://beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf",
  page_url: "http://beeindia.gov.in/show_content.php?lang=1&level=2&ls_id=345&lid=67",
  snapshot_label: "till 26th October 2025",
  pdf_created: "2026-02-17",
  licence: "No licence is published by BEE for this file; republished with attribution.",
};

const ATTRIBUTION =
  'Data: Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India — "EV Public Charging Stations Data till 26th October 2025". Republished with attribution; not an official BEE service.';

/** Generous bounds around India's mainland and islands; outside means the coordinate is wrong. */
const INDIA_BOUNDS = { minLat: 6, maxLat: 37.6, minLng: 68, maxLng: 97.5 };

const COLUMN = {
  cpo: 0,
  ownership: 1,
  state: 2,
  district: 3,
  city: 4,
  location: 5,
  lat: 6,
  lng: 7,
  type: 8,
  chargerKw: 9,
  connectorKw: 10,
  connectors: 11,
};

class BuildError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildError";
  }
}

const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Strict decimal parse: anything but a plain decimal (hex, exponent, suffix, empty) is null. */
function parseDecimal(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return DECIMAL.test(text) ? Number(text) : null;
}

const RATING_LIST = /^\d+(\.\d+)?(\+\d+(\.\d+)?)+$/;

/**
 * The guns of one charger, each with the standard it serves and the power it delivers.
 * "Connector Rating" is either one value for every gun or a "+"-joined list, one per gun
 * (e.g. "60+60+22" on a CCS2 + CHAdeMO + Type 2 combo). Returns null when the rating
 * cannot be mapped to guns without guessing.
 */
function gunsFor(standards, ratingText, connectors) {
  const text = String(ratingText).trim();
  if (RATING_LIST.test(text)) {
    const ratings = text.split("+").map(Number);
    if (ratings.length !== connectors) return null;
    if (ratings.length === standards.length) {
      return ratings.map((kw, i) => ({ standard: standards[i], kw }));
    }
    // "30+30+22" on "Combo(CCS-II+Type-II)": the last gun is the last standard and the
    // rest are the first. Only this two-standard shape occurs in the source.
    if (standards.length === 2 && ratings.length > 2) {
      return ratings.map((kw, i) => ({ standard: i === ratings.length - 1 ? standards[1] : standards[0], kw }));
    }
    return null;
  }

  const kw = parseDecimal(text);
  if (kw === null) return null;
  if (standards.length === 1) return Array.from({ length: connectors }, () => ({ standard: standards[0], kw }));
  if (connectors === standards.length) return standards.map((standard) => ({ standard, kw }));
  return null;
}

function locationQuality(lat, lng) {
  if (lat === lng) return "suspect";
  const b = INDIA_BOUNDS;
  if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) return "suspect";
  return "ok";
}

/** Stable across refreshes: depends only on who runs the site and where it is. */
function stationId(operator, lat, lng) {
  const key = `${operator}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
  return "evs_" + crypto.createHash("sha1").update(key).digest("hex").slice(0, 10);
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedUnique(values) {
  return [...new Set(values)].sort(compare);
}

/** Resolves every spelling first so one run reports all unknown values at once. */
function resolveSpellings(rows) {
  const unknown = { state: new Set(), operator: new Set(), charger_type: new Set() };
  const resolved = rows.map((entry) => {
    const cells = entry.cells.map((c) => (c === null || c === undefined ? null : reference.collapse(c)));
    const state = reference.resolveState(cells[COLUMN.state]);
    const operator = reference.resolveOperator(cells[COLUMN.cpo]);
    const type = reference.resolveChargerType(cells[COLUMN.type]);
    if (!state) unknown.state.add(cells[COLUMN.state]);
    if (!operator) unknown.operator.add(cells[COLUMN.cpo]);
    if (!type) unknown.charger_type.add(cells[COLUMN.type]);
    return { entry, cells, state, operator, type };
  });

  const problems = Object.entries(unknown)
    .filter(([, values]) => values.size > 0)
    .map(([kind, values]) => `${kind}: ${[...values].map((v) => JSON.stringify(v)).join(", ")}`);
  if (problems.length > 0) {
    throw new BuildError(
      `Unknown spellings — add them to backend/data/reference/ with a reason, then rebuild.\n${problems.join("\n")}`
    );
  }
  return resolved;
}

function buildDataset(rawDoc) {
  const resolved = resolveSpellings(rawDoc.rows);
  const rejects = [];
  const groups = new Map();

  for (const { entry, cells, state, operator, type } of resolved) {
    const lat = parseDecimal(cells[COLUMN.lat]);
    const lng = parseDecimal(cells[COLUMN.lng]);
    if (lat === null || lng === null) {
      rejects.push({ page: entry.page, row: entry.row, reason: "BAD_COORDINATE", cells });
      continue;
    }
    const chargerKw = parseDecimal(cells[COLUMN.chargerKw]);
    const connectors = parseDecimal(cells[COLUMN.connectors]);
    const ratingText = cells[COLUMN.connectorKw];
    const ratingParses = parseDecimal(ratingText) !== null || RATING_LIST.test(String(ratingText || "").trim());
    if (chargerKw === null || connectors === null || !Number.isInteger(connectors) || connectors < 1 || !ratingParses) {
      rejects.push({ page: entry.page, row: entry.row, reason: "BAD_NUMBER", cells });
      continue;
    }
    const guns = gunsFor(type.standards, ratingText, connectors);
    if (guns === null) {
      rejects.push({ page: entry.page, row: entry.row, reason: "RATING_MISMATCH", cells });
      continue;
    }

    const id = stationId(operator.canonical, lat, lng);
    if (!groups.has(id)) groups.set(id, { key: `${operator.canonical}|${lat}|${lng}`, rows: [] });
    const group = groups.get(id);
    if (group.key !== `${operator.canonical}|${lat}|${lng}`) {
      throw new BuildError(`Station id collision for ${id}: "${group.key}" and "${operator.canonical}|${lat}|${lng}"`);
    }
    group.rows.push({ entry, cells, state, operator, type, lat, lng, chargerKw, guns });
  }

  const stations = [...groups.entries()].map(([id, group]) => toStation(id, group.rows));
  stations.sort(
    (a, b) => compare(a.state_code, b.state_code) || compare(a.city, b.city) || compare(a.id, b.id)
  );

  return {
    stations,
    rejects,
    meta: buildMeta(rawDoc, stations, rejects),
    source: {
      url: SOURCE.url,
      page_url: SOURCE.page_url,
      title: SOURCE.title,
      sha256: rawDoc.sha256,
      size_bytes: rawDoc.size_bytes,
      pages: rawDoc.pages_in_file,
      rows: rawDoc.rows.length,
    },
  };
}

function toStation(id, rows) {
  const first = rows[0];
  const chargers = new Map();
  for (const r of rows) {
    const typeRaw = r.cells[COLUMN.type];
    const key = `${typeRaw}|${r.chargerKw}|${JSON.stringify(r.guns)}`;
    if (!chargers.has(key)) {
      chargers.set(key, {
        type_raw: typeRaw,
        standards: r.type.standards,
        lev_variant: r.type.lev_variant,
        charger_kw: r.chargerKw,
        connectors_per_charger: r.guns.length,
        guns: r.guns,
        count: 0,
      });
    }
    chargers.get(key).count += 1;
  }
  const chargerList = [...chargers.values()];
  const standards = sortedUnique(chargerList.flatMap((c) => c.standards));
  const maxByStandard = {};
  for (const gun of chargerList.flatMap((c) => c.guns)) {
    maxByStandard[gun.standard] = Math.max(maxByStandard[gun.standard] || 0, gun.kw);
  }
  const maxKwByStandard = Object.fromEntries(Object.keys(maxByStandard).sort(compare).map((k) => [k, maxByStandard[k]]));
  const adminKey = (r) => `${r.state.code}|${r.cells[COLUMN.district]}|${r.cells[COLUMN.city]}`;
  const pages = rows.map((r) => r.entry.page);

  return {
    id,
    operator: first.operator.canonical,
    ownership: first.operator.ownership,
    state: first.state.name,
    state_code: first.state.code,
    district: first.cells[COLUMN.district],
    city: first.cells[COLUMN.city],
    address: first.cells[COLUMN.location],
    latitude: first.lat,
    longitude: first.lng,
    location_quality: locationQuality(first.lat, first.lng),
    mixed_admin: new Set(rows.map(adminKey)).size > 1,
    chargers: chargerList,
    total_chargers: chargerList.reduce((n, c) => n + c.count, 0),
    total_connectors: chargerList.reduce((n, c) => n + c.count * c.connectors_per_charger, 0),
    max_power_kw: Math.max(...Object.values(maxKwByStandard)),
    max_kw_by_standard: maxKwByStandard,
    standards,
    currents: sortedUnique(standards.map((s) => reference.standard(s).current)),
    vehicle_classes: sortedUnique(standards.flatMap((s) => reference.standard(s).vehicle_classes)),
    source: { page_first: Math.min(...pages), page_last: Math.max(...pages), row_count: rows.length },
  };
}

function buildMeta(rawDoc, stations, rejects) {
  return {
    dataset: "India public EV charging stations",
    attribution: ATTRIBUTION,
    source: { ...SOURCE, sha256: rawDoc.sha256, size_bytes: rawDoc.size_bytes, pages: rawDoc.pages_in_file },
    counts: {
      rows: rawDoc.rows.length,
      stations: stations.length,
      chargers: stations.reduce((n, s) => n + s.total_chargers, 0),
      connectors: stations.reduce((n, s) => n + s.total_connectors, 0),
      suspect_locations: stations.filter((s) => s.location_quality === "suspect").length,
      mixed_admin: stations.filter((s) => s.mixed_admin).length,
      rejects: rejects.length,
      states: new Set(stations.map((s) => s.state_code)).size,
      operators: new Set(stations.map((s) => s.operator)).size,
    },
    not_provided: [
      "real-time charger availability or status",
      "pricing, payment or booking",
      "opening hours",
    ],
    data_notes: "https://github.com/shrinivas-sn/ev-charging-stations-api/blob/main/DOCS/DATA-NOTES.md",
  };
}

module.exports = {
  ATTRIBUTION,
  SOURCE,
  BuildError,
  buildDataset,
  parseDecimal,
  locationQuality,
  stationId,
};

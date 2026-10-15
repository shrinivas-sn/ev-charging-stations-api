"use strict";

/**
 * Query-string parsing against a per-route spec. Unknown names, repeated names and
 * anything but a plain decimal for a number are rejected; nothing is silently ignored.
 * Meaning-level checks (is this a real state?) happen in the service, which owns the data.
 */

const { ApiError } = require("./errors");

const DECIMAL = /^-?\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

const text = () => ({ type: "text" });

/** Filters shared by the directory and the radius search. */
const FILTERS = {
  state: text(),
  district: text(),
  city: text(),
  operator: text(),
  ownership: text(),
  connector: text(),
  vehicle: text(),
  current: text(),
  min_power_kw: { type: "number", min: 0, max: 1000 },
};

const PAGING = {
  page: { type: "int", min: 1, max: 100000, default: 1 },
  limit: { type: "int", min: 1, max: 100, default: 25 },
};

const SPECS = {
  stations: { ...FILTERS, location_quality: text(), ...PAGING },
  near: {
    lat: { type: "number", min: -90, max: 90, required: true, code: "INVALID_LATITUDE" },
    lng: { type: "number", min: -180, max: 180, required: true, code: "INVALID_LONGITUDE" },
    radius: { type: "number", min: 0.1, max: 100, default: 10 },
    ...FILTERS,
    ...PAGING,
  },
  nearPins: {
    lat: { type: "number", min: -90, max: 90, required: true, code: "INVALID_LATITUDE" },
    lng: { type: "number", min: -180, max: 180, required: true, code: "INVALID_LONGITUDE" },
    radius: { type: "number", min: 0.1, max: 100, default: 10 },
    ...FILTERS,
    limit: { type: "int", min: 1, max: 10000, default: 5000 },
  },
  cities: { state: text() },
  none: {},
};

function invalid(name, rule, raw, expected) {
  return new ApiError(400, rule.code || "INVALID_PARAMETER", `'${name}' must be ${expected}, received '${raw}'.`, {
    parameter: name,
    received: raw,
    expected,
  });
}

function parseValue(name, rule, raw) {
  if (rule.type === "text") return raw;
  const pattern = rule.type === "int" ? INTEGER : DECIMAL;
  const kind = rule.type === "int" ? "a whole number" : "a plain decimal number";
  const expected = `${kind} between ${rule.min} and ${rule.max}`;
  if (!pattern.test(raw)) throw invalid(name, rule, raw, expected);
  const value = Number(raw);
  if (value < rule.min || value > rule.max) throw invalid(name, rule, raw, expected);
  return value;
}

/** Returns `{ name: value }` for every spec entry, using defaults (or null) for absent values. */
function parseQuery(query, spec) {
  const allowed = Object.keys(spec);
  for (const name of Object.keys(query)) {
    if (!allowed.includes(name)) {
      throw new ApiError(400, "UNKNOWN_PARAMETER", `Unknown query parameter '${name}'.`, {
        parameter: name,
        allowed,
      });
    }
  }

  const values = {};
  for (const [name, rule] of Object.entries(spec)) {
    const raw = query[name];
    if (Array.isArray(raw) || (raw !== undefined && typeof raw !== "string")) {
      throw new ApiError(400, "INVALID_PARAMETER", `'${name}' may be given only once.`, { parameter: name });
    }
    const trimmed = raw === undefined ? "" : raw.trim();
    if (trimmed === "") {
      if (rule.required) {
        throw new ApiError(400, "MISSING_COORDINATES", `'${name}' is required.`, { parameter: name });
      }
      values[name] = rule.default === undefined ? null : rule.default;
      continue;
    }
    values[name] = parseValue(name, rule, trimmed);
  }
  return values;
}

module.exports = { SPECS, parseQuery };

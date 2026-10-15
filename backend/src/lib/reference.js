"use strict";

/**
 * Lookups over the committed reference tables in backend/data/reference/.
 * Shared by the dataset build (raw PDF spellings) and the API (user query spellings).
 * Every resolver returns null for an unknown value; callers decide whether that is
 * a build failure or a 404.
 */

const path = require("node:path");

const REFERENCE_DIR = path.join(__dirname, "..", "..", "data", "reference");

const statesTable = require(path.join(REFERENCE_DIR, "states.json"));
const operatorsTable = require(path.join(REFERENCE_DIR, "operators.json"));
const standardsTable = require(path.join(REFERENCE_DIR, "connector-standards.json"));

/** Collapses runs of whitespace, as the raw PDF cells wrap mid-word. */
function collapse(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

/** Case- and punctuation-insensitive key: `CCS-2`, `ccs 2` and `CCS2` match. */
function compactKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const stateByRaw = new Map();
const stateByKey = new Map();
for (const state of statesTable.states) {
  for (const spelling of [state.name, ...state.aliases]) stateByRaw.set(collapse(spelling), state);
  for (const key of [state.name, state.code, state.iso]) stateByKey.set(compactKey(key), state);
}

const operatorByRaw = new Map();
const operatorByKey = new Map();
for (const operator of operatorsTable.operators) {
  for (const spelling of [operator.canonical, ...operator.aliases]) {
    operatorByRaw.set(collapse(spelling), operator);
    operatorByKey.set(compactKey(spelling), operator);
  }
}

const standardById = new Map(standardsTable.standards.map((s) => [s.id, s]));
const rawTypes = new Map(
  Object.entries(standardsTable.raw_types).map(([spelling, value]) => [collapse(spelling), value])
);
const standardByQuery = new Map(Object.entries(standardsTable.query_aliases));
for (const standard of standardsTable.standards) standardByQuery.set(compactKey(standard.id), standard.id);

function resolveState(raw) {
  if (raw === null || raw === undefined) return null;
  return stateByRaw.get(collapse(raw)) || null;
}

/** User-facing lookup: full name, 2-letter code or ISO code, any case or punctuation. */
function resolveStateQuery(raw) {
  return stateByKey.get(compactKey(raw)) || null;
}

function resolveOperator(raw) {
  if (raw === null || raw === undefined) return null;
  return operatorByRaw.get(collapse(raw)) || null;
}

function resolveOperatorQuery(raw) {
  return operatorByKey.get(compactKey(raw)) || null;
}

function resolveChargerType(raw) {
  if (raw === null || raw === undefined) return null;
  return rawTypes.get(collapse(raw)) || null;
}

/** Maps a user's connector spelling to a standard id, or null. */
function resolveStandardQuery(raw) {
  return standardByQuery.get(compactKey(raw)) || null;
}

module.exports = {
  collapse,
  compactKey,
  resolveState,
  resolveStateQuery,
  resolveOperator,
  resolveOperatorQuery,
  resolveChargerType,
  resolveStandardQuery,
  standard: (id) => standardById.get(id) || null,
  states: () => statesTable.states,
  operators: () => operatorsTable.operators,
  standards: () => standardsTable.standards,
  sources: () => ({
    states: statesTable.source_url,
    operators: operatorsTable.source,
    standards: standardsTable.source_url,
  }),
};

"use strict";

// Checks the committed dataset in backend/data, built from the real BEE PDF.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { ATTRIBUTION, locationQuality } = require("../src/lib/normalise");
const reference = require("../src/lib/reference");

const DATA = path.join(__dirname, "..", "data");
const stations = JSON.parse(fs.readFileSync(path.join(DATA, "stations.json"), "utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(DATA, "meta.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(path.join(DATA, "source.json"), "utf8"));

describe("Committed BEE dataset", () => {
  test("holds the full station list, not a sample", () => {
    assert.ok(stations.length >= 25000, `only ${stations.length} stations`);
    assert.equal(meta.counts.stations, stations.length);
    assert.equal(source.rows, 39641);
    assert.equal(source.pages, 1159);
  });

  test("station ids are well-formed and unique", () => {
    const seen = new Set();
    for (const s of stations) {
      assert.match(s.id, /^evs_[0-9a-f]{10}$/);
      assert.ok(!seen.has(s.id), `duplicate id ${s.id}`);
      seen.add(s.id);
    }
  });

  test("every state code and charger standard is a known reference value", () => {
    const codes = new Set(reference.states().map((s) => s.code));
    const standards = new Set(reference.standards().map((s) => s.id));
    for (const s of stations) {
      assert.ok(codes.has(s.state_code), `${s.id} state ${s.state_code}`);
      for (const id of s.standards) assert.ok(standards.has(id), `${s.id} standard ${id}`);
    }
  });

  test("no trace of the old generated sample remains in backend/data", () => {
    for (const file of fs.readdirSync(DATA)) {
      const full = path.join(DATA, file);
      if (!fs.statSync(full).isFile()) continue;
      assert.ok(!fs.readFileSync(full, "utf8").includes("generated-sample"), file);
    }
  });

  test("attribution is the exact agreed text", () => {
    assert.equal(meta.attribution, ATTRIBUTION);
    assert.ok(meta.attribution.includes("Bureau of Energy Efficiency (BEE)"));
  });

  test("suspect count equals stations with lat == lng or out-of-bounds coordinates", () => {
    const expected = stations.filter((s) => locationQuality(s.latitude, s.longitude) === "suspect").length;
    assert.equal(meta.counts.suspect_locations, expected);
    assert.ok(expected > 0, "the PDF is known to contain lat == lng rows");
  });

  test("every row of the PDF is accounted for", () => {
    const grouped = stations.reduce((n, s) => n + s.source.row_count, 0);
    assert.equal(grouped + meta.counts.rejects, meta.counts.rows);
  });
});

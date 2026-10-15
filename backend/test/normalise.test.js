"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const { buildDataset, parseDecimal, locationQuality, stationId, BuildError } = require("../src/lib/normalise");

const SAMPLE = require("./fixtures/bee-rows-sample.json");
const BUILD_SCRIPT = path.join(__dirname, "..", "scripts", "build-dataset.js");

/** A raw-rows document built from hand-written rows, in the extractor's output shape. */
function doc(rows) {
  return {
    source_file: "test.pdf",
    sha256: "0".repeat(64),
    size_bytes: 1,
    pages_in_file: 1,
    rows_total: rows.length,
    missing_cells: 0,
    rows: rows.map((cells, i) => ({ page: 1, row: i + 1, cells })),
  };
}

function row(overrides = {}) {
  const base = {
    cpo: "IOCL",
    ownership: "Govt.",
    state: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    location: "Test Fuel Station, MG Road",
    lat: "12.971600",
    lng: "77.594600",
    type: "CCS-II",
    chargerKw: "60",
    connectorKw: "60",
    connectors: "2",
  };
  const v = { ...base, ...overrides };
  return [v.cpo, v.ownership, v.state, v.district, v.city, v.location, v.lat, v.lng, v.type, v.chargerKw, v.connectorKw, v.connectors];
}

describe("parseDecimal", () => {
  test("accepts plain decimals and integers", () => {
    assert.equal(parseDecimal("12.034186"), 12.034186);
    assert.equal(parseDecimal("60"), 60);
    assert.equal(parseDecimal(" 7.4 "), 7.4);
  });

  test("rejects prefixes, hex, exponents, Infinity and empty", () => {
    for (const bad of ["12.5abc", "0x10", "1e3", "Infinity", "", null, undefined, "1,5"]) {
      assert.equal(parseDecimal(bad), null, String(bad));
    }
  });
});

describe("locationQuality", () => {
  test("lat == lng is suspect", () => assert.equal(locationQuality(27.684776, 27.684776), "suspect"));
  test("outside India's bounds is suspect", () => {
    assert.equal(locationQuality(51.5, -0.12), "suspect");
    assert.equal(locationQuality(12.9, 120.1), "suspect");
  });
  test("a normal Indian coordinate is ok", () => assert.equal(locationQuality(12.9716, 77.5946), "ok"));
});

describe("buildDataset on real PDF rows", () => {
  const result = buildDataset(SAMPLE);

  test("every row is either in a station or rejected", () => {
    const grouped = result.stations.reduce((n, s) => n + s.source.row_count, 0);
    assert.equal(grouped + result.rejects.length, SAMPLE.rows.length);
  });

  test("station ids are well-formed and unique", () => {
    const ids = result.stations.map((s) => s.id);
    for (const id of ids) assert.match(id, /^evs_[0-9a-f]{10}$/);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("lat == lng rows are kept and flagged suspect", () => {
    const suspect = result.stations.filter((s) => s.location_quality === "suspect");
    assert.ok(suspect.length >= 1);
    for (const s of suspect) assert.equal(s.latitude, s.longitude);
  });

  test("states resolve to canonical names and ISO codes", () => {
    for (const s of result.stations) assert.match(s.state_code, /^[A-Z]{2}$/);
    assert.ok(result.stations.some((s) => s.state === "Andaman and Nicobar Islands" && s.state_code === "AN"));
  });

  test("the page 1 last row keeps its recovered connector count", () => {
    const station = result.stations.find((s) => s.address.startsWith("N.R.T Centre, Chilakaluripet"));
    assert.ok(station, "N.R.T Centre station missing");
    assert.equal(station.chargers[0].connectors_per_charger, 1);
  });

  test("meta counts agree with the stations", () => {
    assert.equal(result.meta.counts.stations, result.stations.length);
    assert.equal(result.meta.counts.rows, SAMPLE.rows.length);
    assert.equal(
      result.meta.counts.suspect_locations,
      result.stations.filter((s) => s.location_quality === "suspect").length
    );
    assert.match(result.meta.attribution, /^Data: Bureau of Energy Efficiency \(BEE\)/);
  });
});

describe("buildDataset grouping and derived fields", () => {
  test("identical rows merge into one charger entry with a count", () => {
    const { stations } = buildDataset(doc([row(), row()]));
    assert.equal(stations.length, 1);
    assert.equal(stations[0].chargers.length, 1);
    assert.equal(stations[0].chargers[0].count, 2);
    assert.equal(stations[0].total_chargers, 2);
    assert.equal(stations[0].total_connectors, 4);
  });

  test("different charger types at one site form one station with separate entries", () => {
    const { stations } = buildDataset(
      doc([row(), row({ type: "Bharat AC-001", chargerKw: "10", connectorKw: "3.3", connectors: "3" })])
    );
    assert.equal(stations.length, 1);
    assert.equal(stations[0].chargers.length, 2);
    assert.deepEqual(stations[0].currents, ["AC", "DC"]);
    assert.equal(stations[0].max_power_kw, 60);
  });

  test("two operators at identical coordinates are two stations", () => {
    const { stations } = buildDataset(doc([row(), row({ cpo: "Tata Power", ownership: "Private" })]));
    assert.equal(stations.length, 2);
  });

  test("combo charger exposes all its standards; vehicle classes are the union", () => {
    const { stations } = buildDataset(
      doc([row({ type: "Combo (CCS-II + CHAdeMo + Type II)", chargerKw: "142", connectorKw: "60+60+22", connectors: "3" })])
    );
    assert.deepEqual(stations[0].chargers[0].standards, ["CCS2", "CHADEMO", "TYPE2_AC"]);
    assert.deepEqual(stations[0].vehicle_classes, ["car", "two_three_wheeler"]);
  });

  test("a LEV-only station serves only two/three-wheelers", () => {
    const { stations } = buildDataset(doc([row({ type: "LEV AC Charge point", chargerKw: "3.3", connectorKw: "3.3", connectors: "1" })]));
    assert.deepEqual(stations[0].vehicle_classes, ["two_three_wheeler"]);
    assert.deepEqual(stations[0].currents, ["AC"]);
  });

  test("max_power_kw comes from the strongest single gun, not the sum", () => {
    const rows = Array.from({ length: 10 }, () => row({ type: "Type-II AC", chargerKw: "7.4", connectorKw: "7.4", connectors: "1" }));
    const { stations } = buildDataset(doc(rows));
    assert.equal(stations[0].max_power_kw, 7.4);
    assert.equal(stations[0].total_chargers, 10);
  });

  test("malformed numbers are rejected with a reason", () => {
    const { stations, rejects } = buildDataset(doc([row({ lat: "12.5abc" }), row({ chargerKw: "" }), row()]));
    assert.equal(stations.length, 1);
    assert.deepEqual(rejects.map((r) => r.reason).sort(), ["BAD_COORDINATE", "BAD_NUMBER"]);
  });

  test("an unknown charger type, state or operator stops the build and lists the value", () => {
    assert.throws(() => buildDataset(doc([row({ type: "Tesla Supercharger" })])), (error) => {
      assert.ok(error instanceof BuildError);
      assert.match(error.message, /Tesla Supercharger/);
      return true;
    });
    assert.throws(() => buildDataset(doc([row({ state: "Atlantis" })])), /Atlantis/);
    assert.throws(() => buildDataset(doc([row({ cpo: "Nobody Charging" })])), /Nobody Charging/);
  });

  test("a station keeps its id when unrelated rows are added", () => {
    const alone = buildDataset(doc([row()])).stations[0].id;
    const withOthers = buildDataset(doc([row({ lat: "13.000000" }), row(), row({ cpo: "BPCL" })])).stations.find(
      (s) => s.operator === "IOCL" && s.latitude === 12.9716
    ).id;
    assert.equal(alone, withOthers);
    assert.equal(alone, stationId("IOCL", 12.9716, 77.5946));
  });

  test("differing district or city within one station is flagged mixed_admin", () => {
    const { stations } = buildDataset(doc([row(), row({ type: "Type-II AC", city: "Bangalore" })]));
    assert.equal(stations[0].mixed_admin, true);
  });
});

describe("charger guns (what a vehicle actually receives)", () => {
  test("a rating list on a combo charger maps one gun per standard, in order", () => {
    const { stations } = buildDataset(
      doc([row({ type: "Combo (CCS-II + CHAdeMo + Type II)", chargerKw: "142", connectorKw: "60+60+22", connectors: "3" })])
    );
    assert.deepEqual(stations[0].chargers[0].guns, [
      { standard: "CCS2", kw: 60 },
      { standard: "CHADEMO", kw: 60 },
      { standard: "TYPE2_AC", kw: 22 },
    ]);
    assert.equal(stations[0].max_power_kw, 60);
    assert.deepEqual(stations[0].max_kw_by_standard, { CCS2: 60, CHADEMO: 60, TYPE2_AC: 22 });
  });

  test("a list longer than the standards gives the last gun to the last standard", () => {
    const { stations } = buildDataset(
      doc([row({ type: "Combo(CCS-II+Type-II)", chargerKw: "82", connectorKw: "30+30+22", connectors: "3" })])
    );
    assert.deepEqual(stations[0].chargers[0].guns, [
      { standard: "CCS2", kw: 30 },
      { standard: "CCS2", kw: 30 },
      { standard: "TYPE2_AC", kw: 22 },
    ]);
  });

  test("a single rating applies to every gun of a single-standard charger", () => {
    const { stations } = buildDataset(
      doc([row({ type: "Bharat AC-001", chargerKw: "10", connectorKw: "3.3", connectors: "3" })])
    );
    assert.deepEqual(stations[0].chargers[0].guns, [
      { standard: "BHARAT_AC001", kw: 3.3 },
      { standard: "BHARAT_AC001", kw: 3.3 },
      { standard: "BHARAT_AC001", kw: 3.3 },
    ]);
    assert.equal(stations[0].max_power_kw, 3.3);
    assert.equal(stations[0].chargers[0].charger_kw, 10);
  });

  test("a single rating on a two-standard combo gives one gun per standard", () => {
    const { stations } = buildDataset(
      doc([row({ type: "Combo (CCS-II+CHAdeMO)", chargerKw: "50", connectorKw: "25", connectors: "2" })])
    );
    assert.deepEqual(stations[0].chargers[0].guns, [
      { standard: "CCS2", kw: 25 },
      { standard: "CHADEMO", kw: 25 },
    ]);
  });

  test("a rating list that does not match the connector count is rejected", () => {
    const { stations, rejects } = buildDataset(
      doc([row({ type: "Combo (CCS-II+CHAdeMO)", chargerKw: "100", connectorKw: "50+50", connectors: "3" }), row()])
    );
    assert.equal(stations.length, 1);
    assert.deepEqual(rejects.map((r) => r.reason), ["RATING_MISMATCH"]);
  });

  test("an Excel overflow coordinate (###) is rejected as a bad coordinate", () => {
    const { rejects } = buildDataset(doc([row({ lng: "###########" })]));
    assert.deepEqual(rejects.map((r) => r.reason), ["BAD_COORDINATE"]);
  });
});

describe("build-dataset.js script", () => {
  test("writes byte-identical output on two runs", () => {
    const sums = [];
    for (let run = 0; run < 2; run += 1) {
      const out = fs.mkdtempSync(path.join(os.tmpdir(), "ev-build-"));
      execFileSync(process.execPath, [BUILD_SCRIPT, path.join(__dirname, "fixtures", "bee-rows-sample.json"), "--out", out]);
      const files = ["stations.json", "meta.json", "rejects.json", "source.json"];
      const hash = crypto.createHash("sha256");
      for (const file of files) hash.update(fs.readFileSync(path.join(out, file)));
      sums.push(hash.digest("hex"));
      fs.rmSync(out, { recursive: true, force: true });
    }
    assert.equal(sums[0], sums[1]);
  });
});

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const reference = require("../src/lib/reference");
const raw = require("./fixtures/raw-spellings.json");

describe("Reference tables resolve every raw spelling in the BEE PDF", () => {
  test("all 46 state spellings resolve to one of 36 states/UTs with a 2-letter code", () => {
    assert.equal(raw.states.length, 46);
    const codes = new Set();
    for (const spelling of raw.states) {
      const state = reference.resolveState(spelling);
      assert.ok(state, `unresolved state: ${spelling}`);
      assert.match(state.code, /^[A-Z]{2}$/);
      codes.add(state.code);
    }
    assert.equal(reference.states().length, 36);
    assert.ok(codes.size <= 36);
  });

  test("state aliases land on the right canonical names", () => {
    assert.equal(reference.resolveState("Uttrakhand").name, "Uttarakhand");
    assert.equal(reference.resolveState("UT OF D&NH AND D&D").code, "DH");
    assert.equal(reference.resolveState("Andaman & Nicobar").name, "Andaman and Nicobar Islands");
    assert.equal(reference.resolveState("KERALA").code, "KL");
    assert.equal(reference.resolveState("Telangana").code, "TS");
  });

  test("all 70 operator spellings resolve, including line-wrap-split names", () => {
    assert.equal(raw.operators.length, 70);
    for (const spelling of raw.operators) {
      const operator = reference.resolveOperator(spelling);
      assert.ok(operator, `unresolved operator: ${spelling}`);
      assert.ok(["govt", "private"].includes(operator.ownership));
    }
    assert.equal(reference.resolveOperator("CORPORAT ION OF CHENNAI").canonical, "Corporation of Chennai");
    assert.equal(reference.resolveOperator("Surat Municipal Corporatio n").canonical, "Surat Municipal Corporation");
  });

  test("all 19 charger-type spellings resolve; combos yield several standards", () => {
    assert.equal(raw.charger_types.length, 19);
    for (const spelling of raw.charger_types) {
      const type = reference.resolveChargerType(spelling);
      assert.ok(type && type.standards.length > 0, `unresolved charger type: ${spelling}`);
    }
    assert.deepEqual(reference.resolveChargerType("Combo (CCS-II + CHAdeMo + Type II)").standards, [
      "CCS2",
      "CHADEMO",
      "TYPE2_AC",
    ]);
    assert.deepEqual(reference.resolveChargerType("CCS").standards, ["CCS2"]);
    assert.equal(reference.resolveChargerType("LEV DC Charge Point (IS-17017-2-7)").lev_variant, "IS-17017-2-7");
  });

  test("unknown spellings resolve to null rather than a guess", () => {
    assert.equal(reference.resolveState("Atlantis"), null);
    assert.equal(reference.resolveOperator("Nobody Charging"), null);
    assert.equal(reference.resolveChargerType("Tesla Supercharger"), null);
  });

  test("no two canonical values collide", () => {
    const names = reference.operators().map((o) => o.canonical.toLowerCase());
    assert.equal(new Set(names).size, names.length);
    const codes = reference.states().map((s) => s.code);
    assert.equal(new Set(codes).size, codes.length);
    const ids = reference.standards().map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("every charger standard cites a source and declares current and vehicle classes", () => {
    for (const standard of reference.standards()) {
      assert.match(standard.source_url, /^https?:\/\//);
      assert.ok(["AC", "DC"].includes(standard.current));
      assert.ok(Array.isArray(standard.vehicle_classes));
    }
  });

  test("query aliases resolve user spellings of a standard", () => {
    for (const spelling of ["CCS-2", "ccs 2", "CCS2", "ccs"]) {
      assert.equal(reference.resolveStandardQuery(spelling), "CCS2", spelling);
    }
    assert.equal(reference.resolveStandardQuery("type-2"), "TYPE2_AC");
    assert.equal(reference.resolveStandardQuery("LEV_AC"), "LEV_AC");
    assert.equal(reference.resolveStandardQuery("gbt"), null);
  });
});

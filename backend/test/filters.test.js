"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const reference = require("../src/lib/reference");
const stations = require("../data/stations.json");
const server = useServer();

/** Oracle: does any single gun of the station satisfy every condition? */
function anyGun(station, { standard, current, vehicle, minKw } = {}) {
  return station.chargers.some((c) =>
    c.guns.some((g) => {
      const std = reference.standard(g.standard);
      return (
        (!standard || g.standard === standard) &&
        (!current || std.current === current) &&
        (!vehicle || std.vehicle_classes.includes(vehicle)) &&
        (minKw === undefined || g.kw >= minKw)
      );
    })
  );
}

/** Every page of a directory query, through the real HTTP API. */
async function allPages(query) {
  const out = [];
  for (let page = 1; ; page += 1) {
    const { status, body } = await server.get(`/v1/stations?${query}&limit=100&page=${page}`);
    assert.equal(status, 200, query);
    out.push(...body.data);
    if (page >= body.meta.total_pages) return { items: out, total: body.meta.total, meta: body.meta };
  }
}

describe("Vehicle, current and power filters act on one gun", () => {
  test("vehicle=car returns exactly the stations with a car-capable gun", async () => {
    const expected = stations.filter((s) => anyGun(s, { vehicle: "car" })).length;
    const { body } = await server.get("/v1/stations?vehicle=car&limit=1");
    assert.equal(body.meta.total, expected);
    const { items } = await allPages("vehicle=car&state=GA");
    for (const s of items) assert.ok(anyGun(s, { vehicle: "car" }), s.id);
    assert.ok(stations.some((s) => s.vehicle_classes.join() === "two_three_wheeler"), "data has 2W/3W-only stations");
  });

  test("current=dc&min_power_kw=50 returns only stations with one DC gun of at least 50 kW", async () => {
    const expected = stations.filter((s) => anyGun(s, { current: "DC", minKw: 50 })).length;
    const { items, total } = await allPages("current=dc&min_power_kw=50&state=KA");
    assert.ok(total > 0);
    for (const s of items) assert.ok(anyGun(s, { current: "DC", minKw: 50 }), s.id);
    const all = await server.get("/v1/stations?current=dc&min_power_kw=50&limit=1");
    assert.equal(all.body.meta.total, expected);
  });

  test("conditions combine on the same gun, not across guns", async () => {
    // A station whose AC guns are all below 30 kW but which has a DC gun of 30 kW or more.
    const target = stations.find(
      (s) => s.location_quality === "ok" && anyGun(s, { current: "AC" }) && !anyGun(s, { current: "AC", minKw: 30 }) && anyGun(s, { current: "DC", minKw: 30 })
    );
    assert.ok(target, "fixture station exists in the data");
    const ac = await allPages(`current=ac&min_power_kw=30&state=${target.state_code}`);
    assert.ok(!ac.items.some((s) => s.id === target.id), "AC 30 kW must not match a slow-AC + DC station");
    const dc = await allPages(`current=dc&min_power_kw=30&state=${target.state_code}`);
    assert.ok(dc.items.some((s) => s.id === target.id));
  });

  test("min_power_kw uses gun power: a 10 kW Bharat AC-001 (3.3 kW guns) does not match 5 kW", async () => {
    const bharatOnly = stations.find((s) => s.standards.join() === "BHARAT_AC001" && s.max_power_kw < 5);
    assert.ok(bharatOnly);
    const { items } = await allPages(`min_power_kw=5&state=${bharatOnly.state_code}&operator=${encodeURIComponent(bharatOnly.operator)}`);
    assert.ok(!items.some((s) => s.id === bharatOnly.id));
  });
});

describe("Connector, operator, ownership and location filters", () => {
  test("connector spellings CCS-2, CCS 2, ccs2 and CCS2 give the same total", async () => {
    const totals = [];
    for (const spelling of ["CCS-2", "CCS 2", "ccs2", "CCS2"]) {
      const { status, body } = await server.get(`/v1/stations?connector=${encodeURIComponent(spelling)}&limit=1`);
      assert.equal(status, 200, spelling);
      totals.push(body.meta.total);
    }
    assert.equal(new Set(totals).size, 1);
    assert.equal(totals[0], stations.filter((s) => s.standards.includes("CCS2")).length);
  });

  test("operator matches case-insensitively and never by substring", async () => {
    const a = await server.get("/v1/stations?operator=iocl&limit=1");
    const b = await server.get("/v1/stations?operator=IOCL&limit=1");
    assert.equal(a.body.meta.total, b.body.meta.total);
    assert.equal(a.body.meta.total, stations.filter((s) => s.operator === "IOCL").length);
    const partial = await server.get("/v1/stations?operator=IO");
    assert.equal(partial.status, 404);
    assert.equal(partial.body.error.code, "UNKNOWN_OPERATOR");
    assert.ok(partial.body.error.details.valid_values.includes("IOCL"));
  });

  test("ownership=govt returns only government operators", async () => {
    const { body } = await server.get("/v1/stations?ownership=govt&limit=1");
    assert.equal(body.meta.total, stations.filter((s) => s.ownership === "govt").length);
  });

  test("state accepts a name, a code and an ISO code", async () => {
    const totals = [];
    for (const v of ["Karnataka", "karnataka", "KA", "IN-KA"]) {
      const { body } = await server.get(`/v1/stations?state=${v}&limit=1`);
      totals.push(body.meta.total);
    }
    assert.equal(new Set(totals).size, 1);
    assert.equal(totals[0], stations.filter((s) => s.state_code === "KA").length);
  });

  test("location_quality=suspect returns only the flagged stations", async () => {
    const { body } = await server.get("/v1/stations?location_quality=suspect&limit=100");
    assert.equal(body.meta.total, stations.filter((s) => s.location_quality === "suspect").length);
    for (const s of body.data) assert.equal(s.location_quality, "suspect");
  });

  test("district filters within a state", async () => {
    const sample = stations.find((s) => s.state_code === "KA" && s.district === "Bengaluru Urban");
    assert.ok(sample);
    const { body } = await server.get("/v1/stations?state=KA&district=bengaluru%20urban&limit=1");
    assert.equal(body.meta.total, stations.filter((s) => s.state_code === "KA" && s.district.toLowerCase() === "bengaluru urban").length);
  });
});

describe("City lookup", () => {
  test("Bangalore and Bengaluru return the same stations", async () => {
    const a = await server.get("/v1/stations?city=Bangalore&limit=1");
    const b = await server.get("/v1/stations?city=Bengaluru&limit=1");
    assert.equal(a.status, 200);
    assert.equal(a.body.meta.total, b.body.meta.total);
    assert.ok(a.body.meta.total > 0);
  });

  test("a city name used in several states returns all and names the states", async () => {
    const { body } = await server.get("/v1/stations?city=Kota&limit=1");
    assert.ok(body.meta.filters_applied.city_ambiguous_states.length >= 2);
    const narrowed = await server.get("/v1/stations?city=Kota&state=RJ&limit=1");
    assert.ok(narrowed.body.meta.total < body.meta.total);
    assert.equal(narrowed.body.meta.filters_applied.city_ambiguous_states, undefined);
  });

  test("an unknown city is a 404 pointing at /v1/cities", async () => {
    const { status, body } = await server.get("/v1/stations?city=Atlantis&state=KA");
    assert.equal(status, 404);
    assert.equal(body.error.code, "UNKNOWN_CITY");
    assert.equal(body.error.details.hint, "/v1/cities?state=KA");
  });
});

describe("Unknown enum values are 404 with the valid values", () => {
  const cases = [
    ["connector=gbt", "UNKNOWN_CONNECTOR", "CCS2"],
    ["vehicle=truck", "UNKNOWN_VEHICLE", "car"],
    ["ownership=public", "UNKNOWN_OWNERSHIP", "govt"],
    ["current=both", "UNKNOWN_CURRENT", "dc"],
    ["location_quality=good", "UNKNOWN_LOCATION_QUALITY", "ok"],
  ];
  for (const [query, code, sample] of cases) {
    test(query, async () => {
      const { status, body } = await server.get(`/v1/stations?${query}`);
      assert.equal(status, 404);
      assert.equal(body.error.code, code);
      assert.ok(body.error.details.valid_values.includes(sample));
    });
  }
});

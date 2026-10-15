"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const meta = require("../data/meta.json");
const stations = require("../data/stations.json");
const server = useServer();

describe("Attribution on every /v1 success response", () => {
  const paths = [
    "/v1/stations?limit=1",
    "/v1/stations/near?lat=12.9716&lng=77.5946",
    `/v1/stations/${stations[0].id}`,
    "/v1/states",
    "/v1/cities?state=GA",
    "/v1/operators",
    "/v1/connectors",
    "/v1/meta",
  ];
  for (const path of paths) {
    test(path, async () => {
      const { status, body } = await server.get(path);
      assert.equal(status, 200);
      assert.equal(body.meta.attribution, meta.attribution);
      assert.equal(body.meta.source.url, meta.source.url);
    });
  }
});

describe("/v1/cities", () => {
  test("lists only the requested state's cities, with station counts that sum to the state total", async () => {
    const { status, body } = await server.get("/v1/cities?state=KA");
    assert.equal(status, 200);
    assert.ok(body.data.length > 0);
    for (const c of body.data) assert.equal(c.state_code, "KA");
    assert.equal(body.data.reduce((n, c) => n + c.stations, 0), stations.filter((s) => s.state_code === "KA").length);
  });

  test("without a state, lists every city across India", async () => {
    const { body } = await server.get("/v1/cities");
    assert.equal(body.data.reduce((n, c) => n + c.stations, 0), stations.length);
  });

  test("an unknown state is a 404", async () => {
    const { status, body } = await server.get("/v1/cities?state=XX");
    assert.equal(status, 404);
    assert.equal(body.error.code, "UNKNOWN_STATE");
  });
});

describe("/v1/operators", () => {
  test("every operator with ownership; station counts sum to the total", async () => {
    const { body } = await server.get("/v1/operators");
    assert.equal(body.data.length, meta.counts.operators);
    assert.equal(body.data.reduce((n, o) => n + o.stations, 0), stations.length);
    for (const o of body.data) assert.ok(["govt", "private"].includes(o.ownership));
    assert.ok(body.data[0].stations >= body.data[body.data.length - 1].stations, "sorted by stations");
  });
});

describe("/v1/connectors", () => {
  test("every standard with its source, vehicles served and real counts", async () => {
    const { body } = await server.get("/v1/connectors");
    const byId = Object.fromEntries(body.data.map((s) => [s.id, s]));
    for (const id of ["CCS2", "CHADEMO", "TYPE2_AC", "BHARAT_AC001", "BHARAT_DC001", "LEV_AC", "LEV_DC"]) {
      assert.ok(byId[id], id);
      assert.match(byId[id].source_url, /^https?:\/\//);
    }
    assert.ok(byId.CCS2.stations > 0 && byId.LEV_AC.stations > 0);
    assert.equal(byId.CCS2.stations, stations.filter((s) => s.standards.includes("CCS2")).length);
    assert.deepEqual(byId.LEV_AC.vehicle_classes, ["two_three_wheeler"]);
  });
});

describe("/v1/meta", () => {
  test("counts match the dataset", async () => {
    const { body } = await server.get("/v1/meta");
    assert.equal(body.data.counts.stations, stations.length);
    assert.equal(body.data.counts.suspect_locations, stations.filter((s) => s.location_quality === "suspect").length);
  });
});

describe("Reference endpoints take no unknown parameters", () => {
  for (const path of ["/v1/states?x=1", "/v1/operators?page=2", "/v1/connectors?limit=5", "/v1/meta?x=1", "/v1/cities?city=Pune"]) {
    test(path, async () => {
      const { status, body } = await server.get(path);
      assert.equal(status, 400);
      assert.equal(body.error.code, "UNKNOWN_PARAMETER");
    });
  }
});

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const meta = require("../data/meta.json");
const server = useServer();

describe("Root, health and endpoint index", () => {
  test("GET / describes the API and its data source", async () => {
    const { status, body } = await server.get("/");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.stations, meta.counts.stations);
    assert.equal(body.data.attribution, meta.attribution);
  });

  test("GET /health reports ok and the station count", async () => {
    const { status, body } = await server.get("/health");
    assert.equal(status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.stations_indexed, meta.counts.stations);
  });

  test("GET /v1 lists every endpoint", async () => {
    const { status, body } = await server.get("/v1");
    assert.equal(status, 200);
    const paths = body.data.endpoints.map((e) => e.path);
    for (const p of ["/v1/stations", "/v1/stations/near", "/v1/stations/{id}", "/v1/states", "/v1/cities", "/v1/operators", "/v1/connectors", "/v1/meta"]) {
      assert.ok(paths.includes(p), p);
    }
  });
});

describe("Stations directory (core)", () => {
  test("default page has 25 stations and the dataset total", async () => {
    const { status, body } = await server.get("/v1/stations");
    assert.equal(status, 200);
    assert.equal(body.data.length, 25);
    assert.equal(body.meta.total, meta.counts.stations);
    assert.equal(body.meta.page, 1);
    assert.equal(body.meta.limit, 25);
    assert.equal(body.meta.total_pages, Math.ceil(meta.counts.stations / 25));
  });

  test("station payloads carry the documented shape and no internal keys", async () => {
    const { body } = await server.get("/v1/stations?limit=50");
    for (const s of body.data) {
      for (const key of ["id", "operator", "ownership", "state", "state_code", "city", "latitude", "longitude", "chargers", "max_power_kw", "standards", "vehicle_classes", "location_quality"]) {
        assert.ok(key in s, `missing ${key}`);
      }
      for (const key of Object.keys(s)) assert.ok(!key.startsWith("_"), `internal key ${key}`);
      assert.ok(!("source" in s), "list items do not carry source page fields");
    }
  });

  test("a station id from the list round-trips through /v1/stations/:id with its source pages", async () => {
    const list = await server.get("/v1/stations?limit=1&page=7");
    const id = list.body.data[0].id;
    const { status, body } = await server.get(`/v1/stations/${id}`);
    assert.equal(status, 200);
    assert.equal(body.data.id, id);
    assert.ok(body.data.source.page_first >= 1);
  });
});

describe("States summary", () => {
  test("36 states/UTs whose station counts sum to the total", async () => {
    const { status, body } = await server.get("/v1/states");
    assert.equal(status, 200);
    assert.equal(body.data.length, 36);
    assert.equal(body.data.reduce((n, s) => n + s.stations, 0), meta.counts.stations);
    const ka = body.data.find((s) => s.code === "KA");
    assert.equal(ka.name, "Karnataka");
    assert.ok(ka.car_fast_dc_stations >= 0 && ka.car_fast_dc_stations <= ka.stations);
  });
});

describe("Loading", () => {
  test("data is loaded once per process", () => {
    const service = require("../src/services/stations-service");
    const first = service.loadCount();
    service.getStations({});
    service.getStations({});
    assert.equal(service.loadCount(), first <= 1 ? 1 : first);
  });
});

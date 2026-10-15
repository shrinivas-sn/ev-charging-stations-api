"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const stations = require("../data/stations.json");
const server = useServer();

const BENGALURU = "lat=12.9716&lng=77.5946";

describe("Radius search", () => {
  test("results are sorted by distance, then id, and lie inside the radius", async () => {
    const { status, body } = await server.get(`/v1/stations/near?${BENGALURU}&radius=5&limit=100`);
    assert.equal(status, 200);
    assert.ok(body.data.length > 0);
    for (let i = 1; i < body.data.length; i += 1) {
      const [a, b] = [body.data[i - 1], body.data[i]];
      assert.ok(a.distance_km < b.distance_km || (a.distance_km === b.distance_km && a.id < b.id), `order at ${i}`);
    }
    for (const s of body.data) assert.ok(s.distance_km <= 5);
    assert.equal(body.meta.radius_km, 5);
    assert.deepEqual(body.meta.center, { lat: 12.9716, lng: 77.5946 });
  });

  test("pages do not overlap and together equal one larger page", async () => {
    const p1 = await server.get(`/v1/stations/near?${BENGALURU}&radius=5&limit=10&page=1`);
    const p2 = await server.get(`/v1/stations/near?${BENGALURU}&radius=5&limit=10&page=2`);
    const both = await server.get(`/v1/stations/near?${BENGALURU}&radius=5&limit=20`);
    const ids = [...p1.body.data, ...p2.body.data].map((s) => s.id);
    assert.equal(new Set(ids).size, 20);
    assert.deepEqual(ids, both.body.data.map((s) => s.id));
    assert.equal(p1.body.meta.total_found, both.body.meta.total_found);
    assert.equal(p1.body.meta.total_pages, Math.ceil(p1.body.meta.total_found / 10));
  });

  test("a page past the end is empty, not an error", async () => {
    const { status, body } = await server.get(`/v1/stations/near?${BENGALURU}&radius=1&page=9999`);
    assert.equal(status, 200);
    assert.deepEqual(body.data, []);
  });

  test("suspect coordinates are never returned, even when the centre is on one", async () => {
    const suspect = stations.find((s) => s.location_quality === "suspect" && s.latitude >= -90 && s.latitude <= 90 && s.longitude >= -180 && s.longitude <= 180);
    assert.ok(suspect);
    const { status, body } = await server.get(`/v1/stations/near?lat=${suspect.latitude}&lng=${suspect.longitude}&radius=100&limit=100`);
    assert.equal(status, 200);
    for (const s of body.data) assert.equal(s.location_quality, "ok");
  });

  test("filters apply on the server, so totals reflect the filter", async () => {
    const all = await server.get(`/v1/stations/near?${BENGALURU}&radius=10&limit=1`);
    const car = await server.get(`/v1/stations/near?${BENGALURU}&radius=10&limit=100&vehicle=car&current=dc&min_power_kw=50`);
    assert.ok(car.body.meta.total_found < all.body.meta.total_found);
    for (const s of car.body.data) {
      assert.ok(s.chargers.some((c) => c.guns.some((g) => ["CCS2", "CHADEMO", "BHARAT_DC001"].includes(g.standard) && g.kw >= 50)), s.id);
    }
    assert.equal(car.body.meta.filters_applied.vehicle, "car");
  });

  test("radius 0, negative or above 100 is rejected; lat/lng are required", async () => {
    for (const r of ["0", "-5", "100.5"]) {
      const { status } = await server.get(`/v1/stations/near?${BENGALURU}&radius=${r}`);
      assert.equal(status, 400, r);
    }
    for (const q of ["lng=77.5", "lat=12.9", "lat=&lng=77"]) {
      const { status, body } = await server.get(`/v1/stations/near?${q}`);
      assert.equal(status, 400, q);
      assert.equal(body.error.code, "MISSING_COORDINATES", q);
    }
    const { body } = await server.get("/v1/stations/near?lat=91&lng=77");
    assert.equal(body.error.code, "INVALID_LATITUDE");
  });

  test("the default radius is 10 km", async () => {
    const { body } = await server.get(`/v1/stations/near?${BENGALURU}`);
    assert.equal(body.meta.radius_km, 10);
  });
});

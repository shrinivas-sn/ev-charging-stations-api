"use strict";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/app");

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("Health & Root Endpoints", () => {
  test("GET / returns 200 with API metadata and docs link", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.name, "India EV Charging Station Directory API");
    assert.ok(json.data.endpoints.length > 0);
    assert.ok(json.data.total_stations > 0);
  });

  test("GET /health returns 200 with service status ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, "ok");
    assert.equal(json.service, "ev-charging-stations-api");
    assert.ok(json.stations_indexed > 0);
  });
});

describe("Stations Directory Endpoints", () => {
  test("GET /v1/stations returns default paginated list of stations", async () => {
    const res = await fetch(`${baseUrl}/v1/stations`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.meta.limit, 25);
    assert.equal(json.meta.page, 1);
    assert.equal(json.data.length, 25);
    assert.ok(json.meta.total > 20000);

    const first = json.data[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.operator);
    assert.ok(first.state);
    assert.ok(first.city);
    assert.ok(typeof first.latitude === "number");
    assert.ok(typeof first.longitude === "number");
    assert.ok(Array.isArray(first.connectors));
  });

  test("GET /v1/stations with state filter returns only stations from that state", async () => {
    const res = await fetch(`${baseUrl}/v1/stations?state=Karnataka&limit=10`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length > 0);
    for (const st of json.data) {
      assert.equal(st.state, "Karnataka");
    }
  });

  test("GET /v1/stations with city filter returns only stations from that city", async () => {
    const res = await fetch(`${baseUrl}/v1/stations?city=Mumbai&limit=10`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length > 0);
    for (const st of json.data) {
      assert.equal(st.city, "Mumbai");
    }
  });

  test("GET /v1/stations with min_power_kw filter returns only high-capacity stations", async () => {
    const res = await fetch(`${baseUrl}/v1/stations?min_power_kw=100&limit=10`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length > 0);
    for (const st of json.data) {
      assert.ok(st.total_capacity_kw >= 100);
    }
  });
});

describe("Proximity Geo-Radius Search", () => {
  test("GET /v1/stations/near returns stations ordered by distance around Bengaluru coordinates", async () => {
    // Bengaluru center coordinates
    const res = await fetch(`${baseUrl}/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&limit=5`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length > 0);

    let prevDist = -1;
    for (const st of json.data) {
      assert.ok(typeof st.distance_km === "number");
      assert.ok(st.distance_km <= 15);
      assert.ok(st.distance_km >= prevDist, "Stations must be sorted by distance");
      prevDist = st.distance_km;
    }
  });

  test("GET /v1/stations/near returns 400 when lat or lng is missing", async () => {
    const res = await fetch(`${baseUrl}/v1/stations/near?lat=12.9716`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, "MISSING_COORDINATES");
  });

  test("GET /v1/stations/near returns 400 when latitude is invalid", async () => {
    const res = await fetch(`${baseUrl}/v1/stations/near?lat=195.0&lng=77.5946`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, "INVALID_LATITUDE");
  });
});

describe("Station Detail Lookup", () => {
  test("GET /v1/stations/1 returns station detail object", async () => {
    const res = await fetch(`${baseUrl}/v1/stations/1`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, 1);
    assert.ok(json.data.name);
    assert.ok(json.data.connectors.length > 0);
  });

  test("GET /v1/stations/9999999 returns 404 when station does not exist", async () => {
    const res = await fetch(`${baseUrl}/v1/stations/9999999`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, "STATION_NOT_FOUND");
  });
});

describe("Reference Endpoints", () => {
  test("GET /v1/states returns state aggregates", async () => {
    const res = await fetch(`${baseUrl}/v1/states`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length >= 20);
    const firstState = json.data[0];
    assert.ok(firstState.state);
    assert.ok(firstState.total_stations > 0);
    assert.ok(firstState.top_operators.length > 0);
  });

  test("GET /v1/connectors returns connector standard dictionary", async () => {
    const res = await fetch(`${baseUrl}/v1/connectors`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length >= 5);
    const ccs = json.data.find((c) => c.id === "ccs-2");
    assert.ok(ccs);
    assert.equal(ccs.name, "CCS Type 2 (Combo 2)");
    assert.equal(ccs.current_type, "DC");
  });

  test("Unknown route returns 404 with standardized error envelope", async () => {
    const res = await fetch(`${baseUrl}/v1/unknown-endpoint-path`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, "ROUTE_NOT_FOUND");
  });
});

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
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("Health, root and endpoint index", () => {
  test("GET / returns 200 with API metadata and endpoint list", async () => {
    const { status, body } = await get("/");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.name, "India EV Charging Station Directory API");
    assert.ok(body.data.endpoints.length > 0);
  });

  test("GET /health returns 200 with service status ok", async () => {
    const { status, body } = await get("/health");
    assert.equal(status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "ev-charging-stations-api");
    assert.ok(body.stations_indexed > 0);
  });

  test("GET /v1 is a self-describing endpoint index, not a 404", async () => {
    const { status, body } = await get("/v1");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    const paths = body.data.endpoints.map((e) => e.path);
    assert.ok(paths.includes("/v1/stations"));
    assert.ok(paths.includes("/v1/stations/near"));
    assert.ok(paths.includes("/v1/operators"));
    assert.ok(body.data.rate_limit.requests > 0);
  });
});

describe("Dataset provenance honesty", () => {
  test("GET /v1/meta reports the dataset as generated sample data, not official", async () => {
    const { status, body } = await get("/v1/meta");
    assert.equal(status, 200);
    assert.equal(body.data.dataset_status, "generated-sample");
    assert.equal(body.data.provenance.is_official, false);
    assert.ok(/not official/i.test(body.data.provenance.summary));
  });

  test("meta counts are derived from the data and agree with /v1/states", async () => {
    const meta = (await get("/v1/meta")).body.data;
    const states = (await get("/v1/states")).body;
    assert.equal(meta.total_states, states.meta.count);
    assert.equal(meta.total_stations, states.meta.total_stations);
    assert.equal(meta.coverage.states_and_union_territories, states.meta.count);
  });

  test("dataset covers all 36 states and union territories", async () => {
    const { body } = await get("/v1/meta");
    assert.equal(body.data.coverage.states_and_union_territories, 36);
  });
});

describe("Stations directory", () => {
  test("GET /v1/stations returns a default paginated list", async () => {
    const { status, body } = await get("/v1/stations");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.meta.limit, 25);
    assert.equal(body.meta.page, 1);
    assert.equal(body.data.length, 25);
    assert.ok(body.meta.total > 20000);
    assert.ok(body.meta.took_ms >= 0);

    const first = body.data[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.operator);
    assert.ok(first.state);
    assert.ok(first.city);
    assert.equal(typeof first.latitude, "number");
    assert.equal(typeof first.longitude, "number");
    assert.ok(Array.isArray(first.connectors));
  });

  test("station payloads never leak internal index keys", async () => {
    const { body } = await get("/v1/stations?limit=5");
    for (const station of body.data) {
      for (const key of Object.keys(station)) {
        assert.ok(!key.startsWith("_"), `unexpected internal key ${key}`);
      }
    }
  });

  test("state filter accepts full names, state codes and padded input", async () => {
    for (const query of ["state=Karnataka", "state=KA", "state=%20karnataka%20"]) {
      const { body } = await get(`/v1/stations?${query}&limit=10`);
      assert.ok(body.data.length > 0, `${query} returned no rows`);
      for (const station of body.data) assert.equal(station.state, "Karnataka");
      assert.equal(body.meta.filters_applied.state, "Karnataka");
    }
  });

  test("state filter reaches states outside the original 22-state subset", async () => {
    const { body } = await get("/v1/stations?state=Manipur&limit=5");
    assert.ok(body.data.length > 0);
    for (const station of body.data) assert.equal(station.state, "Manipur");
  });

  test("city filter trims input and resolves colloquial aliases", async () => {
    const trimmed = await get("/v1/stations?city=%20Mumbai%20&limit=5");
    assert.ok(trimmed.body.data.length > 0);
    for (const station of trimmed.body.data) assert.equal(station.city, "Mumbai");

    const alias = await get("/v1/stations?city=Bangalore&limit=5");
    assert.ok(alias.body.data.length > 0);
    for (const station of alias.body.data) assert.equal(station.city, "Bengaluru");
    assert.equal(alias.body.meta.filters_applied.city, "Bengaluru");
  });

  test("connector filter normalises CCS-2, CCS 2, ccs2 and Type2 spellings", async () => {
    const ccsBaseline = (await get("/v1/stations?connector=CCS-2&limit=1")).body.meta.total;
    assert.ok(ccsBaseline > 0);

    for (const spelling of ["CCS-2", "CCS 2", "ccs2", "CCS%202"]) {
      const { body } = await get(`/v1/stations?connector=${spelling}&limit=1`);
      assert.equal(body.meta.total, ccsBaseline, `${spelling} disagreed with CCS-2`);
      assert.equal(body.meta.filters_applied.connector, "CCS-2");
    }

    const type2 = (await get("/v1/stations?connector=Type2&limit=1")).body;
    assert.ok(type2.meta.total > 0);
    assert.equal(type2.meta.filters_applied.connector, "Type-2 AC");
  });

  test("min_power_kw filter excludes lower-capacity stations", async () => {
    const { body } = await get("/v1/stations?min_power_kw=100&limit=20");
    assert.ok(body.data.length > 0);
    for (const station of body.data) assert.ok(station.total_capacity_kw >= 100);
    assert.equal(body.meta.filters_applied.min_power_kw, 100);
  });

  test("operator filter matches case-insensitively and reports the canonical name", async () => {
    const { body } = await get("/v1/stations?operator=statiq&limit=5");
    assert.ok(body.data.length > 0);
    for (const station of body.data) assert.equal(station.operator, "Statiq");
    assert.equal(body.meta.filters_applied.operator, "Statiq");
  });

  test("page beyond the last page returns an empty page, not an error", async () => {
    const { status, body } = await get("/v1/stations?page=99999");
    assert.equal(status, 200);
    assert.equal(body.data.length, 0);
    assert.equal(body.meta.count, 0);
  });
});

describe("Query parameter validation", () => {
  test("non-numeric min_power_kw is rejected instead of silently ignored", async () => {
    const { status, body } = await get("/v1/stations?min_power_kw=abc");
    assert.equal(status, 400);
    assert.equal(body.error.code, "INVALID_PARAMETER");
    assert.equal(body.error.details.parameter, "min_power_kw");
  });

  test("negative min_power_kw is rejected", async () => {
    const { status, body } = await get("/v1/stations?min_power_kw=-5");
    assert.equal(status, 400);
    assert.equal(body.error.code, "INVALID_PARAMETER");
  });

  test("limit above the maximum is rejected rather than clamped in silence", async () => {
    const { status, body } = await get("/v1/stations?limit=5000");
    assert.equal(status, 400);
    assert.equal(body.error.details.parameter, "limit");
  });

  test("limit=0 and page=0 are rejected", async () => {
    assert.equal((await get("/v1/stations?limit=0")).status, 400);
    assert.equal((await get("/v1/stations?page=0")).status, 400);
    assert.equal((await get("/v1/stations?page=abc")).status, 400);
  });

  test("unknown state, city and connector values produce actionable 400s", async () => {
    const state = await get("/v1/stations?state=Atlantis");
    assert.equal(state.status, 400);
    assert.equal(state.body.error.code, "UNKNOWN_STATE");

    const city = await get("/v1/stations?city=Atlantis");
    assert.equal(city.status, 400);
    assert.equal(city.body.error.code, "UNKNOWN_CITY");

    const connector = await get("/v1/stations?connector=GB/T");
    assert.equal(connector.status, 400);
    assert.equal(connector.body.error.code, "UNKNOWN_CONNECTOR");
    assert.ok(Array.isArray(connector.body.error.details.expected));
  });
});

describe("Proximity search", () => {
  test("GET /v1/stations/near returns stations ordered nearest first", async () => {
    const { status, body } = await get(
      "/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&limit=5"
    );
    assert.equal(status, 200);
    assert.ok(body.data.length > 0);

    let previous = -1;
    for (const station of body.data) {
      assert.equal(typeof station.distance_km, "number");
      assert.ok(station.distance_km <= 15);
      assert.ok(station.distance_km >= previous, "stations must be sorted by distance");
      previous = station.distance_km;
    }
  });

  test("near result meta echoes the search window and the page size", async () => {
    const { body } = await get("/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&limit=3");
    assert.deepEqual(body.meta.center, { lat: 12.9716, lng: 77.5946 });
    assert.equal(body.meta.radius_km, 15);
    assert.equal(body.meta.limit, 3);
    assert.ok(body.meta.total_found >= body.meta.count);
  });

  test("near search accepts connector and min_power_kw filters server side", async () => {
    const unfiltered = (await get("/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&limit=1"))
      .body.meta.total_found;
    const filtered = (
      await get("/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&connector=Bharat%20DC-001&limit=5")
    ).body;
    const capacity = (
      await get("/v1/stations/near?lat=12.9716&lng=77.5946&radius=15&min_power_kw=100&limit=5")
    ).body;

    assert.ok(filtered.meta.total_found > 0);
    assert.ok(filtered.meta.total_found < unfiltered, "connector filter did not narrow the radius");
    assert.equal(filtered.meta.filters_applied.connector, "Bharat DC-001");
    for (const station of filtered.data) {
      assert.ok(station.connectors.some((c) => c.type === "Bharat DC-001"));
    }

    for (const station of capacity.data) assert.ok(station.total_capacity_kw >= 100);
  });

  test("missing or empty coordinates return 400 MISSING_COORDINATES", async () => {
    for (const path of ["/v1/stations/near?lat=12.9716", "/v1/stations/near?lng=77.5946", "/v1/stations/near?lat=&lng=77"]) {
      const { status, body } = await get(path);
      assert.equal(status, 400, path);
      assert.equal(body.error.code, "MISSING_COORDINATES");
    }
  });

  test("out-of-range coordinates return 400", async () => {
    const lat = await get("/v1/stations/near?lat=195&lng=77");
    assert.equal(lat.status, 400);
    assert.equal(lat.body.error.code, "INVALID_LATITUDE");

    const lng = await get("/v1/stations/near?lat=12&lng=200");
    assert.equal(lng.status, 400);
    assert.equal(lng.body.error.code, "INVALID_LONGITUDE");
  });

  test("zero and negative radii are rejected instead of silently rewritten", async () => {
    for (const radius of ["0", "-5"]) {
      const { status, body } = await get(
        `/v1/stations/near?lat=12.9716&lng=77.5946&radius=${radius}`
      );
      assert.equal(status, 400, `radius=${radius}`);
      assert.equal(body.error.code, "INVALID_PARAMETER");
    }
  });

  test("radius above 100 km is rejected rather than silently capped", async () => {
    const { status, body } = await get("/v1/stations/near?lat=12.9716&lng=77.5946&radius=250");
    assert.equal(status, 400);
    assert.equal(body.error.details.parameter, "radius");
  });
});

describe("Station detail", () => {
  test("GET /v1/stations/1 returns one station", async () => {
    const { status, body } = await get("/v1/stations/1");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, 1);
    assert.ok(body.data.name);
    assert.ok(body.data.connectors.length > 0);
  });

  test("non-integer ids are rejected instead of truncating to a real station", async () => {
    for (const id of ["1.5", "1e3", "abc", "-1", "0x10"]) {
      const { status, body } = await get(`/v1/stations/${id}`);
      assert.equal(status, 400, `id ${id}`);
      assert.equal(body.error.code, "INVALID_STATION_ID");
    }
  });

  test("a well-formed but unknown id returns 404", async () => {
    const { status, body } = await get("/v1/stations/9999999");
    assert.equal(status, 404);
    assert.equal(body.error.code, "STATION_NOT_FOUND");
  });
});

describe("Reference endpoints", () => {
  test("GET /v1/states returns one aggregate per state/UT", async () => {
    const { status, body } = await get("/v1/states");
    assert.equal(status, 200);
    assert.equal(body.data.length, 36);
    assert.equal(body.data[0].state.length > 0, true);
    assert.ok(body.data[0].total_stations > 0);
    assert.ok(body.data[0].top_operators.length > 0);
  });

  test("GET /v1/operators lists charge point operators with counts that sum to the total", async () => {
    const { status, body } = await get("/v1/operators");
    assert.equal(status, 200);
    assert.ok(body.data.length >= 5);
    const sum = body.data.reduce((total, row) => total + row.total_stations, 0);
    assert.equal(sum, body.meta.total_stations);
    assert.ok(body.data.every((row) => typeof row.operator === "string"));
  });

  test("GET /v1/connectors returns the standard dictionary with station counts", async () => {
    const { status, body } = await get("/v1/connectors");
    assert.equal(status, 200);
    assert.ok(body.data.length >= 5);

    const ccs = body.data.find((row) => row.id === "ccs-2");
    assert.ok(ccs);
    assert.equal(ccs.name, "CCS Type 2 (Combo 2)");
    assert.equal(ccs.current_type, "DC");
    assert.ok(ccs.stations_with_this_connector > 0);

    // Documented but absent from this dataset: must report zero, not a guess.
    const chademo = body.data.find((row) => row.id === "chademo");
    assert.equal(chademo.dataset_type, null);
    assert.equal(chademo.stations_with_this_connector, 0);
  });

  test("unknown routes return the standard error envelope", async () => {
    const { status, body } = await get("/v1/unknown-endpoint-path");
    assert.equal(status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "ROUTE_NOT_FOUND");
  });
});

describe("CORS and rate limiting", () => {
  test("responses carry CORS headers for keyless browser use", async () => {
    const res = await fetch(`${baseUrl}/v1/connectors`);
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
  });

  test("rate limit headers are present and keyed per forwarded client address", async () => {
    const first = await fetch(`${baseUrl}/v1/meta`, {
      headers: { "X-Forwarded-For": "203.0.113.9" },
    });
    const second = await fetch(`${baseUrl}/v1/meta`, {
      headers: { "X-Forwarded-For": "198.51.100.7" },
    });
    assert.equal(first.headers.get("ratelimit-limit"), second.headers.get("ratelimit-limit"));
    // Two distinct clients must not share a remaining-requests counter.
    const remainingFirst = Number(first.headers.get("ratelimit-remaining"));
    const remainingSecond = Number(second.headers.get("ratelimit-remaining"));
    assert.ok(
      Math.abs(remainingFirst - remainingSecond) <= 1,
      `clients shared one bucket: ${remainingFirst} vs ${remainingSecond}`
    );
  });
});

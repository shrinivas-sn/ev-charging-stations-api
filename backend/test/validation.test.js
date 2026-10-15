"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const server = useServer();

describe("Unknown and malformed parameters", () => {
  test("an unknown parameter is a 400 that names the allowed ones", async () => {
    for (const path of ["/v1/stations?min_power=50", "/v1/stations?offset=5", "/v1/stations/near?lat=12.9&lng=77.5&location_quality=ok"]) {
      const { status, body } = await server.get(path);
      assert.equal(status, 400, path);
      assert.equal(body.error.code, "UNKNOWN_PARAMETER", path);
      assert.ok(Array.isArray(body.error.details.allowed), path);
    }
    const { body } = await server.get("/v1/stations?min_power=50");
    assert.ok(body.error.details.allowed.includes("min_power_kw"));
  });

  test("a repeated parameter is a 400", async () => {
    const { status, body } = await server.get("/v1/stations?state=MH&state=KA");
    assert.equal(status, 400);
    assert.equal(body.error.code, "INVALID_PARAMETER");
  });

  test("numbers must be plain decimals: hex, exponent, Infinity and suffixes are 400", async () => {
    const cases = [
      ["/v1/stations?min_power_kw=0x10", "INVALID_PARAMETER"],
      ["/v1/stations?min_power_kw=1e2", "INVALID_PARAMETER"],
      ["/v1/stations?min_power_kw=50kw", "INVALID_PARAMETER"],
      ["/v1/stations?page=1.5", "INVALID_PARAMETER"],
      ["/v1/stations?limit=Infinity", "INVALID_PARAMETER"],
      ["/v1/stations/near?lat=0x10&lng=77", "INVALID_LATITUDE"],
      ["/v1/stations/near?lat=1e1&lng=77", "INVALID_LATITUDE"],
      ["/v1/stations/near?lat=12&lng=77abc", "INVALID_LONGITUDE"],
      ["/v1/stations/near?lat=12&lng=77&radius=Infinity", "INVALID_PARAMETER"],
    ];
    for (const [path, code] of cases) {
      const { status, body } = await server.get(path);
      assert.equal(status, 400, path);
      assert.equal(body.error.code, code, path);
    }
  });

  test("an empty value means the default", async () => {
    const { status, body } = await server.get("/v1/stations?limit=&page=");
    assert.equal(status, 200);
    assert.equal(body.meta.limit, 25);
    assert.equal(body.meta.page, 1);
  });

  test("limit above 100 and page 0 are rejected", async () => {
    for (const path of ["/v1/stations?limit=101", "/v1/stations?limit=0", "/v1/stations?page=0"]) {
      const { status } = await server.get(path);
      assert.equal(status, 400, path);
    }
  });

  test("an unknown state is a 404 listing every valid state", async () => {
    const { status, body } = await server.get("/v1/stations?state=Atlantis");
    assert.equal(status, 404);
    assert.equal(body.error.code, "UNKNOWN_STATE");
    assert.equal(body.error.details.valid_values.length, 36);
  });
});

describe("Station ids", () => {
  test("malformed ids, including old integer ids, are 400", async () => {
    for (const id of ["123", "1", "evs_xyz", "evs_00000000000", "EVS_0000000000"]) {
      const { status, body } = await server.get(`/v1/stations/${id}`);
      assert.equal(status, 400, id);
      assert.equal(body.error.code, "INVALID_STATION_ID", id);
    }
  });

  test("a well-formed unknown id is 404", async () => {
    const { status, body } = await server.get("/v1/stations/evs_0000000000");
    assert.equal(status, 404);
    assert.equal(body.error.code, "STATION_NOT_FOUND");
  });
});

describe("Methods and unknown routes", () => {
  test("POST, PUT and DELETE on a known route are 405 with an Allow header", async () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
      const { status, headers, body } = await server.request("/v1/stations", { method });
      assert.equal(status, 405, method);
      assert.equal(headers.get("allow"), "GET, HEAD, OPTIONS");
      assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
    }
    const detail = await server.request("/v1/stations/evs_0000000000", { method: "DELETE" });
    assert.equal(detail.status, 405);
  });

  test("an unknown path is a JSON 404", async () => {
    const { status, body } = await server.get("/v1/nope");
    assert.equal(status, 404);
    assert.equal(body.error.code, "ROUTE_NOT_FOUND");
  });
});

describe("Unhandled errors", () => {
  test("an exception becomes a 500 envelope with no stack, path or version", async () => {
    const service = require("../src/services/stations-service");
    const original = service.getStatesSummary;
    const errorLog = console.error;
    service.getStatesSummary = () => {
      throw new Error("boom at E:\\secret\\path.js:12 express@5.3.0");
    };
    console.error = () => {};
    try {
      const { status, body, headers } = await server.get("/v1/states");
      assert.equal(status, 500);
      assert.equal(body.error.code, "INTERNAL_SERVER_ERROR");
      const text = JSON.stringify(body);
      for (const leak of ["boom", "secret", "path.js", "express@", "at "]) assert.ok(!text.includes(leak), leak);
      assert.equal(headers.get("cache-control"), "no-store");
    } finally {
      service.getStatesSummary = original;
      console.error = errorLog;
    }
  });
});

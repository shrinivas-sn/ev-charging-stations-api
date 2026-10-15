"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const server = useServer();
const CACHEABLE = "public, s-maxage=3600, stale-while-revalidate=86400";

describe("Caching headers", () => {
  test("successful /v1 responses are CDN-cacheable", async () => {
    for (const path of ["/v1/stations?limit=1", "/v1/stations/near?lat=12.97&lng=77.59", "/v1/states", "/v1/connectors", "/v1"]) {
      const { status, headers } = await server.get(path);
      assert.equal(status, 200, path);
      assert.equal(headers.get("cache-control"), CACHEABLE, path);
    }
  });

  test("404 responses are cacheable too (a missing station stays missing until the next deploy)", async () => {
    const { status, headers } = await server.get("/v1/stations/evs_0000000000");
    assert.equal(status, 404);
    assert.equal(headers.get("cache-control"), CACHEABLE);
  });

  test("400, 405 and 500-class responses are never cached", async () => {
    const bad = await server.get("/v1/stations?limit=abc");
    assert.equal(bad.status, 400);
    assert.equal(bad.headers.get("cache-control"), "no-store");
    const method = await server.request("/v1/stations", { method: "POST" });
    assert.equal(method.status, 405);
    assert.equal(method.headers.get("cache-control"), "no-store");
  });

  test("/health is never cached", async () => {
    const { headers } = await server.get("/health");
    assert.equal(headers.get("cache-control"), "no-store");
  });

  test("cacheable responses carry no per-client rate-limit headers", async () => {
    const { headers } = await server.get("/v1/stations?limit=1");
    for (const name of ["ratelimit", "ratelimit-remaining", "ratelimit-limit", "x-ratelimit-remaining", "ratelimit-policy"]) {
      assert.equal(headers.get(name), null, name);
    }
  });
});

describe("CORS", () => {
  test("GET responses allow any origin (public keyless API)", async () => {
    const { headers } = await server.get("/v1/stations?limit=1", { headers: { Origin: "https://example.com" } });
    assert.equal(headers.get("access-control-allow-origin"), "*");
  });

  test("a preflight is answered with the allowed methods", async () => {
    const { status, headers } = await server.request("/v1/stations", {
      method: "OPTIONS",
      headers: { Origin: "https://example.com", "Access-Control-Request-Method": "GET" },
    });
    assert.equal(status, 204);
    assert.equal(headers.get("access-control-allow-origin"), "*");
    assert.match(headers.get("access-control-allow-methods"), /GET/);
  });
});

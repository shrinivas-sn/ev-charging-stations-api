"use strict";

// Runs in its own process (node --test isolates files), so this limit applies only here.
process.env.RATE_LIMIT_MAX = "2";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const server = useServer();

describe("Rate limiting", () => {
  test("requests past the limit get a 429 envelope with Retry-After and no-store", async () => {
    const client = { headers: { "X-Forwarded-For": "203.0.113.10" } };
    assert.equal((await server.get("/v1/states", client)).status, 200);
    assert.equal((await server.get("/v1/states", client)).status, 200);
    const limited = await server.get("/v1/states", client);
    assert.equal(limited.status, 429);
    assert.equal(limited.body.success, false);
    assert.equal(limited.body.error.code, "RATE_LIMIT_EXCEEDED");
    const retryAfter = Number(limited.headers.get("retry-after"));
    assert.ok(Number.isInteger(retryAfter) && retryAfter > 0, `Retry-After ${limited.headers.get("retry-after")}`);
    assert.equal(limited.headers.get("cache-control"), "no-store");
  });

  test("another client address has its own budget", async () => {
    const other = await server.get("/v1/states", { headers: { "X-Forwarded-For": "198.51.100.7" } });
    assert.equal(other.status, 200);
  });

  test("/health is not rate limited", async () => {
    const client = { headers: { "X-Forwarded-For": "203.0.113.10" } };
    assert.equal((await server.get("/health", client)).status, 200);
  });
});

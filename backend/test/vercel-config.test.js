"use strict";

// Checks the deploy config: function region, files shipped with it, headers and routes.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "vercel.json"), "utf8"));

const REWRITE_SOURCES = ["/health", "/v1", "/v1/(.*)", "/docs", "/playground", "/status", "/guides", "/guides/:id"];

describe("vercel.json", () => {
  test("regions pins the function to Mumbai", () => {
    assert.deepEqual(config.regions, ["bom1"]);
  });

  test("only backend/data is shipped with the function", () => {
    assert.equal(config.functions["api/index.js"].includeFiles, "backend/data/**");
    assert.equal(config.functions["api/index.js"].maxDuration, 15);
  });

  test("no header overrides the function's own Cache-Control on /v1", () => {
    assert.ok(!config.headers.some((h) => h.source === "/v1/(.*)"));
  });

  test("the portal still builds with vite into frontend/dist", () => {
    assert.equal(config.framework, "vite");
    assert.equal(config.buildCommand, "npm run build");
    assert.equal(config.outputDirectory, "frontend/dist");
  });

  test("rewrites stay the eight known routes, in order", () => {
    assert.deepEqual(config.rewrites.map((r) => r.source), REWRITE_SOURCES);
  });

  test("only the /v1 rewrite uses a wildcard", () => {
    for (const { source } of config.rewrites) {
      if (source === "/v1/(.*)") continue;
      assert.ok(!source.includes("(.*)"), source);
    }
  });

  test("keeps /health uncached and the security headers on everything else", () => {
    const bySource = Object.fromEntries(config.headers.map((h) => [h.source, h.headers]));
    const value = (source, key) => bySource[source].find((h) => h.key === key).value;
    assert.equal(value("/health", "Cache-Control"), "no-store");
    assert.equal(value("/(.*)", "X-Content-Type-Options"), "nosniff");
    assert.equal(value("/(.*)", "X-Frame-Options"), "DENY");
    assert.equal(value("/(.*)", "Referrer-Policy"), "strict-origin-when-cross-origin");
  });
});

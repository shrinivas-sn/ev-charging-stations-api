"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { useServer } = require("./helpers");

const manifest = require("../../api.json");
const server = useServer();

describe("Manifest routes", () => {
  test("every api route answers 200 with JSON, as api.json advertises", async () => {
    const routes = manifest.routes.filter((route) => route.kind === "api");
    assert.ok(routes.length > 0, "api.json has no api routes");
    for (const route of routes) {
      const { status, headers } = await server.get(route.path);
      assert.equal(status, 200, `${route.path}: expected 200, got ${status}`);
      assert.match(headers.get("content-type") || "", /application\/json/, route.path);
    }
  });
});

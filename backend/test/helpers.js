"use strict";

// Starts the real Express app on an ephemeral port for one test file.
// node --test runs each file in its own process, so env set here is per file.

if (!process.env.RATE_LIMIT_MAX) process.env.RATE_LIMIT_MAX = "1000000";

const { before, after } = require("node:test");
const http = require("node:http");

function useServer() {
  const ctx = { baseUrl: null };
  let server;

  before(async () => {
    const app = require("../src/app");
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        ctx.baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  ctx.request = async (path, { method = "GET", headers = {} } = {}) => {
    const res = await fetch(`${ctx.baseUrl}${path}`, { method, headers });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, headers: res.headers, body };
  };
  ctx.get = (path, options) => ctx.request(path, options);

  return ctx;
}

module.exports = { useServer };

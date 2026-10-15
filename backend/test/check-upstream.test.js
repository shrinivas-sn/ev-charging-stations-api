"use strict";

// check-upstream compares BEE's linked PDF with the pinned backend/data/source.json.
// No network here: each test injects a fake fetch.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { checkUpstream } = require("../scripts/check-upstream");

const PDF = Buffer.from("%PDF-1.4 test");
const SHA = crypto.createHash("sha256").update(PDF).digest("hex");
const PAGE = "http://bee.test/page";
const ANCHOR_TEXT = "EV Public Charging Stations Data till 26th October 2025 (Click to view the detailed list)";

const anchor = (href) => `<a href="/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf">unrelated</a>\n<a href="${href}" onclick="x()">${ANCHOR_TEXT}</a>`;

function source() {
  return { page_url: PAGE, url: "http://bee.test/a.pdf", sha256: SHA, size_bytes: PDF.length };
}

function fakeFetch(routes) {
  return async (url) => {
    const route = routes[url];
    if (!route) throw new Error(`unexpected URL ${url}`);
    if (route instanceof Error) throw route;
    return new Response(route.body, { status: route.status ?? 200 });
  };
}

describe("check-upstream", () => {
  test("same file: exit 0, status same", async () => {
    const fetchImpl = fakeFetch({
      [PAGE]: { body: anchor("http://bee.test/a.pdf") },
      "http://bee.test/a.pdf": { body: PDF },
    });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 0);
    assert.equal(result.status, "same");
    assert.equal(result.upstream.url, "http://bee.test/a.pdf");
    assert.equal(result.upstream.anchor_text, ANCHOR_TEXT);
    assert.equal(result.current.sha256, SHA);
  });

  test("BEE links a different file: exit 2", async () => {
    const fetchImpl = fakeFetch({
      [PAGE]: { body: anchor("/b.pdf") },
      "http://bee.test/b.pdf": { body: PDF },
    });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 2);
    assert.equal(result.status, "changed");
    assert.equal(result.upstream.url, "http://bee.test/b.pdf");
  });

  test("same URL, different bytes: exit 2", async () => {
    const fetchImpl = fakeFetch({
      [PAGE]: { body: anchor("http://bee.test/a.pdf") },
      "http://bee.test/a.pdf": { body: Buffer.from("%PDF-1.4 other") },
    });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 2);
    assert.equal(result.status, "changed");
  });

  test("no BEE anchor on the page: error", async () => {
    const fetchImpl = fakeFetch({ [PAGE]: { body: "<html><body>maintenance</body></html>" } });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 1);
    assert.equal(result.status, "error");
    assert.equal(result.reason, "anchor not found");
  });

  test("the link answers HTML instead of a PDF: error", async () => {
    const fetchImpl = fakeFetch({
      [PAGE]: { body: anchor("http://bee.test/a.pdf") },
      "http://bee.test/a.pdf": { body: "<html><body>not a pdf</body></html>" },
    });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 1);
    assert.equal(result.reason, "not a PDF");
  });

  test("BEE page down: error with the status", async () => {
    const fetchImpl = fakeFetch({ [PAGE]: { status: 503, body: "unavailable" } });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 1);
    assert.equal(result.reason, "page HTTP 503");
  });

  test("network failure: error with the message", async () => {
    const fetchImpl = fakeFetch({ [PAGE]: new Error("getaddrinfo ENOTFOUND bee.test") });
    const result = await checkUpstream({ fetchImpl, source: source() });
    assert.equal(result.code, 1);
    assert.equal(result.status, "error");
    assert.equal(result.reason, "getaddrinfo ENOTFOUND bee.test");
  });
});

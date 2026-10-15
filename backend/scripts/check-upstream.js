#!/usr/bin/env node
"use strict";

/**
 * Reports whether BEE still links the PDF that backend/data/source.json pins.
 *
 *   node backend/scripts/check-upstream.js
 *
 * Prints one JSON object on stdout and sets the exit code:
 *   0 same file, 2 a different file, 1 the check itself failed (page down, no link, no PDF).
 * It downloads the PDF and compares its sha256, so a silent re-upload is caught.
 * Writes nothing.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const USER_AGENT = "Mozilla/5.0";
const ANCHOR = /<a\b[^>]*href="([^"]+)"[^>]*>([^<]*EV Public Charging Stations Data[^<]*)</i;

async function checkUpstream({ fetchImpl = fetch, source }) {
  try {
    const page = await fetchImpl(source.page_url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(60000),
    });
    if (page.status !== 200) return { code: 1, status: "error", reason: `page HTTP ${page.status}` };

    const match = ANCHOR.exec(await page.text());
    if (!match) return { code: 1, status: "error", reason: "anchor not found" };
    const url = new URL(match[1], source.page_url).href;
    const anchor_text = match[2].replace(/\s+/g, " ").trim();

    const pdf = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(120000),
    });
    if (pdf.status !== 200) return { code: 1, status: "error", reason: `pdf HTTP ${pdf.status}` };

    const bytes = Buffer.from(await pdf.arrayBuffer());
    if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") return { code: 1, status: "error", reason: "not a PDF" };

    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const changed = url !== source.url || sha256 !== source.sha256;
    return {
      code: changed ? 2 : 0,
      status: changed ? "changed" : "same",
      current: { url: source.url, sha256: source.sha256, size: source.size_bytes },
      upstream: { url, sha256, size: bytes.length, anchor_text },
    };
  } catch (error) {
    return { code: 1, status: "error", reason: error.message };
  }
}

if (require.main === module) {
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "source.json"), "utf8"));
  checkUpstream({ source }).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.code;
  });
}

module.exports = { checkUpstream };

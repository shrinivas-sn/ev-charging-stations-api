#!/usr/bin/env node
"use strict";

/**
 * Builds backend/data/{stations,meta,rejects,source}.json from the extractor's raw rows.
 *
 *   node backend/scripts/build-dataset.js ingest/out/raw-rows.json [--out backend/data]
 *
 * Output is deterministic: the same input always produces the same bytes.
 * Exit 1 when a spelling is missing from backend/data/reference/ (listed on stderr).
 */

const fs = require("node:fs");
const path = require("node:path");
const { buildDataset, BuildError } = require("../src/lib/normalise");

function arg(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

/** One station per line keeps diffs readable when BEE publishes a new list. */
function writeLines(file, items) {
  const body = items.length === 0 ? "[]\n" : `[\n${items.map((i) => JSON.stringify(i)).join(",\n")}\n]\n`;
  fs.writeFileSync(file, body);
}

function writePretty(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function main(args) {
  const input = args[0];
  if (!input || input.startsWith("--")) {
    console.error("Usage: node backend/scripts/build-dataset.js <raw-rows.json> [--out <dir>]");
    return 1;
  }
  const outDir = path.resolve(arg(args, "--out") || path.join(__dirname, "..", "data"));
  const rawDoc = JSON.parse(fs.readFileSync(input, "utf8"));

  let result;
  try {
    result = buildDataset(rawDoc);
  } catch (error) {
    if (error instanceof BuildError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }

  fs.mkdirSync(outDir, { recursive: true });
  writeLines(path.join(outDir, "stations.json"), result.stations);
  writePretty(path.join(outDir, "meta.json"), result.meta);
  writePretty(path.join(outDir, "rejects.json"), result.rejects);
  writePretty(path.join(outDir, "source.json"), result.source);

  const c = result.meta.counts;
  console.log(
    `rows ${c.rows} stations ${c.stations} chargers ${c.chargers} suspect ${c.suspect_locations} ` +
      `mixed_admin ${c.mixed_admin} rejects ${c.rejects} states ${c.states} operators ${c.operators}`
  );
  return 0;
}

process.exitCode = main(process.argv.slice(2));

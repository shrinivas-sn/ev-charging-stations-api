"use strict";

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const stationsRouter = require("./routes/stations");
const referenceRouter = require("./routes/reference");
const service = require("./services/stations-service");
const { sendError } = require("./lib/errors");

const SERVICE_NAME = "ev-charging-stations-api";
const SERVICE_VERSION = "2.0.0";

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

const app = express();
app.disable("x-powered-by");

/**
 * Vercel overwrites X-Forwarded-For with the real client address, so one trusted hop
 * gives a per-client req.ip there. Without a proxy in front (plain `npm start`), callers
 * could spoof the header; see README.
 */
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

app.use(cors({ origin: "*", methods: ["GET", "HEAD", "OPTIONS"] }));

/**
 * Data only changes on deploy, so successful reads are CDN-cacheable. Error responses
 * override this with no-store (see sendError); 404s keep it.
 */
const CACHEABLE = "public, s-maxage=3600, stale-while-revalidate=86400";
app.use(["/v1", "/"], (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") res.set("Cache-Control", CACHEABLE);
  next();
});

// No RateLimit-* headers: on CDN-cached responses they would show one caller's budget to everyone.
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: false,
  legacyHeaders: false,
  validate: { trustProxy: true },
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const seconds = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000) : RATE_LIMIT_WINDOW_MS / 1000;
    res.set("Retry-After", String(Math.max(1, seconds)));
    return sendError(
      res,
      429,
      "RATE_LIMIT_EXCEEDED",
      `Rate limit exceeded: ${RATE_LIMIT_MAX} requests per ${Math.round(RATE_LIMIT_WINDOW_MS / 60000)} minutes per client. Retry after the number of seconds in the Retry-After header.`
    );
  },
});
app.use("/v1", limiter);

function endpointIndex() {
  return [
    { method: "GET", path: "/v1/stations", description: "Station directory with filters and paging" },
    { method: "GET", path: "/v1/stations/near", description: "Stations within a radius of a point, nearest first" },
    { method: "GET", path: "/v1/stations/{id}", description: "One station by id (evs_ + 10 hex digits)" },
    { method: "GET", path: "/v1/states", description: "Station counts per state and union territory" },
    { method: "GET", path: "/v1/cities", description: "Cities with stations, optionally for one state" },
    { method: "GET", path: "/v1/operators", description: "Charge point operators with station counts" },
    { method: "GET", path: "/v1/connectors", description: "Charging standards, vehicles served and counts" },
    { method: "GET", path: "/v1/meta", description: "Dataset source, attribution and counts" },
    { method: "GET", path: "/health", description: "Liveness check" },
  ];
}

app.get("/", (req, res) => {
  const meta = service.getDatasetMeta();
  return res.json({
    success: true,
    data: {
      name: "India EV Charging Station Directory API",
      version: SERVICE_VERSION,
      stations: meta.counts.stations,
      snapshot: meta.source.snapshot_label,
      attribution: meta.attribution,
      documentation: "/docs",
      playground: "/playground",
      endpoints: endpointIndex().map((e) => e.path),
    },
  });
});

app.get("/health", (req, res) => {
  const meta = service.getDatasetMeta();
  res.set("Cache-Control", "no-store");
  return res.json({
    status: "ok",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    stations_indexed: meta.counts.stations,
    snapshot: meta.source.snapshot_label,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/v1", (req, res) => {
  return res.json({
    success: true,
    data: {
      name: "India EV Charging Station Directory API",
      version: SERVICE_VERSION,
      documentation: "/docs",
      rate_limit: { requests: RATE_LIMIT_MAX, window_seconds: RATE_LIMIT_WINDOW_MS / 1000 },
      endpoints: endpointIndex(),
    },
  });
});

app.use("/v1", stationsRouter);
app.use("/v1", referenceRouter);

const KNOWN_PATHS = [
  "/",
  "/health",
  "/v1",
  "/v1/stations",
  "/v1/stations/near",
  "/v1/stations/near/pins",
  "/v1/stations/:id",
  "/v1/states",
  "/v1/cities",
  "/v1/operators",
  "/v1/connectors",
  "/v1/meta",
];

// GET and HEAD are answered above and OPTIONS by cors; anything else on a real route is 405.
app.all(KNOWN_PATHS, (req, res) => {
  res.set("Allow", "GET, HEAD, OPTIONS");
  return sendError(res, 405, "METHOD_NOT_ALLOWED", `${req.method} is not supported. This API is read-only.`);
});

app.use((req, res) => {
  return sendError(res, 404, "ROUTE_NOT_FOUND", `No endpoint at '${req.path}'. See /v1 for the endpoint index.`);
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  return sendError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred while processing your request.");
});

module.exports = app;

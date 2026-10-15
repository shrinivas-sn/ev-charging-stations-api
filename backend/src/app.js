"use strict";

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const stationsRouter = require("./routes/stations");
const referenceRouter = require("./routes/reference");
const { getDatasetMeta } = require("./services/stations-service");
const { sendError } = require("./lib/errors");

const SERVICE_NAME = "ev-charging-stations-api";
const SERVICE_VERSION = "1.0.0";

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 300;

const app = express();
app.disable("x-powered-by");

/**
 * Vercel terminates TLS at its edge and forwards the real client address in
 * X-Forwarded-For. Without this, Express reports the proxy address as req.ip and
 * every caller on the internet shares a single rate-limit bucket.
 */
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // express-rate-limit v7 validates the client-address derivation; behind a
  // single trusted proxy hop req.ip is the real caller.
  validate: { trustProxy: true },
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded: ${RATE_LIMIT_MAX} requests per ${Math.round(
        RATE_LIMIT_WINDOW_MS / 60000
      )} minutes per client. Retry after the number of seconds in the Retry-After header.`,
    },
  },
});

app.use("/v1", limiter);

function endpointIndex() {
  return [
    { method: "GET", path: "/v1/stations", description: "Paginated station directory with filters" },
    { method: "GET", path: "/v1/stations/near", description: "Radius search around a coordinate" },
    { method: "GET", path: "/v1/stations/{id}", description: "Single station by integer id" },
    { method: "GET", path: "/v1/states", description: "Station totals per state and union territory" },
    { method: "GET", path: "/v1/operators", description: "Charge point operators with station counts" },
    { method: "GET", path: "/v1/connectors", description: "Charging standard reference dictionary" },
    { method: "GET", path: "/v1/meta", description: "Dataset provenance, coverage and counts" },
    { method: "GET", path: "/health", description: "Liveness probe" },
  ];
}

app.get("/", (req, res) => {
  const meta = getDatasetMeta();
  return res.status(200).json({
    success: true,
    data: {
      name: "India EV Charging Station Directory API",
      version: SERVICE_VERSION,
      description:
        "Keyless REST API for Indian public electric vehicle charging stations, connectors and power ratings.",
      dataset_status: meta.dataset_status,
      dataset_provenance: meta.provenance,
      documentation: "/docs",
      playground: "/playground",
      endpoints: endpointIndex().map((e) => e.path),
    },
  });
});

app.get("/health", (req, res) => {
  const meta = getDatasetMeta();
  return res.status(200).json({
    status: "ok",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    stations_indexed: meta.total_stations,
    dataset_status: meta.dataset_status,
    timestamp: new Date().toISOString(),
  });
});

/** GET /v1 — self-describing index so callers can discover routes without docs. */
app.get("/v1", (req, res) => {
  return res.status(200).json({
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

app.use((req, res) => {
  return sendError(
    res,
    404,
    "ROUTE_NOT_FOUND",
    `The requested endpoint '${req.originalUrl}' does not exist. See /v1 for the endpoint index.`
  );
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  return sendError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred while processing your request."
  );
});

module.exports = app;

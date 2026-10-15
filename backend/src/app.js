"use strict";

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const stationsRouter = require("./routes/stations");
const referenceRouter = require("./routes/reference");
const { getDatasetMeta } = require("./services/stations-service");

const app = express();

// Disable x-powered-by
app.disable("x-powered-by");

// Global CORS enabled for all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// Standard rate limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again after 15 minutes."
    }
  }
});

app.use("/v1/", limiter);

// Root route (API info & health)
app.get("/", (req, res) => {
  const meta = getDatasetMeta();
  return res.status(200).json({
    success: true,
    data: {
      name: "India EV Charging Station Directory API",
      version: "1.0.0",
      description: "Free, keyless REST API for India's public EV charging stations, connectors, and power ratings.",
      documentation: "https://ev-charging-stations-api.vercel.app/docs",
      endpoints: [
        "/v1/stations",
        "/v1/stations/near?lat={lat}&lng={lng}&radius={km}",
        "/v1/stations/{id}",
        "/v1/states",
        "/v1/connectors",
        "/v1/meta",
        "/health"
      ],
      total_stations: meta.total_stations,
      license: meta.license
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const meta = getDatasetMeta();
  return res.status(200).json({
    status: "ok",
    service: "ev-charging-stations-api",
    version: "1.0.0",
    uptime_seconds: Math.floor(process.uptime()),
    stations_indexed: meta.total_stations,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/v1", stationsRouter);
app.use("/v1", referenceRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `The requested endpoint '${req.originalUrl}' does not exist.`
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred while processing your request."
    }
  });
});

module.exports = app;

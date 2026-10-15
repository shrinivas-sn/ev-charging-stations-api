"use strict";

const express = require("express");
const { getStations, getNearbyStations, getStationById } = require("../services/stations-service");

const router = express.Router();

/**
 * GET /v1/stations/near
 * Must be registered before /v1/stations/:id to avoid route collision!
 */
router.get("/stations/near", (req, res) => {
  const { lat, lng, radius, limit } = req.query;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_COORDINATES",
        message: "Both 'lat' and 'lng' query parameters are required for proximity search."
      }
    });
  }

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);

  if (Number.isNaN(numLat) || numLat < -90 || numLat > 90) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_LATITUDE",
        message: "Latitude must be a valid number between -90 and 90."
      }
    });
  }

  if (Number.isNaN(numLng) || numLng < -180 || numLng > 180) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_LONGITUDE",
        message: "Longitude must be a valid number between -180 and 180."
      }
    });
  }

  const result = getNearbyStations(numLat, numLng, radius, limit);
  return res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta
  });
});

/**
 * GET /v1/stations
 */
router.get("/stations", (req, res) => {
  const { state, city, operator, connector, min_power_kw, page, limit } = req.query;

  const result = getStations({
    state,
    city,
    operator,
    connector,
    min_power_kw,
    page,
    limit
  });

  return res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta
  });
});

/**
 * GET /v1/stations/:id
 */
router.get("/stations/:id", (req, res) => {
  const { id } = req.params;
  const station = getStationById(id);

  if (!station) {
    return res.status(404).json({
      success: false,
      error: {
        code: "STATION_NOT_FOUND",
        message: `No electric vehicle charging station found with ID: ${id}`
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: station,
    meta: {
      fetched_at: new Date().toISOString()
    }
  });
});

module.exports = router;

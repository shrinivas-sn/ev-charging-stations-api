"use strict";

const express = require("express");
const {
  getStations,
  getNearbyStations,
  getStationById,
} = require("../services/stations-service");
const { sendError, withValidation } = require("../lib/errors");

const router = express.Router();

/**
 * GET /v1/stations/near
 * Registered before /v1/stations/:id so the literal path always wins.
 */
router.get(
  "/stations/near",
  withValidation((req, res) => {
    const result = getNearbyStations(req.query);
    return res.status(200).json({ success: true, data: result.data, meta: result.meta });
  })
);

/**
 * GET /v1/stations
 */
router.get(
  "/stations",
  withValidation((req, res) => {
    const result = getStations(req.query);
    return res.status(200).json({ success: true, data: result.data, meta: result.meta });
  })
);

/**
 * GET /v1/stations/:id
 */
router.get(
  "/stations/:id",
  withValidation((req, res) => {
    const result = getStationById(req.params.id);
    if (!result.station) {
      return sendError(
        res,
        404,
        "STATION_NOT_FOUND",
        `No station found with id ${req.params.id}. Ids run from 1 to the dataset total.`
      );
    }
    return res.status(200).json({
      success: true,
      data: result.station,
      meta: { took_ms: result.took_ms },
    });
  })
);

module.exports = router;

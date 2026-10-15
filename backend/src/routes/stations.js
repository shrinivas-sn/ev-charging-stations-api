"use strict";

const express = require("express");
const service = require("../services/stations-service");
const { SPECS, parseQuery } = require("../lib/params");
const { sendError, withErrors } = require("../lib/errors");

const router = express.Router();

router.get(
  "/stations",
  withErrors((req, res) => {
    const result = service.getStations(parseQuery(req.query, SPECS.stations));
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

// Registered before /stations/:id so "near" is never read as an id.
router.get(
  "/stations/near",
  withErrors((req, res) => {
    const result = service.getNearbyStations(parseQuery(req.query, SPECS.near));
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/stations/:id",
  withErrors((req, res) => {
    parseQuery(req.query, SPECS.none);
    const station = service.getStationById(req.params.id);
    if (!station) {
      return sendError(res, 404, "STATION_NOT_FOUND", `No station has id '${req.params.id}'.`);
    }
    return res.json({ success: true, data: station, meta: service.sourceMeta() });
  })
);

module.exports = router;

"use strict";

const express = require("express");
const service = require("../services/stations-service");
const { sendError, withErrors } = require("../lib/errors");

const router = express.Router();

router.get(
  "/stations",
  withErrors((req, res) => {
    const result = service.getStations({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || undefined });
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/stations/:id",
  withErrors((req, res) => {
    const station = service.getStationById(req.params.id);
    if (!station) {
      return sendError(res, 404, "STATION_NOT_FOUND", `No station has id '${req.params.id}'.`);
    }
    return res.json({ success: true, data: station, meta: service.sourceMeta() });
  })
);

module.exports = router;

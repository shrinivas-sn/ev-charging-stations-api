"use strict";

const express = require("express");
const service = require("../services/stations-service");
const { withErrors } = require("../lib/errors");

const router = express.Router();

router.get(
  "/states",
  withErrors((req, res) => {
    const result = service.getStatesSummary();
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/meta",
  withErrors((req, res) => {
    return res.json({ success: true, data: service.getDatasetMeta(), meta: service.sourceMeta() });
  })
);

module.exports = router;

"use strict";

const express = require("express");
const service = require("../services/stations-service");
const { SPECS, parseQuery } = require("../lib/params");
const { withErrors } = require("../lib/errors");

const router = express.Router();

router.get(
  "/states",
  withErrors((req, res) => {
    parseQuery(req.query, SPECS.none);
    const result = service.getStatesSummary();
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/cities",
  withErrors((req, res) => {
    const result = service.getCities(parseQuery(req.query, SPECS.cities));
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/operators",
  withErrors((req, res) => {
    parseQuery(req.query, SPECS.none);
    const result = service.getOperators();
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/connectors",
  withErrors((req, res) => {
    parseQuery(req.query, SPECS.none);
    const result = service.getConnectors();
    return res.json({ success: true, data: result.data, meta: result.meta });
  })
);

router.get(
  "/meta",
  withErrors((req, res) => {
    parseQuery(req.query, SPECS.none);
    return res.json({ success: true, data: service.getDatasetMeta(), meta: service.sourceMeta() });
  })
);

module.exports = router;

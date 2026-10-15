"use strict";

const express = require("express");
const {
  getStatesSummary,
  getConnectors,
  getOperators,
  getDatasetMeta,
} = require("../services/stations-service");

const router = express.Router();

/**
 * GET /v1/states
 */
router.get("/states", (req, res) => {
  const result = getStatesSummary();
  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/**
 * GET /v1/operators
 * Charge point operators present in the dataset, with station counts.
 */
router.get("/operators", (req, res) => {
  const result = getOperators();
  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/**
 * GET /v1/connectors
 */
router.get("/connectors", (req, res) => {
  const result = getConnectors();
  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/**
 * GET /v1/meta
 */
router.get("/meta", (req, res) => {
  const meta = getDatasetMeta();
  return res.status(200).json({
    success: true,
    data: meta,
    meta: { fetched_at: new Date().toISOString() },
  });
});

module.exports = router;

"use strict";

const { ValidationError } = require("../services/stations-service");

/** Every error response uses the same envelope, including validation failures. */
function sendError(res, status, code, message, details) {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

/**
 * Turns a thrown ValidationError into a 400 with the standard envelope, and
 * forwards anything else to the global handler.
 */
function withValidation(handler) {
  return (req, res, next) => {
    try {
      return handler(req, res);
    } catch (error) {
      if (error instanceof ValidationError) {
        return sendError(res, 400, error.code, error.message, error.details);
      }
      return next(error);
    }
  };
}

module.exports = { sendError, withValidation };

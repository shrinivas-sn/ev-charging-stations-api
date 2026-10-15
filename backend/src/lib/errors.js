"use strict";

/** A client error with a stable machine-readable code and an HTTP status (400 or 404). */
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Every error response uses the same envelope. Only 404 may be cached by the CDN
 * (a missing station stays missing until the next deploy); every other error is no-store.
 */
function sendError(res, status, code, message, details) {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  if (status !== 404) res.set("Cache-Control", "no-store");
  return res.status(status).json(body);
}

/** Turns a thrown ApiError into its envelope and forwards anything else to the 500 handler. */
function withErrors(handler) {
  return (req, res, next) => {
    try {
      return handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) return sendError(res, error.status, error.code, error.message, error.details);
      return next(error);
    }
  };
}

module.exports = { ApiError, sendError, withErrors };

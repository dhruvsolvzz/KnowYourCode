'use strict';

/**
 * Wraps async route handlers to avoid try/catch boilerplate.
 * Forwards errors to Express global error handler via next().
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

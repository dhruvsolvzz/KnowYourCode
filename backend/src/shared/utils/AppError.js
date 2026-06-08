'use strict';

/**
 * Operational error class. Only these errors get user-facing messages.
 * Programming errors (TypeError, etc.) bubble up as 500s with generic messages.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

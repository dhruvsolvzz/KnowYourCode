'use strict';
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global error handler — must be the LAST middleware registered.
 * Handles all errors forwarded via next(err).
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: messages,
      },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_FIELD',
        message: `${field} already exists`,
        details: null,
      },
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ${err.path}`,
        details: null,
      },
    });
  }

  // Operational errors (AppError instances)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: null,
      },
    });
  }

  // Programming errors — don't leak details
  logger.error('UNHANDLED ERROR:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      details: config.env === 'development' ? err.message : null,
    },
  });
};

module.exports = { errorHandler };

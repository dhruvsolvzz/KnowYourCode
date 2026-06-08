'use strict';
const AppError = require('../utils/AppError');
const { AUTH_EMAIL_NOT_VERIFIED } = require('../constants/errorCodes');

/**
 * Guard: requires email to be verified.
 * Must run AFTER authMiddleware.
 */
const emailVerifiedMiddleware = (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    return next(
      new AppError(
        'Please verify your email address before accessing this feature.',
        403,
        AUTH_EMAIL_NOT_VERIFIED
      )
    );
  }
  next();
};

module.exports = { emailVerifiedMiddleware };

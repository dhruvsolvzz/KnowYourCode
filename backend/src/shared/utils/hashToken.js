'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Hash a token with SHA-256 for DB storage (fast, not for passwords).
 * Used for: emailVerificationToken, passwordResetToken.
 */
const hashTokenSHA256 = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Hash refresh tokens with bcrypt for stronger security.
 */
const hashRefreshToken = async (token) => bcrypt.hash(token, 10);

/**
 * Compare a raw refresh token against a bcrypt hash.
 */
const compareRefreshToken = async (token, hash) => bcrypt.compare(token, hash);

module.exports = {
  hashTokenSHA256,
  hashRefreshToken,
  compareRefreshToken,
};

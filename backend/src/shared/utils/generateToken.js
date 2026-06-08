'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

/**
 * Generate a signed JWT access token.
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'knowyourcode',
  });
};

/**
 * Generate a cryptographically random refresh token.
 * Returns { token (raw, for cookie), hashed (for DB storage) }
 */
const generateRefreshToken = () => {
  const token = crypto.randomBytes(64).toString('hex');
  return token;
};

/**
 * Generate a random URL-safe token for email verification / password reset.
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify and decode a JWT access token.
 * Throws if invalid or expired.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.secret, { issuer: 'knowyourcode' });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyAccessToken,
};

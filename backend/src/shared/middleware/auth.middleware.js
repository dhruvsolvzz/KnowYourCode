'use strict';
const { verifyAccessToken } = require('../utils/generateToken');
const AppError = require('../utils/AppError');
const { AUTH_UNAUTHORIZED, AUTH_TOKEN_INVALID } = require('../constants/errorCodes');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../database/models/User.model');

/**
 * Verify JWT from Authorization: Bearer <token> header.
 * Attaches req.user to the request.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, AUTH_UNAUTHORIZED);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : AUTH_TOKEN_INVALID;
    throw new AppError('Invalid or expired token', 401, code);
  }

  const user = await User.findById(decoded.sub).select('+accessTokens');
  if (!user || !user.accessTokens || !user.accessTokens.includes(token)) {
    throw new AppError('User not found or token has been revoked', 401, AUTH_UNAUTHORIZED);
  }

  req.user = user;
  next();
});

module.exports = { authMiddleware };

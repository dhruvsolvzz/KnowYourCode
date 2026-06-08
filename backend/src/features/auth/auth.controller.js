'use strict';
const asyncHandler = require('../../shared/utils/asyncHandler');
const authService = require('./auth.service');
const config = require('../../shared/config');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register(name, email, password);
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, res);
  res.json({ success: true, data: result });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  await authService.logout(req.user._id, refreshToken, res, accessToken);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.params.token);
  // Redirect to frontend after email verification
  res.redirect(`${config.frontend.url}/auth/verified?message=${encodeURIComponent(result.message)}`);
});

const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerification(req.body.email);
  res.json({ success: true, data: result });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, data: result });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.params.token, req.body.password);
  res.json({ success: true, data: result });
});

const refreshToken = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  const result = await authService.refreshTokens(rawToken, res);
  res.json({ success: true, data: result });
});

const githubCallback = asyncHandler(async (req, res) => {
  const result = await authService.githubCallback(req.user, res);
  // Redirect to frontend with access token in URL (frontend stores in memory)
  res.redirect(
    `${config.frontend.url}/auth/callback?token=${result.accessToken}`
  );
});

const googleCallback = asyncHandler(async (req, res) => {
  const result = await authService.googleCallback(req.user, res);
  // Redirect to frontend with access token in URL
  res.redirect(
    `${config.frontend.url}/auth/callback?token=${result.accessToken}`
  );
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  res.json({ success: true, data: { user } });
});

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshToken,
  githubCallback,
  googleCallback,
  getMe,
};

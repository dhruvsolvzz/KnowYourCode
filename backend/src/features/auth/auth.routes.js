'use strict';
const express = require('express');
const passport = require('passport');
const controller = require('./auth.controller');
const { authMiddleware } = require('../../shared/middleware/auth.middleware');
const { authRateLimiter } = require('../../shared/middleware/rateLimiter.middleware');
const { isGithubConfigured, isGoogleConfigured } = require('../../shared/config/passport');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateResendVerification,
} = require('./auth.validation');

const router = express.Router();

// Public routes (with strict rate limiting)
router.post('/register', authRateLimiter, validateRegister, controller.register);
router.post('/login', authRateLimiter, validateLogin, controller.login);
router.get('/verify-email/:token', controller.verifyEmail);
router.post('/resend-verification', authRateLimiter, validateResendVerification, controller.resendVerification);
router.post('/forgot-password', authRateLimiter, validateForgotPassword, controller.forgotPassword);
router.post('/reset-password/:token', authRateLimiter, validateResetPassword, controller.resetPassword);
router.post('/refresh-token', controller.refreshToken);

// GitHub OAuth — only available if credentials are configured
const githubNotConfigured = (req, res) =>
  res.status(501).json({
    success: false,
    error: {
      code: 'GITHUB_OAUTH_NOT_CONFIGURED',
      message: 'GitHub OAuth is not configured on this server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your environment.',
    },
  });

if (isGithubConfigured) {
  router.get('/github', passport.authenticate('github', { scope: ['user:email', 'repo'], session: false }));
  router.get('/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/login?error=github_failed' }),
    controller.githubCallback
  );
} else {
  router.get('/github', githubNotConfigured);
  router.get('/github/callback', githubNotConfigured);
}

// Route to expose GitHub config status (used by frontend to show/hide the button)
router.get('/github/status', (req, res) => {
  res.json({ success: true, data: { configured: isGithubConfigured } });
});

// Google OAuth
const googleNotConfigured = (req, res) =>
  res.status(501).json({
    success: false,
    error: {
      code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      message: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.',
    },
  });

if (isGoogleConfigured) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
    controller.googleCallback
  );
} else {
  router.get('/google', googleNotConfigured);
  router.get('/google/callback', googleNotConfigured);
}

// Route to expose Google config status
router.get('/google/status', (req, res) => {
  res.json({ success: true, data: { configured: isGoogleConfigured } });
});

// Protected
router.get('/me', authMiddleware, controller.getMe);

module.exports = router;

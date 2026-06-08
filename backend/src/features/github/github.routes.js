'use strict';
const express = require('express');
const { authMiddleware } = require('../../shared/middleware/auth.middleware');
const { emailVerifiedMiddleware } = require('../../shared/middleware/emailVerified.middleware');
const { verifyWebhookSignature, handleWebhook } = require('./webhooks/webhook.handler');
const asyncHandler = require('../../shared/utils/asyncHandler');
const githubService = require('./github.service');

const router = express.Router();

// List user's GitHub repos (OAuth users only)
router.get('/repos',
  authMiddleware,
  emailVerifiedMiddleware,
  asyncHandler(async (req, res) => {
    const repos = await githubService.listUserRepos(req.user);
    res.json({ success: true, data: { repositories: repos } });
  })
);

// Install webhook for a repository
router.post('/repos/:id/webhook',
  authMiddleware,
  emailVerifiedMiddleware,
  asyncHandler(async (req, res) => {
    const result = await githubService.installWebhook(req.params.id, req.user);
    res.json({ success: true, data: result });
  })
);

// Remove webhook
router.delete('/repos/:id/webhook',
  authMiddleware,
  emailVerifiedMiddleware,
  asyncHandler(async (req, res) => {
    const result = await githubService.removeWebhook(req.params.id, req.user);
    res.json({ success: true, data: result });
  })
);

// Webhook receiver — no JWT auth, uses HMAC-SHA256 instead
// NOTE: express.raw() is applied BEFORE express.json() in app.js for this path
router.post('/webhook/:repoId',
  verifyWebhookSignature,
  handleWebhook
);

module.exports = router;

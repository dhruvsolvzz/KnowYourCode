'use strict';
const express = require('express');
const controller = require('./ai.controller');
const { authMiddleware } = require('../../shared/middleware/auth.middleware');
const { emailVerifiedMiddleware } = require('../../shared/middleware/emailVerified.middleware');

const router = express.Router();
router.use(authMiddleware, emailVerifiedMiddleware);

router.post('/:repoId/ask', controller.askQuestion);
router.post('/:repoId/explain-file', controller.explainFile);
router.post('/:repoId/explain-flow', controller.explainFlow);
router.get('/:repoId/chat-history', controller.getChatHistory);

module.exports = router;

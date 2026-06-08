'use strict';
const express = require('express');
const controller = require('./summary.controller');
const { authMiddleware } = require('../../shared/middleware/auth.middleware');
const { emailVerifiedMiddleware } = require('../../shared/middleware/emailVerified.middleware');

const router = express.Router();
router.use(authMiddleware, emailVerifiedMiddleware);

router.post('/:repoId/generate', controller.generateSummary);
router.get('/:repoId', controller.getSummary);

module.exports = router;

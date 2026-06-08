'use strict';
const express = require('express');
const controller = require('./graph.controller');
const { authMiddleware } = require('../../shared/middleware/auth.middleware');
const { emailVerifiedMiddleware } = require('../../shared/middleware/emailVerified.middleware');

const router = express.Router();
router.use(authMiddleware, emailVerifiedMiddleware);

router.get('/:repoId/architecture', controller.getArchitectureGraph);
router.get('/:repoId/dependency', controller.getDependencyGraph);
router.get('/:repoId/structure', controller.getFolderGraph);
router.get('/:repoId/commit/:commitSha', controller.getCommitImpactGraph);
router.post('/:repoId/data-flow', controller.getDataFlowGraph);

module.exports = router;

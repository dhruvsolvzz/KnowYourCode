'use strict';
const express = require('express');
const controller = require('./repository.controller');
const { authMiddleware } = require('../../shared/middleware/auth.middleware');
const { emailVerifiedMiddleware } = require('../../shared/middleware/emailVerified.middleware');
const { validateAddRepository } = require('./repository.validation');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
});

const router = express.Router();

// All repository routes require auth + email verified
router.use(authMiddleware, emailVerifiedMiddleware);

router.get('/', controller.listRepositories);
router.post('/', validateAddRepository, controller.addRepository);
router.post('/upload', upload.single('zipFile'), controller.uploadRepository);
router.get('/lookup', controller.lookupRepository);
router.get('/:id', controller.getRepository);
router.delete('/:id', controller.deleteRepository);
router.post('/:id/analyze', controller.reanalyze);
router.get('/:id/structure', controller.getFolderStructure);
router.get('/:id/commits', controller.getCommits);
router.get('/:id/languages', controller.getLanguages);

module.exports = router;

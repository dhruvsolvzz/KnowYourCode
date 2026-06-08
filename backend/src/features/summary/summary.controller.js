'use strict';
const asyncHandler = require('../../shared/utils/asyncHandler');
const summaryService = require('./summary.service');

const generateSummary = asyncHandler(async (req, res) => {
  const summary = await summaryService.generateSummary(req.params.repoId, req.user._id);
  res.status(202).json({ success: true, data: summary });
});

const getSummary = asyncHandler(async (req, res) => {
  const summary = await summaryService.getLatestSummary(req.params.repoId, req.user._id);
  res.json({ success: true, data: summary });
});

module.exports = { generateSummary, getSummary };

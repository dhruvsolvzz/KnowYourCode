'use strict';
const asyncHandler = require('../../shared/utils/asyncHandler');
const aiService = require('./ai.service');

const askQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Question is required' } });
  }
  const result = await aiService.askQuestion(req.params.repoId, req.user._id, question);
  res.json({ success: true, data: result });
});

const explainFile = asyncHandler(async (req, res) => {
  const { filePath } = req.body;
  const result = await aiService.explainFile(req.params.repoId, req.user._id, filePath);
  res.json({ success: true, data: result });
});

const explainFlow = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const result = await aiService.explainFlow(req.params.repoId, req.user._id, query);
  res.json({ success: true, data: result });
});

const getChatHistory = asyncHandler(async (req, res) => {
  const history = await aiService.getChatHistory(req.params.repoId, req.user._id);
  res.json({ success: true, data: { history } });
});

module.exports = { askQuestion, explainFile, explainFlow, getChatHistory };

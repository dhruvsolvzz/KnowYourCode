'use strict';
const asyncHandler = require('../../shared/utils/asyncHandler');
const repositoryService = require('./repository.service');

const listRepositories = asyncHandler(async (req, res) => {
  const result = await repositoryService.listRepositories(req.user._id, req.query);
  res.json({ success: true, data: result });
});

const addRepository = asyncHandler(async (req, res) => {
  const { url, source } = req.body;
  const repo = await repositoryService.addRepository(req.user._id, url, source || 'public_url', req.user);
  res.status(202).json({ success: true, data: { repository: repo, message: 'Analysis started' } });
});

const uploadRepository = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Please upload a ZIP file' } });
  }
  const projectName = req.body.projectName || req.file.originalname.replace(/\.zip$/i, '');
  const repo = await repositoryService.addFromZip(req.user._id, projectName, req.file.buffer);
  res.status(202).json({ success: true, data: { repository: repo, message: 'ZIP analysis started' } });
});

const getRepository = asyncHandler(async (req, res) => {
  const repo = await repositoryService.getRepository(req.params.id, req.user._id);
  res.json({ success: true, data: { repository: repo } });
});

const deleteRepository = asyncHandler(async (req, res) => {
  const result = await repositoryService.deleteRepository(req.params.id, req.user._id);
  res.json({ success: true, data: result });
});

const reanalyze = asyncHandler(async (req, res) => {
  const result = await repositoryService.reanalyze(req.params.id, req.user._id, req.user);
  res.status(202).json({ success: true, data: result });
});

const getCommits = asyncHandler(async (req, res) => {
  const result = await repositoryService.getCommits(req.params.id, req.user._id, req.query);
  res.json({ success: true, ...result });
});

const getFolderStructure = asyncHandler(async (req, res) => {
  const repo = await repositoryService.getRepository(req.params.id, req.user._id);
  res.json({ success: true, data: { folderStructure: repo.folderStructure } });
});

const getLanguages = asyncHandler(async (req, res) => {
  const repo = await repositoryService.getRepository(req.params.id, req.user._id);
  res.json({ success: true, data: { languages: repo.languages } });
});

const lookupRepository = asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, error: { message: 'URL is required' } });
  }
  const repo = await repositoryService.lookupRepository(url, req.user._id);
  res.json({ success: true, data: { repositoryId: repo._id } });
});

module.exports = {
  listRepositories,
  addRepository,
  uploadRepository,
  lookupRepository,
  getRepository,
  deleteRepository,
  reanalyze,
  getCommits,
  getFolderStructure,
  getLanguages,
};

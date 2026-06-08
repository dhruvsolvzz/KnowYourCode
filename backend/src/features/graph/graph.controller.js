'use strict';
const asyncHandler = require('../../shared/utils/asyncHandler');
const graphService = require('./graph.service');

const getArchitectureGraph = asyncHandler(async (req, res) => {
  const graph = await graphService.getArchitectureGraph(req.params.repoId, req.user._id);
  res.json({ success: true, data: graph });
});

const getDependencyGraph = asyncHandler(async (req, res) => {
  const graph = await graphService.getDependencyGraph(req.params.repoId, req.user._id);
  res.json({ success: true, data: graph });
});

const getCommitImpactGraph = asyncHandler(async (req, res) => {
  const graph = await graphService.getCommitImpactGraph(req.params.repoId, req.user._id, req.params.commitSha);
  res.json({ success: true, data: graph });
});

const getDataFlowGraph = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const graph = await graphService.getDataFlowGraph(req.params.repoId, req.user._id, query);
  res.json({ success: true, data: graph });
});

const getFolderGraph = asyncHandler(async (req, res) => {
  const graph = await graphService.getFolderGraph(req.params.repoId, req.user._id);
  res.json({ success: true, data: graph });
});

module.exports = {
  getArchitectureGraph,
  getDependencyGraph,
  getCommitImpactGraph,
  getDataFlowGraph,
  getFolderGraph,
};

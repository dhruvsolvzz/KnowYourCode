'use strict';
const AppError = require('../../shared/utils/AppError');
const repositoryRepository = require('../repository/repository.repository');
const graphRepository = require('./graph.repository');
const Commit = require('../../shared/database/models/Commit.model');
const { buildArchitectureGraph } = require('./builders/ArchitectureGraphBuilder');
const { buildDependencyGraph } = require('./builders/DependencyGraphBuilder');
const { buildCommitImpactGraph } = require('./builders/CommitImpactGraphBuilder');
const { buildDataFlowGraph } = require('./builders/DataFlowGraphBuilder');
const { buildFolderGraph } = require('./builders/FolderGraphBuilder');
const aiService = require('../ai/ai.service');

class GraphService {
  async _getRepo(repoId, userId) {
    const repo = await repositoryRepository.findByIdAndUserId(repoId, userId);
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
    return repo;
  }

  async getArchitectureGraph(repoId, userId) {
    const repo = await this._getRepo(repoId, userId);
    const graph = buildArchitectureGraph(repo.importantFiles || [], repo.importMap || {}, repo.astData || null);
    return graphRepository.upsert(repoId, 'full_architecture', graph);
  }

  async getDependencyGraph(repoId, userId) {
    const repo = await this._getRepo(repoId, userId);
    const graph = buildDependencyGraph(repo.importantFiles || [], repo.importMap || {});
    return graphRepository.upsert(repoId, 'dependency', graph);
  }

  async getCommitImpactGraph(repoId, userId, commitSha) {
    const repo = await this._getRepo(repoId, userId);
    const commit = await Commit.findOne({ repositoryId: repoId, sha: commitSha });
    if (!commit) throw new AppError('Commit not found', 404, 'NOT_FOUND');

    const graph = buildCommitImpactGraph(commit, repo.importantFiles || [], repo.importMap || {});
    return graphRepository.upsert(repoId, 'commit_impact', { ...graph, commitSha });
  }

  async getDataFlowGraph(repoId, userId, query) {
    if (!query || !query.trim()) {
      throw new AppError('Query is required for data flow analysis', 400, 'VALIDATION_ERROR');
    }

    await this._getRepo(repoId, userId);
    const analysis = await aiService.explainFlow(repoId, userId, query);
    const flowFiles = Array.isArray(analysis.flowFiles) ? analysis.flowFiles : [];
    const graph = buildDataFlowGraph(flowFiles);

    // Persist the full Gemini analysis alongside the graph nodes/edges
    return graphRepository.upsert(repoId, 'data_flow', {
      ...graph,
      queryContext: query,
      description: analysis.description || '',
      entryPoint: analysis.entryPoint || '',
      flowSteps: Array.isArray(analysis.flowSteps) ? analysis.flowSteps : [],
      dataTransformations: Array.isArray(analysis.dataTransformations) ? analysis.dataTransformations : [],
    });
  }

  async getFolderGraph(repoId, userId) {
    const repo = await this._getRepo(repoId, userId);
    const graph = buildFolderGraph(repo.folderStructure);
    return graphRepository.upsert(repoId, 'folder_structure', graph);
  }
}

module.exports = new GraphService();

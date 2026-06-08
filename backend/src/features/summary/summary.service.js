'use strict';
const AppError = require('../../shared/utils/AppError');
const repositoryRepository = require('../repository/repository.repository');
const summaryRepository = require('./summary.repository');
const Commit = require('../../shared/database/models/Commit.model');
const aiProvider = require('../ai/providers');
const promptBuilder = require('../ai/PromptBuilder');
const logger = require('../../shared/utils/logger');

class SummaryService {
  async _getRepo(repoId, userId) {
    const repo = await repositoryRepository.findByIdAndUserId(repoId, userId);
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
    return repo;
  }

  _computeStats(commits) {
    const stats = {
      totalCommits: commits.length,
      newRoutes: 0,
      newModels: 0,
      newComponents: 0,
      filesModified: 0,
      linesAdded: 0,
      linesRemoved: 0,
      topContributors: {},
      mostModifiedFiles: {},
    };

    const fileSet = new Set();
    commits.forEach((commit) => {
      stats.linesAdded += commit.changedFiles?.reduce((sum, file) => sum + (file.additions || 0), 0) || 0;
      stats.linesRemoved += commit.changedFiles?.reduce((sum, file) => sum + (file.deletions || 0), 0) || 0;
      commit.changedFiles?.forEach((file) => {
        if (file.filename) {
          fileSet.add(file.filename);
          stats.mostModifiedFiles[file.filename] = (stats.mostModifiedFiles[file.filename] || 0) + 1;
          if (/routes?\//i.test(file.filename)) stats.newRoutes += 1;
          if (/models?\//i.test(file.filename)) stats.newModels += 1;
          if (/components?\//i.test(file.filename) || /views?\//i.test(file.filename)) stats.newComponents += 1;
        }
      });
      if (commit.author?.name) {
        stats.topContributors[commit.author.name] = (stats.topContributors[commit.author.name] || 0) + 1;
      }
    });

    return {
      totalCommits: stats.totalCommits,
      newRoutes: stats.newRoutes,
      newModels: stats.newModels,
      newComponents: stats.newComponents,
      filesModified: fileSet.size,
      linesAdded: stats.linesAdded,
      linesRemoved: stats.linesRemoved,
      topContributors: Object.entries(stats.topContributors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, commits]) => ({ name, commits })),
      mostModifiedFiles: Object.entries(stats.mostModifiedFiles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, changes]) => ({ path, changes })),
    };
  }

  async generateSummary(repoId, userId) {
    const repo = await this._getRepo(repoId, userId);
    const commits = await Commit.find({ repositoryId: repoId }).sort({ timestamp: -1 }).limit(20);
    const stats = this._computeStats(commits);

    const prompt = promptBuilder.buildRepositorySummaryPrompt(repo, commits, stats);
    let analysis;

    try {
      analysis = await aiProvider.generateStructuredResponse(prompt);
    } catch (err) {
      logger.warn(`SummaryService: AI structured response failed, falling back to text for repo ${repoId}: ${err.message}`);
      const text = await aiProvider.generateResponse(prompt);
      analysis = {
        aiNarrative: text,
        highlights: [],
        architectureChanges: [],
      };
    }

    const summary = {
      period: {
        startDate: commits[commits.length - 1]?.timestamp || new Date(),
        endDate: commits[0]?.timestamp || new Date(),
      },
      stats,
      aiNarrative: analysis.aiNarrative || analysis.narrative || 'No narrative generated.',
      architectureChanges: Array.isArray(analysis.architectureChanges) ? analysis.architectureChanges : [],
      highlights: Array.isArray(analysis.highlights) ? analysis.highlights : [],
    };

    return summaryRepository.upsert(repoId, userId, 'repository', summary);
  }

  async getLatestSummary(repoId, userId) {
    await this._getRepo(repoId, userId);
    const summary = await summaryRepository.findLatestByRepo(repoId);
    if (!summary) {
      throw new AppError('Summary not found', 404, 'NOT_FOUND');
    }
    return summary;
  }
}

module.exports = new SummaryService();

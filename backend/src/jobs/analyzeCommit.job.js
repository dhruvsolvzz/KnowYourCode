'use strict';
const Commit = require('../shared/database/models/Commit.model');
const Repository = require('../shared/database/models/Repository.model');
const AIService = require('../features/ai/ai.service');
const logger = require('../shared/utils/logger');
const { COMMIT_ANALYSIS_MAX_RETRIES } = require('../shared/constants/limits');

class AnalyzeCommitJob {
  async run(commitId, repoId) {
    const commit = await Commit.findById(commitId);
    if (!commit) {
      throw new Error(`Commit not found: ${commitId}`);
    }

    const repository = await Repository.findById(repoId);
    if (!repository) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    if (commit.analysisStatus === 'completed') {
      return commit;
    }

    commit.analysisStatus = 'processing';
    await commit.save();

    try {
      const analysis = await AIService.analyzeCommit(commit, repository);
      commit.aiAnalysis = {
        ...analysis,
        generatedAt: new Date(),
      };
      commit.analysisStatus = 'completed';
      await commit.save();
      logger.info(`AnalyzeCommitJob: Commit ${commit.sha.slice(0, 7)} analyzed successfully`);
      return commit;
    } catch (err) {
      commit.analysisRetries += 1;
      commit.analysisStatus = commit.analysisRetries >= COMMIT_ANALYSIS_MAX_RETRIES ? 'failed' : 'pending';
      await commit.save();
      logger.error(`AnalyzeCommitJob failed for commit ${commit.sha.slice(0, 7)}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new AnalyzeCommitJob();

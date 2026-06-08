'use strict';
const repositoryRepository = require('../features/repository/repository.repository');
const summaryService = require('../features/summary/summary.service');
const logger = require('../shared/utils/logger');

class GenerateSummaryJob {
  async run(repoId) {
    const repo = await repositoryRepository.findById(repoId);
    if (!repo) {
      throw new Error(`Repository not found: ${repoId}`);
    }

    try {
      logger.info(`GenerateSummaryJob: Generating summary for repo ${repoId}`);
      return await summaryService.generateSummary(repoId, repo.userId);
    } catch (err) {
      logger.error(`GenerateSummaryJob failed for repo ${repoId}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new GenerateSummaryJob();

'use strict';
const Commit = require('../../../shared/database/models/Commit.model');
const logger = require('../../../shared/utils/logger');

/**
 * Handle GitHub push events.
 * Saves new commits to DB with pending analysis status.
 * AI analysis is triggered as a background job.
 */
const handlePush = async (payload, repoId) => {
  const commits = payload.commits || [];
  if (!commits.length) return;

  for (const commit of commits) {
    // Deduplicate by SHA
    const existing = await Commit.findOne({ sha: commit.id });
    if (existing) {
      logger.debug(`Push handler: Commit ${commit.id.slice(0,7)} already exists, skipping`);
      continue;
    }

    const commitDoc = await Commit.create({
      repositoryId: repoId,
      sha: commit.id,
      message: commit.message,
      author: {
        name: commit.author?.name,
        email: commit.author?.email,
        username: commit.author?.username,
        avatarUrl: null,
      },
      timestamp: new Date(commit.timestamp),
      url: commit.url,
      changedFiles: [
        ...(commit.added || []).map((f) => ({ filename: f, status: 'added', additions: 0, deletions: 0 })),
        ...(commit.modified || []).map((f) => ({ filename: f, status: 'modified', additions: 0, deletions: 0 })),
        ...(commit.removed || []).map((f) => ({ filename: f, status: 'removed', additions: 0, deletions: 0 })),
      ],
      analysisStatus: 'pending',
      source: 'webhook',
    });

    logger.info(`Push handler: Saved commit ${commit.id.slice(0,7)} for repo ${repoId}`);

    // Trigger async AI analysis (fire-and-forget)
    setImmediate(async () => {
      try {
        const analyzeCommitJob = require('../../../jobs/analyzeCommit.job');
        await analyzeCommitJob.run(commitDoc._id, repoId);
      } catch (err) {
        logger.error(`Failed to queue commit analysis: ${err.message}`);
      }
    });
  }
};

module.exports = handlePush;

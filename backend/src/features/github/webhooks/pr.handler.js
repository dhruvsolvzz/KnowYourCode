'use strict';
const logger = require('../../../shared/utils/logger');
const githubService = require('../github.service');
const aiProvider = require('../../ai/providers');

const buildPRAnalysisPrompt = (pr, diff) => {
  const truncatedDiff = diff.length > 16000 ? `${diff.slice(0, 16000)}\n...diff truncated...` : diff;

  return `You are a senior software engineering reviewer. Analyze the pull request diff below and return valid JSON only with these fields:\n` +
    `{
` +
    `  "summary": "One-sentence overview of the change",
` +
    `  "risk": "Assessment of risk or potential impact",
` +
    `  "affectedAreas": ["List of modules, files, or subsystems affected"],
` +
    `  "recommendations": ["Review focus, testing suggestions, or follow-up actions"]
` +
    `}\n` +
    `The diff is:\n${truncatedDiff}`;
};

const buildCommentBody = (analysis, pr) => {
  const affectedAreas = Array.isArray(analysis.affectedAreas) && analysis.affectedAreas.length
    ? analysis.affectedAreas.map((area) => `- ${area}`).join('\n')
    : '- Not available';

  const recommendations = Array.isArray(analysis.recommendations) && analysis.recommendations.length
    ? analysis.recommendations.map((item) => `- ${item}`).join('\n')
    : '- No specific recommendations.';

  return `### 🤖 PR Impact Analysis\n
**Summary:** ${analysis.summary || 'No summary generated.'}\n
**Risk:** ${analysis.risk || 'Unknown'}\n
**Affected areas:**\n${affectedAreas}\n\n**Recommendations:**\n${recommendations}\n\n_Analysis generated automatically._`;
};

/**
 * Handle GitHub pull_request events.
 * Runs AI-based PR impact analysis on opened/synchronize events and posts a comment.
 */
const handlePR = async (payload, repoId) => {
  const action = payload.action;
  const pr = payload.pull_request;

  logger.info(`PR handler: [${action}] PR #${pr?.number} "${pr?.title}" for repo ${repoId}`);

  if (action !== 'opened' && action !== 'synchronize') {
    return;
  }

  setImmediate(async () => {
    try {
      const diff = await githubService.fetchPullRequestDiff(repoId, pr.number);
      const prompt = buildPRAnalysisPrompt(pr, diff);
      let analysis;

      try {
        analysis = await aiProvider.generateStructuredResponse(prompt);
      } catch (err) {
        logger.warn(`PR handler: structured analysis failed, falling back to plain text for PR #${pr.number}: ${err.message}`);
        const fallbackText = await aiProvider.generateResponse(prompt);
        analysis = {
          summary: fallbackText,
          risk: 'unknown',
          affectedAreas: [],
          recommendations: [],
        };
      }

      const commentBody = buildCommentBody(analysis, pr);
      await githubService.postPullRequestComment(repoId, pr.number, commentBody);
      logger.info(`PR handler: Posted analysis comment for PR #${pr.number}`);
    } catch (err) {
      logger.error(`PR handler error for PR #${pr?.number}: ${err.message}`);
    }
  });
};

module.exports = handlePR;

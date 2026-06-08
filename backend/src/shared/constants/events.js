'use strict';

module.exports = {
  // Repository events
  REPO_ADDED: 'repo:added',
  REPO_ANALYSIS_STARTED: 'repo:analysis:started',
  REPO_ANALYSIS_COMPLETED: 'repo:analysis:completed',
  REPO_ANALYSIS_FAILED: 'repo:analysis:failed',

  // Commit events
  COMMIT_RECEIVED: 'commit:received',
  COMMIT_ANALYSIS_STARTED: 'commit:analysis:started',
  COMMIT_ANALYSIS_COMPLETED: 'commit:analysis:completed',
  COMMIT_ANALYSIS_FAILED: 'commit:analysis:failed',

  // Webhook events
  WEBHOOK_PUSH: 'webhook:push',
  WEBHOOK_PR: 'webhook:pull_request',

  // Email events
  EMAIL_SEND_VERIFICATION: 'email:send:verification',
  EMAIL_SEND_RESET: 'email:send:reset',
  EMAIL_SEND_COMMIT_NOTIFICATION: 'email:send:commit_notification',
  EMAIL_SEND_WEEKLY_DIGEST: 'email:send:weekly_digest',
};

'use strict';

module.exports = {
  // Per-user limits
  MAX_REPOS_FREE: 3,
  MAX_REPOS_PRO: 50,
  MAX_AI_QUESTIONS_PER_DAY_FREE: 10,
  MAX_AI_QUESTIONS_PER_DAY_PRO: 500,

  // Analysis limits
  MAX_FILES_FOR_EMBEDDING: 200,
  MAX_IMPORTANT_FILES_FOR_IMPORT_RESOLUTION: 50,
  CHUNK_SIZE_TOKENS: 2000,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 30 * 1000, // 30 seconds
  RATE_LIMIT_MAX_REQUESTS: 100,
  AUTH_RATE_LIMIT_MAX: 5, // 5 login attempts per window

  // Tokens
  REFRESH_TOKEN_MAX_PER_USER: 5, // clean up old tokens

  // Commit analysis retries
  COMMIT_ANALYSIS_MAX_RETRIES: 3,
};

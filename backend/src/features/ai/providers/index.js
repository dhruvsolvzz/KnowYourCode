'use strict';
const logger = require('../../../shared/utils/logger');
const config = require('../../../shared/config');
const GeminiProvider = require('./GeminiProvider');
const OpenAIProvider = require('./OpenAIProvider');
const GroqProvider = require('./GroqProvider');

const PROVIDERS = {
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  groq: GroqProvider,
};

const selected = (config.selectedAIProvider || 'gemini').toLowerCase();
let provider = PROVIDERS[selected];
let activeProvider = selected;

// Validate the selected provider is actually configured
if (!provider || (provider.available === false)) {
  logger.warn(`Provider "${selected}" is not configured or unavailable. Falling back to Gemini.`);
  provider = GeminiProvider;
  activeProvider = 'gemini';
}

logger.info(`✅ AI provider active: ${activeProvider}`);
module.exports = provider;


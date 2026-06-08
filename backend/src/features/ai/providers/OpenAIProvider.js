'use strict';
const axios = require('axios');
const AppError = require('../../../shared/utils/AppError');
const logger = require('../../../shared/utils/logger');
const config = require('../../../shared/config');

/**
 * OpenAI provider implementation using the OpenAI REST API.
 * Set AI_PROVIDER=openai in env to use this instead of Gemini.
 */
class OpenAIProvider {
  constructor() {
    this.apiKey = config.openai.apiKey;
    if (!this.apiKey) {
      logger.debug('OpenAI provider not configured');
    }
    this.available = !!this.apiKey;
    if (this.available) {
      this.client = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    }
  }

  _checkAvailable() {
    if (!this.available) throw new AppError('OpenAI not configured', 503, 'AI_PROVIDER_ERROR');
  }

  async generateResponse(prompt) {
    this._checkAvailable();
    try {
      const payload = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1200,
      };
      const result = await this.client.post('/chat/completions', payload);
      const content = result?.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned an empty response');
      }
      return content.trim();
    } catch (err) {
      logger.error('OpenAI generateResponse error:', err.response?.data || err.message);
      throw new AppError('AI provider error', 503, 'AI_PROVIDER_ERROR');
    }
  }

  async generateStructuredResponse(prompt) {
    this._checkAvailable();
    try {
      const payload = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1500,
      };
      const result = await this.client.post('/chat/completions', payload);
      const text = result?.data?.choices?.[0]?.message?.content || '';
      return JSON.parse(text);
    } catch (err) {
      logger.error('OpenAI generateStructuredResponse error:', err.response?.data || err.message);
      throw new AppError('AI structured response failed', 503, 'AI_PROVIDER_ERROR');
    }
  }

  async generateEmbedding(text) {
    this._checkAvailable();
    try {
      const payload = {
        model: 'text-embedding-3-large',
        input: text,
      };
      const result = await this.client.post('/embeddings', payload);
      const embedding = result?.data?.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error('OpenAI returned an invalid embedding');
      }
      return embedding;
    } catch (err) {
      logger.error('OpenAI generateEmbedding error:', err.response?.data || err.message);
      throw new AppError('AI_EMBEDDING_FAILED', 503, 'AI_EMBEDDING_FAILED');
    }
  }
}

module.exports = new OpenAIProvider();

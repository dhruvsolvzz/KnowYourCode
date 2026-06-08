'use strict';
const axios = require('axios');
const AppError = require('../../../shared/utils/AppError');
const logger = require('../../../shared/utils/logger');
const config = require('../../../shared/config');

/**
 * Groq provider — OpenAI-compatible API, ultra-fast inference.
 * Free tier: 14,400 requests/day, 500,000 tokens/minute.
 * Models: llama-3.3-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it
 * Get key: https://console.groq.com/keys
 *
 * Set AI_PROVIDER=groq in .env to use this provider.
 */
class GroqProvider {
  constructor() {
    this.apiKey = config.groq.apiKey;
    if (!this.apiKey) {
      logger.debug('Groq provider not configured — set GROQ_API_KEY in .env');
    }
    this.available = !!this.apiKey;

    if (this.available) {
      this.client = axios.create({
        baseURL: 'https://api.groq.com/openai/v1',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Best free model for code understanding tasks
      this.model = 'llama-3.3-70b-versatile';
    }
  }

  _checkAvailable() {
    if (!this.available) {
      throw new AppError('Groq not configured — set GROQ_API_KEY in .env', 503, 'AI_PROVIDER_ERROR');
    }
  }

  /**
   * Generate a plain-text response.
   */
  async generateResponse(prompt) {
    this._checkAvailable();
    try {
      const result = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1200,
      });
      const content = result?.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Groq returned an empty response');
      return content.trim();
    } catch (err) {
      logger.error('Groq generateResponse error:', err.response?.data || err.message);
      throw new AppError('AI provider error', 503, 'AI_PROVIDER_ERROR');
    }
  }

  /**
   * Generate a structured JSON response.
   * Groq supports JSON mode via response_format.
   */
  async generateStructuredResponse(prompt) {
    this._checkAvailable();
    try {
      const result = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis assistant. Always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });
      const text = result?.data?.choices?.[0]?.message?.content || '';
      return JSON.parse(text);
    } catch (err) {
      logger.error('Groq generateStructuredResponse error:', err.response?.data || err.message);
      throw new AppError('AI structured response failed', 503, 'AI_PROVIDER_ERROR');
    }
  }

  /**
   * Groq does not offer an embeddings API natively.
   * We fallback to Gemini for embeddings seamlessly since its free tier includes it.
   */
  async generateEmbedding(text) {
    const GeminiProvider = require('./GeminiProvider');
    if (!GeminiProvider.available) {
      throw new AppError(
        'Groq does not support embeddings and Gemini is not configured. Add GEMINI_API_KEY to .env for embeddings.',
        501,
        'AI_EMBEDDING_FAILED'
      );
    }
    return GeminiProvider.generateEmbedding(text);
  }

  async generateEmbeddingsBatch(texts) {
    const GeminiProvider = require('./GeminiProvider');
    if (!GeminiProvider.available) {
      throw new AppError(
        'Groq does not support embeddings and Gemini is not configured. Add GEMINI_API_KEY to .env for embeddings.',
        501,
        'AI_EMBEDDING_FAILED'
      );
    }
    return GeminiProvider.generateEmbeddingsBatch(texts);
  }
}

module.exports = new GroqProvider();

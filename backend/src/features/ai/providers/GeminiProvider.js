'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../../shared/config');
const logger = require('../../../shared/utils/logger');
const AppError = require('../../../shared/utils/AppError');

// Model preference order — fallback if primary is unavailable
const PRIMARY_MODEL = 'gemini-2.0-flash';
const STRUCTURED_MODEL = 'gemini-2.0-flash';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';

class GeminiProvider {
  constructor() {
    this.available = !!config.gemini.apiKey;
    if (!config.gemini.apiKey) {
      logger.warn('⚠️  GEMINI_API_KEY not set — AI features will be unavailable');
      return;
    }
    this.client = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.client.getGenerativeModel({ model: PRIMARY_MODEL });
    this.embeddingModel = this.client.getGenerativeModel({ model: EMBEDDING_MODEL });
  }

  _checkAvailable() {
    if (!this.client) throw new AppError('AI provider not configured', 503, 'AI_PROVIDER_ERROR');
  }

  /**
   * Generate a plain-text response.
   */
  async generateResponse(prompt) {
    this._checkAvailable();
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      logger.error('Gemini generateResponse error:', err.message);
      throw new AppError('AI provider error', 503, 'AI_PROVIDER_ERROR');
    }
  }

  /**
   * Generate a structured JSON response using Gemini's JSON mode.
   */
  async generateStructuredResponse(prompt) {
    this._checkAvailable();
    try {
      const model = this.client.getGenerativeModel({
        model: STRUCTURED_MODEL,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        logger.error('Gemini JSON parse error. Raw text:', text.slice(0, 500));
        throw parseErr;
      }
    } catch (err) {
      logger.error('Gemini structured response error:', err.message);
      throw new AppError(`AI structured response failed: ${err.message}`, 503, 'AI_PROVIDER_ERROR');
    }
  }

  /**
   * Generate a 768-dimensional embedding vector.
   */
  async generateEmbedding(text) {
    this._checkAvailable();
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values; // float[]
    } catch (err) {
      logger.error('Gemini embedding error:', err);
      throw new AppError('Embedding generation failed', 503, 'AI_EMBEDDING_FAILED');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch.
   */
  async generateEmbeddingsBatch(texts) {
    this._checkAvailable();
    // Process in chunks to avoid rate limits
    const BATCH_SIZE = 5;
    const results = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(batch.map((t) => this.generateEmbedding(t)));
      results.push(...embeddings);
      if (i + BATCH_SIZE < texts.length) {
        await new Promise((r) => setTimeout(r, 200)); // Rate limit pause
      }
    }
    return results;
  }
}

module.exports = new GeminiProvider();

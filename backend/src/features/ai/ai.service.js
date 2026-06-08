'use strict';
const AppError = require('../../shared/utils/AppError');
const Repository = require('../../shared/database/models/Repository.model');
const User = require('../../shared/database/models/User.model');
const Embedding = require('../../shared/database/models/Embedding.model');
const aiProvider = require('./providers');
const embeddingService = require('./EmbeddingService');
const promptBuilder = require('./PromptBuilder');
const { fetchFileContent } = require('../repository/parser/MetadataExtractor');
const logger = require('../../shared/utils/logger');

// In-memory chat history store (per user+repo session)
// Production: persist to MongoDB or Redis
const chatHistoryStore = new Map();

class AIService {
  async askQuestion(repoId, userId, question) {
    const repo = await Repository.findOne({ _id: repoId, userId });
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');

    const hasEmbeddings = await Embedding.exists({ repositoryId: repoId });
    if (!hasEmbeddings) {
      throw new AppError(
        'Repository embeddings not yet generated. Please wait for analysis to complete.',
        422,
        'AI_NO_EMBEDDINGS'
      );
    }

    // RAG: get relevant chunks
    const codeChunks = await embeddingService.semanticSearch(repoId, question);

    const prompt = promptBuilder.buildRAGPrompt(repo, codeChunks, question);

    let response;
    try {
      response = await aiProvider.generateStructuredResponse(prompt);
    } catch (_) {
      // Fallback to plain text if JSON parsing fails
      const text = await aiProvider.generateResponse(prompt);
      response = { explanation: text, flowSteps: [], relatedFiles: [] };
    }

    // Save to chat history
    const historyKey = `${userId}-${repoId}`;
    const history = chatHistoryStore.get(historyKey) || [];
    history.push({ role: 'user', content: question, timestamp: new Date() });
    history.push({ role: 'assistant', content: response.explanation, timestamp: new Date() });
    chatHistoryStore.set(historyKey, history.slice(-50)); // Keep last 50

    return response;
  }

  async explainFile(repoId, userId, filePath) {
    const repo = await Repository.findOne({ _id: repoId, userId });
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');

    const user = await User.findById(userId).select('+githubAccessToken');
    const accessToken = user?.githubAccessToken || null;

    const content = await fetchFileContent(repo.owner, repo.name, filePath, accessToken, repo.source, repo._id);
    if (!content) throw new AppError('File not found or empty', 404, 'NOT_FOUND');

    const prompt = promptBuilder.buildFileExplanationPrompt(filePath, content, repo);
    return aiProvider.generateStructuredResponse(prompt);
  }

  async explainFlow(repoId, userId, query) {
    const repo = await Repository.findOne({ _id: repoId, userId });
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');

    // Try to fetch relevant code snippets from embeddings for richer context
    let codeSnippets = [];
    try {
      const hasEmbeddings = await Embedding.exists({ repositoryId: repoId });
      if (hasEmbeddings) {
        codeSnippets = await embeddingService.semanticSearch(repoId, query, 6);
      }
    } catch (err) {
      logger.warn(`explainFlow: Could not fetch embeddings for context: ${err.message}`);
    }

    const prompt = promptBuilder.buildDetailedFlowControlPrompt(
      repo,
      query,
      repo.importantFiles || [],
      codeSnippets
    );

    let response;
    try {
      response = await aiProvider.generateStructuredResponse(prompt);
    } catch (err) {
      logger.warn(`explainFlow: Detailed prompt failed (${err.message}), falling back to basic prompt`);
      // Fallback: basic prompt without code snippets
      const basicPrompt = promptBuilder.buildFlowIdentificationPrompt(
        repo,
        query,
        repo.importantFiles || []
      );
      try {
        response = await aiProvider.generateStructuredResponse(basicPrompt);
      } catch (basicErr) {
        const text = await aiProvider.generateResponse(basicPrompt);
        response = {
          entryPoint: '',
          description: text,
          flowFiles: [],
          flowSteps: [],
          dataTransformations: [],
        };
      }
    }

    // Normalise — ensure all expected fields exist
    return {
      entryPoint: response.entryPoint || '',
      description: response.description || '',
      flowFiles: Array.isArray(response.flowFiles) ? response.flowFiles : [],
      flowSteps: Array.isArray(response.flowSteps) ? response.flowSteps : [],
      dataTransformations: Array.isArray(response.dataTransformations) ? response.dataTransformations : [],
    };
  }

  async getChatHistory(repoId, userId) {
    const historyKey = `${userId}-${repoId}`;
    return chatHistoryStore.get(historyKey) || [];
  }

  async analyzeCommit(commitDoc, repoDoc) {
    const prompt = promptBuilder.buildCommitAnalysisPrompt(commitDoc, repoDoc);
    try {
      return await aiProvider.generateStructuredResponse(prompt);
    } catch (err) {
      // Fallback to text parsing
      const text = await aiProvider.generateResponse(prompt);
      return {
        whatChanged: text,
        whyItChanged: 'See commit message',
        affectedModules: [],
        impactLevel: 'low',
        flowDescription: '',
        summary: commitDoc.message,
      };
    }
  }
}

module.exports = new AIService();

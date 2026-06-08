'use strict';
const Embedding = require('../../shared/database/models/Embedding.model');
const aiProvider = require('./providers');
const { fetchFileContent } = require('../repository/parser/MetadataExtractor');
const { CHUNK_SIZE_TOKENS, MAX_FILES_FOR_EMBEDDING } = require('../../shared/constants/limits');
const logger = require('../../shared/utils/logger');

/**
 * Splits code into chunks of ~2000 tokens (rough estimate: 4 chars ≈ 1 token)
 */
const chunkCode = (content, chunkSizeTokens = CHUNK_SIZE_TOKENS) => {
  const charLimit = chunkSizeTokens * 4;
  const chunks = [];
  for (let i = 0; i < content.length; i += charLimit) {
    chunks.push(content.slice(i, i + charLimit));
  }
  return chunks;
};

class EmbeddingService {
  /**
   * Generate and store embeddings for all important files in a repository.
   */
  async generateRepositoryEmbeddings(repositoryId, importantFiles, owner, repo, accessToken, source) {
    logger.info(`EmbeddingService: Generating embeddings for ${importantFiles.length} files`);

    // Delete existing embeddings for fresh re-analysis
    await Embedding.deleteMany({ repositoryId });

    const filesToEmbed = importantFiles
      .filter((f) => /\.(js|jsx|ts|tsx|py|java|go|rs)$/.test(f.path))
      .slice(0, MAX_FILES_FOR_EMBEDDING);

    let totalChunks = 0;

    for (const file of filesToEmbed) {
      try {
        const content = await fetchFileContent(owner, repo, file.path, accessToken, source, repositoryId);
        if (!content || content.length < 50) continue;

        const chunks = chunkCode(content);

        for (let i = 0; i < chunks.length; i++) {
          const embedding = await aiProvider.generateEmbedding(chunks[i]);

          await Embedding.create({
            repositoryId,
            filePath: file.path,
            chunkIndex: i,
            content: chunks[i],
            embedding,
            metadata: {
              fileType: file.path.split('.').pop(),
              layer: file.type,
            },
          });
          totalChunks++;
        }

        logger.debug(`EmbeddingService: Embedded ${file.path} (${chunks.length} chunks)`);
      } catch (err) {
        logger.warn(`EmbeddingService: Failed to embed ${file.path}: ${err.message}`);
      }
    }

    logger.info(`EmbeddingService: Stored ${totalChunks} chunks for repo ${repositoryId}`);
    return totalChunks;
  }

  /**
   * Semantic search using MongoDB vector search.
   * Falls back to text search if Atlas Vector Search is not configured.
   */
  async semanticSearch(repositoryId, query, limit = 5) {
    const queryEmbedding = await aiProvider.generateEmbedding(query);

    try {
      // Atlas Vector Search — requires index configured in Atlas UI
      const results = await Embedding.aggregate([
        {
          $vectorSearch: {
            index: 'embedding_vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 50,
            limit,
            filter: { repositoryId },
          },
        },
        {
          $project: {
            filePath: 1,
            content: 1,
            'metadata.layer': 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ]);
      return results;
    } catch (err) {
      logger.warn('Vector search failed, falling back to regular query:', err.message);
      // Fallback: return most recent embeddings for the repo
      return Embedding.find({ repositoryId })
        .select('filePath content metadata')
        .limit(limit);
    }
  }
}

module.exports = new EmbeddingService();

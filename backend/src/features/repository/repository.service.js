'use strict';
const AppError = require('../../shared/utils/AppError');
const repositoryRepository = require('./repository.repository');
const repositoryParser = require('./parser/RepositoryParser');
const { parseGithubUrl } = require('./parser/MetadataExtractor');
const { paginate, parsePaginationParams } = require('../../shared/utils/paginate');
const { REPO_NOT_FOUND, REPO_ACCESS_DENIED, REPO_ALREADY_EXISTS } = require('../../shared/constants/errorCodes');
const { MAX_REPOS_FREE } = require('../../shared/constants/limits');
const EventEmitter = require('events');
const logger = require('../../shared/utils/logger');

const emitter = new EventEmitter();

class RepositoryService {
  async lookupRepository(url, userId) {
    let repo = await repositoryRepository.findOne({ url, userId });
    
    if (!repo) {
      const match = url.match(/github\.com[/:]([^/]+)\/([^/.\s]+?)(?:\.git)?(?:\/|$)/);
      if (match) {
        repo = await repositoryRepository.findOne({ 
          owner: { $regex: new RegExp(`^${match[1]}$`, 'i') }, 
          name: { $regex: new RegExp(`^${match[2]}$`, 'i') }, 
          userId 
        });
      } else {
        const parts = url.split('/');
        if (parts.length === 2) {
          repo = await repositoryRepository.findOne({ 
            owner: { $regex: new RegExp(`^${parts[0]}$`, 'i') }, 
            name: { $regex: new RegExp(`^${parts[1]}$`, 'i') }, 
            userId 
          });
        } else {
          // Maybe they just entered the project name exactly or partially?
          repo = await repositoryRepository.findOne({ 
            name: { $regex: new RegExp(`^${url}$`, 'i') }, 
            userId 
          });
        }
      }
    }
    
    if (!repo) {
      throw new AppError('Repository not found for this URL/identifier', 404, 'REPO_NOT_FOUND');
    }
    return repo;
  }

  async listRepositories(userId, query) {
    const { page, limit, skip } = parsePaginationParams(query);
    const [repos, total] = await Promise.all([
      repositoryRepository.findAllByUser(userId, { skip, limit }),
      repositoryRepository.countByUser(userId),
    ]);
    return { repositories: repos, meta: paginate(total, page, limit) };
  }

  async addRepository(userId, url, source, user) {
    // Validate GitHub URL
    let owner, repo;
    try {
      ({ owner, repo } = parseGithubUrl(url));
    } catch (_) {
      throw new AppError('Invalid GitHub repository URL', 400, 'REPO_INVALID_URL');
    }

    // Get access token for OAuth users
    const accessToken = source === 'github_oauth' ? user.githubAccessToken : null;

    // Create repository record (pending status)
    const repoDoc = await repositoryRepository.create({
      userId,
      url,
      source,
      name: repo,
      owner,
      analysisStatus: 'processing',
    });

    // Trigger async analysis (non-blocking)
    setImmediate(async () => {
      try {
        logger.info(`Starting background analysis for repo: ${url}`);
        const parsed = await repositoryParser.parse(url, accessToken);
        await repositoryRepository.update(repoDoc._id, {
          ...parsed,
          analysisStatus: 'completed',
          lastAnalyzedAt: new Date(),
        });
        logger.info(`Analysis completed for repo: ${url}`);

        // Generate embeddings for AI insights
        const embeddingService = require('../ai/EmbeddingService');
        await embeddingService.generateRepositoryEmbeddings(repoDoc._id, parsed.importantFiles, owner, repo, accessToken, source);
      } catch (err) {
        logger.error(`Analysis failed for repo ${url}: ${err.message}`);
        await repositoryRepository.setAnalysisStatus(repoDoc._id, 'failed');
      }
    });

    return repoDoc;
  }

  async addFromZip(userId, projectName, zipBuffer) {
    const zipParser = require('./parser/ZipParser');
    const fs = require('fs');
    const path = require('path');

    // Create repository record (processing status)
    const repoDoc = await repositoryRepository.create({
      userId,
      url: `zip://${projectName}`,
      source: 'zip_upload',
      name: projectName,
      owner: 'local',
      analysisStatus: 'processing',
    });

    // Save zip file to disk for later use by AI Learning Mode
    try {
      const uploadsDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, `${repoDoc._id}.zip`), zipBuffer);
    } catch (err) {
      logger.error(`Failed to save ZIP to disk for ${projectName}: ${err.message}`);
    }

    // Trigger async analysis (non-blocking)
    setImmediate(async () => {
      try {
        logger.info(`Starting ZIP analysis for project: ${projectName}`);
        const parsed = await zipParser.parse(zipBuffer, projectName);
        await repositoryRepository.update(repoDoc._id, {
          ...parsed,
          analysisStatus: 'completed',
          lastAnalyzedAt: new Date(),
        });
        logger.info(`ZIP analysis completed for project: ${projectName}`);

        // Generate embeddings for AI insights
        const embeddingService = require('../ai/EmbeddingService');
        await embeddingService.generateRepositoryEmbeddings(repoDoc._id, parsed.importantFiles, 'local', projectName, null, 'zip_upload');
      } catch (err) {
        logger.error(`ZIP analysis failed for ${projectName}: ${err.message}`);
        await repositoryRepository.setAnalysisStatus(repoDoc._id, 'failed');
      }
    });

    return repoDoc;
  }

  async getRepository(repoId, userId) {
    const repo = await repositoryRepository.findByIdAndUserId(repoId, userId);
    if (!repo) throw new AppError('Repository not found', 404, REPO_NOT_FOUND);
    return repo;
  }

  async deleteRepository(repoId, userId) {
    const repo = await repositoryRepository.findByIdAndUserId(repoId, userId);
    if (!repo) throw new AppError('Repository not found', 404, REPO_NOT_FOUND);
    await repositoryRepository.delete(repoId);
    return { message: 'Repository removed' };
  }

  async reanalyze(repoId, userId, user) {
    const repo = await repositoryRepository.findByIdAndUserId(repoId, userId);
    if (!repo) throw new AppError('Repository not found', 404, REPO_NOT_FOUND);

    await repositoryRepository.setAnalysisStatus(repoId, 'processing');

    setImmediate(async () => {
      try {
        const accessToken = repo.source === 'github_oauth' ? user.githubAccessToken : null;
        const parsed = await repositoryParser.parse(repo.url, accessToken);
        await repositoryRepository.update(repoId, { ...parsed, analysisStatus: 'completed', lastAnalyzedAt: new Date() });

        // Generate embeddings for AI insights
        const embeddingService = require('../ai/EmbeddingService');
        await embeddingService.generateRepositoryEmbeddings(repoId, parsed.importantFiles, repo.owner, repo.name, accessToken, repo.source);
      } catch (err) {
        logger.error(`Re-analysis failed: ${err.message}`);
        await repositoryRepository.setAnalysisStatus(repoId, 'failed');
      }
    });

    return { message: 'Re-analysis started' };
  }

  async getCommits(repoId, userId, query) {
    const repo = await repositoryRepository.findByIdAndUserId(repoId, userId);
    if (!repo) throw new AppError('Repository not found', 404, REPO_NOT_FOUND);
    const { page, limit, skip } = parsePaginationParams(query);
    const [commits, total] = await Promise.all([
      repositoryRepository.getCommits(repoId, { skip, limit }),
      repositoryRepository.countCommits(repoId),
    ]);
    return { commits, meta: paginate(total, page, limit) };
  }
}

module.exports = new RepositoryService();

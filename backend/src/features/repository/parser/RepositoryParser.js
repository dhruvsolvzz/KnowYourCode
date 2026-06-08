'use strict';
const { parseGithubUrl, fetchRepoMetadata, fetchLanguages, fetchFileTree, fetchFileContent } = require('./MetadataExtractor');
const { buildFolderTree } = require('./FileTreeBuilder');
const { detectArchitecture, detectImportantFiles } = require('./ArchitectureDetector');
const { buildImportMap } = require('./ImportResolver');
const logger = require('../../../shared/utils/logger');

/**
 * Main parser orchestrator — runs all analysis steps for a repository.
 * Returns enriched repository data to be saved to MongoDB.
 */
class RepositoryParser {
  /**
   * @param {string} githubUrl - e.g. https://github.com/owner/repo
   * @param {string|null} accessToken - user's GitHub OAuth token (optional)
   */
  async parse(githubUrl, accessToken = null) {
    logger.info(`RepositoryParser: Starting analysis for ${githubUrl}`);

    // Step 1: Parse URL
    const { owner, repo } = parseGithubUrl(githubUrl);

    // Step 2: Fetch metadata
    logger.info(`RepositoryParser: Fetching metadata for ${owner}/${repo}`);
    const [metadata, languages] = await Promise.all([
      fetchRepoMetadata(owner, repo, accessToken),
      fetchLanguages(owner, repo, accessToken),
    ]);

    const defaultBranch = metadata.default_branch || 'main';

    // Step 3: Fetch entire file tree (1 API call)
    logger.info(`RepositoryParser: Fetching file tree (branch: ${defaultBranch})`);
    const flatTree = await fetchFileTree(owner, repo, defaultBranch, accessToken);
    const folderStructure = buildFolderTree(flatTree);

    // Step 4: Architecture detection (uses package.json if available)
    const pkgJsonFile = flatTree.find((f) => f.path === 'package.json' && f.type === 'blob');
    let packageJsonContent = null;
    if (pkgJsonFile) {
      packageJsonContent = await fetchFileContent(owner, repo, 'package.json', accessToken);
    }
    const detectedStack = detectArchitecture(flatTree, packageJsonContent);

    // Step 5: Detect important files
    const importantFiles = detectImportantFiles(flatTree);
    logger.info(`RepositoryParser: Found ${importantFiles.length} important files`);

    // Step 6: Build import map (API calls limited to important files only)
    let importMap = {};
    try {
      importMap = await buildImportMap(importantFiles, owner, repo, accessToken);
    } catch (err) {
      logger.warn(`RepositoryParser: Import resolution partially failed: ${err.message}`);
    }

    // Step 7: Advanced AST Analysis
    const astData = {
        frontend: [],
        backend: [],
        dataFlowEdges: []
    };
    
    try {
      const FrontendAnalyzer = require('../ast/FrontendAnalyzer');
      const BackendAnalyzer = require('../ast/BackendAnalyzer');
      const FlowMatcher = require('../ast/FlowMatcher');

      for (const file of importantFiles) {
        if (file.path.match(/\.(js|jsx|ts|tsx)$/)) {
            const code = await fetchFileContent(owner, repo, file.path, accessToken);
            if (code) {
               if (file.path.includes('src/') && (file.path.includes('components') || file.path.includes('pages') || file.path.includes('features') || code.includes('import React'))) {
                   const fData = FrontendAnalyzer.analyze(code, file.path);
                   if (fData) astData.frontend.push(fData);
               } else {
                   const bData = BackendAnalyzer.analyze(code, file.path);
                   if (bData) astData.backend.push(bData);
               }
            }
        }
      }

      astData.dataFlowEdges = FlowMatcher.match(astData.frontend, astData.backend);
      logger.info(`RepositoryParser: Extracted ${astData.dataFlowEdges.length} semantic data flow edges`);
    } catch (err) {
        logger.warn(`RepositoryParser: AST Analysis failed: ${err.message}`);
    }

    logger.info(`RepositoryParser: Analysis complete for ${owner}/${repo}`);

    return {
      name: metadata.name,
      owner: metadata.owner?.login || owner,
      description: metadata.description,
      defaultBranch,
      isPrivate: metadata.private,
      stars: metadata.stargazers_count,
      forks: metadata.forks_count,
      githubRepoId: String(metadata.id),
      languages,
      totalFiles: flatTree.filter((f) => f.type === 'blob').length,
      folderStructure,
      importantFiles,
      detectedStack,
      importMap, // stored temporarily; used by graph builders
      astData, // semantic data flows
      analysisStatus: 'completed',
    };
  }
}

module.exports = new RepositoryParser();

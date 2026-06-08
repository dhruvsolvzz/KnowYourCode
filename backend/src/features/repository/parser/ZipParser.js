'use strict';
const AdmZip = require('adm-zip');
const path = require('path');
const { buildFolderTree } = require('./FileTreeBuilder');
const { detectArchitecture, detectImportantFiles } = require('./ArchitectureDetector');
const { buildImportMapFromContent } = require('./ImportResolver');
const logger = require('../../../shared/utils/logger');

class ZipParser {
  async parse(zipBuffer, projectName) {
    logger.info(`ZipParser: Starting analysis for uploaded project: ${projectName}`);

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // Build flat tree and content map
    const flatTree = [];
    const fileContentMap = {};
    let rootPrefix = '';

    // Detect common root folder (many ZIPs wrap everything in a single folder)
    const topLevelDirs = new Set();
    for (const entry of entries) {
      const firstPart = entry.entryName.split('/')[0];
      if (firstPart) topLevelDirs.add(firstPart);
    }
    if (topLevelDirs.size === 1) {
      rootPrefix = [...topLevelDirs][0] + '/';
    }

    for (const entry of entries) {
      let entryPath = entry.entryName;
      
      // Strip common root prefix
      if (rootPrefix && entryPath.startsWith(rootPrefix)) {
        entryPath = entryPath.slice(rootPrefix.length);
      }
      
      if (!entryPath || entryPath === '') continue;

      // Skip node_modules entirely
      if (entryPath.includes('node_modules/')) continue;
      // Skip hidden directories
      if (entryPath.split('/').some(p => p.startsWith('.') && p !== '.')) continue;

      if (entry.isDirectory) {
        flatTree.push({ path: entryPath.replace(/\/$/, ''), type: 'tree' });
      } else {
        flatTree.push({ path: entryPath, type: 'blob', size: entry.header.size });
        // Only read text-like files into content map
        const ext = path.extname(entryPath).toLowerCase();
        const textExts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs', '.cjs', '.py', '.go', '.java', '.rb', '.php', '.css', '.html', '.md', '.yml', '.yaml', '.toml', '.env'];
        if (textExts.includes(ext) || entryPath === 'package.json') {
          try {
            fileContentMap[entryPath] = entry.getData().toString('utf-8');
          } catch (err) {
            logger.warn(`ZipParser: Could not read ${entryPath}: ${err.message}`);
          }
        }
      }
    }

    logger.info(`ZipParser: Extracted ${flatTree.length} entries from ZIP`);

    // Build folder structure
    const folderStructure = buildFolderTree(flatTree);

    // Architecture detection
    const packageJsonContent = fileContentMap['package.json'] || null;
    const detectedStack = detectArchitecture(flatTree, packageJsonContent);

    // Detect important files
    const importantFiles = detectImportantFiles(flatTree);
    logger.info(`ZipParser: Found ${importantFiles.length} important files`);

    // Build import map from local content
    let importMap = {};
    try {
      importMap = buildImportMapFromContent(importantFiles, fileContentMap);
    } catch (err) {
      logger.warn(`ZipParser: Import resolution partially failed: ${err.message}`);
    }

    // AST Analysis
    const astData = { frontend: [], backend: [], dataFlowEdges: [] };
    try {
      const FrontendAnalyzer = require('../ast/FrontendAnalyzer');
      const BackendAnalyzer = require('../ast/BackendAnalyzer');
      const FlowMatcher = require('../ast/FlowMatcher');

      for (const file of importantFiles) {
        if (file.path.match(/\.(js|jsx|ts|tsx)$/)) {
          const code = fileContentMap[file.path];
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
      logger.info(`ZipParser: Extracted ${astData.dataFlowEdges.length} semantic data flow edges`);
    } catch (err) {
      logger.warn(`ZipParser: AST Analysis failed: ${err.message}`);
    }

    // Detect languages from file extensions
    const langMap = {};
    const langNames = { '.js': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TypeScript', '.py': 'Python', '.go': 'Go', '.java': 'Java', '.rb': 'Ruby', '.php': 'PHP', '.css': 'CSS', '.html': 'HTML', '.json': 'JSON' };
    for (const f of flatTree.filter(f => f.type === 'blob')) {
      const ext = path.extname(f.path).toLowerCase();
      const lang = langNames[ext];
      if (lang) langMap[lang] = (langMap[lang] || 0) + (f.size || 1);
    }
    const totalBytes = Object.values(langMap).reduce((s, b) => s + b, 0) || 1;
    const languages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({ name, bytes, percentage: Math.round((bytes / totalBytes) * 100) }));

    logger.info(`ZipParser: Analysis complete for ${projectName}`);

    return {
      name: projectName,
      owner: 'local',
      description: `Uploaded ZIP project: ${projectName}`,
      defaultBranch: 'main',
      isPrivate: true,
      stars: 0,
      forks: 0,
      languages,
      totalFiles: flatTree.filter(f => f.type === 'blob').length,
      folderStructure,
      importantFiles,
      detectedStack,
      importMap,
      astData,
      analysisStatus: 'completed',
    };
  }
}

module.exports = new ZipParser();

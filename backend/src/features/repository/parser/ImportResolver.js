'use strict';
const { fetchFileContent } = require('./MetadataExtractor');
const logger = require('../../../shared/utils/logger');

/**
 * Parse import/require statements from JS/TS source code.
 * Returns array of imported module paths.
 */
const parseImports = (code) => {
  const imports = new Set();

  // ES6 imports: import X from '...'
  const esImportRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = esImportRegex.exec(code)) !== null) {
    imports.add(match[1]);
  }

  // CommonJS: require('...')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(code)) !== null) {
    imports.add(match[1]);
  }

  // Filter: only relative imports (./... or ../...)
  return [...imports].filter((imp) => imp.startsWith('.'));
};

/**
 * Resolve a relative import path against the importing file's directory.
 */
const resolveImportPath = (importerPath, importPath) => {
  const parts = importerPath.split('/');
  parts.pop(); // Remove filename
  const base = parts.join('/');

  const resolved = importPath.split('/').reduce(
    (acc, part) => {
      if (part === '..') { acc.pop(); return acc; }
      if (part !== '.') acc.push(part);
      return acc;
    },
    base ? base.split('/') : []
  );

  return resolved.join('/');
};

/**
 * Build import map: { fileA.path → [fileB.path, fileC.path] }
 * Only processes importantFiles to stay within API rate limits.
 */
const buildImportMap = async (importantFiles, owner, repo, accessToken) => {
  const importMap = {};
  const allPaths = importantFiles.map((f) => f.path);

  for (const file of importantFiles) {
    const ext = file.path.split('.').pop();
    if (!['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) continue;

    const content = await fetchFileContent(owner, repo, file.path, accessToken);
    if (!content) continue;

    const rawImports = parseImports(content);
    const resolvedImports = rawImports
      .map((imp) => resolveImportPath(file.path, imp))
      .filter((resolved) =>
        allPaths.some((p) => p.startsWith(resolved))
      );

    if (resolvedImports.length > 0) {
      importMap[file.path] = resolvedImports;
    }

    logger.debug(`ImportResolver: ${file.path} → [${resolvedImports.join(', ')}]`);
  }

  return importMap;
};

const buildImportMapFromContent = (importantFiles, fileContentMap) => {
  const importMap = {};
  const allPaths = importantFiles.map((f) => f.path);
  for (const file of importantFiles) {
    const ext = file.path.split('.').pop();
    if (!['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) continue;
    const content = fileContentMap[file.path];
    if (!content) continue;
    const rawImports = parseImports(content);
    const resolvedImports = rawImports
      .map((imp) => resolveImportPath(file.path, imp))
      .filter((resolved) => allPaths.some((p) => p.startsWith(resolved)));
    if (resolvedImports.length > 0) {
      importMap[file.path] = resolvedImports;
    }
  }
  return importMap;
};

module.exports = { buildImportMap, buildImportMapFromContent, parseImports, resolveImportPath };

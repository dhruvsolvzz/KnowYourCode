'use strict';

/**
 * Build a commit impact graph — highlights which files were changed in a commit.
 */
const buildCommitImpactGraph = (commit, importantFiles, importMap) => {
  const changedPaths = new Set((commit.changedFiles || []).map((f) => f.filename));

  // All nodes: changed files + their direct dependents
  const affectedPaths = new Set(changedPaths);

  // Find files that import any changed file
  for (const [importer, imports] of Object.entries(importMap || {})) {
    for (const imp of imports) {
      if ([...changedPaths].some((cp) => cp.startsWith(imp) || imp.startsWith(cp.replace(/\.[^.]+$/, '')))) {
        affectedPaths.add(importer);
      }
    }
  }

  const allFiles = importantFiles.filter(
    (f) => changedPaths.has(f.path) || affectedPaths.has(f.path)
  );

  const nodes = allFiles.map((file, i) => {
    const isChanged = changedPaths.has(file.path);
    const changedFile = (commit.changedFiles || []).find((cf) => cf.filename === file.path);

    return {
      id: file.path,
      type: file.type === 'model' ? 'model' : file.type === 'route' ? 'route' : 'service',
      position: { x: (i % 4) * 260, y: Math.floor(i / 4) * 160 },
      data: {
        label: file.path.split('/').pop(),
        filePath: file.path,
        layer: file.type,
        metadata: {
          isChanged,
          status: changedFile?.status,
          additions: changedFile?.additions,
          deletions: changedFile?.deletions,
          impactLevel: commit.aiAnalysis?.impactLevel || 'low',
        },
      },
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = [];

  for (const [importer, imports] of Object.entries(importMap || {})) {
    if (!nodeIds.has(importer)) continue;
    for (const imp of imports) {
      const targetId = [...nodeIds].find(
        (id) => id.startsWith(imp) || imp.startsWith(id.replace(/\.[^.]+$/, ''))
      );
      if (targetId && targetId !== importer) {
        edges.push({
          id: `impact-${importer}->${targetId}`,
          source: importer,
          target: targetId,
          type: 'smoothstep',
          animated: changedPaths.has(importer),
          data: { relationshipType: 'impact' },
        });
      }
    }
  }

  return { nodes, edges };
};

module.exports = { buildCommitImpactGraph };

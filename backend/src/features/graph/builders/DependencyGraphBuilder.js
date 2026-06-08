'use strict';
const { layoutTopBottom } = require('../layout/DagreLayoutEngine');

/**
 * Build a dependency graph from the import map.
 * Shows which files depend on which — useful for spotting tight coupling.
 */
const buildDependencyGraph = (importantFiles, importMap) => {
  const nodes = layoutTopBottom(
    importantFiles.map((file) => ({
      id: file.path,
      type: file.type === 'model' ? 'model' : file.type === 'route' ? 'route' : 'service',
      data: {
        label: file.path.split('/').pop(),
        filePath: file.path,
        layer: file.type,
        metadata: { role: file.role },
      },
    }))
  );

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = [];

  for (const [importer, imports] of Object.entries(importMap || {})) {
    for (const imported of imports) {
      const targetId = [...nodeIds].find(
        (id) => id.startsWith(imported) || imported.startsWith(id.replace(/\.[^.]+$/, ''))
      );
      if (targetId && targetId !== importer && nodeIds.has(importer)) {
        edges.push({
          id: `dep-${importer}->${targetId}`,
          source: importer,
          target: targetId,
          type: 'straight',
          animated: false,
          label: 'imports',
          data: { relationshipType: 'dependency' },
        });
      }
    }
  }

  return { nodes, edges };
};

module.exports = { buildDependencyGraph };

'use strict';

/**
 * Recursively builds graph nodes and edges from a parsed folder structure.
 */
const buildFolderGraph = (folderStructure) => {
  const nodes = [];
  const edges = [];

  if (!folderStructure) return { nodes, edges };

  const traverse = (node, parentPath = null) => {
    const id = node.path || 'root';
    // Let's use existing types: 'service' for files, 'component' or something else, but we can just use generic types
    // or standard React Flow default node, we will let GraphCanvas map them.
    const nodeType = node.type === 'directory' ? 'folder' : 'file';

    nodes.push({
      id,
      type: nodeType,
      data: {
        label: node.name,
        filePath: node.path,
        layer: nodeType, // used for styling in frontend
      },
    });

    if (parentPath !== null) {
      edges.push({
        id: `${parentPath}->${id}`,
        source: parentPath,
        target: id,
        type: 'smoothstep',
        animated: false,
        data: { relationshipType: 'contains' },
      });
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, id);
      }
    }
  };

  traverse(folderStructure);
  return { nodes, edges };
};

module.exports = { buildFolderGraph };

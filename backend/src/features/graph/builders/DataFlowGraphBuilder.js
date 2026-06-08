'use strict';
const { layoutLeftRight } = require('../layout/DagreLayoutEngine');

const LAYER_ORDER = ['component', 'route', 'controller', 'service', 'model', 'database'];

const classifyLayer = (filePath) => {
  if (/\/(pages|components|views)\//.test(filePath)) return 'component';
  if (/routes?\//.test(filePath)) return 'route';
  if (/controllers?\//.test(filePath)) return 'controller';
  if (/services?\//.test(filePath)) return 'service';
  if (/models?\//.test(filePath)) return 'model';
  return 'service';
};

/**
 * Build a data flow graph for a specific user query.
 * flowFiles comes from AI service (identifyFlowEntryPoints).
 */
const buildDataFlowGraph = (flowFiles) => {
  if (!flowFiles || flowFiles.length === 0) return { nodes: [], edges: [] };

  // Sort by layer order
  const sorted = [...flowFiles].sort((a, b) => {
    const la = LAYER_ORDER.indexOf(a.layer || classifyLayer(a.path));
    const lb = LAYER_ORDER.indexOf(b.layer || classifyLayer(b.path));
    return la - lb;
  });

  const nodes = sorted.map((file, i) => ({
    id: file.path,
    type: file.layer || classifyLayer(file.path),
    position: { x: i * 280, y: 0 },
    data: {
      label: file.path.split('/').pop(),
      filePath: file.path,
      layer: file.layer,
      metadata: { action: file.action },
    },
  }));

  const edges = sorted.slice(0, -1).map((_, i) => ({
    id: `e${i}-${i + 1}`,
    source: sorted[i].path,
    target: sorted[i + 1].path,
    type: 'smoothstep',
    animated: true,
    label: inferEdgeLabel(sorted[i], sorted[i + 1]),
    data: { relationshipType: inferRelationship(sorted[i].layer, sorted[i + 1]?.layer) },
  }));

  return { nodes, edges };
};

const inferEdgeLabel = (from, to) => {
  const fromLayer = from.layer || '';
  const toLayer = to.layer || '';
  if (fromLayer === 'component' && toLayer === 'route') return 'HTTP Request';
  if (fromLayer === 'route' && toLayer === 'controller') return 'calls';
  if (fromLayer === 'controller' && toLayer === 'service') return 'delegates';
  if (fromLayer === 'service' && toLayer === 'model') return 'query';
  if (fromLayer === 'model' && toLayer === 'database') return 'read/write';
  return '→';
};

const inferRelationship = (fromLayer, toLayer) => {
  if (fromLayer === 'component') return 'http';
  if (fromLayer === 'service') return 'query';
  return 'function_call';
};

module.exports = { buildDataFlowGraph };

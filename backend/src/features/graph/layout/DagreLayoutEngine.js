'use strict';

/**
 * Auto-layout graph nodes using a simple Dagre-inspired algorithm.
 * We implement this without the dagre npm package (no native dep issues).
 *
 * For production, install: npm install dagre
 * and replace with: const dagre = require('dagre');
 */

const LAYER_ORDER = ['component', 'route', 'controller', 'service', 'model', 'database'];
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const H_GAP = 80;
const V_GAP = 100;

/**
 * Layout nodes in a top-to-bottom layered graph.
 * Groups nodes by their type/layer and spaces them evenly.
 */
const layoutTopBottom = (nodes) => {
  // Group by layer
  const layers = {};
  for (const node of nodes) {
    const layer = LAYER_ORDER.indexOf(node.type) !== -1 ? node.type : 'service';
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(node);
  }

  const orderedLayers = LAYER_ORDER.filter((l) => layers[l]);
  const laid = [];

  orderedLayers.forEach((layerName, layerIndex) => {
    const layerNodes = layers[layerName];
    const totalWidth = layerNodes.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const startX = -totalWidth / 2;
    const y = layerIndex * (NODE_HEIGHT + V_GAP);

    layerNodes.forEach((node, i) => {
      laid.push({
        ...node,
        position: { x: startX + i * (NODE_WIDTH + H_GAP), y },
      });
    });
  });

  return laid;
};

/**
 * Layout nodes left-to-right (for data flow view).
 */
const layoutLeftRight = (nodes) => {
  return nodes.map((node, i) => ({
    ...node,
    position: { x: i * (NODE_WIDTH + H_GAP), y: 0 },
  }));
};

module.exports = { layoutTopBottom, layoutLeftRight };

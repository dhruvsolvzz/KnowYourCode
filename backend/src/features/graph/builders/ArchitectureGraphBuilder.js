'use strict';
const { layoutTopBottom } = require('../layout/DagreLayoutEngine');

const classifyLayer = (filePath) => {
  if (/\/(pages|components|views)\//i.test(filePath)) return 'component';
  if (/routes?\//i.test(filePath)) return 'route';
  if (/controllers?\//i.test(filePath)) return 'controller';
  if (/models?\//i.test(filePath)) return 'model';
  return 'service';
};

/**
 * Build a full architecture graph from the repository's important files, import map, and AST data.
 */
const buildArchitectureGraph = (importantFiles, importMap = {}, astData = null) => {
  const nodes = [];
  const edges = [];

  if (astData && astData.dataFlowEdges && astData.dataFlowEdges.length > 0) {
    const addedNodes = new Set();
    const addNode = (id, type, label, layer, metadata = {}) => {
      if (!addedNodes.has(id)) {
        nodes.push({ id, type, data: { label, layer, metadata } });
        addedNodes.add(id);
      }
    };

    addNode('mongodb', 'database', 'MongoDB', 'database');
    addNode('redux-store', 'store', 'Redux/State Store', 'store');

    // Add backend nodes
    astData.backend.forEach(bf => {
      const layer = classifyLayer(bf.path);
      const label = bf.path.split('/').pop();
      addNode(bf.path, layer, label, layer, { path: bf.path });

      bf.routes.forEach(route => {
        const routeId = `route-${route.method}-${route.path}`;
        addNode(routeId, 'route', `${route.method} ${route.path}`, 'route', { handler: route.handler });
        edges.push({
          id: `${routeId}->${bf.path}`,
          source: routeId,
          target: bf.path,
          type: 'smoothstep',
          animated: true,
          data: { relationshipType: 'route_handler' }
        });
      });

      bf.dbCalls.forEach(db => {
        edges.push({
          id: `${bf.path}->mongodb-${db.model}-${db.operation}`,
          source: bf.path,
          target: 'mongodb',
          label: `${db.model}.${db.operation}()`,
          type: 'smoothstep',
          animated: true,
          data: { relationshipType: 'db_call', operation: db.operation, model: db.model }
        });
      });
    });

    // Add frontend nodes
    astData.frontend.forEach(ff => {
      const layer = classifyLayer(ff.path);
      const label = ff.path.split('/').pop();
      addNode(ff.path, 'component', label, layer, { path: ff.path });

      ff.stateOps.forEach(op => {
        edges.push({
          id: `${ff.path}->redux-${op.action}`,
          source: ff.path,
          target: 'redux-store',
          label: `dispatch(${op.action})`,
          type: 'smoothstep',
          animated: true,
          data: { relationshipType: 'state_dispatch', action: op.action }
        });
      });
    });

    // Connect frontend components to backend routes based on FlowMatcher edges
    astData.dataFlowEdges.forEach(edge => {
      // routeId corresponds to what we added above
      const apiMethod = edge.label.split(' ')[0];
      const apiPath = edge.label.split(' ')[1];
      const routeId = `route-${apiMethod}-${apiPath}`;
      
      edges.push({
        id: `${edge.source}->${edge.target}-${apiMethod}-${apiPath}`,
        source: edge.source,
        // If we found a direct route node for this flow, connect to it, otherwise directly to file
        target: addedNodes.has(routeId) ? routeId : edge.target,
        label: edge.label,
        type: 'smoothstep',
        animated: true,
        data: { relationshipType: 'api_call', payload: edge.payload }
      });
    });

    // Clean up empty redux store node if no edges point to it
    const finalNodes = nodes.filter(n => {
       if (n.id === 'redux-store') {
          return edges.some(e => e.target === 'redux-store');
       }
       if (n.id === 'mongodb') {
          return edges.some(e => e.target === 'mongodb');
       }
       return true;
    });

    return { nodes: layoutTopBottom(finalNodes), edges };
  } else {
    // Fallback to legacy import map
    const rawNodes = importantFiles.map((file) => ({
      id: file.path,
      type: file.type === 'entry' ? 'service' : classifyLayer(file.path),
      data: {
        label: file.path.split('/').pop(),
        filePath: file.path,
        layer: file.type,
        metadata: { role: file.role },
      },
    }));

    const finalNodes = layoutTopBottom(rawNodes);
    const nodeIds = new Set(finalNodes.map((n) => n.id));

    for (const [importer, imports] of Object.entries(importMap)) {
      for (const imported of imports) {
        const targetId = [...nodeIds].find((id) => id.startsWith(imported) || imported.startsWith(id.replace(/\.[^.]+$/, '')));
        if (targetId && targetId !== importer) {
          edges.push({
            id: `${importer}->${targetId}`,
            source: importer,
            target: targetId,
            type: 'smoothstep',
            animated: false,
            data: { relationshipType: 'import' },
          });
        }
      }
    }

    return { nodes: finalNodes, edges };
  }
};

module.exports = { buildArchitectureGraph };

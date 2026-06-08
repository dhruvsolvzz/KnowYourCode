import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.padding': '[top=60,left=60,bottom=60,right=60]',
  'elk.spacing.nodeNode': '100',
  'elk.layered.spacing.nodeNodeBetweenLayers': '140',
  'elk.edgeRouting': 'SPLINES',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};

export const getLayoutedElements = async (nodes, edges, options = {}) => {
  const isHorizontal = options?.['elk.direction'] === 'RIGHT';
  
  const graph = {
    id: 'root',
    layoutOptions: { ...elkOptions, ...options },
    children: nodes.map((node) => ({
      ...node,
      // ELK needs explicit dimensions
      width: 160,
      height: 50,
    })),
    edges: edges.map((edge) => ({
      ...edge,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children.find((n) => n.id === node.id);
      return {
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: {
          x: elkNode.x,
          y: elkNode.y,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error('ELK Layout Error:', error);
    return { nodes, edges }; // Fallback
  }
};

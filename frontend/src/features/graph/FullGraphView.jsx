import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../shared/api/axiosInstance';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  ReactFlow, MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NodeInfoPanel from './panels/NodeInfoPanel';
import EdgeInfoPanel from './panels/EdgeInfoPanel';
import { getLayoutedElements } from './elkLayout';
import AnimatedEdge from './AnimatedEdge';

/* ── Node shape config ─── matching the reference dark/ice-blue aesthetic */
const NODE_SHAPES = {
  component:  'pill',
  route:      'pill',
  controller: 'rect',
  service:    'pill',
  model:      'rect',
  database:   'pill',
  entry:      'pill',
  config:     'rect',
  default:    'pill',
};

/* ── Layer config ─────────────────────────────────────────── */
const LAYER_CONFIG = {
  component:  { color: '#b8dce8', label: 'Component' },
  route:      { color: '#b8dce8', label: 'Route'     },
  controller: { color: '#b8dce8', label: 'Controller'},
  service:    { color: '#b8dce8', label: 'Service'   },
  model:      { color: '#b8dce8', label: 'Model'     },
  database:   { color: '#b8dce8', label: 'Database'  },
  entry:      { color: '#b8dce8', label: 'Entry'     },
  config:     { color: '#b8dce8', label: 'Config'    },
  default:    { color: '#b8dce8', label: 'File'      },
};

const getLayerConfig = (nodeType) => LAYER_CONFIG[nodeType] || LAYER_CONFIG.default;
const getNodeShape = (nodeType) => NODE_SHAPES[nodeType] || 'pill';

/* ── Custom node ── sleek pill/capsule design ─────────────── */
const ArchNode = ({ data }) => {
  const cfg = getLayerConfig(data.layer || data.nodeType);
  const shape = getNodeShape(data.layer || data.nodeType);
  const isPill = shape === 'pill';

  return (
    <>
      <Handle type="target" position={Position.Top}
        style={{
          background: '#5eaac7',
          width: 7,
          height: 7,
          border: '2px solid #0d1b2a',
          borderRadius: '50%',
          boxShadow: '0 0 6px rgba(94, 170, 199, 0.5)',
        }} />
      <div
        className="graph-node-container"
        style={{
          background: isPill
            ? 'linear-gradient(135deg, rgba(20, 40, 60, 0.85), rgba(12, 28, 45, 0.9))'
            : 'linear-gradient(135deg, rgba(18, 36, 55, 0.9), rgba(10, 22, 38, 0.95))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(94, 170, 199, 0.2)',
          borderRadius: isPill ? 100 : 10,
          padding: isPill ? '10px 28px' : '10px 22px',
          minWidth: 100,
          maxWidth: 200,
          boxShadow: `
            0 0 20px rgba(94, 170, 199, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 4px 20px rgba(0, 0, 0, 0.3)
          `,
          transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <p style={{
          color: cfg.color,
          fontSize: 13,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500,
          letterSpacing: '0.02em',
          wordBreak: 'break-word',
          lineHeight: 1.4,
          margin: 0,
        }}>
          {data.label}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{
          background: '#5eaac7',
          width: 7,
          height: 7,
          border: '2px solid #0d1b2a',
          borderRadius: '50%',
          boxShadow: '0 0 6px rgba(94, 170, 199, 0.5)',
        }} />
    </>
  );
};

const nodeTypes = { archNode: ArchNode };
const edgeTypes = { animated: AnimatedEdge };

/* ── Map raw backend nodes → React Flow nodes ────────────── */
const mapNodes = (rawNodes) =>
  rawNodes.map((node) => ({
    id: node.id,
    type: 'archNode',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: (node.data?.label || node.id || '').split('/').pop(),
      layer: node.data?.layer || node.type || 'default',
      nodeType: node.type || 'default',
      role: node.data?.metadata?.role || '',
      filePath: node.data?.filePath || node.id,
    },
  }));

/* ── Map raw backend edges → React Flow edges ────────────── */
const mapEdges = (rawEdges) =>
  rawEdges.map((edge, i) => {
    const relType = edge.data?.relationshipType || edge.label || '';
    const isDotted = ['query', 'imports', 'uses', 'references', 'calls'].includes(relType.toLowerCase());
    return {
      id: edge.id || `e-${i}`,
      source: edge.source,
      target: edge.target,
      type: 'animated',
      animated: false,
      label: relType || '',
      data: { ...edge.data, edgeStyle: isDotted ? 'dotted' : 'solid' },
      style: {
        stroke: '#5eaac7',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#5eaac7',
        width: 12,
        height: 12,
      },
    };
  });

/* ── Smart node filter ── only keep meaningful source files ── */
const NOISE_FILENAMES = new Set([
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'tsconfig.json', 'tsconfig.build.json', 'jsconfig.json',
  '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs',
  '.prettierrc', '.prettierrc.js', '.prettierrc.json',
  '.babelrc', 'babel.config.js', 'babel.config.json',
  'webpack.config.js', 'webpack.config.ts',
  'rollup.config.js', 'rollup.config.ts',
  'vite.config.js', 'vite.config.ts',
  'jest.config.js', 'jest.config.ts',
  '.gitignore', '.gitattributes', '.npmignore', '.npmrc',
  '.editorconfig', '.env', '.env.example', '.env.local',
  'LICENSE', 'LICENSE.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
  'Makefile', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'README.md', 'readme.md',
]);

const NOISE_PATTERNS = [
  /node_modules\//i,
  /\.d\.ts$/i,
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /__tests__\//i,
  /__mocks__\//i,
  /\.stories\.(js|ts|jsx|tsx)$/i,
  /dist\//i,
  /build\//i,
  /\.next\//i,
  /coverage\//i,
  /\.cache\//i,
  /\.git\//i,
  /\.vscode\//i,
  /\.idea\//i,
];

const isImportantNode = (node) => {
  const id = node.id || '';
  const filePath = node.data?.filePath || id;
  const label = (node.data?.label || id || '').split('/').pop();
  if (id.startsWith('route-') || id === 'mongodb' || id === 'redux-store') return true;
  if (NOISE_FILENAMES.has(label)) return false;
  if (NOISE_PATTERNS.some(p => p.test(filePath))) return false;
  if (label.startsWith('.') && !label.startsWith('..')) return false;
  return true;
};

const filterGraph = (nodes, edges) => {
  const filteredNodes = nodes.filter(isImportantNode);
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  return { nodes: filteredNodes, edges: filteredEdges };
};

/* ── Legend ──────────────────────────────────────────────── */
const Legend = ({ visibleLayers }) => (
  <div style={{
    background: 'rgba(10, 18, 30, 0.7)',
    border: '1px solid rgba(94, 170, 199, 0.12)',
    borderRadius: 14,
    padding: '14px 18px',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  }}>
    <p style={{
      color: 'rgba(94, 170, 199, 0.6)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      margin: '0 0 10px 0',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      Layers
    </p>
    {Object.entries(LAYER_CONFIG)
      .filter(([key]) => key !== 'default' && visibleLayers.has(key))
      .map(([key, cfg]) => (
        <div key={key} className="flex items-center gap-3 mb-2 last:mb-0">
          <span style={{
            width: 8,
            height: 8,
            borderRadius: getNodeShape(key) === 'pill' ? 8 : 2,
            background: 'rgba(94, 170, 199, 0.3)',
            border: '1px solid rgba(94, 170, 199, 0.5)',
            display: 'inline-block',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(94, 170, 199, 0.2)',
          }} />
          <span style={{
            color: '#7ec8e3',
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.02em',
          }}>
            {cfg.label}
          </span>
        </div>
      ))}
  </div>
);

/* ── Stats bar ───────────────────────────────────────────── */
const StatsBar = ({ nodes, edges, searchQuery, setSearchQuery }) => (
  <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 p-3 rounded-2xl"
    style={{
      background: 'rgba(10, 18, 30, 0.75)',
      border: '1px solid rgba(94, 170, 199, 0.1)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
    <div className="flex items-center gap-4 px-2 text-sm" style={{ color: 'rgba(94, 170, 199, 0.5)' }}>
      <span className="flex items-center gap-1.5">
        <span style={{ color: '#5eaac7', fontWeight: 700, background: 'rgba(94, 170, 199, 0.08)', padding: '2px 8px', borderRadius: 8, border: '1px solid rgba(94, 170, 199, 0.15)', fontSize: 12 }}>{nodes.length}</span> nodes
      </span>
      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(94, 170, 199, 0.2)', display: 'inline-block' }} />
      <span className="flex items-center gap-1.5">
        <span style={{ color: '#5eaac7', fontWeight: 700, background: 'rgba(94, 170, 199, 0.08)', padding: '2px 8px', borderRadius: 8, border: '1px solid rgba(94, 170, 199, 0.15)', fontSize: 12 }}>{edges.length}</span> edges
      </span>
    </div>
    <input
      type="text"
      placeholder="Search nodes..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        background: 'rgba(10, 18, 30, 0.6)',
        border: '1px solid rgba(94, 170, 199, 0.12)',
        borderRadius: 10,
        padding: '6px 12px',
        fontSize: 13,
        color: '#b8dce8',
        fontFamily: "'Inter', system-ui, sans-serif",
        outline: 'none',
      }}
    />
  </div>
);

/* ── Main component ──────────────────────────────────────── */
const FullGraphView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [graphError, setGraphError] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isReplaying, setIsReplaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await axiosInstance.get(`/graph/${id}/architecture`);
        const data = res.data.data;
        const mn = mapNodes(data.nodes || []);
        const me = mapEdges(data.edges || []);
        const { nodes: filteredNodes, edges: filteredEdges } = filterGraph(mn, me);
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(filteredNodes, filteredEdges, { 'elk.direction': 'DOWN' });
        if (layoutedNodes.length === 0) {
          setGraphError('Graph is empty — the repository may not have been analysed yet.');
        } else {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
        }
      } catch {
        setGraphError('Failed to fetch graph data.');
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [id, setNodes, setEdges]);

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const onEdgeClick = (event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const startReplay = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setReplayIndex(0);
    setIsReplaying(true);
  };

  useEffect(() => {
    if (isReplaying && edges.length > 0) {
      if (replayIndex >= edges.length) {
        setIsReplaying(false);
        setReplayIndex(-1);
        return;
      }
      const timer = setTimeout(() => {
        setSelectedEdge(edges[replayIndex]);
        setReplayIndex(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isReplaying, replayIndex, edges]);

  const styledNodes = useMemo(() => {
    if (!selectedNode && !selectedEdge && !searchQuery) return nodes;
    
    let connectedNodeIds = new Set();
    const query = searchQuery.toLowerCase();

    if (searchQuery) {
      nodes.forEach(node => {
        if (node.data.label.toLowerCase().includes(query)) {
          connectedNodeIds.add(node.id);
          edges.forEach(edge => {
            if (edge.source === node.id) connectedNodeIds.add(edge.target);
            if (edge.target === node.id) connectedNodeIds.add(edge.source);
          });
        }
      });
    } else if (selectedNode) {
      connectedNodeIds.add(selectedNode.id);
      edges.forEach(edge => {
        if (edge.source === selectedNode.id) connectedNodeIds.add(edge.target);
        if (edge.target === selectedNode.id) connectedNodeIds.add(edge.source);
      });
    } else if (selectedEdge) {
      connectedNodeIds.add(selectedEdge.source);
      connectedNodeIds.add(selectedEdge.target);
    }

    return nodes.map(node => {
      const isConnected = connectedNodeIds.has(node.id);
      return {
        ...node,
        data: { ...node.data, isDimmed: !isConnected },
        style: {
          ...node.style,
          transition: "all 0.3s ease-in-out",
          opacity: isConnected ? 1 : 0.15,
          filter: isConnected ? "none" : "blur(3px)",
        }
      };
    });
  }, [nodes, edges, selectedNode, selectedEdge, searchQuery]);

  const styledEdges = useMemo(() => {
    if (!selectedNode && !selectedEdge && !searchQuery) return edges;
    
    const query = searchQuery.toLowerCase();
    const matchingNodeIds = new Set(
      searchQuery ? nodes.filter(n => n.data.label.toLowerCase().includes(query)).map(n => n.id) : []
    );

    return edges.map(edge => {
      let isConnected = false;
      if (searchQuery) {
        isConnected = matchingNodeIds.has(edge.source) || matchingNodeIds.has(edge.target);
      } else if (selectedNode) {
        isConnected = edge.source === selectedNode.id || edge.target === selectedNode.id;
      } else if (selectedEdge) {
        isConnected = edge.id === selectedEdge.id;
      }
      return {
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: isConnected ? 2.5 : 1.5,
          stroke: isConnected ? '#7ec8e3' : 'rgba(94, 170, 199, 0.12)',
          opacity: isConnected ? 1 : 0.15,
        },
        animated: false,
      };
    });
  }, [edges, nodes, selectedNode, selectedEdge, searchQuery]);

  const visibleLayers = new Set(nodes.map(n => n.data?.layer || n.data?.nodeType || 'default'));

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center"
        style={{ background: '#0a0f1a' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#5eaac7' }} />
      </div>
    );
  }

  if (graphError) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: '#0a0f1a' }}>
        <AlertCircle className="w-12 h-12 mb-4" style={{ color: '#e85d5d' }} />
        <h2 style={{ fontSize: 20, color: '#b8dce8', fontWeight: 600, marginBottom: 8 }}>Error</h2>
        <p style={{ color: 'rgba(94, 170, 199, 0.5)' }}>{graphError}</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative" style={{ background: '#0a0f1a' }}>
      <StatsBar nodes={nodes} edges={edges} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(15, 35, 55, 0.6) 0%, #0a0f1a 70%)',
        }}
      >
        <Controls
          className="graph-controls"
          style={{
            background: 'rgba(10, 18, 30, 0.7)',
            border: '1px solid rgba(94, 170, 199, 0.12)',
            borderRadius: 12,
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        />
        <MiniMap
          nodeColor={() => '#5eaac7'}
          maskColor="rgba(6, 12, 22, 0.75)"
          style={{
            background: 'rgba(10, 18, 30, 0.7)',
            border: '1px solid rgba(94, 170, 199, 0.12)',
            borderRadius: 14,
            backdropFilter: 'blur(12px)',
          }}
        />
        <Background color="rgba(94, 170, 199, 0.04)" gap={40} size={1} />
        <Panel position="top-right">
          <Legend visibleLayers={visibleLayers} />
        </Panel>
      </ReactFlow>

      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={startReplay}
          disabled={isReplaying}
          style={{
            background: isReplaying ? 'rgba(94, 170, 199, 0.1)' : 'rgba(94, 170, 199, 0.15)',
            border: '1px solid rgba(94, 170, 199, 0.3)',
            color: isReplaying ? 'rgba(94, 170, 199, 0.4)' : '#b8dce8',
            padding: '10px 20px',
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: isReplaying ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 20px rgba(94, 170, 199, 0.1)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isReplaying ? 'Replaying Flow...' : 'Replay Flow'}
        </button>
      </div>

      {selectedNode && !isReplaying && (
        <NodeInfoPanel 
          repoId={id} 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
        />
      )}

      {selectedEdge && (
        <EdgeInfoPanel
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  );
};

export default FullGraphView;

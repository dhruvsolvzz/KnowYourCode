import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axiosInstance from '../../shared/api/axiosInstance';
import { useAuth } from '../../shared/context/AuthContext';
import {
  Network, Loader2, Link2, AlertCircle, CheckCircle2,
  ChevronDown, ExternalLink, RefreshCw, Sparkles, Zap, Send, FolderTree,
} from 'lucide-react';
import {
  ReactFlow, MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NodeInfoPanel from './panels/NodeInfoPanel';
import EdgeInfoPanel from './panels/EdgeInfoPanel';
import FlowControlPanel from './FlowControlPanel';
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

/* ── URL helpers ─────────────────────────────────────────── */
const parseGithubUrl = (raw) => {
  try {
    const url = new URL(raw.trim().replace(/\.git$/, ''));
    const parts = url.pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (url.hostname !== 'github.com' || parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`.toLowerCase();
  } catch { return null; }
};

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

  // Always keep special non-file nodes (e.g. mongodb, redux-store, route-*)
  if (id.startsWith('route-') || id === 'mongodb' || id === 'redux-store') return true;

  // Filter out known noise filenames
  if (NOISE_FILENAMES.has(label)) return false;

  // Filter out noise patterns in file path
  if (NOISE_PATTERNS.some(p => p.test(filePath))) return false;

  // Filter out hidden/dotfiles (but not paths containing dot-folders)
  if (label.startsWith('.') && !label.startsWith('..')) return false;

  return true;
};

/** Filter a graph to only keep important nodes and their connected edges */
const filterGraph = (nodes, edges) => {
  const filteredNodes = nodes.filter(isImportantNode);
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  return { nodes: filteredNodes, edges: filteredEdges };
};

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
      role: node.data?.metadata?.role || node.data?.metadata?.action || '',
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
      marginBottom: 10,
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
const StatsBar = ({ nodes, edges, repoName, searchQuery, setSearchQuery }) => (
  <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 p-3 rounded-2xl"
    style={{
      background: 'rgba(10, 18, 30, 0.75)',
      border: '1px solid rgba(94, 170, 199, 0.1)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
    <div className="flex items-center gap-4 px-2 text-sm" style={{ color: 'rgba(94, 170, 199, 0.5)' }}>
      <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, color: '#b8dce8', letterSpacing: '-0.01em' }}>{repoName}</span>
      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(94, 170, 199, 0.2)', display: 'inline-block' }} />
      <span className="flex items-center gap-1.5">
        <span style={{ color: '#5eaac7', fontWeight: 700, background: 'rgba(94, 170, 199, 0.08)', padding: '2px 8px', borderRadius: 8, border: '1px solid rgba(94, 170, 199, 0.15)', fontSize: 12 }}>{nodes.length}</span> nodes
      </span>
      <span className="flex items-center gap-1.5">
        <span style={{ color: '#5eaac7', fontWeight: 700, background: 'rgba(94, 170, 199, 0.08)', padding: '2px 8px', borderRadius: 8, border: '1px solid rgba(94, 170, 199, 0.15)', fontSize: 12 }}>{edges.length}</span> edges
      </span>
    </div>
    {setSearchQuery && (
      <input
        type="text"
        placeholder="Search nodes..."
        value={searchQuery || ''}
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
    )}
  </div>
);

/* ── Tab pill ─────────────────────────────────────────────── */
const Tab = ({ active, onClick, icon: Icon, label, accent }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
      active
        ? accent === 'violet'
          ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
          : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

/* ── ReactFlow canvas helper ─────────────────────────────── */
const GraphCanvas = ({ nodes, edges, onNodesChange, onEdgesChange, onNodeClick, onEdgeClick, loading, selectedNode, selectedEdge, searchQuery }) => {
  const visibleLayers = new Set(nodes.map(n => n.data?.layer || n.data?.nodeType || 'default'));

  const styledNodes = useMemo(() => {
    if (!selectedNode && !selectedEdge && !searchQuery) return nodes;
    
    let connectedNodeIds = new Set();
    const query = (searchQuery || '').toLowerCase();

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
          opacity: isConnected ? 1 : 0.2,
          filter: isConnected ? "none" : "blur(3px)",
        }
      };
    });
  }, [nodes, edges, selectedNode, selectedEdge, searchQuery]);

  const styledEdges = useMemo(() => {
    if (!selectedNode && !selectedEdge && !searchQuery) return edges;
    
    const query = (searchQuery || '').toLowerCase();
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

  return (
    <div className="flex-1 relative z-0 graph-canvas-wrapper">
      {nodes.length > 0 ? (
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
          fitViewOptions={{ padding: 0.25 }}
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
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(15, 35, 55, 0.4) 0%, #0a0f1a 70%)' }}>
          {loading ? (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(94, 170, 199, 0.08)',
                border: '1px solid rgba(94, 170, 199, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(94, 170, 199, 0.1)',
              }}>
                <Loader2 className="w-9 h-9 animate-spin" style={{ color: '#5eaac7' }} />
              </div>
              <p style={{ color: '#5eaac7', fontSize: 16, fontWeight: 500, letterSpacing: '0.04em' }}>
                Synthesizing graph…
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'rgba(94, 170, 199, 0.05)',
                border: '1px solid rgba(94, 170, 199, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles className="w-10 h-10" style={{ color: 'rgba(94, 170, 199, 0.4)' }} />
              </div>
              <p style={{
                color: 'rgba(94, 170, 199, 0.5)',
                fontSize: 15,
                fontWeight: 500,
                textAlign: 'center',
                maxWidth: 360,
                letterSpacing: '0.03em',
                lineHeight: 1.6,
              }}>
                Connect a workspace above and run the analysis to visualize its graph.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main component ──────────────────────────────────────── */
const GraphView = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab]   = useState('architecture'); // 'architecture' | 'flow'
  const [repoUrl, setRepoUrl]       = useState('');
  const [repos, setRepos]           = useState([]);
  const [resolved, setResolved]     = useState(null);
  const [resolveError, setResolveError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Architecture tab state
  const [archLoading, setArchLoading]   = useState(false);
  const [archError, setArchError]       = useState('');
  const [archNodes, setArchNodes, onArchNodesChange] = useNodesState([]);
  const [archEdges, setArchEdges, onArchEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isReplaying, setIsReplaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Flow tab state
  const [flowQuery, setFlowQuery]     = useState('');
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowError, setFlowError]     = useState('');
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState([]);
  const [flowData, setFlowData]       = useState(null); // full Gemini analysis

  // Structure tab state
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError]     = useState('');
  const [structureNodes, setStructureNodes, onStructureNodesChange] = useNodesState([]);
  const [structureEdges, setStructureEdges, onStructureEdgesChange] = useEdgesState([]);

  /* load repos */
  useEffect(() => {
    if (!user) return;
    axiosInstance.get('/repositories?limit=100')
      .then(r => setRepos(r.data.data?.repositories || []))
      .catch(() => {});
  }, [user]);

  /* resolve URL → repo id */
  useEffect(() => {
    setResolved(null); setResolveError('');
    if (!repoUrl.trim()) return;
    const slug = parseGithubUrl(repoUrl);
    if (!slug) { setResolveError('Enter a valid GitHub URL, e.g. https://github.com/owner/repo'); return; }
    const match = repos.find(r => `${r.owner}/${r.name}`.toLowerCase() === slug);
    if (match) setResolved({ id: match._id, name: match.name, owner: match.owner });
    else if (repos.length > 0)
      setResolveError(`"${slug}" not found. Add it from the Repositories page first.`);
  }, [repoUrl, repos]);

  /* fetch architecture graph */
  const fetchArchGraph = async (e) => {
    e?.preventDefault();
    if (!resolved) return;
    setArchLoading(true); setArchError(''); setArchNodes([]); setArchEdges([]); setSelectedNode(null);
    try {
      const res = await axiosInstance.get(`/graph/${resolved.id}/architecture`);
      const data = res.data.data;
      const mn = mapNodes(data.nodes || []);
      const me = mapEdges(data.edges || []);
      const { nodes: filteredNodes, edges: filteredEdges } = filterGraph(mn, me);
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(filteredNodes, filteredEdges, { 'elk.direction': 'DOWN' });
      if (layoutedNodes.length === 0) setArchError('Graph is empty — the repository may not have been analysed yet.');
      else { setArchNodes(layoutedNodes); setArchEdges(layoutedEdges); }
    } catch {
      setArchError('Failed to fetch graph. Make sure the repository is fully analysed.');
    } finally {
      setArchLoading(false);
    }
  };

  /* fetch flow graph */
  const fetchFlowGraph = async (e) => {
    e?.preventDefault();
    if (!resolved || !flowQuery.trim()) return;
    setFlowLoading(true); setFlowError(''); setFlowNodes([]); setFlowEdges([]); setFlowData(null);
    try {
      const res = await axiosInstance.post(`/graph/${resolved.id}/data-flow`, { query: flowQuery });
      const data = res.data.data;
      const mn = mapNodes(data.nodes || []);
      const me = mapEdges(data.edges || []);
      const { nodes: filteredNodes, edges: filteredEdges } = filterGraph(mn, me);
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(filteredNodes, filteredEdges, { 'elk.direction': 'DOWN' });
      if (layoutedNodes.length === 0) setFlowError('No data flow found for this query.');
      else { setFlowNodes(layoutedNodes); setFlowEdges(layoutedEdges); }
      // Store the full Gemini analysis for the FlowControlPanel
      setFlowData({
        description: data.description || '',
        entryPoint: data.entryPoint || '',
        flowSteps: data.flowSteps || [],
        dataTransformations: data.dataTransformations || [],
      });
      if (mn.length === 0 && !data.description) {
        setFlowError('No flow data returned. Try a more specific query like "user login flow".');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to generate flow analysis.';
      setFlowError(msg);
    } finally {
      setFlowLoading(false);
    }
  };

  /* fetch structure graph */
  const fetchStructureGraph = async (e) => {
    e?.preventDefault();
    if (!resolved) return;
    setStructureLoading(true); setStructureError(''); setStructureNodes([]); setStructureEdges([]); setSelectedNode(null);
    try {
      const res = await axiosInstance.get(`/graph/${resolved.id}/structure`);
      const data = res.data.data;
      const mn = mapNodes(data.nodes || []);
      const me = mapEdges(data.edges || []);
      const { nodes: filteredNodes, edges: filteredEdges } = filterGraph(mn, me);
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(filteredNodes, filteredEdges, { 'elk.direction': 'RIGHT' });
      if (layoutedNodes.length === 0) setStructureError('Graph is empty — no folder structure found.');
      else { setStructureNodes(layoutedNodes); setStructureEdges(layoutedEdges); }
    } catch {
      setStructureError('Failed to fetch directory structure.');
    } finally {
      setStructureLoading(false);
    }
  };

  /* open graph in new window */
  const openInNewWindow = useCallback(() => {
    if (resolved?.id) window.open(`/graph/full/${resolved.id}`, '_blank');
  }, [resolved]);

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const onEdgeClick = (_, edge) => {
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
    let currentEdges = archEdges;
    if (activeTab === 'flow') currentEdges = flowEdges;
    if (activeTab === 'structure') currentEdges = structureEdges;

    if (isReplaying && currentEdges.length > 0) {
      if (replayIndex >= currentEdges.length) {
        setIsReplaying(false);
        setReplayIndex(-1);
        return;
      }
      const timer = setTimeout(() => {
        setSelectedEdge(currentEdges[replayIndex]);
        setReplayIndex(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isReplaying, replayIndex, activeTab, archEdges, flowEdges, structureEdges]);

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsReplaying(false);
    setReplayIndex(-1);
  }, [activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-8 max-w-[1600px] mx-auto w-full gap-6">

      {/* Header */}
      <div className="flex items-start justify-between mt-2">
        <div>
          <h1 className="text-4xl font-extrabold text-white flex items-center gap-4 tracking-tight">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Network className="w-6 h-6 text-indigo-400" />
            </div>
            Architecture Graph
          </h1>
          <p className="text-zinc-400 text-lg mt-3 max-w-2xl">
            Visualise component layers, data flow, and module relationships in a high-fidelity interactive map.
          </p>
        </div>
        {archNodes.length > 0 && activeTab === 'architecture' && (
          <button
            onClick={openInNewWindow}
            title="Open in new window"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5
                       text-zinc-300 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/20
                       transition-all text-sm font-semibold shadow-lg backdrop-blur-sm"
          >
            <ExternalLink className="w-4 h-4" /> Full Screen
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-3">
        <Tab
          active={activeTab === 'architecture'}
          onClick={() => setActiveTab('architecture')}
          icon={Network}
          label="Architecture"
          accent="indigo"
        />
        <Tab
          active={activeTab === 'flow'}
          onClick={() => setActiveTab('flow')}
          icon={Zap}
          label="Flow Analysis"
          accent="violet"
        />
        <Tab
          active={activeTab === 'structure'}
          onClick={() => setActiveTab('structure')}
          icon={FolderTree}
          label="Directory Structure"
          accent="indigo"
        />
        {(archNodes.length > 0 || flowNodes.length > 0 || structureNodes.length > 0) && (
          <div className="ml-auto flex items-center">
            <button
              onClick={startReplay}
              disabled={isReplaying || (activeTab === 'architecture' ? archEdges.length === 0 : flowEdges.length === 0)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-zinc-500 text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all"
            >
              {isReplaying ? 'Replaying Flow...' : 'Replay Flow'}
            </button>
          </div>
        )}
      </div>

      {/* ── Repo picker row ─────────────────────────────────── */}
      <form
        onSubmit={activeTab === 'architecture' ? fetchArchGraph : activeTab === 'structure' ? fetchStructureGraph : fetchFlowGraph}
        className="flex gap-4 max-w-4xl relative z-20"
      >
        <div className="flex-1 relative">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
          <input
            id="repo-url-input"
            type="url"
            placeholder="https://github.com/owner/repository"
            value={repoUrl}
            onChange={e => { setRepoUrl(e.target.value); setShowDropdown(false); }}
            className={`w-full bg-black/40 border rounded-2xl pl-12 pr-12 py-3.5 text-zinc-200 backdrop-blur-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-base shadow-[0_8px_30px_rgba(0,0,0,0.2)]
              ${resolveError ? 'border-red-500/50 focus:border-red-500/50' : resolved ? 'border-emerald-500/50 focus:border-emerald-500/50' : 'border-white/10 focus:border-indigo-500/50'}`}
          />
          {resolved && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
          {resolveError && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />}
        </div>

        {activeTab === 'architecture' ? (
          <>
            <button type="submit" disabled={archLoading || !resolved}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 text-base shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]">
              {archLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Network className="w-5 h-5" />}
              Visualize
            </button>
            {archNodes.length > 0 && (
              <button type="button" onClick={fetchArchGraph} title="Re-fetch"
                className="px-4 py-3.5 rounded-2xl border border-white/10 bg-black/40 text-zinc-400 backdrop-blur-sm
                           hover:text-white hover:border-white/20 transition-all shrink-0 shadow-lg hover:shadow-xl">
                <RefreshCw className={`w-5 h-5 ${archLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </>
        ) : activeTab === 'structure' ? (
          <>
            <button type="submit" disabled={structureLoading || !resolved}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 text-base shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]">
              {structureLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderTree className="w-5 h-5" />}
              Visualize
            </button>
            {structureNodes.length > 0 && (
              <button type="button" onClick={fetchStructureGraph} title="Re-fetch"
                className="px-4 py-3.5 rounded-2xl border border-white/10 bg-black/40 text-zinc-400 backdrop-blur-sm
                           hover:text-white hover:border-white/20 transition-all shrink-0 shadow-lg hover:shadow-xl">
                <RefreshCw className={`w-5 h-5 ${structureLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </>
        ) : null}
      </form>

      {/* Flow query row */}
      {activeTab === 'flow' && (
        <form onSubmit={fetchFlowGraph} className="flex gap-4 max-w-4xl -mt-3 relative z-20">
          <div className="flex-1 relative">
            <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500 pointer-events-none" />
            <input
              id="flow-query-input"
              type="text"
              placeholder='e.g. "How does user login work?" or "Trace the payment flow"'
              value={flowQuery}
              onChange={e => setFlowQuery(e.target.value)}
              className="w-full bg-black/40 border border-violet-500/30 rounded-2xl pl-12 pr-6 py-3.5 text-zinc-200 backdrop-blur-sm
                         focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-base
                         placeholder:text-zinc-600 shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
            />
          </div>
          <button
            type="submit"
            disabled={flowLoading || !resolved || !flowQuery.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 text-base
                       shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
          >
            {flowLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Analyze Flow
          </button>
        </form>
      )}

      {/* Status feedback */}
      <div className="flex flex-col gap-2 -mt-3 mb-1 ml-2">
        {resolved && (
          <p className="text-sm text-emerald-400 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Workspace matched: <span className="font-bold font-mono tracking-tight bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{resolved.owner}/{resolved.name}</span>
          </p>
        )}
        {resolveError && (
          <p className="text-sm text-red-400 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4" /> {resolveError}
          </p>
        )}
        {(activeTab === 'architecture' ? archError : activeTab === 'flow' ? flowError : structureError) && (
          <p className="text-sm text-amber-400 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 font-medium max-w-max backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {activeTab === 'architecture' ? archError : activeTab === 'flow' ? flowError : structureError}
          </p>
        )}
      </div>

      {/* Repo picker dropdown */}
      {repos.length > 0 && (
        <div className="max-w-4xl -mt-4 mb-2 ml-2 relative z-30">
          <button
            type="button"
            onClick={() => setShowDropdown(v => !v)}
            className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            Select from Workspaces
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-3 w-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {repos.map(r => (
                <button key={r._id} type="button"
                  onClick={() => { setRepoUrl(r.url || `https://github.com/${r.owner}/${r.name}`); setShowDropdown(false); }}
                  className="w-full text-left px-5 py-3.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white
                             transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group">
                  <span className="font-mono text-sm tracking-tight">{r.owner}/<span className="font-bold group-hover:text-indigo-400 transition-colors">{r.name}</span></span>
                  <span className={`text-xs px-3 py-1 font-bold uppercase tracking-widest rounded-full border ${
                    r.analysisStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>{r.analysisStatus}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Graph canvas ─────────────────────────────────────── */}
      <div className="flex-1 rounded-3xl overflow-hidden relative flex min-h-0"
        style={{
          background: '#0a0f1a',
          border: '1px solid rgba(94, 170, 199, 0.08)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(94, 170, 199, 0.03)',
        }}>

        {/* Architecture tab */}
        {activeTab === 'architecture' && (
          <>
            {archNodes.length > 0 && (
              <StatsBar 
                nodes={archNodes} 
                edges={archEdges} 
                repoName={`${resolved?.owner}/${resolved?.name}`}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery} 
              />
            )}
            <div className="flex-1 flex flex-col">
              <GraphCanvas
                nodes={archNodes}
                edges={archEdges}
                onNodesChange={onArchNodesChange}
                onEdgesChange={onArchEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                loading={archLoading}
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                searchQuery={searchQuery}
              />
            </div>
            {/* AI file-explain panel */}
            {selectedNode && !isReplaying && (
              <NodeInfoPanel
                repoId={resolved?.id}
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
          </>
        )}

        {/* Flow tab */}
        {activeTab === 'flow' && (
          <>
            {flowNodes.length > 0 && (
              <StatsBar nodes={flowNodes} edges={flowEdges} repoName={`${resolved?.owner}/${resolved?.name}`} />
            )}
            {/* Split: graph left, FlowControlPanel right */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col">
                <GraphCanvas
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodesChange={onFlowNodesChange}
                  onEdgesChange={onFlowEdgesChange}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  loading={flowLoading}
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                />
              </div>
              {/* Only show panel when we have AI data */}
              {(flowData || flowLoading) && (
                <FlowControlPanel
                  data={flowData}
                  query={flowQuery}
                  loading={flowLoading}
                />
              )}
            </div>
            {selectedNode && !isReplaying && (
              <NodeInfoPanel
                repoId={resolved?.id}
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
          </>
        )}

        {/* Structure tab */}
        {activeTab === 'structure' && (
          <>
            {structureNodes.length > 0 && (
              <StatsBar 
                nodes={structureNodes} 
                edges={structureEdges} 
                repoName={`${resolved?.owner}/${resolved?.name}`}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery} 
              />
            )}
            <div className="flex-1 flex flex-col">
              <GraphCanvas
                nodes={structureNodes}
                edges={structureEdges}
                onNodesChange={onStructureNodesChange}
                onEdgesChange={onStructureEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                loading={structureLoading}
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                searchQuery={searchQuery}
              />
            </div>
            {selectedNode && !isReplaying && (
              <NodeInfoPanel
                repoId={resolved?.id}
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
          </>
        )}
      </div>
    </div>
  );
};

export default GraphView;

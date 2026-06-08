import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../shared/api/axiosInstance';
import {
  FolderGit2, ArrowLeft, GitCommit, Code2, FolderTree,
  Star, GitFork, FileCode2, ChevronRight, AlertCircle, Loader2, RefreshCw,
  ExternalLink, Github, Network
} from 'lucide-react';

/* ─── tiny helpers ─────────────────────────────────────────── */
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n);

const LANG_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', CSS: '#563d7c', HTML: '#e34c26',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', default: '#6366f1',
};

const statusStyle = (s) => ({
  completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  processing: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] animate-pulse',
  failed:     'bg-red-500/10  border-red-500/20  text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
})[s] || 'bg-white/5 border-white/10 text-zinc-400';

/* ─── sub-components ────────────────────────────────────────── */
const Card = ({ children, className = '' }) => (
  <div className={`glass-card rounded-3xl p-7 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, color, children }) => (
  <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6 tracking-tight">
    <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center border border-white/5`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    {children}
  </h3>
);

/* Languages card */
const LanguagesCard = ({ languages }) => {
  if (!languages?.length) return (
    <Card className="h-full">
      <SectionTitle icon={Code2} color="text-indigo-400">Languages</SectionTitle>
      <div className="flex flex-col items-center justify-center h-40 text-zinc-500 border border-dashed border-white/10 rounded-2xl bg-black/20">
        <Code2 className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm font-medium">No language data yet</p>
      </div>
    </Card>
  );

  const total = languages.reduce((s, l) => s + (l.bytes || 0), 0);

  return (
    <Card className="h-full">
      <SectionTitle icon={Code2} color="text-indigo-400">Languages</SectionTitle>
      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-3 mb-6 bg-black/40 shadow-inner">
        {languages.map((l) => (
          <div
            key={l.name}
            style={{
              width: `${l.percentage ?? (l.bytes / total * 100)}%`,
              backgroundColor: LANG_COLORS[l.name] || LANG_COLORS.default,
            }}
            className="transition-all duration-500 hover:brightness-110"
            title={`${l.name}: ${l.percentage ?? (total ? +(l.bytes / total * 100).toFixed(1) : 0)}%`}
          />
        ))}
      </div>
      <ul className="space-y-3">
        {languages.map((l) => {
          const pct = l.percentage ?? (total ? +(l.bytes / total * 100).toFixed(1) : 0);
          return (
            <li key={l.name} className="flex items-center justify-between text-sm group">
              <span className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shadow-sm group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: LANG_COLORS[l.name] || LANG_COLORS.default }}
                />
                <span className="text-zinc-300 font-medium">{l.name}</span>
              </span>
              <span className="text-zinc-500 font-mono text-xs">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

/* Commits card */
const CommitsCard = ({ repoId }) => {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get(`/repositories/${repoId}/commits?limit=5`)
      .then(r => setCommits(r.data.commits || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repoId]);

  return (
    <Card className="h-full">
      <SectionTitle icon={GitCommit} color="text-cyan-400">Recent Commits</SectionTitle>
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-3 text-zinc-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading commits…
        </div>
      ) : commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-zinc-500 border border-dashed border-white/10 rounded-2xl bg-black/20">
          <GitCommit className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">No commits recorded yet</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {commits.map((c, i) => (
            <li key={c._id || c.sha} className="relative pl-6">
              {/* Timeline dot and line */}
              <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500/40 border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)] z-10" />
              {i < commits.length - 1 && (
                <div className="absolute left-1 top-3.5 bottom-[-20px] w-0.5 bg-white/5" />
              )}
              
              <p className="text-zinc-200 text-sm font-medium leading-relaxed line-clamp-2 hover:text-white transition-colors">{c.message}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                {c.author?.username && <span className="flex items-center gap-1 font-medium text-zinc-400">@{c.author.username}</span>}
                {c.timestamp && (
                  <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                )}
                {c.sha && (
                  <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-zinc-400 border border-white/5">{c.sha.slice(0, 7)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/* Folder structure card */
const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', 'coverage', '__pycache__', '.vscode']);

const FolderCard = ({ repoId }) => {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get(`/repositories/${repoId}/structure`)
      .then(r => setStructure(r.data.data?.folderStructure))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repoId]);

  const renderNode = (node, depth = 0, maxItems = 15) => {
    if (!node) return null;

    // Handle the root node — render its children directly
    const children = node.children || [];
    const filtered = children.filter(c => !IGNORED_DIRS.has(c.name));

    // Sort: directories first, then files, alphabetically within each group
    const sorted = [...filtered].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    const visible = sorted.slice(0, maxItems);
    const remaining = sorted.length - visible.length;

    return (
      <ul className={depth > 0 ? 'ml-5 border-l border-white/10 pl-3' : ''}>
        {visible.map((child) => {
          const isDir = child.type === 'directory';
          return (
            <li key={child.path || child.name} className="py-1">
              <span className="flex items-center gap-2.5 text-sm group cursor-default">
                {isDir
                  ? <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                  : <FileCode2 className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />}
                <span className={`font-mono text-xs ${isDir ? 'text-zinc-300 font-semibold group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-200'} transition-colors`}>
                  {child.name}
                </span>
              </span>
              {isDir && child.children?.length > 0 && depth < 2 && renderNode(child, depth + 1, 8)}
            </li>
          );
        })}
        {remaining > 0 && (
          <li className="text-xs font-mono text-zinc-600 py-1 ml-6 flex items-center gap-2">
            <div className="w-4 h-[1px] bg-white/10" />
            +{remaining} more
          </li>
        )}
      </ul>
    );
  };

  return (
    <Card className="h-full">
      <SectionTitle icon={FolderTree} color="text-emerald-400">Folder Structure</SectionTitle>
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-3 text-zinc-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading structure…
        </div>
      ) : !structure ? (
        <div className="flex flex-col items-center justify-center h-40 text-zinc-500 border border-dashed border-white/10 rounded-2xl bg-black/20">
          <FolderTree className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">Structure not yet mapped</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[300px] text-sm custom-scrollbar pr-2">{renderNode(structure)}</div>
      )}
    </Card>
  );
};

/* ─── main component ────────────────────────────────────────── */
const RepoDetails = () => {
  const { id } = useParams();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const fetchRepo = () => {
    axiosInstance.get(`/repositories/${id}`)
      .then(r => setRepo(r.data.data.repository))
      .catch(() => setError('Failed to load repository details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepo();
  }, [id]);

  const handleReanalyze = () => {
    setAnalyzing(true);
    axiosInstance.post(`/repositories/${id}/analyze`)
      .then(() => {
        // Optimistically update status to processing
        setRepo(prev => ({ ...prev, analysisStatus: 'processing' }));
        // Could poll here, but for now just wait a bit and fetch
        setTimeout(fetchRepo, 3000);
      })
      .catch(() => setError('Failed to trigger re-analysis'))
      .finally(() => setAnalyzing(false));
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[50vh] gap-3 text-zinc-500 animate-pulse font-medium tracking-wide">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> Loading workspace details…
    </div>
  );
  if (error || !repo) return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="glass-panel border-red-500/30 p-8 rounded-3xl flex items-center gap-4 text-red-400">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Error Loading Repository</h3>
          <p>{error || 'Repository not found'}</p>
        </div>
      </div>
    </div>
  );

  const stack = [
    ...(repo.detectedStack?.frontend || []),
    ...(repo.detectedStack?.backend  || []),
    ...(repo.detectedStack?.database || []),
    ...(repo.detectedStack?.testing  || []),
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full">
      {/* Back */}
      <Link
        to="/repositories"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 font-medium tracking-wide transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </div>
        Back to Workspaces
      </Link>

      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 mb-10 relative overflow-hidden group">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none transition-colors duration-700" />
        
        <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
          <div className="w-20 h-20 bg-black/40 border border-white/10 text-indigo-400 rounded-3xl flex items-center justify-center shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.3)] group-hover:border-indigo-500/30 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-500">
            <FolderGit2 className="w-10 h-10" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
              <h1 className="text-4xl font-extrabold text-white tracking-tight">{repo.name}</h1>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest-sm uppercase border w-max ${statusStyle(repo.analysisStatus)}`}>
                {(repo.analysisStatus || 'pending')}
              </span>
              <div className="md:ml-auto flex gap-3">
                <Link
                  to={`/graph/full/${id}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                >
                  <Network className="w-4 h-4" />
                  Visualize
                </Link>
                <button
                  onClick={handleReanalyze}
                  disabled={analyzing || repo.analysisStatus === 'processing'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold tracking-wide transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
                >
                  <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                  {analyzing ? 'Analyzing...' : 'Re-analyze'}
                </button>
              </div>
            </div>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-indigo-400 transition-colors text-sm font-medium mb-4"
            >
              <Github className="w-4 h-4" />
              {repo.owner}/{repo.name}
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
            {repo.description && (
              <p className="text-zinc-300 text-lg max-w-3xl leading-relaxed">{repo.description}</p>
            )}

            {/* Meta stats */}
            <div className="flex flex-wrap items-center gap-6 mt-8 text-sm font-medium text-zinc-400">
              {repo.stars > 0 && (
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
                    <Star className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-white text-lg">{fmt(repo.stars)}</span>
                  <span className="text-xs uppercase tracking-widest-sm text-zinc-500">Stars</span>
                </span>
              )}
              {repo.forks > 0 && (
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <GitFork className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="text-white text-lg">{fmt(repo.forks)}</span>
                  <span className="text-xs uppercase tracking-widest-sm text-zinc-500">Forks</span>
                </span>
              )}
              {repo.totalFiles > 0 && (
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <FileCode2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-white text-lg">{fmt(repo.totalFiles)}</span>
                  <span className="text-xs uppercase tracking-widest-sm text-zinc-500">Files</span>
                </span>
              )}
              {repo.totalCommits > 0 && (
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                    <GitCommit className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-white text-lg">{fmt(repo.totalCommits)}</span>
                  <span className="text-xs uppercase tracking-widest-sm text-zinc-500">Commits</span>
                </span>
              )}
              {repo.defaultBranch && (
                <span className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 ml-auto">
                  <GitFork className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300 font-mono text-xs">{repo.defaultBranch}</span>
                </span>
              )}
            </div>

            {/* Detected stack badges */}
            {stack.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/5">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest-sm mb-4">Detected Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {stack.map((tech) => (
                    <span
                      key={tech}
                      className="px-4 py-1.5 text-sm font-medium rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-default"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LanguagesCard languages={repo.languages} />
        <CommitsCard repoId={id} />
        <FolderCard repoId={id} />
      </div>

      {/* Important files */}
      {(() => {
        const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', 'coverage', '__pycache__', '.vscode'];
        const filteredFiles = repo.importantFiles?.filter(f => {
          const pathParts = f.path.split(/[/\\]/);
          return !pathParts.some(part => IGNORED_DIRS.includes(part));
        });

        if (!filteredFiles || filteredFiles.length === 0) return null;

        return (
          <div className="mt-8">
            <Card>
              <SectionTitle icon={FileCode2} color="text-amber-400">Key Architectural Files</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFiles.map((f) => (
                  <div key={f.path} className="flex items-start gap-3 p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all group cursor-default">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCode2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-200 font-mono text-sm truncate group-hover:text-amber-300 transition-colors">{f.path}</div>
                      {f.type && (
                        <div className="text-xs font-medium text-zinc-500 tracking-wide mt-1 uppercase">{f.type}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })()}
    </div>
  );
};

export default RepoDetails;

import React, { useState, useEffect } from 'react';
import { X, Loader2, BookOpen, Layers, Code2, BrainCircuit } from 'lucide-react';
import axiosInstance from '../../../shared/api/axiosInstance';

const NodeInfoPanel = ({ repoId, node, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!node || node.id === 'mongodb' || node.id === 'redux-store') {
        setLoading(false);
        setData(null);
        return;
    }
    
    setLoading(true);
    setError(null);
    setData(null);

    // If it's a file path node, get its explanation
    const filePath = node.data?.filePath || node.id;

    axiosInstance.post(`/ai/${repoId}/explain-file`, { filePath })
      .then(res => {
        setData(res.data.data);
      })
      .catch(() => {
        setError('Failed to load AI Learning Mode explanation for this node.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [repoId, node]);

  if (!node) return null;

  return (
    <div className="absolute top-4 right-4 z-50 w-96 max-h-[calc(100vh-32px)] bg-black/80 border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden flex flex-col pointer-events-auto">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">Learning Mode</h3>
            <p className="text-xs text-zinc-400 truncate max-w-[180px] font-mono mt-0.5" title={node.data?.label || node.id}>
              {node.data?.label || node.id}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar relative z-10 space-y-6">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)] mb-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
            <span className="text-sm font-medium tracking-wide text-zinc-400">AI is analyzing node purpose...</span>
          </div>
        ) : error ? (
           <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-zinc-400 text-sm font-medium px-4">{error}</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* What this does */}
            <div>
              <h4 className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-2.5 uppercase tracking-widest-sm">
                <BookOpen className="w-4 h-4 text-indigo-400" /> What this file does
              </h4>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  {data.purpose || 'No purpose described.'}
                </p>
              </div>
            </div>

            {/* Why it exists */}
            {data.layer && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                <span className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> Architectural Role
                </span>
                <span className="text-sm font-bold text-white capitalize tracking-tight">
                  Operates at the {data.layer} layer.
                </span>
              </div>
            )}

            {/* Inputs/Outputs */}
            {data.keyFunctions && data.keyFunctions.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-3 uppercase tracking-widest-sm">
                  <Code2 className="w-4 h-4 text-cyan-400" /> Functions & Data
                </h4>
                <ul className="space-y-3">
                  {data.keyFunctions.map((fn, i) => (
                    <li key={i} className="text-sm bg-white/5 p-4 rounded-2xl border border-white/10">
                      <span className="font-mono font-bold text-indigo-300 block mb-1.5">{fn.name}</span>
                      <span className="text-zinc-400 leading-relaxed text-xs">{fn.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-zinc-400 text-sm font-medium px-4">Static architectural node. No code analysis available.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeInfoPanel;

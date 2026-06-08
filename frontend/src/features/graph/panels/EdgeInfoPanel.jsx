import React from 'react';
import { X, ArrowRight, Database, Globe, Layers, ArrowDownUp } from 'lucide-react';

const EdgeInfoPanel = ({ edge, onClose }) => {
  if (!edge) return null;

  const data = edge.data || {};
  const isApiCall = data.relationshipType === 'api_call';
  const isDbCall = data.relationshipType === 'db_call';
  const isState = data.relationshipType === 'state_dispatch';

  return (
    <div className="absolute top-4 left-4 z-50 w-80 bg-black/80 border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">Data Flow Edge</h3>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Connection info */}
        <div className="flex flex-col gap-2 relative">
            <div className="absolute left-3 top-4 bottom-4 w-px bg-white/10" />
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="text-xs font-mono text-zinc-300 truncate" title={edge.source}>{edge.source}</div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-indigo-900 border border-indigo-500 flex items-center justify-center flex-shrink-0">
                    <ArrowDownUp className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="text-xs font-mono text-indigo-300 truncate" title={edge.target}>{edge.target}</div>
            </div>
        </div>

        {/* Payload / Context */}
        {isApiCall && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" /> API Call
                </h4>
                <div className="text-sm text-zinc-200 font-mono mb-2">{edge.label}</div>
                {data.payload && data.payload.length > 0 && (
                    <div className="mt-3">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Payload</span>
                        <div className="flex flex-wrap gap-1.5">
                            {data.payload.map((p, i) => (
                                <span key={i} className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono">{p}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {isDbCall && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  <Database className="w-3.5 h-3.5 text-emerald-400" /> Database Operation
                </h4>
                <div className="text-sm text-zinc-200 font-mono"><span className="text-emerald-400">{data.model}</span>.{data.operation}()</div>
            </div>
        )}

        {isState && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> State Update
                </h4>
                <div className="text-sm text-zinc-200 font-mono text-amber-200">{"dispatch(\"" + data.action + "\")"}</div>
            </div>
        )}

        {(!isApiCall && !isDbCall && !isState) && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-zinc-400 text-center">Static architectural link</div>
            </div>
        )}
      </div>
    </div>
  );
};

export default EdgeInfoPanel;

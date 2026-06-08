import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, ArrowRight, Code2, Info, AlertCircle } from 'lucide-react';

/* ── Layer config ─────────────────────────────────────────── */
const LAYER_CONFIG = {
  component:  { color: '#818cf8', bg: 'rgba(99,102,241,0.12)',  border: '#4f46e5', label: 'Component',  icon: '🧩' },
  route:      { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: '#059669', label: 'Route',       icon: '🔀' },
  controller: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: '#2563eb', label: 'Controller', icon: '🎮' },
  service:    { color: '#f472b6', bg: 'rgba(244,114,182,0.12)',border: '#db2777', label: 'Service',     icon: '⚙️' },
  model:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: '#d97706', label: 'Model',       icon: '📦' },
  database:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',border: '#7c3aed', label: 'Database',    icon: '🗄️' },
};

const getLayer = (layer) => LAYER_CONFIG[layer] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: '#475569', label: layer || 'Unknown', icon: '📄' };

/* ── Step Card ───────────────────────────────────────────── */
const StepCard = ({ step, transformation, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = getLayer(step.layer);

  return (
    <div className="relative">
      {/* Step */}
      <div
        className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.01]"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}33` }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: cfg.border }}
        />

        <div className="pl-5 pr-4 py-4">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-2">
            {/* Step number */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: cfg.border, color: '#fff' }}
            >
              {step.stepNumber}
            </div>

            {/* Layer badge */}
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
              style={{ color: cfg.color, background: `${cfg.border}22`, border: `1px solid ${cfg.border}44` }}
            >
              {cfg.icon} {cfg.label}
            </span>

            {/* Expand toggle */}
            <div className="ml-auto text-zinc-600 group-hover:text-zinc-400 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Title */}
          <p className="text-white font-bold text-sm leading-snug mb-1">{step.title}</p>

          {/* File */}
          <p
            className="text-xs font-mono truncate"
            style={{ color: cfg.color }}
            title={step.file}
          >
            {step.file || '—'}
          </p>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
              {/* Action */}
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Action</span>
                <p className="text-zinc-300 text-xs leading-relaxed">{step.action}</p>
              </div>

              {/* Description */}
              {step.description && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Detail</span>
                  <p className="text-zinc-400 text-xs leading-relaxed">{step.description}</p>
                </div>
              )}

              {/* Code hint */}
              {step.codeHint && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> Code Hint
                  </span>
                  <pre
                    className="text-xs p-3 rounded-xl overflow-x-auto leading-relaxed"
                    style={{ background: 'rgba(0,0,0,0.5)', color: cfg.color, border: `1px solid ${cfg.border}33` }}
                  >
                    {step.codeHint}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data transformation arrow between steps */}
      {!isLast && transformation && (
        <div className="flex items-start gap-3 my-2 ml-4 pl-2">
          <div className="flex flex-col items-center pt-1">
            <div className="w-px h-3 bg-white/10" />
            <ArrowRight className="w-4 h-4 text-zinc-600 rotate-90" />
            <div className="w-px h-3 bg-white/10" />
          </div>
          <div className="flex-1 bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-xs">
            <span className="text-zinc-400 font-medium">{transformation.what}</span>
            {transformation.how && (
              <span className="text-zinc-600 ml-2">via {transformation.how}</span>
            )}
          </div>
        </div>
      )}

      {/* Simple connector when no transformation data */}
      {!isLast && !transformation && (
        <div className="flex justify-center my-1.5">
          <div className="w-px h-6 bg-white/10" />
        </div>
      )}
    </div>
  );
};

/* ── Main FlowControlPanel ───────────────────────────────── */
const FlowControlPanel = ({ data, query }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!data) return null;

  const { description, entryPoint, flowSteps = [], dataTransformations = [] } = data;

  // Build a quick lookup: transformation between step N → N+1
  const transformMap = {};
  dataTransformations.forEach(t => {
    transformMap[t.fromStep] = t;
  });

  return (
    <div
      className={`flex flex-col bg-black/50 backdrop-blur-xl border-l border-white/10 transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-96'
      }`}
      style={{ maxHeight: '100%', overflowY: 'auto' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center justify-center w-full py-3 border-b border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
        title={collapsed ? 'Expand flow panel' : 'Collapse flow panel'}
      >
        {collapsed ? (
          <Zap className="w-5 h-5 text-violet-400" />
        ) : (
          <div className="flex items-center gap-2 w-full px-4">
            <Zap className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-sm font-bold text-white tracking-tight">Flow Control</span>
            <ChevronUp className="w-4 h-4 ml-auto" />
          </div>
        )}
      </button>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Query */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl px-4 py-3">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block mb-1">Query</span>
            <p className="text-white text-sm font-medium leading-snug">{"\"" + query + "\""}</p>
          </div>

          {/* Entry point */}
          {entryPoint && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Entry Point</span>
              <p className="text-emerald-400 text-xs font-mono font-bold truncate">{entryPoint}</p>
            </div>
          )}

          {/* AI Description */}
          {description && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> AI Narrative
              </span>
              <p className="text-zinc-300 text-xs leading-relaxed">{description}</p>
            </div>
          )}

          {/* Steps */}
          {flowSteps.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Execution Steps
                </span>
                <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                  {flowSteps.length}
                </span>
              </div>
              <div className="space-y-1">
                {flowSteps.map((step, i) => (
                  <StepCard
                    key={step.stepNumber || i}
                    step={step}
                    transformation={transformMap[step.stepNumber]}
                    isLast={i === flowSteps.length - 1}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <AlertCircle className="w-8 h-8 text-zinc-600" />
              <p className="text-zinc-500 text-sm">No step-by-step breakdown available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlowControlPanel;

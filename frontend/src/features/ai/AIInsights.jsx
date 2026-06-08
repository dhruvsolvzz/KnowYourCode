import React, { useState } from 'react';
import axiosInstance from '../../shared/api/axiosInstance';
import { Send, Bot, User, Loader2, Sparkles, Brain } from 'lucide-react';

const AIInsights = () => {
  const [repoId, setRepoId] = useState('');
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!repoId || !question.trim()) return;

    const userMessage = { role: 'user', text: question };
    setChat(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      let targetId = repoId;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(repoId);
      if (!isObjectId) {
        const lookupRes = await axiosInstance.get(`/repositories/lookup?url=${encodeURIComponent(repoId)}`);
        targetId = lookupRes.data.data.repositoryId;
      }

      const res = await axiosInstance.post(`/ai/${targetId}/ask`, { question: userMessage.text });
      setChat(prev => [...prev, { role: 'ai', text: res.data.data.explanation || res.data.data.answer || 'No response.' }]);
    } catch (error) {
      if (error.response?.status === 404 && error.response?.data?.error?.code === 'REPO_NOT_FOUND') {
        setChat(prev => [...prev, { role: 'ai', text: 'Error: Repository not found. Please make sure you have added it to your workspaces.' }]);
      } else if (error.response?.status === 422) {
        setChat(prev => [...prev, { role: 'ai', text: `Hold on! Repository embeddings are not yet generated. If you just added the repository, please wait a minute. Otherwise, try going to the repository details page and clicking "Re-analyze".` }]);
      } else {
        setChat(prev => [...prev, { role: 'ai', text: 'Error: Failed to fetch AI response.' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-8 max-w-5xl mx-auto min-h-full">
      <header className="mb-10 pt-4">
        <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Brain className="w-6 h-6 text-cyan-400" />
          </div>
          AI Codebase Insights
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl">
          Chat with your codebase to understand architecture, flows, and potential improvements.
        </p>
      </header>

      <div className="mb-8">
        <label htmlFor="repo-id-input" className="block text-xs font-bold text-zinc-500 mb-3 tracking-widest-sm uppercase">Select Workspace</label>
        <input
          id="repo-id-input"
          type="text"
          placeholder="Paste repository ID or URL (e.g. owner/repo) here..."
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          className="w-full max-w-md bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-zinc-200 placeholder:text-zinc-600 transition-all backdrop-blur-sm"
        />
      </div>

      <div className="flex-1 glass-panel rounded-3xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative">
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div aria-live="polite" className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar relative z-10">
          {chat.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <Sparkles className="w-10 h-10 text-cyan-400" />
              </div>
              <p className="text-lg font-medium tracking-wide">Ask a question about your code to get started.</p>
              <p className="text-sm mt-2 opacity-60">Try: &quot;Explain the authentication flow&quot; or &quot;How does the database connect?&quot;</p>
            </div>
          ) : (
            chat.map((msg, idx) => (
              <div key={idx} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg ${msg.role === 'user' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div role={msg.text.startsWith('Error') ? "alert" : undefined} className={`max-w-[80%] rounded-3xl p-5 text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-[0_5px_20px_rgba(99,102,241,0.2)]' : 'bg-white/5 border border-white/10 text-zinc-300 rounded-tl-none backdrop-blur-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-none p-5 flex items-center gap-3 backdrop-blur-sm">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-zinc-400 font-medium tracking-wide">Synthesizing codebase insights...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-black/40 border-t border-white/10 backdrop-blur-md relative z-10">
          <form onSubmit={handleAsk} className="flex gap-4">
            <label htmlFor="question-input" className="sr-only">Ask anything about the architecture</label>
            <input
              id="question-input"
              type="text"
              placeholder="Ask anything about the architecture..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-zinc-200 placeholder:text-zinc-600 transition-all text-lg"
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={loading || !question.trim() || !repoId}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-cyan-600 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;

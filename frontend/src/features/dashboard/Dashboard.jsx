import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import axiosInstance from '../../shared/api/axiosInstance';
import { FolderGit2, Activity, Zap, ArrowRight, Github, Brain } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ repos: 0, aiInsights: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axiosInstance.get('/repositories');
        setStats({
          repos: res.data.data?.repositories?.length || 0,
          aiInsights: 12 // Placeholder stat
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full">
      <header className="mb-12 pt-4">
        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-widest-sm uppercase">
          Workspace Overview
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
          Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Developer'}</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl">
          Monitor your codebase architecture, analyze new commits, and generate AI insights in real-time.
        </p>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
        
        {/* Main Hero Stat */}
        <div className="glass-card rounded-3xl p-8 col-span-1 md:col-span-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors duration-700" />
          
          <div className="relative z-10">
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <h3 className="text-zinc-400 font-medium mb-1 tracking-wide uppercase text-sm">Connected Repositories</h3>
            <div className="text-6xl font-black text-white tracking-tighter" aria-label={`Connected Repositories: ${loading ? 'loading' : stats.repos}`}>
              {loading ? <span role="status" className="animate-pulse bg-zinc-800 h-16 w-24 rounded-lg block mt-2"><span className="sr-only">Loading...</span></span> : stats.repos}
            </div>
          </div>
          
          <div className="mt-8 relative z-10">
             <Link to="/repositories" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
               Manage connections <ArrowRight className="w-4 h-4" />
             </Link>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
          
          <div className="glass-card rounded-3xl p-6 flex-1 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/20 transition-colors duration-700" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-zinc-400 font-medium uppercase text-xs tracking-widest-sm">Commits Analyzed</h3>
            </div>
            <div className="text-4xl font-bold text-white relative z-10" aria-label={`Commits Analyzed: ${loading ? 'loading' : '143'}`}>
              {loading ? <span role="status" className="animate-pulse bg-zinc-800 h-10 w-20 rounded block mt-1"><span className="sr-only">Loading...</span></span> : '143'}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 flex-1 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-700" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-zinc-400 font-medium uppercase text-xs tracking-widest-sm">Insights Generated</h3>
            </div>
            <div className="text-4xl font-bold text-white relative z-10" aria-label={`Insights Generated: ${loading ? 'loading' : stats.aiInsights}`}>
              {loading ? <span role="status" className="animate-pulse bg-zinc-800 h-10 w-20 rounded block mt-1"><span className="sr-only">Loading...</span></span> : stats.aiInsights}
            </div>
          </div>

        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
        <h2 className="text-xl font-bold text-white tracking-tight">Quick Actions</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/repositories" aria-label="Import a new repository" className="group glass-card rounded-3xl p-8 flex items-center justify-between hover:bg-white/[0.04]">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all duration-300">
              <Github className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 mb-1 group-hover:text-white transition-colors">Import Repository</h3>
              <p className="text-sm text-zinc-500">Connect a new GitHub repository for analysis.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
        
        <Link to="/ai-insights" aria-label="Chat with Codebase" className="group glass-card rounded-3xl p-8 flex items-center justify-between hover:bg-white/[0.04]">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300">
              <Brain className="w-6 h-6 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 mb-1 group-hover:text-white transition-colors">Chat with Codebase</h3>
              <p className="text-sm text-zinc-500">Ask the AI assistant about your architecture.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;

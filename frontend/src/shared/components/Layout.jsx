import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderGit2, LogOut, Network, Brain, FileText, Menu, X } from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-white/10 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        )}
        <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-400' : 'group-hover:scale-110 group-hover:text-zinc-300'}`} />
        <span className="tracking-wide">{children}</span>
      </>
    )}
  </NavLink>
);

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-200 overflow-hidden font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4">
        <h1 className="text-xl font-extrabold bg-gradient-to-br from-white via-indigo-200 to-cyan-400 bg-clip-text text-transparent">
          KnowYourCode
        </h1>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
          className="p-2 text-zinc-400 hover:text-white"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Floating Glass Sidebar */}
      <div className={`
        fixed inset-0 z-40 p-4 transition-transform duration-300 md:relative md:translate-x-0 md:flex-shrink-0 md:w-auto
        ${isSidebarOpen ? 'translate-x-0 bg-black/50 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none' : '-translate-x-full'}
      `}>
        <aside className="w-64 h-full glass-panel rounded-2xl flex flex-col overflow-hidden relative bg-[#050505] md:bg-transparent">
          
          {/* Subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-indigo-500/50 blur-md" />

          <div className="p-6 pb-2 hidden md:block">
            <h1 className="text-2xl font-extrabold heading-tight bg-gradient-to-br from-white via-indigo-200 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              KnowYourCode
            </h1>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mt-6" />
          </div>
          
          <nav aria-label="Main navigation" className="flex-1 px-3 space-y-1.5 mt-4 md:mt-4 pt-16 md:pt-0 overflow-y-auto">
            <SidebarLink to="/dashboard" icon={LayoutDashboard} onClick={() => setIsSidebarOpen(false)}>Dashboard</SidebarLink>
            <SidebarLink to="/repositories" icon={FolderGit2} onClick={() => setIsSidebarOpen(false)}>Repositories</SidebarLink>
            <SidebarLink to="/graph" icon={Network} onClick={() => setIsSidebarOpen(false)}>Architecture</SidebarLink>
            <SidebarLink to="/ai-insights" icon={Brain} onClick={() => setIsSidebarOpen(false)}>AI Insights</SidebarLink>
            <SidebarLink to="/summary" icon={FileText} onClick={() => setIsSidebarOpen(false)}>Summaries</SidebarLink>
          </nav>

          <div className="p-4 mt-auto">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
            
            <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-black/20 border border-white/5 backdrop-blur-md">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate font-mono mt-0.5">Developer</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              aria-label="Logout"
              className="group w-full flex items-center gap-3 px-4 py-2.5 text-zinc-400 hover:text-red-400 rounded-xl transition-all duration-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium tracking-wide">Logout</span>
            </button>
          </div>
        </aside>
        
        {/* Mobile backdrop click target to close */}
        <div 
          className="absolute inset-0 -z-10 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative mt-16 md:mt-0">
        <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E&quot;)] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="h-full w-full relative z-10 animate-slide-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

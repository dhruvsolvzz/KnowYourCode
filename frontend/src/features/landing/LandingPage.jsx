import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { Network, BrainCircuit, Code, ArrowRight, Github } from 'lucide-react';
import Lightfall from '../../components/ui/Lightfall';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent flex flex-col text-white">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b-0 border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Network className="h-8 w-8 text-indigo-500" />
              <span className="font-bold text-xl tracking-tight">KnowYourCode</span>
            </div>
            <nav className="flex items-center gap-4">
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Lightfall Background */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Lightfall
            colors={['#4f46e5', '#06b6d4', '#818cf8']}
            backgroundColor="#050505"
            speed={0.8}
            streakCount={5}
            streakWidth={1.5}
            streakLength={1.5}
            glow={1.2}
            density={0.8}
            twinkle={1.5}
            zoom={2.5}
            backgroundGlow={0.8}
            opacity={0.6}
            mouseInteraction={true}
            mouseStrength={1.2}
            mouseRadius={0.8}
          />
        </div>

        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-8 animate-element">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            Now with AI Insights
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 animate-element animate-delay-100">
            Understand Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Codebase at a Glance
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto animate-element animate-delay-200">
            Visualize repository structures, track dependencies, and gain instant AI-powered insights. The smartest way to navigate and document your code.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-element animate-delay-300">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              Start Analyzing
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-xl glass-card text-white hover:text-indigo-300 font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-32 relative z-10">
          {[
            {
              title: "Interactive Graph View",
              description: "Explore your codebase architecture through dynamic node-based visualizations that reveal hidden dependencies.",
              icon: <Network className="w-8 h-8 text-cyan-400" />
            },
            {
              title: "AI-Powered Insights",
              description: "Get automated code summaries, architecture reviews, and suggested improvements from our advanced AI engine.",
              icon: <BrainCircuit className="w-8 h-8 text-indigo-400" />
            },
            {
              title: "Seamless Integration",
              description: "Connect instantly with your GitHub repositories. No complex setup required to start visualizing your code.",
              icon: <Code className="w-8 h-8 text-emerald-400" />
            }
          ].map((feature, i) => (
            <div 
              key={i} 
              className={`glass-card p-8 rounded-2xl animate-element animate-delay-${(i + 4) * 100}`}
            >
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-zinc-500 text-sm">
        <p>© {new Date().getFullYear()} KnowYourCode. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

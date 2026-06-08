import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../shared/api/axiosInstance';
import { FolderGit2, Plus, RefreshCw, Trash2, Github, Loader2, ExternalLink, ArrowRight, Upload, FileArchive, X } from 'lucide-react';

const RepoList = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('github'); // 'github' | 'upload'

  // ZIP upload state
  const [uploading, setUploading] = useState(false);
  const [zipFile, setZipFile] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const fetchRepos = async () => {
    try {
      const res = await axiosInstance.get('/repositories');
      setRepos(res.data.data?.repositories || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleAddRepo = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      await axiosInstance.post('/repositories', { url: newRepoUrl });
      setNewRepoUrl('');
      await fetchRepos();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add repository');
    } finally {
      setAdding(false);
    }
  };

  const handleZipUpload = async (e) => {
    e.preventDefault();
    if (!zipFile) { setError('Please select a ZIP file'); return; }
    setUploading(true);
    setError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('zipFile', zipFile);
    formData.append('projectName', projectName || zipFile.name.replace(/\.zip$/i, ''));

    try {
      await axiosInstance.post('/repositories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(pct);
        },
      });
      setZipFile(null);
      setProjectName('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchRepos();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload ZIP file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this repository?')) return;
    try {
      await axiosInstance.delete(`/repositories/${id}`);
      setRepos(repos.filter(r => r._id !== id));
    } catch (err) {
      setError('Failed to delete repository');
    }
  };

  const handleReanalyze = async (id) => {
    try {
      await axiosInstance.post(`/repositories/${id}/analyze`);
      alert('Analysis triggered successfully. This may take a few minutes.');
      fetchRepos();
    } catch (err) {
      setError('Failed to trigger analysis');
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed')) {
      setZipFile(file);
      if (!projectName) setProjectName(file.name.replace(/\.zip$/i, ''));
    } else {
      setError('Please drop a valid ZIP file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setZipFile(file);
      if (!projectName) setProjectName(file.name.replace(/\.zip$/i, ''));
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse font-medium tracking-wide">Loading workspaces...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full">
      <header className="mb-12 pt-4">
        <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">Workspaces</h1>
        <p className="text-zinc-400 text-lg">Manage your connected repositories and uploaded projects.</p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-8 backdrop-blur-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="glass-panel p-6 rounded-3xl mb-12 shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700" />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 relative z-10">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'github'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Github className="w-4 h-4" />
            GitHub URL
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'upload'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload ZIP
          </button>
        </div>

        {/* GitHub URL Tab */}
        {activeTab === 'github' && (
          <>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3 tracking-wide">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Github className="w-4 h-4 text-indigo-400" />
              </div>
              Connect GitHub Repository
            </h2>
            <form onSubmit={handleAddRepo} className="flex gap-4 relative z-10">
              <input
                type="url"
                required
                placeholder="https://github.com/username/repo"
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600 transition-all backdrop-blur-sm"
                value={newRepoUrl}
                onChange={(e) => setNewRepoUrl(e.target.value)}
              />
              <button
                type="submit"
                disabled={adding}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 disabled:opacity-70 disabled:hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Connect</>}
              </button>
            </form>
          </>
        )}

        {/* Upload ZIP Tab */}
        {activeTab === 'upload' && (
          <>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3 tracking-wide">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                <FileArchive className="w-4 h-4 text-violet-400" />
              </div>
              Upload Code as ZIP
            </h2>
            <form onSubmit={handleZipUpload} className="relative z-10 space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  dragOver
                    ? 'border-violet-400/60 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]'
                    : zipFile
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {zipFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                      <FileArchive className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold tracking-tight">{zipFile.name}</p>
                      <p className="text-zinc-500 text-sm">{(zipFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setZipFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="ml-4 p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragOver ? 'text-violet-400' : 'text-zinc-600'}`} />
                    <p className="text-zinc-300 font-medium mb-1">Drag & drop your ZIP file here</p>
                    <p className="text-zinc-600 text-sm">or click to browse • Max 50MB</p>
                  </>
                )}
              </div>

              {/* Project Name + Submit */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Project name (optional)"
                  className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-zinc-200 placeholder:text-zinc-600 transition-all backdrop-blur-sm"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={uploading || !zipFile}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 rounded-2xl font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" /> Analyze
                    </>
                  )}
                </button>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </form>
          </>
        )}
      </div>

      {/* Repo List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {repos.length === 0 ? (
          <div className="col-span-full text-center py-16 text-zinc-500 border border-dashed border-white/10 rounded-3xl bg-black/20 backdrop-blur-sm">
            <FolderGit2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium tracking-wide">No workspaces connected yet.<br/>Connect a repository or upload a ZIP above to get started.</p>
          </div>
        ) : (
          repos.map(repo => (
            <div key={repo._id} className="glass-card rounded-3xl p-6 flex flex-col group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    repo.source === 'zip_upload'
                      ? 'bg-violet-500/5 border-violet-500/10 text-violet-300 group-hover:bg-violet-500/10 group-hover:text-violet-400 group-hover:border-violet-500/20'
                      : 'bg-white/5 border-white/10 text-zinc-300 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20'
                  }`}>
                    {repo.source === 'zip_upload' ? <FileArchive className="w-6 h-6" /> : <FolderGit2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <Link to={`/repositories/${repo._id}`} className="text-xl font-bold text-white hover:text-indigo-400 transition-colors tracking-tight">
                      {repo.name}
                    </Link>
                    {repo.source === 'zip_upload' ? (
                      <span className="flex items-center gap-1.5 text-sm text-violet-400/60 mt-0.5">
                        <FileArchive className="w-3 h-3" /> Uploaded ZIP
                      </span>
                    ) : (
                      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5">
                        {repo.owner}/{repo.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-widest-sm uppercase border ${
                    repo.analysisStatus === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                    repo.analysisStatus === 'processing' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] animate-pulse' :
                    repo.analysisStatus === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
                    'bg-white/5 border-white/10 text-zinc-400'
                  }`}>
                    {(repo.analysisStatus || 'pending')}
                  </span>
                </div>
              </div>

              <div className="text-sm font-medium text-zinc-500 mb-8 flex-1 tracking-wide">
                LAST ANALYZED: <span className="text-zinc-300 ml-1">{repo.lastAnalyzedAt ? new Date(repo.lastAnalyzedAt).toLocaleDateString() : 'NEVER'}</span>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-white/5 relative z-10">
                <Link to={`/repositories/${repo._id}`} className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-semibold tracking-wide transition-colors">
                  Open Workspace <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex gap-2">
                  <button onClick={() => handleReanalyze(repo._id)} className="p-2.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all duration-300" title="Re-analyze">
                    <RefreshCw className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => handleDelete(repo._id)} className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-300" title="Remove">
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RepoList;

import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await axiosInstance.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth verification failed', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Listen for the logout event fired by axiosInstance when token refresh fails
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Handle email-not-verified 403s (separate interceptor, doesn't touch 401)
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 403 &&
          error.response?.data?.error?.code === 'AUTH_EMAIL_NOT_VERIFIED'
        ) {
          showToast('Please verify your email first!', 'warning');
        }
        return Promise.reject(error);
      }
    );
    return () => axiosInstance.interceptors.response.eject(interceptor);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const getToastStyles = (type) => {
    switch (type) {
      case 'success': return 'border-emerald-500/30 text-emerald-300';
      case 'error': return 'border-red-500/30 text-red-300';
      case 'warning': return 'border-amber-500/30 text-amber-300';
      case 'info':
      default: return 'border-indigo-500/30 text-indigo-300';
    }
  };

  const getToastDotClass = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'info':
      default: return 'bg-indigo-500';
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, showToast }}>
      {children}
      {toast && (
        <div role="alert" aria-live="assertive" className={`fixed bottom-5 right-5 z-[9999] bg-black/80 backdrop-blur-md border px-5 py-3.5 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-slide-in transition-all ${getToastStyles(toast.type)}`}>
          <div className={`w-2 h-2 rounded-full animate-ping ${getToastDotClass(toast.type)}`}></div>
          <span className="font-medium text-sm">{toast.message}</span>
          <button aria-label="Close" onClick={() => setToast(null)} className="ml-3 text-zinc-400 hover:text-white font-bold cursor-pointer">×</button>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

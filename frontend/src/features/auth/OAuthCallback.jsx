import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import axiosInstance from '../../shared/api/axiosInstance';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('GitHub login failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('No authentication token received.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Store token and fetch user details
    const authenticate = async () => {
      try {
        // Temporarily set the token so the /me request is authenticated
        localStorage.setItem('token', token);
        const res = await axiosInstance.get('/auth/me');
        if (res.data.success) {
          login(res.data.data.user, token);
          setStatus('success');
          setMessage('Logged in successfully! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          throw new Error('Failed to fetch user');
        }
      } catch (err) {
        localStorage.removeItem('token');
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    authenticate();
  }, [searchParams, login, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505] text-zinc-200">
      <div role="status" aria-live="polite" className="text-center space-y-4 glass-panel p-8 rounded-2xl w-full max-w-md mx-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mx-auto" />
            <p className="text-zinc-300 text-lg">Authenticating with GitHub...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="text-zinc-300 text-lg">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-400 text-lg">{message}</p>
            <p className="text-zinc-500 text-sm">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;

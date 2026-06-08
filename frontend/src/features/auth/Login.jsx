import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import axiosInstance, { API_BASE_URL } from '../../shared/api/axiosInstance';
import { SignInPage } from '../../components/ui/sign-in';

const Login = () => {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [githubAvailable, setGithubAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  const { login, showToast } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifiedMessage = searchParams.get('message');
  const oauthError = searchParams.get('error');

  useEffect(() => {
    if (verifiedMessage) {
      setMessage(`✅ ${verifiedMessage}`);
    }
    if (oauthError) {
      setError('GitHub login failed. Please try again or use email/password.');
    }
    
    axiosInstance.get('/auth/github/status')
      .then(res => setGithubAvailable(res.data?.data?.configured === true))
      .catch(() => setGithubAvailable(false));
      
    axiosInstance.get('/auth/google/status')
      .then(res => setGoogleAvailable(res.data?.data?.configured === true))
      .catch(() => setGoogleAvailable(false));
  }, [verifiedMessage, oauthError]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await axiosInstance.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.user, res.data.data.accessToken);
        navigate('/dashboard');
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message || 'Failed to login';

      if (code === 'AUTH_EMAIL_NOT_VERIFIED') {
        showToast('Please verify your email first before logging in.', 'warning');
        setError('Your email is not verified. Please check your inbox for the verification link.');
      } else {
        let finalErrMsg = errMsg;
        if (err.response?.data?.error?.details && Array.isArray(err.response.data.error.details)) {
          finalErrMsg = err.response.data.error.details.join(', ');
        }
        setError(finalErrMsg);
        showToast(finalErrMsg, 'error');
      }
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await axiosInstance.post('/auth/register', { name, email, password });
      if (res.data.success) {
        const successMsg = 'Registration successful! Please check your email to verify your account.';
        setMessage(successMsg);
        showToast(successMsg, 'success');
      }
    } catch (err) {
      const errorData = err.response?.data?.error;
      let errMsg = errorData?.message || 'Failed to register';
      
      if (errorData?.details && Array.isArray(errorData.details)) {
        errMsg = errorData.details.join(', ');
      }
      
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleGithubLogin = () => {
    if (!githubAvailable) {
      const errMsg = 'GitHub login is not configured on this server.';
      setError(errMsg);
      showToast(errMsg, 'error');
      return;
    }
    window.location.href = `${API_BASE_URL}/auth/github`;
  };

  const handleGoogleSignIn = () => {
    if (!googleAvailable) {
      const errMsg = 'Google login is not configured on this server.';
      setError(errMsg);
      showToast(errMsg, 'error');
      return;
    }
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const sampleTestimonials = [
    {
      avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
      name: "Sarah Chen",
      handle: "@sarahdigital",
      text: "Amazing platform! The user experience is seamless and the features are exactly what I needed."
    },
    {
      avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
      name: "Marcus Johnson",
      handle: "@marcustech",
      text: "This service has transformed how I work. Clean design, powerful features, and excellent support."
    },
    {
      avatarSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
      name: "David Martinez",
      handle: "@davidcreates",
      text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity."
    },
  ];

  return (
    <SignInPage
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={sampleTestimonials}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
      onGoogleSignIn={handleGoogleSignIn}
      onGithubSignIn={handleGithubLogin}
      error={error}
      message={message}
    />
  );
};

export default Login;

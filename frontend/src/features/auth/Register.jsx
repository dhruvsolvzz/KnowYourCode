import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { API_BASE_URL } from '../../shared/api/axiosInstance';
import { SignInPage } from '../../components/ui/sign-in';
import { useAuth } from '../../shared/context/AuthContext';

const Register = () => {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [githubAvailable, setGithubAvailable] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance.get('/auth/github/status')
      .then(res => setGithubAvailable(res.data?.data?.configured === true))
      .catch(() => setGithubAvailable(false));
  }, []);

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
      setError(err.response?.data?.error?.message || 'Failed to login');
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
        setMessage('Registration successful! Please check your email to verify your account.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to register');
    }
  };

  const handleGithubLogin = () => {
    if (!githubAvailable) {
      setError('GitHub login is not configured on this server.');
      return;
    }
    window.location.href = `${API_BASE_URL}/auth/github`;
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
      onGithubSignIn={handleGithubLogin}
      error={error}
      message={message}
      defaultIsSignUp={true}
    />
  );
};

export default Register;

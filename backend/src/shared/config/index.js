'use strict';

/**
 * Central configuration with env validation.
 * The app will CRASH on startup if any required env var is missing.
 */

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
});

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  db: {
    uri: process.env.MONGODB_URI,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/github/callback',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },

  selectedAIProvider: process.env.AI_PROVIDER || 'gemini',


  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.GOOGLE_USER || process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    from: process.env.EMAIL_FROM || 'KnowYourCode <noreply@knowyourcode.dev>',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  backend: {
    url: process.env.BACKEND_URL || process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  },

  webhook: {
    baseUrl: process.env.WEBHOOK_BASE_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`,
  },
};

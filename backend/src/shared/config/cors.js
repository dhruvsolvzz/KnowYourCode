'use strict';
const config = require('./index');
const AppError = require('../utils/AppError');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.frontend.url,
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    // Allow requests with no origin (mobile apps, Postman, curl)
    // Also natively support all .vercel.app deployments for frontend previews
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new AppError(`CORS: Origin ${origin} not allowed`, 403, 'CORS_FORBIDDEN'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

module.exports = corsOptions;

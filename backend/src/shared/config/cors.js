'use strict';
const config = require('./index');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.frontend.url,
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

module.exports = corsOptions;

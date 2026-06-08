'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const corsOptions = require('./shared/config/cors');
const { rateLimiter } = require('./shared/middleware/rateLimiter.middleware');
const { requestLogger } = require('./shared/middleware/requestLogger.middleware');
const { errorHandler } = require('./shared/middleware/errorHandler.middleware');
const { isGithubConfigured } = require('./shared/config/passport');

// Route imports
const authRoutes = require('./features/auth/auth.routes');
const repositoryRoutes = require('./features/repository/repository.routes');
const githubRoutes = require('./features/github/github.routes');
const graphRoutes = require('./features/graph/graph.routes');
const aiRoutes = require('./features/ai/ai.routes');
const summaryRoutes = require('./features/summary/summary.routes');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// NOTE: Webhook route uses express.raw() — must be BEFORE express.json()
app.use('/api/v1/github/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(rateLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Passport (OAuth) ────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      githubOAuth: isGithubConfigured,
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/repositories', repositoryRoutes);
app.use('/api/v1/github', githubRoutes);
app.use('/api/v1/graph', graphRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/summary', summaryRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.originalUrl} not found` },
  });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;

'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const app = require('./src/app');
const { connectDB } = require('./src/shared/database/connection');
const config = require('./src/shared/config');
const logger = require('./src/shared/utils/logger');

const PORT = config.port;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.env} mode`);
      logger.info(`📖 API Docs: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

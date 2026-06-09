'use strict';
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  try {
    const uri = process.env.MONGODB_URI || (config.db && config.db.uri) || (config.default && config.default.db && config.default.db.uri);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

    // Drop stale indexes to avoid duplicate key conflicts (e.g., old unique 'username' index)
    try {
      await conn.connection.db.collection('users').dropIndexes();
      logger.info('🧹 Successfully cleared stale database indexes');
    } catch (e) {
      logger.debug('No stale indexes found to drop');
    }

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
      isConnected = false;
    });
  } catch (err) {
    logger.error('MongoDB connection failed:', err.message);
    throw err;
  }
};

module.exports = { connectDB };

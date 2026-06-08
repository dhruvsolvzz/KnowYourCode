'use strict';
const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    config.env === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, stack }) => {
            return `${timestamp} [${level}]: ${stack || message}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;

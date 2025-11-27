const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')
const fs = require('fs')

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'museum-api' },
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Combined logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Security logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
})

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

// Security logging functions
logger.security = {
  loginAttempt: (username, success, ip, userAgent) => {
    logger.warn('Login attempt', {
      type: 'AUTHENTICATION',
      username,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    })
  },
  unauthorizedAccess: (route, ip, userAgent) => {
    logger.warn('Unauthorized access attempt', {
      type: 'AUTHORIZATION',
      route,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    })
  },
  passwordReset: (email, success, ip) => {
    logger.info('Password reset', {
      type: 'PASSWORD_RESET',
      email,
      success,
      ip,
      timestamp: new Date().toISOString()
    })
  },
  userAction: (userId, action, resource, ip) => {
    logger.info('User action', {
      type: 'USER_ACTION',
      userId,
      action,
      resource,
      ip,
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = logger


const logger = require('../utils/logger')
const AuditLog = require('../models/AuditLog')

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    })
  })
  
  next()
}

// Audit logging middleware
const auditLogger = async (req, res, next) => {
  // Log after response is sent
  const originalSend = res.send
  res.send = function(data) {
    // Log user actions (skip GET requests and health checks)
    if (req.user && req.method !== 'GET' && !req.originalUrl.includes('/health')) {
      const action = req.method === 'POST' ? 'CREATE' : 
                    req.method === 'PUT' || req.method === 'PATCH' ? 'UPDATE' :
                    req.method === 'DELETE' ? 'DELETE' : 'OTHER'
      
      const resource = req.originalUrl.split('/').filter(Boolean)[1]?.toUpperCase() || 'UNKNOWN'
      
      // Don't block the response if audit logging fails
      const resourceId =
        req.params?.id ||
        req.params?.imageId ||
        req.body?.id ||
        req.body?._id ||
        req.body?.imageId ||
        null

      AuditLog.create({
        userId: req.user.id,
        userRole: req.user.role,
        username: req.user.username,
        action,
        resource,
        resourceId,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : null
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      }).catch(err => logger.error('Audit log error', { error: err.message }))
    }
    
    originalSend.call(this, data)
  }
  
  next()
}

// Sanitize sensitive data from logs
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body
  
  const sanitized = { ...body }
  if (sanitized.password) sanitized.password = '[REDACTED]'
  if (sanitized.passwordHash) sanitized.passwordHash = '[REDACTED]'
  if (sanitized.token) sanitized.token = '[REDACTED]'
  if (sanitized.refreshToken) sanitized.refreshToken = '[REDACTED]'
  if (sanitized.resetToken) sanitized.resetToken = '[REDACTED]'
  
  return sanitized
}

module.exports = { requestLogger, auditLogger }


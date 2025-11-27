const SuperAdmin = require('../models/SuperAdmin')
const Admin = require('../models/Admin')
const { verifyToken } = require('../utils/jwt')
const logger = require('../utils/logger')

// Helper: extract and verify JWT, return decoded payload or null
const getDecodedToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  return decoded || null
}

// Base authenticator used by role-specific middlewares
const authenticateByRole = (allowedRoles) => async (req, res, next) => {
  try {
    const decoded = getDecodedToken(req)

    if (!decoded) {
      logger.security.unauthorizedAccess(
        req.originalUrl,
        req.ip || req.connection.remoteAddress,
        req.get('user-agent')
      )
      return res.status(401).json({ message: 'Authentication required' })
    }

    if (!allowedRoles.includes(decoded.role)) {
      logger.security.unauthorizedAccess(
        req.originalUrl,
        req.ip || req.connection.remoteAddress,
        req.get('user-agent')
      )
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    let user = null

    if (decoded.role === 'superadmin') {
      user = await SuperAdmin.findById(decoded.id)
      if (!user) {
        logger.security.unauthorizedAccess(
          req.originalUrl,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent')
        )
        return res.status(401).json({ message: 'User not found' })
      }

      req.user = {
        id: user._id.toString(),
        role: 'superadmin',
        username: user.username,
        email: user.email
      }
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id)
      if (!user) {
        logger.security.unauthorizedAccess(
          req.originalUrl,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent')
        )
        return res.status(401).json({ message: 'Admin not found' })
      }

      req.user = {
        id: user._id.toString(),
        role: 'admin',
        username: user.username,
        email: user.email
      }
    }

    next()
  } catch (error) {
    logger.error('Auth error', { error: error.message, stack: error.stack })
    return res.status(401).json({ message: 'Authentication failed' })
  }
}

// Authentication middleware for Super Admin using JWT
const authenticateSuperAdmin = authenticateByRole(['superadmin'])

// Authentication middleware for Admin using JWT
const authenticateAdmin = authenticateByRole(['admin'])

// Authentication middleware that accepts either Admin or SuperAdmin
const authenticateAdminOrSuperAdmin = authenticateByRole(['admin', 'superadmin'])

// Optional RBAC guard to be used after an authenticate* middleware
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' })
  }

  return next()
}

module.exports = {
  authenticateSuperAdmin,
  authenticateAdmin,
  authenticateAdminOrSuperAdmin,
  authorizeRoles
}


const SuperAdmin = require('../models/SuperAdmin')
const Admin = require('../models/Admin')
const { verifyToken } = require('../utils/jwt')
const logger = require('../utils/logger')

// Helper: extract and verify JWT, return decoded payload or null
const getDecodedToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    logger.debug('No token provided in request', { url: req.originalUrl })
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    console.error('❌ Token verification failed for:', req.originalUrl)
    logger.debug('Token verification failed', { url: req.originalUrl, tokenLength: token.length })
  } else {
    console.log('✅ Token verified:', { url: req.originalUrl, role: decoded.role, id: decoded.id, email: decoded.email })
    logger.debug('Token verified successfully', { url: req.originalUrl, role: decoded.role, id: decoded.id })
  }
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
      // Try to find user by ID
      try {
        user = await SuperAdmin.findById(decoded.id)
      } catch (dbError) {
        logger.error('Database error finding SuperAdmin', { 
          error: dbError.message, 
          id: decoded.id,
          url: req.originalUrl 
        })
        return res.status(500).json({ message: 'Database error' })
      }
      
      // If not found by ID, try by email as fallback
      if (!user && decoded.email) {
        try {
          user = await SuperAdmin.findOne({ email: decoded.email })
          if (user) {
            logger.debug('SuperAdmin found by email fallback', { email: decoded.email })
          }
        } catch (dbError) {
          logger.error('Database error finding SuperAdmin by email', { error: dbError.message })
        }
      }
      
      if (!user) {
        console.error('❌ SuperAdmin not found:', { 
          tokenId: decoded.id, 
          tokenEmail: decoded.email,
          tokenRole: decoded.role,
          tokenUsername: decoded.username,
          url: req.originalUrl 
        })
        logger.security.unauthorizedAccess(
          req.originalUrl,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent')
        )
        logger.error('SuperAdmin not found in database', { 
          tokenId: decoded.id, 
          tokenEmail: decoded.email,
          tokenRole: decoded.role,
          url: req.originalUrl 
        })
        return res.status(401).json({ message: 'User not found' })
      } else {
        console.log('✅ SuperAdmin found:', { id: user._id.toString(), username: user.username, email: user.email })
      }

      req.user = {
        id: user._id.toString(),
        role: 'superadmin',
        username: user.username,
        email: user.email
      }
    } else if (decoded.role === 'admin') {
      // Try to find user by ID first
      try {
        user = await Admin.findById(decoded.id)
        if (user) {
          console.log('✅ Admin found by ID:', { id: user._id.toString(), username: user.username })
        }
      } catch (dbError) {
        logger.error('Database error finding Admin by ID', { 
          error: dbError.message, 
          id: decoded.id,
          url: req.originalUrl 
        })
      }
      
      // If not found by ID, try by email as fallback
      if (!user && decoded.email) {
        try {
          user = await Admin.findOne({ email: decoded.email })
          if (user) {
            console.log('✅ Admin found by email fallback:', { email: decoded.email, id: user._id.toString() })
            logger.debug('Admin found by email fallback', { email: decoded.email })
          }
        } catch (dbError) {
          logger.error('Database error finding Admin by email', { error: dbError.message })
        }
      }
      
      if (!user) {
        console.error('❌ Admin not found:', { 
          tokenId: decoded.id, 
          tokenEmail: decoded.email,
          tokenRole: decoded.role,
          tokenUsername: decoded.username,
          url: req.originalUrl 
        })
        logger.security.unauthorizedAccess(
          req.originalUrl,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent')
        )
        logger.error('Admin not found in database', { 
          tokenId: decoded.id, 
          tokenEmail: decoded.email,
          tokenRole: decoded.role,
          url: req.originalUrl 
        })
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


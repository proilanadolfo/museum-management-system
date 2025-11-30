const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'museum-management-system-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'museum-management-system-secret-key-change-in-production') {
  console.warn('⚠️  WARNING: Using default JWT secret in production! Set JWT_SECRET in .env')
}

// Generate access token
function generateToken(user) {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role || (user.db === 'museum_superadmin' ? 'superadmin' : 'admin')
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Generate refresh token
function generateRefreshToken(user) {
  const payload = {
    id: user._id.toString(),
    type: 'refresh',
    role: user.role || (user.db === 'museum_superadmin' ? 'superadmin' : 'admin')
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
}

// Verify token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded
  } catch (error) {
    // Log the specific error for debugging
    if (error.name === 'TokenExpiredError') {
      console.error('JWT Token expired:', error.expiredAt)
    } else if (error.name === 'JsonWebTokenError') {
      console.error('JWT Token invalid:', error.message)
    } else {
      console.error('JWT Verification error:', error.message)
    }
    return null
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken
}


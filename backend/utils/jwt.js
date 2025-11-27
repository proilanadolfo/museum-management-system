const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'museum-management-system-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

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
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken
}


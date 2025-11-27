const { body, validationResult } = require('express-validator')

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    })
  }
  next()
}

// Login validation
const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Username or email is required')
    .trim(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  handleValidationErrors
]

// Admin creation validation
const validateAdminCreation = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .optional()
    .trim(),
  handleValidationErrors
]

// Password reset validation
const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors
]

// Password reset with code validation
const validatePasswordResetCode = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('code')
    .notEmpty()
    .withMessage('Reset code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Reset code must be 6 digits'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('userType')
    .isIn(['admin', 'superadmin'])
    .withMessage('User type must be admin or superadmin'),
  handleValidationErrors
]

module.exports = {
  validateLogin,
  validateAdminCreation,
  validatePasswordReset,
  validatePasswordResetCode,
  handleValidationErrors
}


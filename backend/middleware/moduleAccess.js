const ModulePermission = require('../models/ModulePermission')
const logger = require('../utils/logger')

/**
 * Middleware to check if the authenticated admin has access to a specific module
 * Super Admin always has access (bypasses check)
 * Admin must have the module enabled in their permissions
 */
const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      // Super Admin always has full access
      if (req.user && req.user.role === 'superadmin') {
        return next()
      }

      // If not authenticated or not admin, deny access
      if (!req.user || req.user.role !== 'admin') {
        logger.security.unauthorizedAccess(
          req.originalUrl,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent'),
          'Module access check failed: Not authenticated as admin'
        )
        return res.status(403).json({
          success: false,
          message: 'Access denied: Module access check failed'
        })
      }

      const adminId = req.user.id

      // Check if permission exists for this admin and module
      const permission = await ModulePermission.findOne({
        adminId,
        moduleName
      })

      // If no permission record exists, default to enabled (backward compatibility)
      // If permission exists and is disabled, deny access
      if (permission && !permission.enabled) {
        logger.security.unauthorizedAccess(
          req.originalUrl,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent'),
          `Module access denied: ${moduleName} is disabled for admin ${adminId}`
        )
        return res.status(403).json({
          success: false,
          message: `Access denied: ${moduleName} module is not enabled for your account`
        })
      }

      // Permission is enabled or doesn't exist (default enabled)
      next()
    } catch (error) {
      logger.error('Error checking module access', {
        error: error.message,
        stack: error.stack,
        moduleName,
        adminId: req.user?.id
      })
      return res.status(500).json({
        success: false,
        message: 'Error checking module access'
      })
    }
  }
}

/**
 * Helper function to get all enabled modules for an admin
 * Returns a map of moduleName -> enabled (boolean)
 */
const getAdminModulePermissions = async (adminId) => {
  try {
    const permissions = await ModulePermission.find({ adminId }).lean()

    const permissionMap = {}
    permissions.forEach(perm => {
      permissionMap[perm.moduleName] = perm.enabled
    })

    // Default all modules to enabled if no permission record exists
    const MODULE_NAMES = ['attendance', 'gallery', 'reports', 'settings']
    MODULE_NAMES.forEach(moduleName => {
      if (permissionMap[moduleName] === undefined) {
        permissionMap[moduleName] = true
      }
    })

    return permissionMap
  } catch (error) {
    logger.error('Error getting admin module permissions', {
      error: error.message,
      stack: error.stack,
      adminId
    })
    // Return all enabled by default on error
    return {
      attendance: true,
      gallery: true,
      reports: true,
      settings: true
    }
  }
}

module.exports = {
  checkModuleAccess,
  getAdminModulePermissions
}


const express = require('express')
const router = express.Router()
const ModulePermission = require('../models/ModulePermission')
const Admin = require('../models/Admin')
const { authenticateSuperAdmin, authenticateAdmin } = require('../middleware/auth')
const logger = require('../utils/logger')
const { broadcastModulePermissionsUpdate } = require('../utils/sseBroadcaster')

// Get all module permissions for all admins (Super Admin only)
router.get('/all', authenticateSuperAdmin, async (req, res) => {
  try {
    const permissions = await ModulePermission.find()
      .populate('adminId', 'username email name')
      .sort({ adminId: 1, moduleName: 1 })
      .lean()

    // Group by admin
    const grouped = {}
    permissions.forEach(perm => {
      const adminId = perm.adminId._id.toString()
      if (!grouped[adminId]) {
        grouped[adminId] = {
          admin: {
            id: adminId,
            username: perm.adminId.username,
            email: perm.adminId.email,
            name: perm.adminId.name
          },
          permissions: {}
        }
      }
      grouped[adminId].permissions[perm.moduleName] = {
        enabled: perm.enabled
      }
    })

    res.json({
      success: true,
      permissions: Object.values(grouped)
    })
  } catch (error) {
    logger.error('Error fetching all module permissions', { error: error.message, stack: error.stack })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module permissions',
      error: error.message
    })
  }
})

// Get module permissions for a specific admin (Super Admin only)
router.get('/admin/:adminId', authenticateSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params
    
    console.log('Fetching module permissions for adminId:', adminId)
    
    // Validate adminId format
    if (!adminId || adminId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      })
    }

    const admin = await Admin.findById(adminId)
    if (!admin) {
      console.error('Admin not found:', adminId)
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      })
    }
    
    console.log('Admin found:', { id: admin._id.toString(), username: admin.username, email: admin.email })

    const permissions = await ModulePermission.find({ adminId })
      .sort({ moduleName: 1 })
      .lean()

    // Create a map of module permissions
    const permissionMap = {}
    permissions.forEach(perm => {
      permissionMap[perm.moduleName] = {
        enabled: perm.enabled
      }
    })

    // Ensure all modules have a default entry (enabled by default)
    const MODULE_NAMES = ['attendance', 'gallery', 'reports', 'settings']
    MODULE_NAMES.forEach(moduleName => {
      if (!permissionMap[moduleName]) {
        permissionMap[moduleName] = {
          enabled: true,
          enabledBy: null,
          enabledAt: null,
          disabledBy: null,
          disabledAt: null
        }
      }
    })

    res.json({
      success: true,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
        name: admin.name
      },
      permissions: permissionMap
    })
  } catch (error) {
    logger.error('Error fetching admin module permissions', { error: error.message, stack: error.stack })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin module permissions',
      error: error.message
    })
  }
})

// Get current admin's own module permissions (Admin only)
router.get('/my-permissions', authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id

    const permissions = await ModulePermission.find({ adminId })
      .sort({ moduleName: 1 })
      .lean()

    // Create a map of module permissions
    const permissionMap = {}
    permissions.forEach(perm => {
      permissionMap[perm.moduleName] = perm.enabled
    })

    // Ensure all modules have a default entry (enabled by default if not set)
    const MODULE_NAMES = ['attendance', 'gallery', 'reports', 'settings']
    MODULE_NAMES.forEach(moduleName => {
      if (permissionMap[moduleName] === undefined) {
        permissionMap[moduleName] = true // Default enabled
      }
    })

    res.json({
      success: true,
      permissions: permissionMap
    })
  } catch (error) {
    logger.error('Error fetching my module permissions', { error: error.message, stack: error.stack })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module permissions',
      error: error.message
    })
  }
})

// Update module permission for a specific admin (Super Admin only)
router.put('/admin/:adminId/module/:moduleName', authenticateSuperAdmin, async (req, res) => {
  try {
    const { adminId, moduleName } = req.params
    const { enabled } = req.body
    
    console.log('Updating module permission:', { adminId, moduleName, enabled })

    // Validate adminId format
    if (!adminId || adminId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      })
    }

    // Validate module name
    const MODULE_NAMES = ['attendance', 'gallery', 'reports', 'settings']
    if (!MODULE_NAMES.includes(moduleName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid module name. Must be one of: ${MODULE_NAMES.join(', ')}`
      })
    }

    // Validate enabled value
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled must be a boolean value'
      })
    }

    // Check if admin exists
    const admin = await Admin.findById(adminId)
    if (!admin) {
      console.error('Admin not found for module update:', adminId)
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      })
    }
    
    console.log('Admin found for module update:', { id: admin._id.toString(), username: admin.username })

    // Find or create permission
    let permission = await ModulePermission.findOne({ adminId, moduleName })

    const superAdminId = req.user.id
    const now = new Date()

    if (permission) {
      // Update existing permission
      permission.enabled = enabled
      if (enabled) {
        permission.enabledBy = superAdminId
        permission.enabledAt = now
        permission.disabledBy = null
        permission.disabledAt = null
      } else {
        permission.disabledBy = superAdminId
        permission.disabledAt = now
        permission.enabledBy = null
        permission.enabledAt = null
      }
      await permission.save()
    } else {
      // Create new permission
      permission = new ModulePermission({
        adminId,
        moduleName,
        enabled,
        enabledBy: enabled ? superAdminId : null,
        enabledAt: enabled ? now : null,
        disabledBy: enabled ? null : superAdminId,
        disabledAt: enabled ? null : now
      })
      await permission.save()
    }

    res.json({
      success: true,
      message: `Module ${moduleName} ${enabled ? 'enabled' : 'disabled'} for admin successfully`,
      permission: {
        adminId: permission.adminId.toString(),
        moduleName: permission.moduleName,
        enabled: permission.enabled,
        enabledBy: permission.enabledBy,
        enabledAt: permission.enabledAt,
        disabledBy: permission.disabledBy,
        disabledAt: permission.disabledAt
      }
    })
  } catch (error) {
    logger.error('Error updating module permission', { error: error.message, stack: error.stack })
    res.status(500).json({
      success: false,
      message: 'Failed to update module permission',
      error: error.message
    })
  }
})

// Bulk update module permissions for a specific admin (Super Admin only)
router.put('/admin/:adminId/bulk', authenticateSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params
    const { permissions } = req.body // { attendance: true, reports: false, ... }
    
    console.log('Bulk updating permissions for adminId:', adminId, 'permissions:', permissions)

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'permissions must be an object with module names as keys and boolean values'
      })
    }
    
    // Validate adminId format
    if (!adminId || adminId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      })
    }

    // Check if admin exists
    const admin = await Admin.findById(adminId)
    if (!admin) {
      console.error('Admin not found for bulk update:', adminId)
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      })
    }
    
    console.log('Admin found for bulk update:', { id: admin._id.toString(), username: admin.username })

    const MODULE_NAMES = ['attendance', 'gallery', 'reports', 'settings']
    const superAdminId = req.user.id
    const now = new Date()

    const results = []

    for (const [moduleName, enabled] of Object.entries(permissions)) {
      if (!MODULE_NAMES.includes(moduleName)) {
        continue // Skip invalid module names
      }

      if (typeof enabled !== 'boolean') {
        continue // Skip non-boolean values
      }

      let permission = await ModulePermission.findOne({ adminId, moduleName })

      if (permission) {
        permission.enabled = enabled
        if (enabled) {
          permission.enabledBy = superAdminId
          permission.enabledAt = now
          permission.disabledBy = null
          permission.disabledAt = null
        } else {
          permission.disabledBy = superAdminId
          permission.disabledAt = now
          permission.enabledBy = null
          permission.enabledAt = null
        }
        await permission.save()
      } else {
        permission = new ModulePermission({
          adminId,
          moduleName,
          enabled,
          enabledBy: enabled ? superAdminId : null,
          enabledAt: enabled ? now : null,
          disabledBy: enabled ? null : superAdminId,
          disabledAt: enabled ? null : now
        })
        await permission.save()
      }

      results.push({
        moduleName: permission.moduleName,
        enabled: permission.enabled
      })
    }

    res.json({
      success: true,
      message: 'Module permissions updated successfully',
      permissions: results
    })
  } catch (error) {
    logger.error('Error bulk updating module permissions', { error: error.message, stack: error.stack })
    res.status(500).json({
      success: false,
      message: 'Failed to update module permissions',
      error: error.message
    })
  }
})

module.exports = router


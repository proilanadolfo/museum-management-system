const express = require('express')
const router = express.Router()
const AuditLog = require('../models/AuditLog')
const { authenticateSuperAdmin } = require('../middleware/auth')
const logger = require('../utils/logger')

/**
 * GET /api/audit-logs
 * Get audit logs with pagination and filtering (Super Admin only)
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50, max: 200)
 *   - action: Filter by action (e.g., 'LOGIN', 'CREATE', 'UPDATE', 'DELETE')
 *   - resource: Filter by resource (e.g., 'AUTHENTICATION', 'ADMIN', 'BOOKING')
 *   - userId: Filter by user ID
 *   - userRole: Filter by user role ('admin' or 'superadmin')
 *   - startDate: Filter logs from this date (ISO format)
 *   - endDate: Filter logs until this date (ISO format)
 */
router.get('/audit-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      userId,
      userRole,
      startDate,
      endDate
    } = req.query

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    // Build filter object
    const filter = {}

    if (action) {
      filter.action = action.toUpperCase()
    }

    if (resource) {
      filter.resource = resource.toUpperCase()
    }

    if (userId) {
      filter.userId = userId
    }

    if (userRole) {
      if (['admin', 'superadmin'].includes(userRole.toLowerCase())) {
        filter.userRole = userRole.toLowerCase()
      }
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.timestamp = {}
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate)
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate)
      }
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 }) // Most recent first
        .limit(limitNum)
        .skip(skip)
        .lean(),
      AuditLog.countDocuments(filter)
    ])

    // Log the access (audit log viewing)
    logger.info('Audit logs accessed', {
      userId: req.user.id,
      username: req.user.username,
      filters: filter,
      page: pageNum,
      limit: limitNum
    })

    res.json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    })
  } catch (error) {
    logger.error('Error fetching audit logs', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics (Super Admin only)
 */
router.get('/audit-logs/stats', authenticateSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const dateFilter = {}
    if (startDate || endDate) {
      dateFilter.timestamp = {}
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate)
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate)
    }

    // Get statistics
    const [
      totalLogs,
      actionStats,
      resourceStats,
      roleStats,
      recentLogins
    ] = await Promise.all([
      // Total logs count
      AuditLog.countDocuments(dateFilter),
      
      // Action statistics
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Resource statistics
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Role statistics
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$userRole', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent logins (last 7 days)
      AuditLog.find({
        ...dateFilter,
        action: 'LOGIN',
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .select('username userRole timestamp ipAddress')
        .lean()
    ])

    res.json({
      success: true,
      stats: {
        totalLogs,
        actionStats,
        resourceStats,
        roleStats,
        recentLogins
      }
    })
  } catch (error) {
    logger.error('Error fetching audit log statistics', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router


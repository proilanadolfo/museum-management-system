/**
 * TBCC Routes
 * Endpoints for monitoring and managing TBCC transactions
 */

const express = require('express')
const { getTBCCStats, getTransactionStatus } = require('../middleware/tbcc')
const { authenticateAdminOrSuperAdmin } = require('../middleware/auth')

const router = express.Router()

/**
 * GET /api/tbcc/stats
 * Get TBCC statistics and recent logs
 */
router.get('/stats', authenticateAdminOrSuperAdmin, getTBCCStats)

/**
 * GET /api/tbcc/transaction/:transactionId
 * Get status of a specific transaction
 */
router.get('/transaction/:transactionId', authenticateAdminOrSuperAdmin, getTransactionStatus)

module.exports = router


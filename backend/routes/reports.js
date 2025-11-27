const express = require('express')
const router = express.Router()
const reportController = require('../controllers/reportController')
const { authenticateAdmin } = require('../middleware/auth')

// Export report as PDF (Admin only)
router.post('/reports/export', authenticateAdmin, reportController.exportReport)

// Preview report data (Admin only)
router.post('/reports/preview', authenticateAdmin, reportController.previewReport)

module.exports = router


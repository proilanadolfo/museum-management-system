const express = require('express')
const router = express.Router()
const reportController = require('../controllers/reportController')
const { authenticateAdmin } = require('../middleware/auth')
const { checkModuleAccess } = require('../middleware/moduleAccess')

// Export report as PDF (Admin only)
router.post('/reports/export', authenticateAdmin, checkModuleAccess('reports'), reportController.exportReport)

// Preview report data (Admin only)
router.post('/reports/preview', authenticateAdmin, checkModuleAccess('reports'), reportController.previewReport)

module.exports = router


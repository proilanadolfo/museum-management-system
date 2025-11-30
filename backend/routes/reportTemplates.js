const express = require('express')
const router = express.Router()
const reportTemplateController = require('../controllers/reportTemplateController')
const {
  authenticateAdminOrSuperAdmin,
  authenticateSuperAdmin
} = require('../middleware/auth')

// Get all templates (Admin or Super Admin)
router.get('/report-templates', authenticateAdminOrSuperAdmin, reportTemplateController.getAllTemplates)

// Get single template by ID (Admin or Super Admin)
router.get('/report-templates/:id', authenticateAdminOrSuperAdmin, reportTemplateController.getTemplateById)

// Create new template (Super Admin only)
router.post('/report-templates', authenticateSuperAdmin, reportTemplateController.createTemplate)

// Update template (Super Admin only)
router.put('/report-templates/:id', authenticateSuperAdmin, reportTemplateController.updateTemplate)

// Delete template (Super Admin only)
router.delete('/report-templates/:id', authenticateSuperAdmin, reportTemplateController.deleteTemplate)

module.exports = router

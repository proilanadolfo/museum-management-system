const express = require('express')
const router = express.Router()
const reportTemplateController = require('../controllers/reportTemplateController')
const { authenticateAdminOrSuperAdmin } = require('../middleware/auth')

// Get all templates
router.get('/report-templates', reportTemplateController.getAllTemplates)

// Get single template by ID
router.get('/report-templates/:id', reportTemplateController.getTemplateById)

// Create new template (Admin or Super Admin)
router.post('/report-templates', authenticateAdminOrSuperAdmin, reportTemplateController.createTemplate)

// Update template (Admin or Super Admin)
router.put('/report-templates/:id', authenticateAdminOrSuperAdmin, reportTemplateController.updateTemplate)

// Delete template (Admin or Super Admin)
router.delete('/report-templates/:id', authenticateAdminOrSuperAdmin, reportTemplateController.deleteTemplate)

module.exports = router

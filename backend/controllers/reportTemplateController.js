const ReportTemplate = require('../models/ReportTemplate')

// Get all templates
exports.getAllTemplates = async (req, res) => {
  try {
    // Note: Can't populate across different database connections
    // ReportTemplate is in bookingsConnection, SuperAdmin is in superAdminConnection
    // So we fetch templates without populate
    const templates = await ReportTemplate.find()
      .sort({ updatedAt: -1 })
      .lean() // Use lean() for better performance
    
    res.json({ success: true, templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates',
      error: error.message 
    })
  }
}

// Get single template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params
    const template = await ReportTemplate.findById(id).lean()
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }
    
    res.json({ success: true, template })
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch template' })
  }
}

// Create new template
exports.createTemplate = async (req, res) => {
  try {
    const { name, layout, createdBy } = req.body
    
    // Get createdBy from user (auth middleware) or request body
    const creatorId = req.user?.id || createdBy
    
    if (!name || !layout) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and layout are required' 
      })
    }
    
    if (!creatorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Creator ID is required' 
      })
    }
    
    const template = new ReportTemplate({
      name,
      layout,
      createdBy: creatorId
    })
    
    await template.save()
    
    res.status(201).json({ 
      success: true, 
      template,
      message: 'Template created successfully' 
    })
  } catch (error) {
    console.error('Error creating template:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template',
      error: error.message 
    })
  }
}

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { name, layout } = req.body
    
    const template = await ReportTemplate.findById(id)
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      })
    }
    
    // Check if user is the creator or super admin
    if (template.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this template' 
      })
    }
    
    if (name) template.name = name
    if (layout) template.layout = layout
    template.updatedAt = Date.now()
    
    await template.save()
    
    res.json({ 
      success: true, 
      template,
      message: 'Template updated successfully' 
    })
  } catch (error) {
    console.error('Error updating template:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template',
      error: error.message 
    })
  }
}

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params
    
    const template = await ReportTemplate.findById(id)
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      })
    }
    
    // Check if user is the creator or super admin
    if (template.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this template' 
      })
    }
    
    await ReportTemplate.findByIdAndDelete(id)
    
    res.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting template:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete template' 
    })
  }
}


const ReportTemplate = require('../models/ReportTemplate')
const mongoose = require('mongoose')

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
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    // Convert creatorId to ObjectId if it's a string
    let creatorObjectId
    try {
      creatorObjectId = mongoose.Types.ObjectId.isValid(creatorId) 
        ? new mongoose.Types.ObjectId(creatorId)
        : creatorId
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid creator ID format',
        error: err.message 
      })
    }
    
    const timestamp = Date.now()
    const template = new ReportTemplate({
      name,
      layout,
      createdBy: creatorObjectId,
      rts: timestamp,
      wts: timestamp
    })
    
    await template.save()
    
    res.status(201).json({ 
      success: true, 
      template,
      message: 'Template created successfully' 
    })
  } catch (error) {
    console.error('Error creating template:', error)
    console.error('Error stack:', error.stack)
    console.error('Request body:', JSON.stringify(req.body, null, 2))
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { name, layout, clientTimestamp } = req.body
    
    console.log('Updating template:', { id, name, hasLayout: !!layout, clientTimestamp })
    
    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Template ID is required'
      })
    }
    
    // Check if ID is valid ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid template ID format:', id)
      return res.status(400).json({
        success: false,
        message: 'Invalid template ID format'
      })
    }

    if (clientTimestamp === undefined || clientTimestamp === null) {
      return res.status(400).json({
        success: false,
        message: 'clientTimestamp is required for timestamp ordering'
      })
    }
    
    const template = await ReportTemplate.findById(id)
    
    if (!template) {
      console.error('Template not found:', id)
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      })
    }
    
    console.log('Template found:', { id: template._id.toString(), name: template.name })
    
    // Check if user is the creator or super admin
    if (template.createdBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this template' 
      })
    }
    
    const currentTimestamp = Math.max(
      template.wts || 0,
      template.updatedAt ? template.updatedAt.getTime() : 0
    )

    if (Number(clientTimestamp) < currentTimestamp) {
      return res.status(409).json({
        success: false,
        message: 'Your edit is outdated. Another user saved first.',
        currentTimestamp
      })
    }

    if (name) template.name = name
    if (layout) template.layout = layout
    const now = Date.now()
    template.updatedAt = now
    template.wts = now
    template.rts = Math.max(template.rts || 0, now)
    
    await template.save()
    
    res.json({ 
      success: true, 
      template,
      message: 'Template updated successfully',
      newTimestamp: template.wts
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


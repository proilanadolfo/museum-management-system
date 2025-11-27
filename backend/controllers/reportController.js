const ReportTemplate = require('../models/ReportTemplate')
const Attendance = require('../models/Attendance')
const { generateReportPDF } = require('../utils/pdfGenerator')

/**
 * Export report as PDF
 * POST /api/reports/export
 */
exports.exportReport = async (req, res) => {
  try {
    const { templateId, startDate, endDate, filters } = req.body
    
    // Get admin ID from user or request
    let adminId = req.user?.id
    if (!adminId) {
      // Fallback: get from stored user data (frontend sends it)
      const storedUser = req.body.adminId || req.query.adminId
      if (storedUser) {
        adminId = storedUser
      } else {
        return res.status(401).json({
          success: false,
          message: 'Admin ID is required'
        })
      }
    }

    // Validate template ID
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Template ID is required'
      })
    }

    // Load template
    const template = await ReportTemplate.findById(templateId)
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      })
    }

    // Build query for attendance data
    const query = { adminId }
    
    if (startDate && endDate) {
      query.checkInTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // Apply filters
    if (filters) {
      if (filters.type) {
        query.type = filters.type
      }
      if (filters.status) {
        query.status = filters.status
      }
      if (filters.department) {
        query.department = filters.department
      }
      if (filters.school) {
        query.school = filters.school
      }
      if (filters.grade) {
        query.grade = filters.grade
      }
    }

    // Fetch attendance data
    const attendanceData = await Attendance.find(query)
      .sort({ checkInTime: -1 })
      .lean()

    if (attendanceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the selected filters'
      })
    }

    // Generate PDF
    const pdfBuffer = await generateReportPDF(attendanceData, template.layout)

    // Set response headers
    const fileName = `Report-${template.name}-${new Date().toISOString().split('T')[0]}.pdf`
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    // Send PDF
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error exporting report:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report',
      error: error.message
    })
  }
}

/**
 * Preview report data (without generating PDF)
 * POST /api/reports/preview
 */
exports.previewReport = async (req, res) => {
  try {
    const { startDate, endDate, filters } = req.body
    
    // Get admin ID from user or request
    let adminId = req.user?.id
    if (!adminId) {
      // Fallback: get from stored user data (frontend sends it)
      const storedUser = req.body.adminId || req.query.adminId
      if (storedUser) {
        adminId = storedUser
      } else {
        return res.status(401).json({
          success: false,
          message: 'Admin ID is required'
        })
      }
    }

    // Build query
    const query = { adminId }
    
    if (startDate && endDate) {
      query.checkInTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // Apply filters
    if (filters) {
      if (filters.type) query.type = filters.type
      if (filters.status) query.status = filters.status
      if (filters.department) query.department = filters.department
      if (filters.school) query.school = filters.school
      if (filters.grade) query.grade = filters.grade
    }

    // Fetch data
    const data = await Attendance.find(query)
      .sort({ checkInTime: -1 })
      .limit(100) // Limit for preview
      .lean()

    res.json({
      success: true,
      data,
      count: data.length
    })
  } catch (error) {
    console.error('Error previewing report:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to preview report data',
      error: error.message
    })
  }
}


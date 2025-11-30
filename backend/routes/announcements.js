const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Announcement = require('../models/Announcement')
const { authenticateAdmin } = require('../middleware/auth')

const getRecordTimestamp = (record) =>
  Math.max(record.wts || 0, record.updatedAt ? record.updatedAt.getTime() : 0)

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/announcements'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'announcement-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})

// Get all active announcements (public endpoint - for guest page)
router.get('/announcements', async (req, res) => {
  try {
    const items = await Announcement.find({ isActive: true })
      .sort({ order: 1, date: -1 })
      .limit(10) // Limit to latest 10 announcements
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get all announcements (Admin only - includes inactive)
router.get('/announcements/admin', authenticateAdmin, async (req, res) => {
  try {
    const items = await Announcement.find()
      .sort({ order: 1, date: -1 })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get single announcement (Admin only)
router.get('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const item = await Announcement.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ success: false, message: 'Announcement not found' })
    }
    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create new announcement (Admin only)
router.post('/announcements', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, date, order, isActive } = req.body
    
    if (!title || !description || !date) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ success: false, message: 'Title, description, and date are required' })
    }
    
    const timestamp = Date.now()
    const announcement = new Announcement({
      title,
      description,
      date: new Date(date),
      image: req.file ? `/uploads/announcements/${req.file.filename}` : undefined,
      order: order ? parseInt(order) : 0,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      wts: timestamp,
      rts: timestamp
    })
    
    await announcement.save()
    res.status(201).json({ success: true, data: announcement })
  } catch (error) {
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path)
    }
    res.status(400).json({ success: false, message: error.message })
  }
})

// Update announcement (Admin only)
router.put('/announcements/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, date, isActive, order, clientTimestamp } = req.body
    const item = await Announcement.findById(req.params.id)
    
    if (!item) {
      // Delete uploaded file if item not found
      if (req.file) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(404).json({ success: false, message: 'Announcement not found' })
    }
    
    if (clientTimestamp === undefined || clientTimestamp === null) {
      if (req.file) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ success: false, message: 'clientTimestamp is required for timestamp ordering' })
    }

    const currentTimestamp = getRecordTimestamp(item)
    if (Number(clientTimestamp) < currentTimestamp) {
      if (req.file) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(409).json({
        success: false,
        message: 'Your edit is outdated. Another user saved first.',
        currentTimestamp
      })
    }

    // Update fields
    if (title !== undefined) item.title = title
    if (description !== undefined) item.description = description
    if (date !== undefined) item.date = new Date(date)
    if (order !== undefined) item.order = parseInt(order) || 0
    if (isActive !== undefined) {
      item.isActive = isActive === 'true' || isActive === true
    }
    
    // If new image is uploaded, delete old one and update
    if (req.file) {
      // Delete old image if it exists
      if (item.image) {
        const oldImagePath = path.join(__dirname, '..', item.image)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }
      item.image = `/uploads/announcements/${req.file.filename}`
    }
    
    const now = Date.now()
    item.wts = now
    item.rts = Math.max(item.rts || 0, now)
    
    await item.save()
    res.json({ success: true, data: item, newTimestamp: item.wts })
  } catch (error) {
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path)
    }
    res.status(400).json({ success: false, message: error.message })
  }
})

// Delete announcement (Admin only)
router.delete('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { clientTimestamp } = req.body || {}
    const item = await Announcement.findById(req.params.id)
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Announcement not found' })
    }

    if (clientTimestamp === undefined || clientTimestamp === null) {
      return res.status(400).json({ success: false, message: 'clientTimestamp is required for timestamp ordering' })
    }

    const currentTimestamp = getRecordTimestamp(item)
    if (Number(clientTimestamp) < currentTimestamp) {
      return res.status(409).json({
        success: false,
        message: 'Your edit is outdated. Another user saved first.',
        currentTimestamp
      })
    }
    
    // Delete image file if it exists
    if (item.image) {
      const imagePath = path.join(__dirname, '..', item.image)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }
    
    await Announcement.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Announcement deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router


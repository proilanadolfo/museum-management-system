const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Gallery = require('../models/Gallery')
const { authenticateAdmin } = require('../middleware/auth')
const { checkModuleAccess } = require('../middleware/moduleAccess')

const getRecordTimestamp = (record) =>
  Math.max(record.wts || 0, record.updatedAt ? record.updatedAt.getTime() : 0)

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/gallery'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname))
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

// Get all gallery items (public endpoint - for guest page)
router.get('/gallery', async (req, res) => {
  try {
    const items = await Gallery.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get all gallery items (Admin only - includes inactive)
router.get('/gallery/admin', authenticateAdmin, checkModuleAccess('gallery'), async (req, res) => {
  try {
    const items = await Gallery.find()
      .sort({ order: 1, createdAt: -1 })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get single gallery item (Admin only)
router.get('/gallery/:id', authenticateAdmin, checkModuleAccess('gallery'), async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' })
    }
    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create new gallery item (Admin only)
router.post('/gallery', authenticateAdmin, checkModuleAccess('gallery'), upload.single('image'), async (req, res) => {
  try {
    const { title, category, description, year, order } = req.body
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' })
    }
    
    const timestamp = Date.now()
    const galleryItem = new Gallery({
      title,
      category,
      description,
      image: `/uploads/gallery/${req.file.filename}`,
      year: year || '',
      order: order ? parseInt(order) : 0,
      wts: timestamp,
      rts: timestamp
    })
    
    await galleryItem.save()
    res.status(201).json({ success: true, data: galleryItem })
  } catch (error) {
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path)
    }
    res.status(400).json({ success: false, message: error.message })
  }
})

// Update gallery item (Admin only)
router.put('/gallery/:id', authenticateAdmin, checkModuleAccess('gallery'), upload.single('image'), async (req, res) => {
  try {
    const { title, category, description, year, isActive, order, clientTimestamp } = req.body
    const item = await Gallery.findById(req.params.id)
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' })
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
    item.title = title || item.title
    item.category = category || item.category
    item.description = description || item.description
    item.year = year !== undefined ? year : item.year
    item.order = order !== undefined ? parseInt(order) : item.order
    
    if (isActive !== undefined) {
      item.isActive = isActive === 'true' || isActive === true
    }
    
    // If new image is uploaded, delete old one and update
    if (req.file) {
      // Delete old image
      const oldImagePath = path.join(__dirname, '..', item.image)
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath)
      }
      item.image = `/uploads/gallery/${req.file.filename}`
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

// Delete gallery item (Admin only)
router.delete('/gallery/:id', authenticateAdmin, checkModuleAccess('gallery'), async (req, res) => {
  try {
    const { clientTimestamp } = req.body || {}
    const item = await Gallery.findById(req.params.id)
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' })
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
    
    // Delete image file
    const imagePath = path.join(__dirname, '..', item.image)
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
    }
    
    await Gallery.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Gallery item deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router


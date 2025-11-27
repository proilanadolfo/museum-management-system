const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const MuseumSettings = require('../models/MuseumSettings')
const Booking = require('../models/Booking')
const { broadcastSettingsUpdate } = require('../utils/sseBroadcaster')
const { authenticateAdmin, authenticateSuperAdmin } = require('../middleware/auth')

const router = express.Router()

const MIN_ROTATION_INTERVAL = 3000
const MAX_ROTATION_INTERVAL = 20000
const DEFAULT_ROTATION_INTERVAL = 6000
const MAX_MISSION_IMAGES = 6

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'), false)
  }
}

const getMissionDefaults = () => (
  typeof MuseumSettings.getDefaultMissionSection === 'function'
    ? MuseumSettings.getDefaultMissionSection()
    : {
        heading: 'Our Commitment',
        title: 'Preserving History, Inspiring Future',
        description: 'We are dedicated to the preservation, protection, and promotion of cultural heritage through rigorous scholarship, innovative education, and meaningful community engagement.',
        rotationInterval: DEFAULT_ROTATION_INTERVAL,
        stats: [
          { label: 'Years of Excellence', value: 25, suffix: '' },
          { label: 'Active Programs', value: 15, suffix: '' },
          { label: 'Research Studies', value: 500, suffix: '+' }
        ],
        images: []
      }
)

const getMissionStatsDefaults = () => (
  typeof MuseumSettings.getDefaultMissionStats === 'function'
    ? MuseumSettings.getDefaultMissionStats()
    : [
        { label: 'Years of Excellence', value: 25, suffix: '' },
        { label: 'Active Programs', value: 15, suffix: '' },
        { label: 'Research Studies', value: 500, suffix: '+' }
      ]
)

const clampRotationInterval = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) {
    return DEFAULT_ROTATION_INTERVAL
  }
  return Math.min(Math.max(num, MIN_ROTATION_INTERVAL), MAX_ROTATION_INTERVAL)
}

const formatMissionSection = (section = {}) => {
  const defaults = getMissionDefaults()
  const statsDefaults = getMissionStatsDefaults()
  const stats = Array.isArray(section.stats) && section.stats.length
    ? section.stats.map((stat, idx) => ({
        _id: stat._id ? String(stat._id) : String(idx),
        label: stat.label || '',
        value: Number(stat.value) || 0,
        suffix: stat.suffix || ''
      }))
    : statsDefaults

  const images = Array.isArray(section.images)
    ? section.images
        .map((img, idx) => ({
          _id: img._id ? String(img._id) : String(idx),
          url: img.url,
          caption: img.caption || '',
          order: typeof img.order === 'number' ? img.order : idx
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []

  return {
    heading: section.heading || defaults.heading,
    title: section.title || defaults.title,
    description: section.description || defaults.description,
    rotationInterval: clampRotationInterval(section.rotationInterval ?? defaults.rotationInterval),
    stats,
    images
  }
}

const sanitizeMissionSectionPayload = (incoming = {}, currentSection = {}) => {
  const defaults = getMissionDefaults()
  const statsDefaults = getMissionStatsDefaults()
  const baseSection = currentSection && typeof currentSection.toObject === 'function'
    ? currentSection.toObject()
    : { ...currentSection }

  const sanitized = {
    heading: baseSection.heading || defaults.heading,
    title: baseSection.title || defaults.title,
    description: baseSection.description || defaults.description,
    rotationInterval: clampRotationInterval(baseSection.rotationInterval ?? defaults.rotationInterval),
    stats: Array.isArray(baseSection.stats) ? baseSection.stats.map(stat => ({ ...stat })) : statsDefaults.map(stat => ({ ...stat })),
    images: Array.isArray(baseSection.images) ? baseSection.images.map(img => ({ ...img })) : []
  }

  if (incoming.heading !== undefined) {
    sanitized.heading = String(incoming.heading).trim() || defaults.heading
  }
  if (incoming.title !== undefined) {
    sanitized.title = String(incoming.title).trim() || defaults.title
  }
  if (incoming.description !== undefined) {
    sanitized.description = String(incoming.description).trim() || defaults.description
  }
  if (incoming.rotationInterval !== undefined) {
    sanitized.rotationInterval = clampRotationInterval(incoming.rotationInterval)
  }

  if (Array.isArray(incoming.stats)) {
    const mappedStats = incoming.stats
      .filter(Boolean)
      .map((stat, idx) => {
        const defaultStat = statsDefaults[idx % statsDefaults.length]
        const numericValue = Number(stat.value)
        return {
          _id: stat._id,
          label: String(stat.label || '').trim() || defaultStat.label,
          value: Number.isNaN(numericValue) ? defaultStat.value : numericValue,
          suffix: String(stat.suffix || '').trim()
        }
      })
      .filter(stat => stat.label)
    sanitized.stats = mappedStats.length ? mappedStats : statsDefaults.map(stat => ({ ...stat }))
  }

  if (Array.isArray(incoming.images)) {
    sanitized.images = incoming.images
      .filter(img => img && img.url)
      .map((img, idx) => ({
        _id: img._id,
        url: img.url,
        caption: String(img.caption || '').trim(),
        order: typeof img.order === 'number' ? img.order : idx
      }))
  } else if (!Array.isArray(sanitized.images)) {
    sanitized.images = []
  }

  return sanitized
}

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/logos/'
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-logo-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const logoUpload = multer({ 
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
})

const missionImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = 'uploads/mission'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'mission-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const missionImageUpload = multer({
  storage: missionImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: imageFileFilter
})

// Get museum settings (Admin only)
router.get('/museum-settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()
    
    // Convert Map to object for JSON response
    const operatingHoursObj = {}
    if (settings.operatingHours) {
      settings.operatingHours.forEach((value, key) => {
        // Convert key to string to ensure consistent JSON serialization
        operatingHoursObj[String(key)] = value
      })
    }
    // Ensure all days (0-6) are present with defaults if missing
    for (let day = 0; day <= 6; day++) {
      const dayStr = String(day)
      if (!operatingHoursObj[dayStr]) {
        operatingHoursObj[dayStr] = day >= 1 && day <= 5 
          ? { open: '09:00', close: '18:00' }
          : { open: '10:00', close: '17:00' }
      }
    }

    res.json({
      success: true,
      data: {
        ...settings.toObject(),
        operatingHours: operatingHoursObj,
        profileLogo: settings.profileLogo,
        missionSection: formatMissionSection(settings.missionSection)
      }
    })
  } catch (error) {
    console.error('Get museum settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve museum settings'
    })
  }
})

// Public museum settings for guests (no auth, safe subset)
router.get('/museum-settings/public', async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()

    const operatingHoursObj = {}
    if (settings.operatingHours) {
      settings.operatingHours.forEach((value, key) => {
        operatingHoursObj[String(key)] = value
      })
    }
    for (let day = 0; day <= 6; day++) {
      const dayStr = String(day)
      if (!operatingHoursObj[dayStr]) {
        operatingHoursObj[dayStr] = day >= 1 && day <= 5
          ? { open: '09:00', close: '18:00' }
          : { open: '10:00', close: '17:00' }
      }
    }

    res.json({
      success: true,
      data: {
        availableDays: settings.availableDays,
        operatingHours: operatingHoursObj,
        blockedDates: settings.blockedDates,
        availableDates: settings.availableDates,
        timeSlots: settings.timeSlots,
        minAdvanceBookingDays: settings.minAdvanceBookingDays,
        maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
        maxVisitorsPerSlot: settings.maxVisitorsPerSlot,
        isAcceptingBookings: settings.isAcceptingBookings,
        mission: settings.mission,
        vision: settings.vision,
        profileLogo: settings.profileLogo,
        missionSection: formatMissionSection(settings.missionSection)
      }
    })
  } catch (error) {
    console.error('Get public museum settings error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve museum settings'
    })
  }
})

// Update museum settings (Admin only)
router.put('/museum-settings', authenticateAdmin, async (req, res) => {
  try {
    const {
      availableDays,
      operatingHours,
      blockedDates,
      availableDates,
      timeSlots,
      minAdvanceBookingDays,
      maxAdvanceBookingDays,
      maxVisitorsPerSlot,
      isAcceptingBookings,
      mission,
      vision,
      missionSection
    } = req.body

    // Helpers
    const toNumberArray = (arr) => {
      if (!Array.isArray(arr)) return undefined
      return arr
        .map(v => (typeof v === 'string' ? v.trim() : v))
        .filter(v => v !== '' && v !== null && v !== undefined)
        .map(v => Number(v))
        .filter(v => !Number.isNaN(v))
    }

    const normalizeTime = (str) => {
      if (!str) return undefined
      let s = String(str).trim().toLowerCase()
      // If already HH:MM 24h
      const m1 = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
      if (m1) return `${m1[1].padStart(2,'0')}:${m1[2]}`
      // Convert 12h like 10:00 am / 5:00 pm
      const m2 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
      if (m2) {
        let hh = parseInt(m2[1], 10)
        const mm = m2[2]
        const ap = m2[3]
        if (ap === 'pm' && hh < 12) hh += 12
        if (ap === 'am' && hh === 12) hh = 0
        return `${String(hh).padStart(2,'0')}:${mm}`
      }
      // Fallback: extract first HH:MM
      const m3 = s.match(/(\d{1,2}):(\d{2})/)
      if (m3) return `${String(parseInt(m3[1],10)).padStart(2,'0')}:${m3[2]}`
      return undefined
    }

    let settings = await MuseumSettings.findOne()
    
    if (!settings) {
      settings = new MuseumSettings()
    }

    // Update fields if provided
    if (availableDays !== undefined) {
      const days = toNumberArray(availableDays)
      if (days && days.length >= 0) {
        settings.availableDays = days
      }
    }
    if (operatingHours !== undefined) {
      // Normalize existing operatingHours to a Map if it's a plain object
      const toMap = (val) => {
        if (val instanceof Map) return val
        const map = new Map()
        if (val && typeof val === 'object') {
          Object.entries(val).forEach(([k, v]) => {
            const dayNum = parseInt(k)
            if (!Number.isNaN(dayNum)) map.set(dayNum, v)
          })
        }
        return map
      }
      settings.operatingHours = toMap(settings.operatingHours)

      // Preserve existing hours and update only provided ones
      if (!settings.operatingHours || settings.operatingHours.size === 0) {
        // Initialize with defaults if empty
        const defaultHours = new Map()
        defaultHours.set('1', { open: '09:00', close: '18:00' })
        defaultHours.set('2', { open: '09:00', close: '18:00' })
        defaultHours.set('3', { open: '09:00', close: '18:00' })
        defaultHours.set('4', { open: '09:00', close: '18:00' })
        defaultHours.set('5', { open: '09:00', close: '18:00' })
        defaultHours.set('6', { open: '10:00', close: '17:00' })
        defaultHours.set('0', { open: '10:00', close: '17:00' })
        settings.operatingHours = defaultHours
      }
      
      // Update only the provided hours, preserve others
      let modified = false
      Object.entries(operatingHours).forEach(([day, hours]) => {
        const dayNum = parseInt(day)
        if (Number.isNaN(dayNum) || dayNum < 0 || dayNum > 6) return
        const key = String(dayNum)
        if (hours && (hours.open || hours.close)) {
          const existing = settings.operatingHours.get(key) || { open: '09:00', close: '18:00' }
          const open = normalizeTime(hours.open) || existing.open
          const close = normalizeTime(hours.close) || existing.close
          settings.operatingHours.set(key, {
            open,
            close
          })
          modified = true
        }
      })
      if (modified) {
        settings.markModified('operatingHours')
      }
    }
    if (blockedDates !== undefined) {
      settings.blockedDates = blockedDates.map(date => new Date(date))
    }
    if (availableDates !== undefined) {
      settings.availableDates = availableDates.map(date => new Date(date))
    }
    if (timeSlots !== undefined) {
      settings.timeSlots = timeSlots
    }
    if (minAdvanceBookingDays !== undefined) {
      settings.minAdvanceBookingDays = minAdvanceBookingDays
    }
    if (maxAdvanceBookingDays !== undefined) {
      settings.maxAdvanceBookingDays = maxAdvanceBookingDays
    }
    if (maxVisitorsPerSlot !== undefined) {
      settings.maxVisitorsPerSlot = maxVisitorsPerSlot
    }
    if (isAcceptingBookings !== undefined) {
      settings.isAcceptingBookings = isAcceptingBookings
    }
    if (mission !== undefined) {
      settings.mission = String(mission).trim()
    }
    if (vision !== undefined) {
      settings.vision = String(vision).trim()
    }
    if (missionSection !== undefined) {
      const sanitizedSection = sanitizeMissionSectionPayload(
        missionSection,
        settings.missionSection || getMissionDefaults()
      )
      settings.missionSection = sanitizedSection
      settings.markModified('missionSection')
    }

    await settings.save()

    // Convert Map to object for JSON response
    const operatingHoursObj = {}
    if (settings.operatingHours) {
      settings.operatingHours.forEach((value, key) => {
        // Convert key to string to ensure consistent JSON serialization
        operatingHoursObj[String(key)] = value
      })
    }
    // Ensure all days (0-6) are present with defaults if missing
    for (let day = 0; day <= 6; day++) {
      const dayStr = String(day)
      if (!operatingHoursObj[dayStr]) {
        operatingHoursObj[dayStr] = day >= 1 && day <= 5 
          ? { open: '09:00', close: '18:00' }
          : { open: '10:00', close: '17:00' }
      }
    }

    const responseData = {
      ...settings.toObject(),
      operatingHours: operatingHoursObj,
      missionSection: formatMissionSection(settings.missionSection)
    }

    // Broadcast real-time settings update (safe subset for guests/admins)
    try {
      broadcastSettingsUpdate({
        action: 'updated',
        settings: {
          availableDays: responseData.availableDays,
          operatingHours: responseData.operatingHours,
          blockedDates: responseData.blockedDates,
          availableDates: responseData.availableDates,
          timeSlots: responseData.timeSlots,
          minAdvanceBookingDays: responseData.minAdvanceBookingDays,
          maxAdvanceBookingDays: responseData.maxAdvanceBookingDays,
          maxVisitorsPerSlot: responseData.maxVisitorsPerSlot,
          isAcceptingBookings: responseData.isAcceptingBookings,
          mission: responseData.mission,
          vision: responseData.vision,
          missionSection: responseData.missionSection
        }
      })
    } catch (broadcastError) {
      console.error('Error broadcasting museum settings update:', broadcastError)
    }

    res.json({
      success: true,
      message: 'Museum settings updated successfully',
      data: responseData
    })
  } catch (error) {
    console.error('Update museum settings error:', error)
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update museum settings'
    })
  }
})

router.post('/museum-settings/mission-images', authenticateAdmin, missionImageUpload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image uploaded'
    })
  }

  try {
    const settings = await MuseumSettings.getSettings()
    if (!settings.missionSection) {
      settings.missionSection = getMissionDefaults()
    }
    if (!Array.isArray(settings.missionSection.images)) {
      settings.missionSection.images = []
    }
    if (settings.missionSection.images.length >= MAX_MISSION_IMAGES) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (cleanupError) {
        console.error('Error cleaning up mission image file:', cleanupError)
      }
      return res.status(400).json({
        success: false,
        message: `You can only upload up to ${MAX_MISSION_IMAGES} mission images`
      })
    }

    const orders = settings.missionSection.images.map(img => (typeof img.order === 'number' ? img.order : 0))
    const nextOrder = orders.length ? Math.max(...orders) + 1 : 0

    settings.missionSection.images.push({
      url: req.file.path,
      caption: req.body.caption ? String(req.body.caption).trim() : '',
      order: nextOrder
    })

    settings.markModified('missionSection')
    await settings.save()

    const missionSection = formatMissionSection(settings.missionSection)

    try {
      broadcastSettingsUpdate({
        action: 'updated',
        settings: {
          missionSection
        }
      })
    } catch (broadcastError) {
      console.error('Error broadcasting mission image upload:', broadcastError)
    }

    res.json({
      success: true,
      message: 'Mission image uploaded successfully',
      data: {
        missionSection
      }
    })
  } catch (error) {
    console.error('Mission image upload error:', error)
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('Error cleaning up mission image file:', unlinkError)
      }
    }
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to upload mission image'
    })
  }
})

router.delete('/museum-settings/mission-images/:imageId', authenticateAdmin, async (req, res) => {
  try {
    const { imageId } = req.params
    const debugLine = `[${new Date().toISOString()}] DELETE mission image: ${imageId}\n`
    try {
      fs.appendFileSync(path.join(process.cwd(), 'mission-image-debug.log'), debugLine)
    } catch (debugErr) {
      console.error('Failed writing mission-image-debug.log:', debugErr)
    }
    console.log(`DELETE request for mission image ID: ${imageId}`)
    
    const settings = await MuseumSettings.getSettings()

    if (!settings.missionSection) {
      settings.missionSection = {
        heading: 'Our Commitment',
        title: 'Preserving History, Inspiring Future', 
        description: 'We are dedicated to the preservation, protection, and promotion of cultural heritage through rigorous scholarship, innovative education, and meaningful community engagement.',
        rotationInterval: 6000,
        stats: [
          { label: 'Years of Excellence', value: 25, suffix: '' },
          { label: 'Active Programs', value: 15, suffix: '' },
          { label: 'Research Studies', value: 500, suffix: '+' }
        ],
        images: []
      }
      settings.markModified('missionSection')
      await settings.save()
    }

    if (!Array.isArray(settings.missionSection.images)) {
      settings.missionSection.images = []
      settings.markModified('missionSection')
      await settings.save()
    }

    console.log('Current mission images:', settings.missionSection.images.length)

    if (settings.missionSection.images.length === 0) {
      console.log('No mission images to delete')
      return res.status(404).json({
        success: false,
        message: 'No mission images found to delete'
      })
    }

    const imageIndex = settings.missionSection.images.findIndex(img => {
      const imgId = img._id
      if (imgId && typeof imgId.toString === 'function') {
        return imgId.toString() === imageId
      }
      return String(imgId) === imageId
    })
    
    if (imageIndex === -1) {
      console.log(`Mission image not found. Looking for ID: ${imageId}`)
      console.log('Available images:', settings.missionSection.images.map(img => ({ 
        _id: img._id, 
        idType: typeof img._id, 
        toString: img._id?.toString?.() 
      })))
      return res.status(404).json({
        success: false,
        message: 'Mission image not found'
      })
    }

    const [removedImage] = settings.missionSection.images.splice(imageIndex, 1)
    settings.missionSection.images.forEach((img, idx) => {
      img.order = idx
    })

    settings.markModified('missionSection')
    await settings.save()

    if (removedImage?.url) {
      const normalizedRelativePath = removedImage.url.replace(/\\/g, path.sep)
      const fullPath = path.join(process.cwd(), normalizedRelativePath)
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath)
        } catch (unlinkErr) {
          console.error('Error deleting mission image file:', unlinkErr)
        }
      } else {
        console.warn('Mission image file not found on disk:', fullPath)
      }
    }

    const missionSection = formatMissionSection(settings.missionSection)

    try {
      broadcastSettingsUpdate({
        action: 'updated',
        settings: {
          missionSection
        }
      })
    } catch (broadcastError) {
      console.error('Error broadcasting mission image delete:', broadcastError)
    }

    res.json({
      success: true,
      message: 'Mission image removed successfully',
      data: {
        missionSection
      }
    })
  } catch (error) {
    const errorDebug = `[${new Date().toISOString()}] DELETE mission image error: ${error?.stack || error}\n`
    try {
      fs.appendFileSync(path.join(process.cwd(), 'mission-image-debug.log'), errorDebug)
    } catch (debugErr) {
      console.error('Failed writing mission-image-debug.log:', debugErr)
    }
    console.error('Delete mission image error:', error)
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to delete mission image'
    })
  }
})

// Get available dates for booking (used by guest booking form)
router.get('/museum-settings/available-dates', async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()
    const availableDatesList = []

    // Get date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() + settings.minAdvanceBookingDays)
    
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays)

    // Generate available dates
    for (let date = new Date(minDate); date <= maxDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay()
      const dateStr = date.toISOString().split('T')[0]
      const dateObj = new Date(date)

      // Check if date is blocked
      const isBlocked = settings.blockedDates.some(blockedDate => {
        const blocked = new Date(blockedDate)
        blocked.setHours(0, 0, 0, 0)
        return blocked.getTime() === dateObj.getTime()
      })

      // Check if date is in availableDates (override)
      const isInAvailableDates = settings.availableDates.some(availDate => {
        const avail = new Date(availDate)
        avail.setHours(0, 0, 0, 0)
        return avail.getTime() === dateObj.getTime()
      })

      // If explicitly in availableDates, include it
      if (isInAvailableDates) {
        const hours = settings.operatingHours.get(String(dayOfWeek)) || { open: '09:00', close: '18:00' }
        availableDatesList.push({
          date: dateStr,
          dayOfWeek: dayOfWeek,
          open: hours.open,
          close: hours.close,
          available: true
        })
      }
      // If not blocked and day is available
      else if (!isBlocked && settings.availableDays.includes(dayOfWeek)) {
        const hours = settings.operatingHours.get(String(dayOfWeek))
        if (hours && hours.open && hours.close) {
          availableDatesList.push({
            date: dateStr,
            dayOfWeek: dayOfWeek,
            open: hours.open,
            close: hours.close,
            available: true
          })
        }
      }
    }

    res.json({
      success: true,
      data: availableDatesList
    })
  } catch (error) {
    console.error('Get available dates error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available dates'
    })
  }
})

// Get available time slots for a specific date
router.get('/museum-settings/available-times/:date', async (req, res) => {
  try {
    const { date } = req.params
    const requestedDate = new Date(date)
    const dayOfWeek = requestedDate.getDay()
    
    const settings = await MuseumSettings.getSettings()
    
    // Get operating hours for this day
    const hours = settings.operatingHours.get(String(dayOfWeek)) || { open: '09:00', close: '18:00' }
    
    // Generate time slots
    let availableSlots = []
    
    if (settings.timeSlots.length > 0) {
      // Use predefined time slots
      availableSlots = settings.timeSlots.filter(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number)
        const [openHour, openMinute] = hours.open.split(':').map(Number)
        const [closeHour, closeMinute] = hours.close.split(':').map(Number)
        
        const slotTime = slotHour * 60 + slotMinute
        const openTime = openHour * 60 + openMinute
        const closeTime = closeHour * 60 + closeMinute
        
        return slotTime >= openTime && slotTime <= closeTime
      })
    } else {
      // Generate hourly slots between open and close
      const [openHour, openMinute] = hours.open.split(':').map(Number)
      const [closeHour, closeMinute] = hours.close.split(':').map(Number)
      
      let currentHour = openHour
      let currentMinute = openMinute
      
      while (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute)) {
        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
        availableSlots.push(timeStr)
        
        currentMinute += 60 // Add 1 hour
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60)
          currentMinute = currentMinute % 60
        }
      }
    }
    
    // Check existing bookings for this date to see which slots are full
    const startOfDay = new Date(requestedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(requestedDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    const bookings = await Booking.find({
      visitDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    })
    
    // Count visitors per time slot (if visitDate includes time)
    const slotCounts = {}
    availableSlots.forEach(slot => {
      slotCounts[slot] = 0
    })
    
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.visitDate)
      const bookingTime = `${String(bookingDate.getHours()).padStart(2, '0')}:${String(bookingDate.getMinutes()).padStart(2, '0')}`
      
      if (slotCounts[bookingTime] !== undefined) {
        slotCounts[bookingTime] += booking.numberOfVisitors
      }
    })
    
    // Filter out full slots
    const availableSlotsWithAvailability = availableSlots.map(slot => ({
      time: slot,
      available: slotCounts[slot] < settings.maxVisitorsPerSlot,
      currentBookings: slotCounts[slot] || 0,
      maxVisitors: settings.maxVisitorsPerSlot
    }))
    
    res.json({
      success: true,
      data: {
        date: date,
        dayOfWeek: dayOfWeek,
        operatingHours: hours,
        slots: availableSlotsWithAvailability
      }
    })
  } catch (error) {
    console.error('Get available times error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available times'
    })
  }
})

// Upload profile logo (SuperAdmin only)
router.post('/museum-settings/profile-logo', authenticateSuperAdmin, logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    const settings = await MuseumSettings.getSettings()
    
    // Delete old logo if it exists
    if (settings.profileLogo) {
      const oldLogoPath = settings.profileLogo
      // Check if it's a relative path (starts with uploads/)
      if (oldLogoPath.startsWith('uploads/')) {
        const fullPath = path.join(process.cwd(), oldLogoPath)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      }
    }

    // Save new logo path (relative to project root)
    settings.profileLogo = req.file.path
    await settings.save()

    // Broadcast logo update
    try {
      broadcastSettingsUpdate({
        action: 'logo_updated',
        profileLogo: settings.profileLogo
      })
    } catch (broadcastError) {
      console.error('Error broadcasting logo update:', broadcastError)
    }

    res.json({
      success: true,
      message: 'Profile logo uploaded successfully',
      data: {
        profileLogo: settings.profileLogo
      }
    })
  } catch (error) {
    console.error('Upload profile logo error:', error)
    
    // Delete uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError)
      }
    }
    
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to upload profile logo'
    })
  }
})

// Delete profile logo (SuperAdmin only)
router.delete('/museum-settings/profile-logo', authenticateSuperAdmin, async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()
    
    if (!settings.profileLogo) {
      return res.status(404).json({
        success: false,
        message: 'No profile logo found'
      })
    }

    // Delete logo file
    const logoPath = settings.profileLogo
    if (logoPath.startsWith('uploads/')) {
      const fullPath = path.join(process.cwd(), logoPath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }
    }

    // Clear logo path
    settings.profileLogo = null
    await settings.save()

    // Broadcast logo deletion
    try {
      broadcastSettingsUpdate({
        action: 'logo_deleted'
      })
    } catch (broadcastError) {
      console.error('Error broadcasting logo deletion:', broadcastError)
    }

    res.json({
      success: true,
      message: 'Profile logo deleted successfully'
    })
  } catch (error) {
    console.error('Delete profile logo error:', error)
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to delete profile logo'
    })
  }
})

module.exports = router


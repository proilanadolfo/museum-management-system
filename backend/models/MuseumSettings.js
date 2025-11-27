const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const getDefaultMissionStats = () => ([
  { label: 'Years of Excellence', value: 25, suffix: '' },
  { label: 'Active Programs', value: 15, suffix: '' },
  { label: 'Research Studies', value: 500, suffix: '+' }
])

const getDefaultMissionSection = () => ({
  heading: 'Our Commitment',
  title: 'Preserving History, Inspiring Future',
  description: 'We are dedicated to the preservation, protection, and promotion of cultural heritage through rigorous scholarship, innovative education, and meaningful community engagement.',
  rotationInterval: 6000,
  stats: getDefaultMissionStats(),
  images: []
})

const missionStatSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    value: { type: Number, default: 0 },
    suffix: { type: String, default: '' }
  },
  { _id: true }
)

const missionImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    order: { type: Number, default: 0 }
  },
  { _id: true }
)

const missionSectionSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      default: () => getDefaultMissionSection().heading
    },
    title: {
      type: String,
      default: () => getDefaultMissionSection().title
    },
    description: {
      type: String,
      default: () => getDefaultMissionSection().description
    },
    rotationInterval: {
      type: Number,
      default: () => getDefaultMissionSection().rotationInterval
    },
    stats: {
      type: [missionStatSchema],
      default: getDefaultMissionStats
    },
    images: {
      type: [missionImageSchema],
      default: () => []
    }
  },
  { _id: false }
)

const museumSettingsSchema = new mongoose.Schema(
  {
    // Available days of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    availableDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Monday to Friday by default
      required: true
    },
    // Operating hours per day
    operatingHours: {
      type: Map,
      of: {
        open: { type: String, default: '09:00' }, // e.g., "09:00"
        close: { type: String, default: '18:00' } // e.g., "18:00"
      },
      default: function() {
        const defaultMap = new Map()
        defaultMap.set('1', { open: '09:00', close: '18:00' }) // Monday
        defaultMap.set('2', { open: '09:00', close: '18:00' }) // Tuesday
        defaultMap.set('3', { open: '09:00', close: '18:00' }) // Wednesday
        defaultMap.set('4', { open: '09:00', close: '18:00' }) // Thursday
        defaultMap.set('5', { open: '09:00', close: '18:00' }) // Friday
        defaultMap.set('6', { open: '10:00', close: '17:00' }) // Saturday
        defaultMap.set('0', { open: '10:00', close: '17:00' }) // Sunday
        return defaultMap
      }
    },
    // Specific blocked dates (holidays, maintenance, etc.)
    blockedDates: {
      type: [Date],
      default: []
    },
    // Specific available dates (override regular schedule)
    availableDates: {
      type: [Date],
      default: []
    },
    // Time slots for bookings (e.g., hourly slots)
    timeSlots: {
      type: [String], // e.g., ["09:00", "10:00", "11:00", ...]
      default: []
    },
    // Minimum advance booking time (in days)
    minAdvanceBookingDays: {
      type: Number,
      default: 1
    },
    // Maximum advance booking time (in days)
    maxAdvanceBookingDays: {
      type: Number,
      default: 90
    },
    // Maximum visitors per time slot
    maxVisitorsPerSlot: {
      type: Number,
      default: 50
    },
    // Whether museum is currently accepting bookings
    isAcceptingBookings: {
      type: Boolean,
      default: true
    },
    // Google Calendar Integration
    googleCalendarEnabled: {
      type: Boolean,
      default: false
    },
    googleCalendarTokens: {
      type: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number
      },
      default: null
    },
    googleCalendarEmail: {
      type: String,
      default: null
    },
    // Museum Information
    mission: {
      type: String,
      default: 'We are dedicated to preserving, interpreting, and sharing the rich cultural heritage of our community. Through engaging exhibits, educational programs, and community partnerships, we inspire visitors to connect with history and appreciate the diversity of human experience.'
    },
    vision: {
      type: String,
      default: 'To be a leading cultural institution that serves as a bridge between past and present, fostering understanding, appreciation, and celebration of our shared heritage while inspiring future generations to value and preserve cultural diversity.'
    },
    // Profile Logo for all pages (SuperAdmin, Admin, Guest)
    profileLogo: {
      type: String,
      default: null // Path to uploaded logo file
    },
    missionSection: {
      type: missionSectionSchema,
      default: getDefaultMissionSection
    }
  },
  { timestamps: true }
)

// Ensure only one settings document exists
museumSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne()
  if (!settings) {
    // Initialize with default operating hours
    const defaultHours = new Map()
    defaultHours.set('1', { open: '09:00', close: '18:00' }) // Monday
    defaultHours.set('2', { open: '09:00', close: '18:00' }) // Tuesday
    defaultHours.set('3', { open: '09:00', close: '18:00' }) // Wednesday
    defaultHours.set('4', { open: '09:00', close: '18:00' }) // Thursday
    defaultHours.set('5', { open: '09:00', close: '18:00' }) // Friday
    defaultHours.set('6', { open: '10:00', close: '17:00' }) // Saturday
    defaultHours.set('0', { open: '10:00', close: '17:00' }) // Sunday
    
    settings = await this.create({
      availableDays: [1, 2, 3, 4, 5],
      operatingHours: defaultHours,
      blockedDates: [],
      availableDates: [],
      timeSlots: [],
      minAdvanceBookingDays: 1,
      maxAdvanceBookingDays: 90,
      maxVisitorsPerSlot: 50,
      isAcceptingBookings: true
    })
  } else {
    // Ensure operatingHours Map has all days initialized
    if (!settings.operatingHours || settings.operatingHours.size === 0) {
      const defaultHours = new Map()
      defaultHours.set('1', { open: '09:00', close: '18:00' })
      defaultHours.set('2', { open: '09:00', close: '18:00' })
      defaultHours.set('3', { open: '09:00', close: '18:00' })
      defaultHours.set('4', { open: '09:00', close: '18:00' })
      defaultHours.set('5', { open: '09:00', close: '18:00' })
      defaultHours.set('6', { open: '10:00', close: '17:00' })
      defaultHours.set('0', { open: '10:00', close: '17:00' })
      settings.operatingHours = defaultHours
      await settings.save()
    } else {
      // Fill in missing days with defaults
      const defaultHoursMap = new Map([
        ['1', { open: '09:00', close: '18:00' }],
        ['2', { open: '09:00', close: '18:00' }],
        ['3', { open: '09:00', close: '18:00' }],
        ['4', { open: '09:00', close: '18:00' }],
        ['5', { open: '09:00', close: '18:00' }],
        ['6', { open: '10:00', close: '17:00' }],
        ['0', { open: '10:00', close: '17:00' }]
      ])
      let needsSave = false
      for (const [day, hours] of defaultHoursMap) {
        if (!settings.operatingHours.has(day)) {
          settings.operatingHours.set(day, hours)
          needsSave = true
        }
      }
      if (needsSave) {
        await settings.save()
      }
    }
  }
  return settings
}

const MuseumSettings = bookingsConnection.model('MuseumSettings', museumSettingsSchema)

MuseumSettings.getDefaultMissionSection = getDefaultMissionSection
MuseumSettings.getDefaultMissionStats = getDefaultMissionStats

module.exports = MuseumSettings


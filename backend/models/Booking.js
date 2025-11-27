const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const bookingSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    contactNumber: { type: String, required: true },
    visitDate: { type: Date, required: true },
    purpose: { 
      type: String, 
      enum: ['general', 'education', 'research', 'group', 'event', 'other'],
      required: true 
    },
    numberOfVisitors: { type: Number, required: true, min: 1, max: 50 },
    specialRequests: { type: String, default: '' },
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'cancelled'], 
      default: 'pending' 
    },
    confirmationCode: { type: String, unique: true },
    notes: { type: String, default: '' },
    googleCalendarEventId: { type: String, default: null }, // Store Google Calendar event ID
    googleCalendarLink: { type: String, default: null }, // Store Google Calendar event link
    cancelledBy: {
      type: String,
      enum: ['guest', 'admin', 'system'],
      default: undefined
    },
    cancelledReason: {
      type: String,
      default: null,
      maxlength: 500
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
)

// Generate confirmation code before saving
bookingSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = 'BK' + Date.now().toString().slice(-6)
  }
  next()
})

module.exports = bookingsConnection.model('Booking', bookingSchema)

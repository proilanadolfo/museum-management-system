const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    image: { type: String }, // Optional image for announcement
    isActive: { type: Boolean, default: true }, // For enabling/disabling announcements
    order: { type: Number, default: 0 } // For custom ordering
  },
  { timestamps: true }
)

module.exports = bookingsConnection.model('Announcement', announcementSchema)


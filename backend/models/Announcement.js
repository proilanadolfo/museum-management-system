const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    image: { type: String }, // Optional image for announcement
    isActive: { type: Boolean, default: true }, // For enabling/disabling announcements
    order: { type: Number, default: 0 }, // For custom ordering
    rts: { type: Number, default: 0 },
    wts: { type: Number, default: 0 }
  },
  { timestamps: true }
)

announcementSchema.pre('save', function (next) {
  if (this.isNew) {
    const now = Date.now()
    this.wts = this.wts || now
    this.rts = this.rts || now
  }
  next()
})

module.exports = bookingsConnection.model('Announcement', announcementSchema)


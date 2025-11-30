const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['historical', 'cultural', 'modern', 'artifacts'],
      required: true 
    },
    description: { type: String, required: true },
    image: { type: String, required: true }, // Path to uploaded image
    year: { type: String, default: '' },
    isActive: { type: Boolean, default: true }, // For enabling/disabling exhibits
    order: { type: Number, default: 0 }, // For custom ordering
    rts: { type: Number, default: 0 },
    wts: { type: Number, default: 0 }
  },
  { timestamps: true }
)

gallerySchema.pre('save', function (next) {
  if (this.isNew) {
    const now = Date.now()
    this.wts = this.wts || now
    this.rts = this.rts || now
  }
  next()
})

module.exports = bookingsConnection.model('Gallery', gallerySchema)


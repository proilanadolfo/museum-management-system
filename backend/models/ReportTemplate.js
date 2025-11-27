const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const reportTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    layout: {
      // Header / title configuration
      title: {
        type: String,
        default: 'Attendance Report'
      },
      titleAlign: {
        type: String,
        enum: ['left', 'center', 'right'],
        default: 'center'
      },
      headerTitle: {
        type: String,
        default: 'Bukidnon Studies Center'
      },
      headerSubtitle: {
        type: String,
        default: 'Central Mindanao University • University Town, Musuan, Bukidnon 8710'
      },
      logoUrl: {
        type: String,
        default: ''
      },
      logoPosition: {
        type: String,
        enum: ['left', 'center', 'right'],
        default: 'left'
      },
      headerBgColor: {
        type: String,
        default: '#ffffff'
      },
      footerText: {
        type: String,
        default: 'Prepared by: __________ | Checked by: ___________'
      },
      footerShowPageNumber: {
        type: Boolean,
        default: true
      },
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait'
      },
      pageMargin: {
        type: String,
        default: '15mm'
      },
      visibleColumns: {
        date: { type: Boolean, default: true },
        name: { type: Boolean, default: true },
        idOrContact: { type: Boolean, default: true },
        grade: { type: Boolean, default: true },
        timeIn: { type: Boolean, default: true },
        timeOut: { type: Boolean, default: true },
        purpose: { type: Boolean, default: true },
        duration: { type: Boolean, default: true },
        status: { type: Boolean, default: true }
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Update updatedAt on save
reportTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Index for faster queries
reportTemplateSchema.index({ createdBy: 1 })
reportTemplateSchema.index({ name: 1 })

module.exports = bookingsConnection.model('ReportTemplate', reportTemplateSchema)

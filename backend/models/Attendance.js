const mongoose = require('mongoose')
const { adminConnection } = require('../db')

const attendanceSchema = new mongoose.Schema({
  idNumber: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['student', 'staff', 'visitor'],
    required: true
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
})

attendanceSchema.index({ idNumber: 1, checkInTime: -1 })
attendanceSchema.index({ status: 1, checkInTime: -1 })

module.exports = adminConnection.model('Attendance', attendanceSchema)

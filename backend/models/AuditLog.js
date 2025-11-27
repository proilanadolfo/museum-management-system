const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const auditLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userRole: { type: String, enum: ['admin', 'superadmin'], required: true },
  username: { type: String },
  action: { type: String, required: true }, // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', etc.
  resource: { type: String, required: true }, // 'BOOKING', 'GALLERY', 'ADMIN', 'AUTHENTICATION', etc.
  resourceId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true })

// Index for faster queries
auditLogSchema.index({ userId: 1, timestamp: -1 })
auditLogSchema.index({ action: 1, timestamp: -1 })
auditLogSchema.index({ resource: 1, timestamp: -1 })

const AuditLog = bookingsConnection.model('AuditLog', auditLogSchema)

module.exports = AuditLog


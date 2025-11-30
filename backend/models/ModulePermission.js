const { adminConnection } = require('../db')
const { Schema } = require('mongoose')

// Module names that can be controlled (only modules that exist in Admin UI)
const MODULE_NAMES = [
  'attendance',
  'gallery',
  'reports',
  'settings'
]

const modulePermissionSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true
    },
    moduleName: {
      type: String,
      enum: MODULE_NAMES,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    // Metadata
    enabledBy: {
      type: Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null
    },
    enabledAt: {
      type: Date,
      default: null
    },
    disabledBy: {
      type: Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null
    },
    disabledAt: {
      type: Date,
      default: null
    },
    rts: { type: Number, default: 0 },
    wts: { type: Number, default: 0 }
  },
  { timestamps: true }
)

// Compound index to ensure one permission per admin per module
modulePermissionSchema.index({ adminId: 1, moduleName: 1 }, { unique: true })

// Pre-save hook to set timestamps
modulePermissionSchema.pre('save', function (next) {
  const now = Date.now()
  if (this.isNew) {
    this.rts = this.rts || now
    this.wts = this.wts || now
  } else {
    this.wts = now
  }
  next()
})

module.exports =
  adminConnection.models.ModulePermission ||
  adminConnection.model('ModulePermission', modulePermissionSchema)


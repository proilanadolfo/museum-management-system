const { adminConnection } = require('../db')
const { Schema } = require('mongoose')

const adminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
)

module.exports =
  adminConnection.models.Admin ||
  adminConnection.model('Admin', adminSchema)



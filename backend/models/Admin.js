const { adminConnection } = require('../db')
const { Schema } = require('mongoose')

const adminSchema = new Schema(
  {
    username: { 
      type: String, 
      required: function() { return !this.googleId }, 
      unique: true, 
      index: true,
      sparse: true
    },
    email: { type: String, required: true, unique: true },
    passwordHash: { 
      type: String, 
      required: function() { return !this.googleId }
    },
    name: { type: String, default: null },
    profilePicture: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    googleProfile: {
      name: String,
      picture: String,
      verified_email: Boolean
    },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    rts: { type: Number, default: 0 },
    wts: { type: Number, default: 0 }
  },
  { timestamps: true }
)

module.exports =
  adminConnection.models.Admin ||
  adminConnection.model('Admin', adminSchema)



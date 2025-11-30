const { superAdminConnection } = require('../db')
const { Schema } = require('mongoose')

const superAdminSchema = new Schema(
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
    resetTokenExpiry: { type: Date, default: null }
  },
  { timestamps: true }
)

module.exports =
  superAdminConnection.models.SuperAdmin ||
  superAdminConnection.model('SuperAdmin', superAdminSchema)



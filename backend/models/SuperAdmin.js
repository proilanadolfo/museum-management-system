const { superAdminConnection } = require('../db')
const { Schema } = require('mongoose')

const superAdminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

module.exports =
  superAdminConnection.models.SuperAdmin ||
  superAdminConnection.model('SuperAdmin', superAdminSchema)



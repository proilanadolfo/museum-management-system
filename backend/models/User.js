const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['admin', 'superadmin'], required: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', userSchema)



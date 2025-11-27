const mongoose = require('mongoose')

// MongoDB Atlas connection options
const connectionOptions = {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 10000, // Increased timeout for DNS resolution
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  connectTimeoutMS: 10000, // Connection timeout
}

const ADMIN_URI = process.env.MONGO_URI_ADMIN || 'mongodb://127.0.0.1:27017/museum_admin'
const SUPERADMIN_URI = process.env.MONGO_URI_SUPERADMIN || 'mongodb://127.0.0.1:27017/museum_superadmin'
const BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS || 'mongodb://127.0.0.1:27017/museum_bookings'

// Helper function to validate connection string
function validateConnectionString(uri, name) {
  if (!uri) {
    throw new Error(`${name} connection string is missing`)
  }
  
  // Check if it's a MongoDB Atlas connection string
  if (uri.startsWith('mongodb+srv://')) {
    // Extract hostname for validation
    const match = uri.match(/mongodb\+srv:\/\/[^@]+@([^/]+)/)
    if (match) {
      const hostname = match[1]
      console.log(`🔍 ${name}: Connecting to ${hostname}`)
    }
  }
}

// Validate connection strings
try {
  validateConnectionString(ADMIN_URI, 'Admin')
  validateConnectionString(SUPERADMIN_URI, 'SuperAdmin')
  validateConnectionString(BOOKINGS_URI, 'Bookings')
} catch (error) {
  console.error('❌ Connection string validation error:', error.message)
}

// Create connections with options
const adminConnection = mongoose.createConnection(ADMIN_URI, connectionOptions)
const superAdminConnection = mongoose.createConnection(SUPERADMIN_URI, connectionOptions)
const bookingsConnection = mongoose.createConnection(BOOKINGS_URI, connectionOptions)

// Add connection event handlers for better debugging
adminConnection.on('error', (err) => {
  console.error('❌ Admin DB connection error:', err.message)
  if (err.code === 'ENOTFOUND') {
    console.error('   💡 Tip: Check if the cluster hostname is correct in your connection string')
    console.error('   💡 Get the exact connection string from MongoDB Atlas → Connect → Connect your application')
  }
})

superAdminConnection.on('error', (err) => {
  console.error('❌ SuperAdmin DB connection error:', err.message)
  if (err.code === 'ENOTFOUND') {
    console.error('   💡 Tip: Check if the cluster hostname is correct in your connection string')
  }
})

bookingsConnection.on('error', (err) => {
  console.error('❌ Bookings DB connection error:', err.message)
  if (err.code === 'ENOTFOUND') {
    console.error('   💡 Tip: Check if the cluster hostname is correct in your connection string')
  }
})

function whenOpen(connection) {
  return new Promise((resolve, reject) => {
    connection.once('open', resolve)
    connection.on('error', reject)
  })
}

module.exports = {
  adminConnection,
  superAdminConnection,
  bookingsConnection,
  whenOpen,
}



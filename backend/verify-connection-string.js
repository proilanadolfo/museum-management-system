// Script to help verify MongoDB Atlas connection string
require('dotenv').config()

console.log('🔍 Verifying MongoDB Atlas Connection Strings...\n')

const ADMIN_URI = process.env.MONGO_URI_ADMIN
const SUPERADMIN_URI = process.env.MONGO_URI_SUPERADMIN
const BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS

function extractInfo(uri) {
  if (!uri) return null
  
  if (uri.startsWith('mongodb+srv://')) {
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/)
    if (match) {
      return {
        username: match[1],
        password: match[2].replace(/%21/g, '!').replace(/%40/g, '@'), // Decode for display
        hostname: match[3],
        database: match[4]
      }
    }
  }
  return null
}

console.log('📋 Current Connection Strings:\n')

const adminInfo = extractInfo(ADMIN_URI)
if (adminInfo) {
  console.log('Admin DB:')
  console.log(`  Hostname: ${adminInfo.hostname}`)
  console.log(`  Database: ${adminInfo.database}`)
  console.log(`  Username: ${adminInfo.username}`)
  console.log(`  Password: ${'*'.repeat(adminInfo.password.length)}`)
} else {
  console.log('❌ Admin DB: Invalid connection string format')
}

console.log('')

const superAdminInfo = extractInfo(SUPERADMIN_URI)
if (superAdminInfo) {
  console.log('SuperAdmin DB:')
  console.log(`  Hostname: ${superAdminInfo.hostname}`)
  console.log(`  Database: ${superAdminInfo.database}`)
  console.log(`  Username: ${superAdminInfo.username}`)
} else {
  console.log('❌ SuperAdmin DB: Invalid connection string format')
}

console.log('')

const bookingsInfo = extractInfo(BOOKINGS_URI)
if (bookingsInfo) {
  console.log('Bookings DB:')
  console.log(`  Hostname: ${bookingsInfo.hostname}`)
  console.log(`  Database: ${bookingsInfo.database}`)
  console.log(`  Username: ${bookingsInfo.username}`)
} else {
  console.log('❌ Bookings DB: Invalid connection string format')
}

console.log('\n💡 To get the correct connection string:')
console.log('   1. Go to MongoDB Atlas dashboard')
console.log('   2. Click "Connect" button on your cluster')
console.log('   3. Select "Connect your application"')
console.log('   4. Copy the connection string')
console.log('   5. Replace <password> with your actual password')
console.log('   6. Replace <dbname> with: museum_admin, museum_superadmin, or museum_bookings')
console.log('\n⚠️  The hostname should look like: cluster0.xxxxx.mongodb.net')
console.log('   (where xxxxx is a unique identifier for your cluster)')


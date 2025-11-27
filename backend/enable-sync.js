// Script to enable real-time database sync in .env file
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env')

console.log('🔧 Enabling Real-Time Database Sync...\n')

try {
  let envContent = ''
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Check if sync is already configured
  if (envContent.includes('ENABLE_DB_SYNC')) {
    console.log('⚠️  ENABLE_DB_SYNC already exists in .env file')
    console.log('   Current value:', envContent.match(/ENABLE_DB_SYNC=(.+)/)?.[1] || 'not set')
    console.log('\n💡 To enable sync, manually set: ENABLE_DB_SYNC=true')
    return
  }

  // Add sync configuration
  const syncConfig = `

# Real-time Database Sync Configuration
# Set to true to enable real-time sync between Atlas and Local DB
ENABLE_DB_SYNC=true

# Local MongoDB Connection Strings (optional - defaults to localhost:27017)
# Uncomment and modify if you want to use different local MongoDB instances
# MONGO_URI_ADMIN_LOCAL=mongodb://127.0.0.1:27017/museum_admin
# MONGO_URI_SUPERADMIN_LOCAL=mongodb://127.0.0.1:27017/museum_superadmin
# MONGO_URI_BOOKINGS_LOCAL=mongodb://127.0.0.1:27017/museum_bookings
`

  // Append to .env file
  fs.appendFileSync(envPath, syncConfig)
  
  console.log('✅ Real-time sync configuration added to .env file!')
  console.log('\n📝 Added configuration:')
  console.log('   - ENABLE_DB_SYNC=true')
  console.log('\n💡 Next steps:')
  console.log('   1. Make sure MongoDB is running locally (mongodb://127.0.0.1:27017)')
  console.log('   2. Restart your backend server: npm run start')
  console.log('   3. Check console logs for sync status')
  console.log('\n📖 For more info, see: backend/REALTIME_SYNC_SETUP.md')
  
} catch (error) {
  console.error('❌ Error:', error.message)
  console.log('\n💡 Manual setup:')
  console.log('   Add this to your .env file:')
  console.log('   ENABLE_DB_SYNC=true')
}


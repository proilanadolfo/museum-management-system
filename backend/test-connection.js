// Quick test script to verify MongoDB Atlas connection
require('dotenv').config()
const mongoose = require('mongoose')

const ADMIN_URI = process.env.MONGO_URI_ADMIN
const SUPERADMIN_URI = process.env.MONGO_URI_SUPERADMIN
const BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS

console.log('🔍 Testing MongoDB Atlas connections...\n')

async function testConnection(name, uri) {
  try {
    console.log(`Testing ${name}...`)
    const connection = mongoose.createConnection(uri, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })

    await new Promise((resolve, reject) => {
      connection.once('open', resolve)
      connection.on('error', reject)
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    })

    console.log(`✅ ${name}: Connected successfully!\n`)
    await connection.close()
    return true
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}\n`)
    return false
  }
}

async function runTests() {
  const results = await Promise.all([
    testConnection('Admin DB', ADMIN_URI),
    testConnection('SuperAdmin DB', SUPERADMIN_URI),
    testConnection('Bookings DB', BOOKINGS_URI),
  ])

  const allPassed = results.every(r => r)
  
  if (allPassed) {
    console.log('🎉 All connections successful! Your MongoDB Atlas setup is working!')
    process.exit(0)
  } else {
    console.log('⚠️  Some connections failed. Please check:')
    console.log('   1. Network Access settings in MongoDB Atlas')
    console.log('   2. Username and password are correct')
    console.log('   3. Internet connection is active')
    process.exit(1)
  }
}

runTests()


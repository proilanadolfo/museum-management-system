// Script to verify database sync between Atlas and Local
require('dotenv').config()
const mongoose = require('mongoose')

const ADMIN_URI = process.env.MONGO_URI_ADMIN || 'mongodb://127.0.0.1:27017/museum_admin'
const SUPERADMIN_URI = process.env.MONGO_URI_SUPERADMIN || 'mongodb://127.0.0.1:27017/museum_superadmin'
const BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS || 'mongodb://127.0.0.1:27017/museum_bookings'

const LOCAL_ADMIN_URI = process.env.MONGO_URI_ADMIN_LOCAL || 'mongodb://127.0.0.1:27017/museum_admin'
const LOCAL_SUPERADMIN_URI = process.env.MONGO_URI_SUPERADMIN_LOCAL || 'mongodb://127.0.0.1:27017/museum_superadmin'
const LOCAL_BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS_LOCAL || 'mongodb://127.0.0.1:27017/museum_bookings'

async function verifySync() {
  console.log('🔍 Verifying Database Sync Status...\n')

  try {
    // Connect to Atlas (Primary)
    const atlasAdmin = mongoose.createConnection(ADMIN_URI)
    const atlasSuperAdmin = mongoose.createConnection(SUPERADMIN_URI)
    const atlasBookings = mongoose.createConnection(BOOKINGS_URI)

    // Connect to Local (Secondary)
    const localAdmin = mongoose.createConnection(LOCAL_ADMIN_URI)
    const localSuperAdmin = mongoose.createConnection(LOCAL_SUPERADMIN_URI)
    const localBookings = mongoose.createConnection(LOCAL_BOOKINGS_URI)

    await Promise.all([
      whenOpen(atlasAdmin),
      whenOpen(atlasSuperAdmin),
      whenOpen(atlasBookings),
      whenOpen(localAdmin),
      whenOpen(localSuperAdmin),
      whenOpen(localBookings)
    ])

    console.log('✅ Connected to both Atlas and Local databases\n')

    // Check each database
    const databases = [
      { name: 'Admin', atlas: atlasAdmin, local: localAdmin },
      { name: 'SuperAdmin', atlas: atlasSuperAdmin, local: localSuperAdmin },
      { name: 'Bookings', atlas: atlasBookings, local: localBookings }
    ]

    for (const db of databases) {
      console.log(`\n📊 Checking ${db.name} Database:`)
      
      const atlasCollections = await db.atlas.db.listCollections().toArray()
      
      for (const collInfo of atlasCollections) {
        const collName = collInfo.name
        const atlasColl = db.atlas.db.collection(collName)
        const localColl = db.local.db.collection(collName)

        const atlasCount = await atlasColl.countDocuments()
        const localCount = await localColl.countDocuments()

        const isSynced = atlasCount === localCount
        const status = isSynced ? '✅' : '❌'

        console.log(`   ${status} ${collName}:`)
        console.log(`      Atlas: ${atlasCount} documents`)
        console.log(`      Local: ${localCount} documents`)
        
        if (!isSynced) {
          console.log(`      ⚠️  MISMATCH: ${Math.abs(atlasCount - localCount)} documents difference`)
        }
      }
    }

    console.log('\n✅ Verification complete!')
    console.log('\n💡 If sync is enabled (ENABLE_DB_SYNC=true), changes in Atlas')
    console.log('   will automatically sync to Local DB in real-time.')

    // Close connections
    await Promise.all([
      atlasAdmin.close(),
      atlasSuperAdmin.close(),
      atlasBookings.close(),
      localAdmin.close(),
      localSuperAdmin.close(),
      localBookings.close()
    ])

  } catch (error) {
    console.error('❌ Error verifying sync:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Make sure:')
      console.error('   1. MongoDB is running locally (mongodb://127.0.0.1:27017)')
      console.error('   2. Atlas connection strings are correct in .env')
    }
  }
}

function whenOpen(connection) {
  return new Promise((resolve, reject) => {
    connection.once('open', resolve)
    connection.on('error', reject)
    setTimeout(() => reject(new Error('Connection timeout')), 10000)
  })
}

verifySync()


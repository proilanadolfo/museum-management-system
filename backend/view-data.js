// Script to view data from MongoDB Atlas
require('dotenv').config()
const { adminConnection, superAdminConnection, bookingsConnection } = require('./db')

console.log('📊 Viewing Data from MongoDB Atlas...\n')

async function viewCollections(connection, dbName) {
  try {
    const collections = await connection.db.listCollections().toArray()
    console.log(`\n📁 Database: ${dbName}`)
    console.log(`   Collections: ${collections.length}`)
    
    if (collections.length === 0) {
      console.log('   ⚠️  No collections found (database is empty)')
      return
    }
    
    for (const collection of collections) {
      const count = await connection.db.collection(collection.name).countDocuments()
      console.log(`\n   📄 Collection: ${collection.name}`)
      console.log(`      Documents: ${count}`)
      
      if (count > 0 && count <= 5) {
        // Show all documents if 5 or less
        const docs = await connection.db.collection(collection.name).find({}).limit(5).toArray()
        console.log(`      Sample data:`)
        docs.forEach((doc, index) => {
          console.log(`         [${index + 1}]`, JSON.stringify(doc, null, 2).substring(0, 200) + '...')
        })
      } else if (count > 5) {
        // Show first 3 documents if more than 5
        const docs = await connection.db.collection(collection.name).find({}).limit(3).toArray()
        console.log(`      Sample data (first 3):`)
        docs.forEach((doc, index) => {
          // Remove sensitive data
          const safeDoc = { ...doc }
          if (safeDoc.password) safeDoc.password = '***HIDDEN***'
          if (safeDoc.hash) safeDoc.hash = '***HIDDEN***'
          console.log(`         [${index + 1}]`, JSON.stringify(safeDoc, null, 2).substring(0, 200) + '...')
        })
      }
    }
  } catch (error) {
    console.error(`   ❌ Error viewing ${dbName}:`, error.message)
  }
}

async function viewAllData() {
  try {
    // Wait for connections
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    console.log('🔍 Connecting to databases...\n')
    
    // View Admin database
    await viewCollections(adminConnection, 'museum_admin')
    
    // View SuperAdmin database
    await viewCollections(superAdminConnection, 'museum_superadmin')
    
    // View Bookings database
    await viewCollections(bookingsConnection, 'museum_bookings')
    
    console.log('\n✅ Data viewing complete!')
    console.log('\n💡 Tip: You can also view data in MongoDB Atlas UI:')
    console.log('   1. Go to MongoDB Atlas Dashboard')
    console.log('   2. Click "Browse Collections" on your cluster')
    console.log('   3. Select the database and collection you want to view')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

viewAllData()


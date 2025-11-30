// Real-time Database Sync Service
// Syncs data between MongoDB Atlas (primary) and Local DB (secondary) in real-time
const mongoose = require('mongoose')
const logger = require('../utils/logger')

class DatabaseSyncService {
  constructor() {
    this.isSyncing = false
    this.changeStreams = []
    this.localConnections = {}
    this.atlasConnections = {}
  }

  // Initialize local database connections
  async initializeLocalConnections() {
    const localOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    const LOCAL_ADMIN_URI = process.env.MONGO_URI_ADMIN_LOCAL || 'mongodb://127.0.0.1:27017/museum_admin'
    const LOCAL_SUPERADMIN_URI = process.env.MONGO_URI_SUPERADMIN_LOCAL || 'mongodb://127.0.0.1:27017/museum_superadmin'
    const LOCAL_BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS_LOCAL || 'mongodb://127.0.0.1:27017/museum_bookings'

    try {
      this.localConnections.admin = mongoose.createConnection(LOCAL_ADMIN_URI, localOptions)
      this.localConnections.superadmin = mongoose.createConnection(LOCAL_SUPERADMIN_URI, localOptions)
      this.localConnections.bookings = mongoose.createConnection(LOCAL_BOOKINGS_URI, localOptions)

      // Wait for connections
      await Promise.all([
        new Promise((resolve) => this.localConnections.admin.once('open', resolve)),
        new Promise((resolve) => this.localConnections.superadmin.once('open', resolve)),
        new Promise((resolve) => this.localConnections.bookings.once('open', resolve)),
      ])

      logger.info('✅ Local database connections established')
      return true
    } catch (error) {
      logger.error('❌ Failed to connect to local databases:', error.message)
      logger.warn('💡 Make sure MongoDB is running locally on port 27017')
      return false
    }
  }

  // Set Atlas connections (from main db.js)
  setAtlasConnections(adminConn, superAdminConn, bookingsConn) {
    this.atlasConnections.admin = adminConn
    this.atlasConnections.superadmin = superAdminConn
    this.atlasConnections.bookings = bookingsConn
  }

  // Sync a single document change
  async syncChange(change, dbName, collectionName) {
    try {
      const localDb = this.localConnections[dbName].db
      const collection = localDb.collection(collectionName)

      switch (change.operationType) {
        case 'insert':
          await collection.insertOne(change.fullDocument)
          logger.debug(`📥 Synced INSERT: ${collectionName}`, { id: change.fullDocument._id })
          console.log(`📥 [SYNC] INSERT → ${dbName}.${collectionName}`, { 
            id: change.fullDocument._id?.toString() || 'N/A' 
          })
          break

        case 'update':
          if (change.fullDocument) {
            await collection.replaceOne({ _id: change.documentKey._id }, change.fullDocument)
          } else {
            // Partial update
            const updateDoc = {}
            if (change.updateDescription?.updatedFields) {
              Object.assign(updateDoc, change.updateDescription.updatedFields)
            }
            if (change.updateDescription?.removedFields) {
              change.updateDescription.removedFields.forEach(field => {
                updateDoc[field] = null
              })
            }
            await collection.updateOne({ _id: change.documentKey._id }, { $set: updateDoc })
          }
          logger.debug(`📥 Synced UPDATE: ${collectionName}`, { id: change.documentKey._id })
          console.log(`📥 [SYNC] UPDATE → ${dbName}.${collectionName}`, { 
            id: change.documentKey._id?.toString() || 'N/A',
            updatedFields: Object.keys(change.updateDescription?.updatedFields || {})
          })
          break

        case 'delete':
          await collection.deleteOne({ _id: change.documentKey._id })
          logger.debug(`📥 Synced DELETE: ${collectionName}`, { id: change.documentKey._id })
          console.log(`📥 [SYNC] DELETE → ${dbName}.${collectionName}`, { 
            id: change.documentKey._id?.toString() || 'N/A' 
          })
          break

        case 'replace':
          if (change.fullDocument) {
            await collection.replaceOne({ _id: change.documentKey._id }, change.fullDocument)
          }
          logger.debug(`📥 Synced REPLACE: ${collectionName}`, { id: change.documentKey._id })
          console.log(`📥 [SYNC] REPLACE → ${dbName}.${collectionName}`, { 
            id: change.documentKey._id?.toString() || 'N/A' 
          })
          break
      }
    } catch (error) {
      logger.error(`❌ Sync error for ${collectionName}:`, error.message)
    }
  }

  // Watch a collection for changes
  watchCollection(atlasConnection, localConnection, dbName, collectionName) {
    try {
      const atlasDb = atlasConnection.db
      const collection = atlasDb.collection(collectionName)

      // Create change stream
      const changeStream = collection.watch([], { fullDocument: 'updateLookup' })

      changeStream.on('change', async (change) => {
        if (!this.isSyncing) return

        try {
          await this.syncChange(change, dbName, collectionName)
          // Log successful sync for verification
          console.log(`✅ Synced ${change.operationType.toUpperCase()}: ${dbName}.${collectionName}`, {
            id: change.documentKey?._id?.toString() || 'N/A',
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          logger.error(`Error syncing change in ${collectionName}:`, error.message)
          console.error(`❌ Sync failed for ${dbName}.${collectionName}:`, error.message)
        }
      })

      changeStream.on('error', (error) => {
        logger.error(`Change stream error for ${collectionName}:`, error.message)
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.isSyncing) {
            logger.info(`🔄 Reconnecting change stream for ${collectionName}...`)
            this.watchCollection(atlasConnection, localConnection, dbName, collectionName)
          }
        }, 5000)
      })

      this.changeStreams.push({ changeStream, collectionName, dbName })
      logger.info(`👁️  Watching ${dbName}.${collectionName} for changes`)
    } catch (error) {
      logger.error(`Failed to watch ${collectionName}:`, error.message)
    }
  }

  // Watch all collections in a database
  async watchDatabase(atlasConnection, localConnection, dbName) {
    try {
      const atlasDb = atlasConnection.db
      const collections = await atlasDb.listCollections().toArray()

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name
        this.watchCollection(atlasConnection, localConnection, dbName, collectionName)
      }

      logger.info(`✅ Started watching ${collections.length} collections in ${dbName}`)
    } catch (error) {
      logger.error(`Failed to watch database ${dbName}:`, error.message)
    }
  }

  // Initial sync - copy all existing data from Atlas to Local
  async initialSync() {
    logger.info('🔄 Starting initial sync from Atlas to Local DB...')

    try {
      for (const [dbName, atlasConn] of Object.entries(this.atlasConnections)) {
        const atlasDb = atlasConn.db
        const localDb = this.localConnections[dbName].db

        const collections = await atlasDb.listCollections().toArray()

        for (const collectionInfo of collections) {
          const collectionName = collectionInfo.name
          const atlasCollection = atlasDb.collection(collectionName)
          const localCollection = localDb.collection(collectionName)

          // Get all documents from Atlas
          const documents = await atlasCollection.find({}).toArray()

          if (documents.length > 0) {
            // Clear existing local data
            await localCollection.deleteMany({})
            // Insert all documents
            await localCollection.insertMany(documents)
            logger.info(`✅ Synced ${documents.length} documents: ${dbName}.${collectionName}`)
            console.log(`✅ Initial sync: ${dbName}.${collectionName} - ${documents.length} documents copied from Atlas to Local`)
          } else {
            console.log(`ℹ️  No documents to sync: ${dbName}.${collectionName}`)
          }
        }
      }

      logger.info('✅ Initial sync completed!')
      return true
    } catch (error) {
      logger.error('❌ Initial sync failed:', error.message)
      return false
    }
  }

  // Start real-time sync
  async start() {
    if (this.isSyncing) {
      logger.warn('⚠️  Sync is already running')
      return
    }

    // Check if sync is enabled
    if (process.env.ENABLE_DB_SYNC !== 'true') {
      logger.info('ℹ️  Database sync is disabled (set ENABLE_DB_SYNC=true to enable)')
      return
    }

    logger.info('🚀 Starting real-time database sync...')

    // Initialize local connections
    const localConnected = await this.initializeLocalConnections()
    if (!localConnected) {
      logger.warn('⚠️  Local DB not available, sync disabled')
      return
    }

    // Perform initial sync
    await this.initialSync()

    // Start watching for changes
    this.watchDatabase(this.atlasConnections.admin, this.localConnections.admin, 'admin')
    this.watchDatabase(this.atlasConnections.superadmin, this.localConnections.superadmin, 'superadmin')
    this.watchDatabase(this.atlasConnections.bookings, this.localConnections.bookings, 'bookings')

    this.isSyncing = true
    logger.info('✅ Real-time sync is now active!')
    console.log('✅ Real-time database sync is ACTIVE!')
    console.log('   - Atlas (Primary) → Local (Secondary)')
    console.log('   - All changes will be synced in real-time')
    console.log('   - Both databases will have the same data')
  }

  // Stop sync
  stop() {
    if (!this.isSyncing) return

    logger.info('🛑 Stopping database sync...')

    // Close all change streams
    this.changeStreams.forEach(({ changeStream }) => {
      changeStream.close()
    })
    this.changeStreams = []

    // Close local connections
    Object.values(this.localConnections).forEach(conn => {
      if (conn && conn.readyState === 1) {
        conn.close()
      }
    })

    this.isSyncing = false
    logger.info('✅ Database sync stopped')
  }

  // Get sync status
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      activeStreams: this.changeStreams.length,
      localConnections: Object.keys(this.localConnections).length,
    }
  }
}

// Export singleton instance
const dbSyncService = new DatabaseSyncService()
module.exports = dbSyncService


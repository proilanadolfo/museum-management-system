const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const logger = require('../utils/logger')

require('dotenv').config()

const BACKUP_DIR = path.join(__dirname, '../backups')
const MONGODB_URI_ADMIN = process.env.MONGO_URI_ADMIN || 'mongodb://127.0.0.1:27017/museum_admin'
const MONGODB_URI_SUPERADMIN = process.env.MONGO_URI_SUPERADMIN || 'mongodb://127.0.0.1:27017/museum_superadmin'
const MONGODB_URI_BOOKINGS = process.env.MONGO_URI_BOOKINGS || 'mongodb://127.0.0.1:27017/museum_bookings'

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  logger.info('Created backup directory', { path: BACKUP_DIR })
}

// Connection options for MongoDB Atlas
const connectionOptions = {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
}

/**
 * Extract database name from MongoDB URI
 */
function getDatabaseName(uri) {
  const match = uri.match(/mongodb\+?srv?:\/\/[^\/]+\/([^?]+)/)
  if (match) {
    return match[1]
  }
  // Fallback for local MongoDB
  const localMatch = uri.match(/mongodb:\/\/[^\/]+\/([^?]+)/)
  return localMatch ? localMatch[1] : 'unknown'
}

/**
 * Backup a single database using Mongoose
 */
async function backupDatabase(uri, dbName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
  const backupPath = path.join(BACKUP_DIR, `${dbName}-${timestamp}`)
  
  // Create backup directory for this database
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true })
  }

  logger.info(`Starting backup for ${dbName}`, { uri: uri.replace(/\/\/[^@]+@/, '//***@'), backupPath })

  try {
    // Create connection
    const connection = mongoose.createConnection(uri, connectionOptions)
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      connection.once('open', resolve)
      connection.once('error', reject)
      setTimeout(() => reject(new Error('Connection timeout')), 30000)
    })

    logger.info(`Connected to ${dbName}`)

    // Get all collections
    const collections = await connection.db.listCollections().toArray()
    
    logger.info(`Found ${collections.length} collections in ${dbName}`)

    // Backup each collection
    const backupPromises = collections.map(async (collectionInfo) => {
      const collectionName = collectionInfo.name
      const collection = connection.db.collection(collectionName)
      
      try {
        // Get all documents
        const documents = await collection.find({}).toArray()
        
        // Save to JSON file
        const filePath = path.join(backupPath, `${collectionName}.json`)
        fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf8')
        
        logger.info(`Backed up ${collectionName}: ${documents.length} documents`)
        
        return {
          collection: collectionName,
          count: documents.length,
          file: filePath
        }
      } catch (error) {
        logger.error(`Error backing up collection ${collectionName}`, { error: error.message })
        throw error
      }
    })

    const results = await Promise.all(backupPromises)
    
    // Create metadata file
    const metadata = {
      database: dbName,
      timestamp: new Date().toISOString(),
      collections: results.map(r => ({
        name: r.collection,
        documentCount: r.count
      })),
      totalDocuments: results.reduce((sum, r) => sum + r.count, 0)
    }
    
    fs.writeFileSync(
      path.join(backupPath, '_metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    )

    // Close connection
    await connection.close()

    logger.info(`Backup completed for ${dbName}`, { 
      path: backupPath,
      collections: results.length,
      totalDocuments: metadata.totalDocuments
    })

    return {
      path: backupPath,
      collections: results.length,
      totalDocuments: metadata.totalDocuments
    }
  } catch (error) {
    logger.error(`Backup failed for ${dbName}`, { error: error.message, stack: error.stack })
    throw error
  }
}

/**
 * Backup uploads directory
 */
async function backupUploads() {
  const uploadsDir = path.join(__dirname, '../uploads')
  
  if (!fs.existsSync(uploadsDir)) {
    logger.info('Uploads directory does not exist, skipping')
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
  const uploadsBackup = path.join(BACKUP_DIR, `uploads-${timestamp}`)

  logger.info('Starting uploads backup', { source: uploadsDir, destination: uploadsBackup })

  try {
    // Copy directory recursively
    await copyDirectory(uploadsDir, uploadsBackup)
    
    logger.info('Uploads backup completed', { path: uploadsBackup })
    return uploadsBackup
  } catch (error) {
    logger.error('Uploads backup failed', { error: error.message })
    throw error
  }
}

/**
 * Recursively copy directory
 */
function copyDirectory(src, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })

    const copyPromises = entries.map(entry => {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        return copyDirectory(srcPath, destPath)
      } else {
        return new Promise((resolve, reject) => {
          fs.copyFile(srcPath, destPath, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    })

    Promise.all(copyPromises)
      .then(() => resolve())
      .catch(reject)
  })
}

/**
 * Perform complete backup
 */
async function performBackup() {
  try {
    logger.info('Starting database backup process...')
    
    // Backup all databases
    const backups = await Promise.all([
      backupDatabase(MONGODB_URI_ADMIN, 'museum_admin'),
      backupDatabase(MONGODB_URI_SUPERADMIN, 'museum_superadmin'),
      backupDatabase(MONGODB_URI_BOOKINGS, 'museum_bookings')
    ])
    
    // Backup uploaded files
    let uploadsBackup = null
    try {
      uploadsBackup = await backupUploads()
    } catch (error) {
      logger.warn('Uploads backup failed, continuing with database backups', { error: error.message })
    }
    
    logger.info('All backups completed successfully', { 
      databases: backups.length,
      uploads: uploadsBackup ? 'success' : 'skipped'
    })
    
    // Clean old backups (keep last 7 days)
    cleanOldBackups()
    
    console.log('\n✅ Backup completed successfully!')
    console.log(`📁 Backup location: ${BACKUP_DIR}`)
    console.log(`📊 Databases backed up: ${backups.length}`)
    backups.forEach((backup, index) => {
      console.log(`   - ${['museum_admin', 'museum_superadmin', 'museum_bookings'][index]}: ${backup.collections} collections, ${backup.totalDocuments} documents`)
    })
    if (uploadsBackup) {
      console.log(`📁 Uploads backed up: ${uploadsBackup}`)
    }
    console.log('')
    
  } catch (error) {
    logger.error('Backup process failed', { error: error.message, stack: error.stack })
    console.error('❌ Backup failed:', error.message)
    process.exit(1)
  } finally {
    // Close all mongoose connections
    await mongoose.disconnect()
  }
}

/**
 * Clean old backups (older than 7 days)
 */
function cleanOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return
    }

    const files = fs.readdirSync(BACKUP_DIR)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    let deletedCount = 0
    
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file)
      try {
        const stats = fs.statSync(filePath)
        
        if (stats.isDirectory() && stats.mtime.getTime() < sevenDaysAgo) {
          fs.rmSync(filePath, { recursive: true, force: true })
          deletedCount++
          logger.info('Deleted old backup', { file })
        }
      } catch (err) {
        // Ignore errors for individual files
        logger.warn('Error checking backup file', { file, error: err.message })
      }
    })
    
    if (deletedCount > 0) {
      logger.info(`Cleaned ${deletedCount} old backup(s)`)
      console.log(`🧹 Cleaned ${deletedCount} old backup(s)`)
    }
  } catch (error) {
    logger.warn('Error cleaning old backups', { error: error.message })
  }
}

// Run backup if called directly
if (require.main === module) {
  performBackup()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { performBackup }

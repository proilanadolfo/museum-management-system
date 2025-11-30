const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const logger = require('../utils/logger')

require('dotenv').config()

const BACKUP_DIR = path.join(__dirname, '../backups')

// Connection options for MongoDB Atlas
const connectionOptions = {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
}

/**
 * Restore a database from JSON backup files
 */
async function restoreDatabase(backupPath, dbName) {
  const uri = process.env[`MONGO_URI_${dbName.toUpperCase().replace('MUSEUM_', '')}`] || 
              `mongodb://127.0.0.1:27017/${dbName}`
  
  logger.info(`Starting restore for ${dbName}`, { backupPath })

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

    // Read metadata if exists
    const metadataPath = path.join(backupPath, '_metadata.json')
    let metadata = null
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
      logger.info(`Found metadata: ${metadata.collections.length} collections, ${metadata.totalDocuments} documents`)
    }

    // Get all JSON files in backup directory
    const files = fs.readdirSync(backupPath)
    const jsonFiles = files.filter(file => file.endsWith('.json') && file !== '_metadata.json')

    logger.info(`Found ${jsonFiles.length} collection files to restore`)

    // Restore each collection
    const restorePromises = jsonFiles.map(async (file) => {
      const collectionName = file.replace('.json', '')
      const filePath = path.join(backupPath, file)
      
      try {
        // Read JSON data
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        
        if (!Array.isArray(data) || data.length === 0) {
          logger.info(`Skipping empty collection: ${collectionName}`)
          return { collection: collectionName, restored: 0 }
        }

        // Get collection
        const collection = connection.db.collection(collectionName)
        
        // Drop existing collection (--drop equivalent)
        await collection.drop().catch(() => {
          // Collection might not exist, that's okay
        })
        
        // Insert documents
        await collection.insertMany(data)
        
        logger.info(`Restored ${collectionName}: ${data.length} documents`)
        
        return {
          collection: collectionName,
          restored: data.length
        }
      } catch (error) {
        logger.error(`Error restoring collection ${collectionName}`, { error: error.message })
        throw error
      }
    })

    const results = await Promise.all(restorePromises)
    const totalRestored = results.reduce((sum, r) => sum + r.restored, 0)

    // Close connection
    await connection.close()

    logger.info(`Restore completed for ${dbName}`, {
      collections: results.length,
      totalDocuments: totalRestored
    })

    return {
      collections: results.length,
      totalDocuments: totalRestored
    }
  } catch (error) {
    logger.error(`Restore failed for ${dbName}`, { error: error.message, stack: error.stack })
    throw error
  }
}

/**
 * Restore uploads directory
 */
async function restoreUploads(backupDate) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      logger.info('Backup directory does not exist')
      return null
    }

    const backups = fs.readdirSync(BACKUP_DIR)
    const uploadsBackup = backups.find(dir => dir.startsWith('uploads-') && dir.includes(backupDate))
    
    if (!uploadsBackup) {
      logger.info('No uploads backup found for date, skipping')
      return null
    }
    
    const uploadsBackupPath = path.join(BACKUP_DIR, uploadsBackup)
    const uploadsDir = path.join(__dirname, '../uploads')
    
    // Remove existing uploads directory
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true })
    }
    
    // Copy backup to uploads directory
    await copyDirectory(uploadsBackupPath, uploadsDir)
    
    logger.info('Uploads restore completed')
    return uploadsBackupPath
  } catch (error) {
    logger.error('Uploads restore failed', { error: error.message })
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
 * Perform restore from backup
 */
async function performRestore(backupDate) {
  try {
    if (!backupDate) {
      throw new Error('Backup date is required. Usage: node restore.js <backup-date>')
    }
    
    logger.info('Starting database restore process...', { backupDate })
    
    // Find backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      throw new Error(`Backup directory not found: ${BACKUP_DIR}`)
    }

    const backups = fs.readdirSync(BACKUP_DIR)
    
    // Extract date and time components from backupDate
    // Support formats: "2025-11-30_13-06", "2025-11-30_13-06-18-910Z", "2025-11-30"
    const dateMatch = backupDate.match(/^(\d{4}-\d{2}-\d{2})(?:_(\d{2})-(\d{2}))?/)
    const targetDate = dateMatch ? dateMatch[1] : backupDate.split('_')[0]
    const targetHour = dateMatch && dateMatch[2] ? dateMatch[2] : null
    const targetMinute = dateMatch && dateMatch[3] ? dateMatch[3] : null
    
    // Find all museum_ backups that match the date (and optionally hour:minute)
    let backupDirs = backups.filter(dir => {
      if (!fs.statSync(path.join(BACKUP_DIR, dir)).isDirectory() || !dir.startsWith('museum_')) {
        return false
      }
      
      // Must match the date
      if (!dir.includes(targetDate)) {
        return false
      }
      
      // If hour and minute specified, match them (ignore seconds/milliseconds)
      if (targetHour && targetMinute) {
        // Extract hour-minute from backup directory name (format: YYYY-MM-DD_HH-MM-...)
        const timePattern = new RegExp(`_${targetHour}-${targetMinute}(-|Z|$)`)
        if (timePattern.test(dir)) {
          return true
        }
        return false
      }
      
      return true
    })
    
    // If no match with time, try just date
    if (backupDirs.length === 0 && (targetHour || targetMinute)) {
      backupDirs = backups.filter(dir => {
        return dir.includes(targetDate) && 
               fs.statSync(path.join(BACKUP_DIR, dir)).isDirectory() &&
               dir.startsWith('museum_')
      })
    }
    
    if (backupDirs.length === 0) {
      // Show available backups to help user
      const availableBackups = backups
        .filter(dir => {
          return fs.statSync(path.join(BACKUP_DIR, dir)).isDirectory() &&
                 dir.startsWith('museum_')
        })
        .map(dir => {
          const match = dir.match(/(museum_\w+)-(.+)/)
          return match ? match[2] : null
        })
        .filter(Boolean)
      
      // Get unique timestamps
      const uniqueTimestamps = [...new Set(availableBackups)]
      
      const errorMsg = `No backup found for date: ${backupDate}\n\n` +
        `Available backups:\n` +
        uniqueTimestamps.slice(0, 5).map(ts => `  - ${ts}`).join('\n') +
        (uniqueTimestamps.length > 5 ? `\n  ... and ${uniqueTimestamps.length - 5} more` : '') +
        `\n\nUse: node scripts/restore.js list (to see all backups)`
      
      throw new Error(errorMsg)
    }
    
    // Find backup directories for each database
    // Note: Each database might have slightly different timestamps (milliseconds)
    const adminBackup = backupDirs.find(dir => dir.startsWith('museum_admin-'))
    const superAdminBackup = backupDirs.find(dir => dir.startsWith('museum_superadmin-'))
    const bookingsBackup = backupDirs.find(dir => dir.startsWith('museum_bookings-'))
    
    if (!adminBackup || !superAdminBackup || !bookingsBackup) {
      const missing = []
      if (!adminBackup) missing.push('museum_admin')
      if (!superAdminBackup) missing.push('museum_superadmin')
      if (!bookingsBackup) missing.push('museum_bookings')
      throw new Error(`Missing backup directories for: ${missing.join(', ')}`)
    }
    
    // Extract timestamps (they might be slightly different)
    const adminMatch = adminBackup.match(/(museum_admin)-(.+)/)
    const superAdminMatch = superAdminBackup.match(/(museum_superadmin)-(.+)/)
    const bookingsMatch = bookingsBackup.match(/(museum_bookings)-(.+)/)
    
    if (!adminMatch || !superAdminMatch || !bookingsMatch) {
      throw new Error('Could not parse backup timestamps')
    }
    
    const adminTimestamp = adminMatch[2]
    const superAdminTimestamp = superAdminMatch[2]
    const bookingsTimestamp = bookingsMatch[2]
    
    console.log(`\n📦 Restoring from backups:`)
    console.log(`   - Admin: ${adminTimestamp}`)
    console.log(`   - SuperAdmin: ${superAdminTimestamp}`)
    console.log(`   - Bookings: ${bookingsTimestamp}`)
    console.log('⚠️  WARNING: This will overwrite existing data!')
    console.log('')
    
    // Restore databases using their specific timestamps
    const results = await Promise.all([
      restoreDatabase(path.join(BACKUP_DIR, adminBackup), 'museum_admin'),
      restoreDatabase(path.join(BACKUP_DIR, superAdminBackup), 'museum_superadmin'),
      restoreDatabase(path.join(BACKUP_DIR, bookingsBackup), 'museum_bookings')
    ])
    
    // Use the most recent timestamp for uploads (they're usually close)
    const timestamp = adminTimestamp
    
    // Restore uploads (use the actual timestamp found)
    let uploadsRestored = false
    try {
      const uploadsPath = await restoreUploads(timestamp)
      if (uploadsPath) {
        uploadsRestored = true
        console.log(`📁 Uploads restored: ${uploadsPath}`)
      }
    } catch (error) {
      logger.warn('Uploads restore failed, continuing', { error: error.message })
      console.log(`⚠️  Uploads restore failed: ${error.message}`)
    }
    
    logger.info('Restore completed successfully')
    console.log('\n✅ Restore completed successfully!')
    console.log(`📊 Databases restored: ${results.length}`)
    results.forEach((result, index) => {
      const dbNames = ['museum_admin', 'museum_superadmin', 'museum_bookings']
      console.log(`   - ${dbNames[index]}: ${result.collections} collections, ${result.totalDocuments} documents`)
    })
    if (uploadsRestored) {
      console.log(`📁 Uploads restored`)
    }
    console.log('')
    
  } catch (error) {
    logger.error('Restore process failed', { error: error.message, stack: error.stack })
    console.error('\n❌ Restore failed:', error.message)
    process.exit(1)
  } finally {
    // Close all mongoose connections
    await mongoose.disconnect()
  }
}

/**
 * List available backups
 */
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('No backup directory found')
      return
    }

    const files = fs.readdirSync(BACKUP_DIR)
    const backups = files
      .filter(file => {
        const filePath = path.join(BACKUP_DIR, file)
        return fs.statSync(filePath).isDirectory() && file.startsWith('museum_')
      })
      .map(file => {
        const match = file.match(/(museum_\w+)-(.+)/)
        if (match) {
          return {
            database: match[1],
            timestamp: match[2],
            path: path.join(BACKUP_DIR, file)
          }
        }
        return null
      })
      .filter(Boolean)
    
    // Group by timestamp
    const grouped = {}
    backups.forEach(backup => {
      if (!grouped[backup.timestamp]) {
        grouped[backup.timestamp] = []
      }
      grouped[backup.timestamp].push(backup.database)
    })
    
    if (Object.keys(grouped).length === 0) {
      console.log('\n📦 No backups found')
      console.log('')
      return
    }
    
    console.log('\n📦 Available Backups:')
    console.log('='.repeat(50))
    Object.keys(grouped).sort().reverse().forEach(timestamp => {
      console.log(`\n📅 ${timestamp}`)
      console.log(`   Databases: ${grouped[timestamp].join(', ')}`)
      
      // Check if metadata exists
      const samplePath = path.join(BACKUP_DIR, `museum_admin-${timestamp}`)
      const metadataPath = path.join(samplePath, '_metadata.json')
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
          console.log(`   Collections: ${metadata.collections.length}, Documents: ${metadata.totalDocuments}`)
        } catch (e) {
          // Ignore metadata read errors
        }
      }
    })
    console.log('\n')
    
  } catch (error) {
    console.error('Error listing backups:', error.message)
  }
}

// Run restore if called directly
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args[0] === 'list') {
    listBackups()
  } else if (args[0]) {
    performRestore(args[0])
      .then(() => {
        process.exit(0)
      })
      .catch((error) => {
        console.error('Fatal error:', error)
        process.exit(1)
      })
  } else {
    console.error('Usage: node restore.js <backup-date>')
    console.error('   or: node restore.js list')
    console.error('\nExample: node restore.js 2024-12-20_14-30-00')
    process.exit(1)
  }
}

module.exports = { performRestore, listBackups }

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const logger = require('../utils/logger')

const BACKUP_DIR = path.join(__dirname, '../backups')
const MONGODB_URI_ADMIN = process.env.MONGO_URI_ADMIN || 'mongodb://127.0.0.1:27017/museum_admin'
const MONGODB_URI_SUPERADMIN = process.env.MONGO_URI_SUPERADMIN || 'mongodb://127.0.0.1:27017/museum_superadmin'
const MONGODB_URI_BOOKINGS = process.env.MONGO_URI_BOOKINGS || 'mongodb://127.0.0.1:27017/museum_bookings'

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  logger.info('Created backup directory', { path: BACKUP_DIR })
}

function backupDatabase(uri, dbName) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
    const backupPath = path.join(BACKUP_DIR, `${dbName}-${timestamp}`)
    
    // Extract connection details
    const match = uri.match(/mongodb:\/\/([^\/]+)\/(.+)/)
    if (!match) {
      return reject(new Error('Invalid MongoDB URI'))
    }
    
    const host = match[1]
    const database = match[2]
    
    // Use mongodump command
    // Note: mongodump must be installed on the system
    const command = `mongodump --host ${host} --db ${database} --out ${backupPath}`
    
    logger.info(`Starting backup for ${dbName}`, { host, database, backupPath })
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Backup failed for ${dbName}`, { error: error.message, stderr })
        return reject(error)
      }
      
      logger.info(`Backup completed for ${dbName}`, { path: backupPath })
      resolve(backupPath)
    })
  })
}

async function backupUploads() {
  return new Promise((resolve, reject) => {
    const uploadsDir = path.join(__dirname, '../uploads')
    
    if (!fs.existsSync(uploadsDir)) {
      logger.info('Uploads directory does not exist, skipping')
      return resolve(null)
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
    const uploadsBackup = path.join(BACKUP_DIR, `uploads-${timestamp}`)
    
    // Copy uploads directory (using platform-appropriate command)
    const isWindows = process.platform === 'win32'
    const command = isWindows 
      ? `xcopy /E /I /Y "${uploadsDir}" "${uploadsBackup}"`
      : `cp -r "${uploadsDir}" "${uploadsBackup}"`
    
    logger.info('Starting uploads backup', { source: uploadsDir, destination: uploadsBackup })
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Uploads backup failed', { error: error.message, stderr })
        return reject(error)
      }
      
      logger.info('Uploads backup completed', { path: uploadsBackup })
      resolve(uploadsBackup)
    })
  })
}

async function performBackup() {
  try {
    logger.info('Starting database backup process...')
    
    const backups = await Promise.all([
      backupDatabase(MONGODB_URI_ADMIN, 'museum_admin'),
      backupDatabase(MONGODB_URI_SUPERADMIN, 'museum_superadmin'),
      backupDatabase(MONGODB_URI_BOOKINGS, 'museum_bookings')
    ])
    
    // Backup uploaded files
    try {
      await backupUploads()
    } catch (error) {
      logger.warn('Uploads backup failed, continuing with database backups', { error: error.message })
    }
    
    logger.info('All backups completed successfully', { backups })
    
    // Clean old backups (keep last 7 days)
    cleanOldBackups()
    
    console.log('✅ Backup completed successfully!')
    console.log(`📁 Backup location: ${BACKUP_DIR}`)
    
  } catch (error) {
    logger.error('Backup process failed', { error: error.message, stack: error.stack })
    console.error('❌ Backup failed:', error.message)
    process.exit(1)
  }
}

function cleanOldBackups() {
  try {
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
    }
  } catch (error) {
    logger.warn('Error cleaning old backups', { error: error.message })
  }
}

// Run backup if called directly
if (require.main === module) {
  performBackup()
}

module.exports = { performBackup }


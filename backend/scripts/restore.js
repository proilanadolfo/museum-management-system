const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const logger = require('../utils/logger')

const BACKUP_DIR = path.join(__dirname, '../backups')

function restoreDatabase(backupPath, dbName) {
  return new Promise((resolve, reject) => {
    const uri = process.env[`MONGO_URI_${dbName.toUpperCase().replace('MUSEUM_', '')}`] || 
                `mongodb://127.0.0.1:27017/${dbName}`
    
    const match = uri.match(/mongodb:\/\/([^\/]+)\/(.+)/)
    if (!match) {
      return reject(new Error('Invalid MongoDB URI'))
    }
    
    const host = match[1]
    const database = match[2]
    
    // Find the actual database folder in backup
    const dbBackupPath = path.join(backupPath, database)
    
    if (!fs.existsSync(dbBackupPath)) {
      return reject(new Error(`Backup path not found: ${dbBackupPath}`))
    }
    
    const command = `mongorestore --host ${host} --db ${database} --drop ${dbBackupPath}`
    
    logger.info(`Starting restore for ${dbName}`, { host, database, backupPath: dbBackupPath })
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Restore failed for ${dbName}`, { error: error.message, stderr })
        return reject(error)
      }
      
      logger.info(`Restore completed for ${dbName}`)
      resolve()
    })
  })
}

async function restoreUploads(backupDate) {
  return new Promise((resolve, reject) => {
    const backups = fs.readdirSync(BACKUP_DIR)
    const uploadsBackup = backups.find(dir => dir.startsWith('uploads-') && dir.includes(backupDate))
    
    if (!uploadsBackup) {
      logger.info('No uploads backup found for date, skipping')
      return resolve(null)
    }
    
    const uploadsBackupPath = path.join(BACKUP_DIR, uploadsBackup)
    const uploadsDir = path.join(__dirname, '../uploads')
    
    // Remove existing uploads directory
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true })
    }
    
    // Copy backup to uploads directory
    const isWindows = process.platform === 'win32'
    const command = isWindows
      ? `xcopy /E /I /Y "${uploadsBackupPath}" "${uploadsDir}"`
      : `cp -r "${uploadsBackupPath}" "${uploadsDir}"`
    
    logger.info('Starting uploads restore', { source: uploadsBackupPath, destination: uploadsDir })
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Uploads restore failed', { error: error.message, stderr })
        return reject(error)
      }
      
      logger.info('Uploads restore completed')
      resolve()
    })
  })
}

async function performRestore(backupDate) {
  try {
    if (!backupDate) {
      throw new Error('Backup date is required. Usage: node restore.js <backup-date>')
    }
    
    logger.info('Starting database restore process...', { backupDate })
    
    // Find backup directory
    const backups = fs.readdirSync(BACKUP_DIR)
    const backupDirs = backups.filter(dir => {
      // Look for directories that match the backup date pattern
      return dir.includes(backupDate) && fs.statSync(path.join(BACKUP_DIR, dir)).isDirectory()
    })
    
    if (backupDirs.length === 0) {
      throw new Error(`No backup found for date: ${backupDate}`)
    }
    
    // Find the first database backup directory (they all have the same timestamp)
    const sampleBackup = backupDirs.find(dir => dir.startsWith('museum_'))
    if (!sampleBackup) {
      throw new Error(`Invalid backup structure for date: ${backupDate}`)
    }
    
    // Extract timestamp from backup directory name
    const timestampMatch = sampleBackup.match(/(museum_\w+)-(.+)/)
    if (!timestampMatch) {
      throw new Error(`Could not parse backup timestamp from: ${sampleBackup}`)
    }
    
    const timestamp = timestampMatch[2]
    const baseBackupPath = path.join(BACKUP_DIR, `museum_admin-${timestamp}`)
    
    // Verify backup exists
    if (!fs.existsSync(baseBackupPath)) {
      throw new Error(`Backup directory not found: ${baseBackupPath}`)
    }
    
    console.log(`📦 Restoring from backup: ${timestamp}`)
    console.log('⚠️  WARNING: This will overwrite existing data!')
    
    // Restore databases
    await Promise.all([
      restoreDatabase(path.dirname(baseBackupPath), 'museum_admin'),
      restoreDatabase(path.dirname(baseBackupPath), 'museum_superadmin'),
      restoreDatabase(path.dirname(baseBackupPath), 'museum_bookings')
    ])
    
    // Restore uploads
    try {
      await restoreUploads(backupDate)
    } catch (error) {
      logger.warn('Uploads restore failed, continuing', { error: error.message })
    }
    
    logger.info('Restore completed successfully')
    console.log('✅ Restore completed successfully!')
    
  } catch (error) {
    logger.error('Restore process failed', { error: error.message, stack: error.stack })
    console.error('❌ Restore failed:', error.message)
    process.exit(1)
  }
}

// List available backups
function listBackups() {
  try {
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
    
    console.log('\n📦 Available Backups:')
    console.log('='.repeat(50))
    Object.keys(grouped).sort().reverse().forEach(timestamp => {
      console.log(`\n📅 ${timestamp}`)
      console.log(`   Databases: ${grouped[timestamp].join(', ')}`)
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
  } else {
    console.error('Usage: node restore.js <backup-date>')
    console.error('   or: node restore.js list')
    console.error('\nExample: node restore.js 2024-01-15_14-30-00')
    process.exit(1)
  }
}

module.exports = { performRestore, listBackups }


// Quick script to test audit logs
// Run: node test-audit.js

const mongoose = require('mongoose')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') })

const BOOKINGS_URI = process.env.MONGO_URI_BOOKINGS || 'mongodb://127.0.0.1:27017/museum_bookings'

const auditLogSchema = new mongoose.Schema({
  userId: String,
  userRole: String,
  username: String,
  action: String,
  resource: String,
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}, { timestamps: true })

async function testAuditLogs() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(BOOKINGS_URI)
    console.log('✅ Connected to MongoDB\n')

    const AuditLog = mongoose.model('AuditLog', auditLogSchema, 'auditlogs')

    // Get recent audit logs
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .lean()

    if (logs.length === 0) {
      console.log('⚠️  No audit logs found.')
      console.log('   Try logging in first to generate audit logs.\n')
    } else {
      console.log(`📊 Found ${logs.length} recent audit log(s):\n`)
      console.log('='.repeat(80))
      
      logs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.action} - ${log.resource}`)
        console.log(`   User: ${log.username || log.userId} (${log.userRole})`)
        console.log(`   Time: ${new Date(log.timestamp).toLocaleString()}`)
        console.log(`   IP: ${log.ipAddress || 'N/A'}`)
        if (log.details) {
          console.log(`   Details: ${JSON.stringify(log.details).substring(0, 100)}...`)
        }
      })
      
      console.log('\n' + '='.repeat(80))
    }

    // Get statistics
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    if (stats.length > 0) {
      console.log('\n📈 Audit Log Statistics:')
      stats.forEach(stat => {
        console.log(`   ${stat._id}: ${stat.count}`)
      })
    }

    await mongoose.disconnect()
    console.log('\n✅ Done!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testAuditLogs()


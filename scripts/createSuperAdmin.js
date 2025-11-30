/**
 * Utility script to create a Super Admin account from the command line.
 *
 * Usage:
 *   node scripts/createSuperAdmin.js <username> <email> <password>
 *
 * Example:
 *   node scripts/createSuperAdmin.js popoysuper 2301114143@student.buksu.edu.ph admin123
 */
const bcrypt = require('bcryptjs')
const { superAdminConnection, whenOpen } = require('../backend/db')
const SuperAdmin = require('../backend/models/SuperAdmin')

async function main() {
  const [username, email, password] = process.argv.slice(2)

  if (!username || !email || !password) {
    console.error('Usage: node scripts/createSuperAdmin.js <username> <email> <password>')
    process.exit(1)
  }

  try {
    await whenOpen(superAdminConnection)

    const existing = await SuperAdmin.findOne({
      $or: [{ username }, { email }]
    })

    if (existing) {
      console.log('Super admin already exists for username/email, skipping create.')
      console.log('Existing ID:', existing._id.toString())
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await SuperAdmin.create({ username, email, passwordHash })

    console.log('✅ Created new super admin account:')
    console.log('  ID:', user._id.toString())
    console.log('  Username:', user.username)
    console.log('  Email:', user.email)
  } catch (error) {
    console.error('❌ Failed to create super admin:', error.message)
    console.error(error)
  } finally {
    await superAdminConnection.close().catch(() => {})
  }
}

main()


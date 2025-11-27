// Check .env file format and connection strings
require('dotenv').config()

console.log('🔍 Checking .env file format and MongoDB connection strings...\n')

// Check if environment variables are loaded
const adminUri = process.env.MONGO_URI_ADMIN
const superAdminUri = process.env.MONGO_URI_SUPERADMIN
const bookingsUri = process.env.MONGO_URI_BOOKINGS

console.log('✅ Environment variables loaded:\n')

if (adminUri) {
  console.log('MONGO_URI_ADMIN: ✓ Set')
  // Check format
  if (!adminUri.startsWith('mongodb+srv://')) {
    console.log('  ⚠️  Warning: Should start with mongodb+srv://')
  }
  if (!adminUri.includes('@')) {
    console.log('  ❌ Error: Missing @ symbol (username:password@host)')
  }
  if (!adminUri.includes('/museum_admin')) {
    console.log('  ⚠️  Warning: Database should be museum_admin')
  }
} else {
  console.log('MONGO_URI_ADMIN: ❌ Not set')
}

if (superAdminUri) {
  console.log('MONGO_URI_SUPERADMIN: ✓ Set')
  if (!superAdminUri.includes('/museum_superadmin')) {
    console.log('  ⚠️  Warning: Database should be museum_superadmin')
  }
} else {
  console.log('MONGO_URI_SUPERADMIN: ❌ Not set')
}

if (bookingsUri) {
  console.log('MONGO_URI_BOOKINGS: ✓ Set')
  if (!bookingsUri.includes('/museum_bookings')) {
    console.log('  ⚠️  Warning: Database should be museum_bookings')
  }
} else {
  console.log('MONGO_URI_BOOKINGS: ❌ Not set')
}

console.log('\n📝 Connection String Format Check:\n')

function checkFormat(uri, name) {
  if (!uri) {
    console.log(`${name}: ❌ Not set`)
    return false
  }
  
  const issues = []
  
  // Check if it's mongodb+srv
  if (!uri.startsWith('mongodb+srv://')) {
    issues.push('Should start with mongodb+srv://')
  }
  
  // Check for username:password@host format
  if (!uri.match(/mongodb\+srv:\/\/[^:]+:[^@]+@[^/]+\//)) {
    issues.push('Invalid format: should be mongodb+srv://username:password@host/database')
  }
  
  // Check for special characters in password (should be encoded)
  const passwordMatch = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/)
  if (passwordMatch) {
    const password = passwordMatch[2]
    // Check if password has unencoded special characters
    if (password.includes('!') && !password.includes('%21')) {
      issues.push('Password contains ! which should be encoded as %21')
    }
    if (password.includes('@') && !password.includes('%40')) {
      issues.push('Password contains @ which should be encoded as %40')
    }
    if (password.includes('#') && !password.includes('%23')) {
      issues.push('Password contains # which should be encoded as %23')
    }
  }
  
  if (issues.length === 0) {
    console.log(`${name}: ✅ Format is correct`)
    return true
  } else {
    console.log(`${name}: ⚠️  Issues found:`)
    issues.forEach(issue => console.log(`   - ${issue}`))
    return false
  }
}

checkFormat(adminUri, 'Admin DB')
checkFormat(superAdminUri, 'SuperAdmin DB')
checkFormat(bookingsUri, 'Bookings DB')

console.log('\n💡 If hostname cannot be resolved, verify the exact hostname from MongoDB Atlas:')
console.log('   1. Go to MongoDB Atlas → Connect → Connect your application')
console.log('   2. Copy the exact connection string')
console.log('   3. The hostname is the part after @ and before /')
console.log('   4. Example: mongodb+srv://user:pass@cluster0.XXXXX.mongodb.net/...')
console.log('      The hostname is: cluster0.XXXXX.mongodb.net')


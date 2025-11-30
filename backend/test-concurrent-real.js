/**
 * Real Concurrent Edit Test
 * Simulates two browsers editing at the same time
 */

require('dotenv').config()
const tbccManager = require('./services/tbccManager')

async function testRealConcurrent() {
  console.log('🧪 Testing Real Concurrent Edits\n')

  const collectionName = 'museumsettings'
  const itemId = 'museum-settings'

  // Simulate Browser 1 starting edit
  console.log('Browser 1: Starting edit...')
  const txn1 = tbccManager.startTransaction('admin', 'UPDATE_MUSEUM_SETTINGS')
  console.log(`  Transaction ID: ${txn1.transactionId}`)
  console.log(`  Timestamp: ${txn1.timestamp}`)

  // Simulate Browser 2 starting edit (almost simultaneously)
  console.log('\nBrowser 2: Starting edit (almost same time)...')
  const txn2 = tbccManager.startTransaction('admin', 'UPDATE_MUSEUM_SETTINGS')
  console.log(`  Transaction ID: ${txn2.transactionId}`)
  console.log(`  Timestamp: ${txn2.timestamp}`)

  // Browser 1 validates first
  console.log('\nBrowser 1: Validating write...')
  const validate1 = tbccManager.validateWrite(txn1.transactionId, collectionName, itemId)
  console.log(`  Allowed: ${validate1.allowed}`)
  if (!validate1.allowed) {
    console.log(`  Reason: ${validate1.reason}`)
  }

  // Browser 2 validates second (should see updated WTS from Browser 1)
  console.log('\nBrowser 2: Validating write (after Browser 1)...')
  const validate2 = tbccManager.validateWrite(txn2.transactionId, collectionName, itemId)
  console.log(`  Allowed: ${validate2.allowed}`)
  if (!validate2.allowed) {
    console.log(`  Reason: ${validate2.reason}`)
    console.log(`  Aborted: ${validate2.aborted}`)
  }

  // Commit Browser 1 if allowed
  if (validate1.allowed) {
    console.log('\nBrowser 1: Committing...')
    const commit1 = tbccManager.commitTransaction(txn1.transactionId)
    console.log(`  Success: ${commit1.success}`)
  }

  // Try to commit Browser 2 (should fail if aborted)
  if (validate2.allowed) {
    console.log('\nBrowser 2: Committing...')
    const commit2 = tbccManager.commitTransaction(txn2.transactionId)
    console.log(`  Success: ${commit2.success}`)
  } else {
    console.log('\nBrowser 2: Cannot commit (transaction aborted)')
  }

  // Check final state
  console.log('\n' + '='.repeat(50))
  console.log('Final State:')
  console.log('='.repeat(50))
  const timestamps = tbccManager.getDataItemTimestamps(collectionName, itemId)
  console.log(`WTS: ${timestamps.wts}`)
  console.log(`RTS: ${timestamps.rts}`)
  
  const stats = tbccManager.getStatistics()
  console.log(`\nStatistics:`)
  console.log(`  Committed: ${stats.committedTransactions}`)
  console.log(`  Aborted: ${stats.abortedTransactions}`)

  console.log('\n✅ Test completed!')
  console.log('\nExpected Result:')
  console.log('  - Browser 1: ✅ Allowed and committed')
  console.log('  - Browser 2: ❌ Should be aborted due to conflict')
}

testRealConcurrent().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})


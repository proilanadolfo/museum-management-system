/**
 * TBCC Concurrent Operations Test
 * Tests TBCC with concurrent write operations
 * 
 * Usage: node test-concurrent-tbcc.js
 */

require('dotenv').config()
const tbccManager = require('./services/tbccManager')

async function testConcurrentOperations() {
  console.log('🧪 Testing Concurrent Operations with TBCC\n')

  // Test 1: Concurrent writes to same item
  console.log('Test 1: Concurrent Writes to Same Item')
  const itemId = 'test-item-concurrent'
  const collectionName = 'test_collection'

  // Start two transactions
  const txn1 = tbccManager.startTransaction('user1', 'CONCURRENT_WRITE_1')
  const txn2 = tbccManager.startTransaction('user2', 'CONCURRENT_WRITE_2')

  console.log(`Transaction 1: ${txn1.transactionId} (TS: ${txn1.timestamp})`)
  console.log(`Transaction 2: ${txn2.transactionId} (TS: ${txn2.timestamp})`)

  // Txn1 writes first
  console.log('\nTxn1 writing...')
  const write1 = tbccManager.validateWrite(txn1.transactionId, collectionName, itemId)
  if (write1.allowed) {
    console.log('✅ Txn1 write allowed')
    tbccManager.commitTransaction(txn1.transactionId)
  } else {
    console.log('❌ Txn1 write failed:', write1.reason)
  }

  // Txn2 tries to write (should conflict if TS < WTS)
  console.log('\nTxn2 writing...')
  const write2 = tbccManager.validateWrite(txn2.transactionId, collectionName, itemId)
  if (write2.allowed) {
    console.log('✅ Txn2 write allowed')
    tbccManager.commitTransaction(txn2.transactionId)
  } else {
    console.log('❌ Txn2 write failed:', write2.reason)
    if (write2.aborted) {
      console.log('   🎯 TBCC Conflict Detection Working!')
    }
  }

  // Test 2: Read after write
  console.log('\n\nTest 2: Read After Write')
  const txn3 = tbccManager.startTransaction('user3', 'READ_AFTER_WRITE')
  const txn4 = tbccManager.startTransaction('user4', 'WRITE_BEFORE_READ')

  const itemId2 = 'test-item-read-write'

  // Txn3 writes
  console.log('\nTxn3 writing...')
  const write3 = tbccManager.validateWrite(txn3.transactionId, collectionName, itemId2)
  if (write3.allowed) {
    console.log('✅ Txn3 write allowed')
    tbccManager.commitTransaction(txn3.transactionId)
  }

  // Txn4 tries to read (with lower TS - simulated conflict)
  console.log('\nTxn4 reading...')
  const read1 = tbccManager.validateRead(txn4.transactionId, collectionName, itemId2)
  if (read1.allowed) {
    console.log('✅ Txn4 read allowed')
    tbccManager.commitTransaction(txn4.transactionId)
  } else {
    console.log('❌ Txn4 read failed:', read1.reason)
    if (read1.aborted) {
      console.log('   🎯 TBCC Write-Read Conflict Detection Working!')
    }
  }

  // Test 3: Multiple concurrent operations
  console.log('\n\nTest 3: Multiple Concurrent Operations')
  const transactions = []
  for (let i = 0; i < 5; i++) {
    transactions.push(tbccManager.startTransaction(`user${i}`, `OP_${i}`))
  }

  console.log(`Started ${transactions.length} concurrent transactions`)
  
  const itemId3 = 'test-item-multiple'
  let successCount = 0
  let conflictCount = 0

  for (const txn of transactions) {
    const result = tbccManager.validateWrite(txn.transactionId, collectionName, itemId3)
    if (result.allowed) {
      successCount++
      tbccManager.commitTransaction(txn.transactionId)
    } else {
      conflictCount++
      if (result.aborted) {
        console.log(`   Transaction ${txn.transactionId} aborted: ${result.reason}`)
      }
    }
  }

  console.log(`\nResults:`)
  console.log(`   Successful: ${successCount}`)
  console.log(`   Conflicts: ${conflictCount}`)

  // Final statistics
  console.log('\n' + '='.repeat(50))
  console.log('📊 Final Statistics:')
  console.log('='.repeat(50))
  const stats = tbccManager.getStatistics()
  console.log(JSON.stringify(stats, null, 2))
  console.log('\n✅ Concurrent operations test completed!\n')
}

// Run tests
testConcurrentOperations().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})


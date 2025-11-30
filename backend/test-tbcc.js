/**
 * TBCC Testing Script
 * Run this to test TBCC functionality
 * 
 * Usage: node test-tbcc.js
 */

require('dotenv').config()
const tbccManager = require('./services/tbccManager')

async function testTBCC() {
  console.log('🧪 Testing TBCC Implementation\n')

  // Test 1: Start Transaction
  console.log('Test 1: Start Transaction')
  const { transactionId, timestamp } = tbccManager.startTransaction('user123', 'TEST_OPERATION')
  console.log(`✅ Transaction started: ${transactionId}`)
  console.log(`   Timestamp: ${timestamp}\n`)

  // Test 2: Validate Write (should succeed)
  console.log('Test 2: Validate Write (new item)')
  const writeResult1 = tbccManager.validateWrite(transactionId, 'bookings', 'item1')
  console.log(`✅ Write allowed: ${writeResult1.allowed}`)
  console.log(`   Reason: ${writeResult1.reason || 'N/A'}\n`)

  // Test 3: Commit Transaction
  console.log('Test 3: Commit Transaction')
  const commitResult = tbccManager.commitTransaction(transactionId)
  console.log(`✅ Commit success: ${commitResult.success}`)
  if (commitResult.success) {
    console.log(`   Operations: ${commitResult.transaction.operations}`)
    console.log(`   Duration: ${commitResult.transaction.duration}ms\n`)
  }

  // Test 4: Conflict Detection - Write-Read
  console.log('Test 4: Write-Read Conflict Detection')
  const txn1 = tbccManager.startTransaction('user1', 'WRITE_OP')
  const txn2 = tbccManager.startTransaction('user2', 'READ_OP')
  
  // Txn1 writes (TS=higher)
  tbccManager.validateWrite(txn1.transactionId, 'bookings', 'item2')
  tbccManager.commitTransaction(txn1.transactionId)
  
  // Txn2 tries to read (TS=lower) - should abort
  const readResult = tbccManager.validateRead(txn2.transactionId, 'bookings', 'item2')
  console.log(`✅ Read allowed: ${readResult.allowed}`)
  console.log(`   Aborted: ${readResult.aborted || false}`)
  console.log(`   Reason: ${readResult.reason || 'N/A'}\n`)

  // Test 5: Conflict Detection - Write-Write
  console.log('Test 5: Write-Write Conflict Detection')
  const txn3 = tbccManager.startTransaction('user3', 'WRITE_OP_1')
  const txn4 = tbccManager.startTransaction('user4', 'WRITE_OP_2')
  
  // Txn3 reads first (sets RTS)
  tbccManager.validateRead(txn3.transactionId, 'bookings', 'item3')
  tbccManager.commitTransaction(txn3.transactionId)
  
  // Txn4 tries to write with lower TS - should abort
  const writeResult2 = tbccManager.validateWrite(txn4.transactionId, 'bookings', 'item3')
  console.log(`✅ Write allowed: ${writeResult2.allowed}`)
  console.log(`   Aborted: ${writeResult2.aborted || false}`)
  console.log(`   Reason: ${writeResult2.reason || 'N/A'}\n`)

  // Test 6: Restart Transaction
  console.log('Test 6: Restart Transaction')
  const oldTxn = tbccManager.startTransaction('user5', 'FAILED_OP')
  tbccManager.abortTransaction(oldTxn.transactionId, 'Test abort')
  const newTxn = tbccManager.restartTransaction(oldTxn.transactionId, 'user5', 'RETRY_OP')
  console.log(`✅ New transaction: ${newTxn.transactionId}`)
  console.log(`   Old timestamp: ${oldTxn.timestamp}`)
  console.log(`   New timestamp: ${newTxn.timestamp}\n`)

  // Test 7: Get Statistics
  console.log('Test 7: Get Statistics')
  const stats = tbccManager.getStatistics()
  console.log(`✅ Statistics:`)
  console.log(`   Active: ${stats.activeTransactions}`)
  console.log(`   Committed: ${stats.committedTransactions}`)
  console.log(`   Aborted: ${stats.abortedTransactions}`)
  console.log(`   Data Items: ${stats.totalDataItems}`)
  console.log(`   Logs: ${stats.totalLogs}\n`)

  // Test 8: Get Transaction Logs
  console.log('Test 8: Get Transaction Logs')
  const logs = tbccManager.getTransactionLogs(10)
  console.log(`✅ Retrieved ${logs.length} log entries`)
  if (logs.length > 0) {
    console.log(`   Latest: ${logs[logs.length - 1].action} - ${logs[logs.length - 1].transactionId}\n`)
  }

  console.log('✅ All tests completed!\n')
  console.log('📊 Final Statistics:')
  console.log(JSON.stringify(tbccManager.getStatistics(), null, 2))
}

// Run tests
testTBCC().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})


/**
 * Timestamp-Based Concurrency Control (TBCC) Manager
 * 
 * Implements TBCC protocol for transaction management:
 * - Every transaction has a unique timestamp (TS)
 * - Each data item tracks Read Timestamp (RTS) and Write Timestamp (WTS)
 * - Enforces serializability through timestamp ordering
 */

const logger = require('../utils/logger')

class TBCCManager {
  constructor() {
    // In-memory storage for data item timestamps
    // Format: { collectionName: { itemId: { rts: number, wts: number } } }
    this.dataItemTimestamps = new Map()
    
    // Active transactions tracking
    // Format: { transactionId: { ts: number, operations: [], status: 'active'|'committed'|'aborted' } }
    this.activeTransactions = new Map()
    
    // Lock tracking for concurrent edit prevention
    // Format: { collectionName:itemId: transactionId } - tracks which transaction is currently editing
    this.editLocks = new Map()
    
    // Transaction counter for unique timestamps
    this.transactionCounter = 0
    
    // Logs for monitoring
    this.transactionLogs = []
    this.maxLogSize = 1000 // Keep last 1000 transaction logs
  }

  /**
   * Generate a unique transaction timestamp
   * @returns {number} Unique timestamp
   */
  generateTransactionTimestamp() {
    // Use high-resolution timestamp to ensure uniqueness
    const now = Date.now()
    const counter = ++this.transactionCounter
    // Combine timestamp with counter for guaranteed uniqueness
    return now * 1000000 + counter
  }

  /**
   * Start a new transaction
   * @param {string} userId - User ID initiating the transaction
   * @param {string} operation - Operation type (e.g., 'CREATE_BOOKING', 'UPDATE_BOOKING')
   * @returns {Object} Transaction object with transactionId and timestamp
   */
  startTransaction(userId, operation) {
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = this.generateTransactionTimestamp()
    
    const transaction = {
      transactionId,
      timestamp,
      userId,
      operation,
      status: 'active',
      operations: [],
      startTime: new Date(),
      retryCount: 0
    }
    
    this.activeTransactions.set(transactionId, transaction)
    
    this.logTransaction(transactionId, 'START', {
      userId,
      operation,
      timestamp
    })
    
    logger.info(`🟢 TBCC: Transaction started`, {
      transactionId,
      timestamp,
      userId,
      operation
    })
    
    return { transactionId, timestamp }
  }

  /**
   * Get or initialize data item timestamps
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Document ID
   * @returns {Object} { rts, wts }
   */
  getDataItemTimestamps(collectionName, itemId) {
    const key = `${collectionName}:${itemId}`
    
    if (!this.dataItemTimestamps.has(key)) {
      // Initialize with current timestamp
      const now = Date.now()
      this.dataItemTimestamps.set(key, {
        rts: 0, // Read Timestamp
        wts: 0  // Write Timestamp
      })
    }
    
    return this.dataItemTimestamps.get(key)
  }

  /**
   * Update data item timestamps
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Document ID
   * @param {Object} updates - { rts?, wts? }
   */
  updateDataItemTimestamps(collectionName, itemId, updates) {
    const key = `${collectionName}:${itemId}`
    const current = this.getDataItemTimestamps(collectionName, itemId)
    
    if (updates.rts !== undefined) {
      current.rts = Math.max(current.rts, updates.rts)
    }
    if (updates.wts !== undefined) {
      current.wts = Math.max(current.wts, updates.wts)
    }
    
    this.dataItemTimestamps.set(key, current)
  }

  /**
   * Validate read operation according to TBCC rules
   * @param {string} transactionId - Transaction ID
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Document ID
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  validateRead(transactionId, collectionName, itemId) {
    const transaction = this.activeTransactions.get(transactionId)
    
    if (!transaction) {
      return { allowed: false, reason: 'Transaction not found' }
    }
    
    if (transaction.status !== 'active') {
      return { allowed: false, reason: `Transaction is ${transaction.status}` }
    }
    
    const ts = transaction.timestamp
    const itemTimestamps = this.getDataItemTimestamps(collectionName, itemId)
    const wts = itemTimestamps.wts
    
    // TBCC Rule: If TS < WTS → abort transaction (write-read conflict)
    if (ts < wts) {
      const reason = `Write-Read Conflict: Transaction TS(${ts}) < Item WTS(${wts})`
      this.abortTransaction(transactionId, reason)
      return { allowed: false, reason, aborted: true }
    }
    
    // Update RTS
    this.updateDataItemTimestamps(collectionName, itemId, { rts: ts })
    
    // Log the read operation
    transaction.operations.push({
      type: 'READ',
      collectionName,
      itemId,
      timestamp: ts,
      time: new Date()
    })
    
    this.logTransaction(transactionId, 'READ', {
      collectionName,
      itemId,
      timestamp: ts,
      wts,
      rts: itemTimestamps.rts
    })
    
    return { allowed: true }
  }

  /**
   * Validate write operation according to TBCC rules
   * @param {string} transactionId - Transaction ID
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Document ID
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  validateWrite(transactionId, collectionName, itemId) {
    const transaction = this.activeTransactions.get(transactionId)
    
    if (!transaction) {
      return { allowed: false, reason: 'Transaction not found' }
    }
    
    if (transaction.status !== 'active') {
      return { allowed: false, reason: `Transaction is ${transaction.status}` }
    }
    
    const ts = transaction.timestamp
    const key = `${collectionName}:${itemId}`
    const lockKey = `${collectionName}:${itemId}`
    
    // CRITICAL: Check if another transaction is already editing this item
    // This implements "first editor wins" - whoever gets the lock first can edit
    const existingLock = this.editLocks.get(lockKey)
    if (existingLock && existingLock !== transactionId) {
      const existingTxn = this.activeTransactions.get(existingLock)
      if (existingTxn && existingTxn.status === 'active') {
        const reason = `Concurrent Edit Conflict: Another transaction (${existingLock}) is currently editing this item`
        this.abortTransaction(transactionId, reason)
        return { allowed: false, reason, aborted: true }
      } else {
        // Lock holder is no longer active, clear the lock
        this.editLocks.delete(lockKey)
      }
    }
    
    // CRITICAL: Get and update timestamps atomically to prevent race conditions
    if (!this.dataItemTimestamps.has(key)) {
      this.dataItemTimestamps.set(key, { rts: 0, wts: 0 })
    }
    
    const itemTimestamps = this.dataItemTimestamps.get(key)
    const rts = itemTimestamps.rts
    const wts = itemTimestamps.wts
    
    // TBCC Rule 1: If TS < WTS → abort transaction (write-read conflict)
    if (ts < wts) {
      const reason = `Write-Read Conflict: Transaction TS(${ts}) < Item WTS(${wts})`
      this.abortTransaction(transactionId, reason)
      return { allowed: false, reason, aborted: true }
    }
    
    // TBCC Rule 2: If TS < RTS → abort transaction (write-write conflict)
    if (ts < rts) {
      const reason = `Write-Write Conflict: Transaction TS(${ts}) < Item RTS(${rts})`
      this.abortTransaction(transactionId, reason)
      return { allowed: false, reason, aborted: true }
    }
    
    // ACQUIRE LOCK: Mark this transaction as the editor
    this.editLocks.set(lockKey, transactionId)
    
    // IMPORTANT: Update WTS IMMEDIATELY to prevent concurrent transactions from passing
    itemTimestamps.wts = Math.max(itemTimestamps.wts, ts)
    this.dataItemTimestamps.set(key, itemTimestamps)
    
    // Log the write operation
    transaction.operations.push({
      type: 'WRITE',
      collectionName,
      itemId,
      timestamp: ts,
      time: new Date()
    })
    
    this.logTransaction(transactionId, 'WRITE', {
      collectionName,
      itemId,
      timestamp: ts,
      wts,
      rts
    })
    
    return { allowed: true }
  }

  /**
   * Abort a transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Abort reason
   */
  abortTransaction(transactionId, reason) {
    const transaction = this.activeTransactions.get(transactionId)
    
    if (!transaction) {
      return
    }
    
    transaction.status = 'aborted'
    transaction.endTime = new Date()
    transaction.abortReason = reason
    
    // Release any locks held by this transaction
    for (const [lockKey, lockedTxnId] of this.editLocks.entries()) {
      if (lockedTxnId === transactionId) {
        this.editLocks.delete(lockKey)
      }
    }
    
    this.logTransaction(transactionId, 'ABORT', {
      reason,
      operations: transaction.operations.length
    })
    
    logger.warn(`🔴 TBCC: Transaction aborted`, {
      transactionId,
      reason,
      timestamp: transaction.timestamp
    })
    
    // Keep transaction in map for logging purposes
    // Clean up after some time (optional)
    setTimeout(() => {
      this.activeTransactions.delete(transactionId)
    }, 3600000) // 1 hour
  }

  /**
   * Commit a transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Commit result
   */
  commitTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId)
    
    if (!transaction) {
      return { success: false, error: 'Transaction not found' }
    }
    
    if (transaction.status !== 'active') {
      return { 
        success: false, 
        error: `Cannot commit ${transaction.status} transaction`,
        status: transaction.status
      }
    }
    
    transaction.status = 'committed'
    transaction.endTime = new Date()
    transaction.duration = transaction.endTime - transaction.startTime
    
    // Release locks held by this transaction
    // Also release any edit locks (LOCK-* transactions)
    const locksToRelease = []
    for (const [lockKey, lockedTxnId] of this.editLocks.entries()) {
      if (lockedTxnId === transactionId) {
        locksToRelease.push(lockKey)
      }
    }
    
    // Also check if this transaction ID matches any lock IDs (for edit locks)
    for (const [lockKey, lockId] of this.editLocks.entries()) {
      if (lockId === transactionId) {
        locksToRelease.push(lockKey)
      }
    }
    
    // Release all locks
    locksToRelease.forEach(lockKey => {
      this.editLocks.delete(lockKey)
    })
    
    this.logTransaction(transactionId, 'COMMIT', {
      operations: transaction.operations.length,
      duration: transaction.duration
    })
    
    logger.info(`✅ TBCC: Transaction committed`, {
      transactionId,
      timestamp: transaction.timestamp,
      operations: transaction.operations.length,
      duration: transaction.duration
    })
    
    // Keep transaction in map for logging purposes
    setTimeout(() => {
      this.activeTransactions.delete(transactionId)
    }, 3600000) // 1 hour
    
    return { 
      success: true, 
      transaction: {
        transactionId,
        timestamp: transaction.timestamp,
        operations: transaction.operations.length,
        duration: transaction.duration
      }
    }
  }

  /**
   * Restart a transaction with new timestamp
   * @param {string} oldTransactionId - Old transaction ID
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   * @returns {Object} New transaction object
   */
  restartTransaction(oldTransactionId, userId, operation) {
    const oldTransaction = this.activeTransactions.get(oldTransactionId)
    
    if (oldTransaction) {
      oldTransaction.retryCount = (oldTransaction.retryCount || 0) + 1
    }
    
    // Start new transaction
    const newTransaction = this.startTransaction(userId, operation)
    
    if (oldTransaction) {
      this.logTransaction(newTransaction.transactionId, 'RESTART', {
        oldTransactionId,
        retryCount: oldTransaction.retryCount
      })
    }
    
    logger.info(`🔄 TBCC: Transaction restarted`, {
      oldTransactionId,
      newTransactionId: newTransaction.transactionId,
      retryCount: oldTransaction?.retryCount || 0
    })
    
    return newTransaction
  }

  /**
   * Log transaction action
   * @param {string} transactionId - Transaction ID
   * @param {string} action - Action type
   * @param {Object} data - Additional data
   */
  logTransaction(transactionId, action, data = {}) {
    const logEntry = {
      transactionId,
      action,
      timestamp: new Date(),
      data
    }
    
    this.transactionLogs.push(logEntry)
    
    // Keep only last maxLogSize entries
    if (this.transactionLogs.length > this.maxLogSize) {
      this.transactionLogs.shift()
    }
  }

  /**
   * Get transaction status
   * @param {string} transactionId - Transaction ID
   * @returns {Object|null} Transaction status
   */
  getTransactionStatus(transactionId) {
    const transaction = this.activeTransactions.get(transactionId)
    
    if (!transaction) {
      return null
    }
    
    return {
      transactionId: transaction.transactionId,
      timestamp: transaction.timestamp,
      status: transaction.status,
      operation: transaction.operation,
      userId: transaction.userId,
      operations: transaction.operations.length,
      startTime: transaction.startTime,
      endTime: transaction.endTime,
      duration: transaction.endTime ? transaction.endTime - transaction.startTime : null,
      abortReason: transaction.abortReason,
      retryCount: transaction.retryCount
    }
  }

  /**
   * Get all transaction logs
   * @param {number} limit - Limit number of logs
   * @returns {Array} Transaction logs
   */
  getTransactionLogs(limit = 100) {
    return this.transactionLogs.slice(-limit)
  }

  /**
   * Acquire edit lock when user starts editing
   * @param {string} userId - User ID
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Item ID
   * @returns {Object} { success: boolean, lockId?: string, error?: string }
   */
  acquireEditLock(userId, collectionName, itemId) {
    const lockKey = `${collectionName}:${itemId}`
    const existingLock = this.editLocks.get(lockKey)
    
    // Check if another user is already editing
    if (existingLock) {
      const existingTxn = this.activeTransactions.get(existingLock)
      if (existingTxn && (existingTxn.status === 'active' || existingTxn.status === 'locked')) {
        return {
          success: false,
          error: 'Another user is currently editing this item',
          lockedBy: existingTxn.userId,
          lockTime: existingTxn.startTime
        }
      } else {
        // Stale lock, clear it
        this.editLocks.delete(lockKey)
      }
    }
    
    // Create a lock transaction
    const lockId = `LOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const lockTransaction = {
      transactionId: lockId,
      userId,
      collectionName,
      itemId,
      status: 'locked',
      startTime: new Date(),
      type: 'edit_lock'
    }
    
    // Store lock
    this.editLocks.set(lockKey, lockId)
    this.activeTransactions.set(lockId, lockTransaction)
    
    logger.info(`🔒 TBCC: Edit lock acquired`, {
      lockId,
      userId,
      collectionName,
      itemId
    })
    
    return {
      success: true,
      lockId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }
  }

  /**
   * Release edit lock
   * @param {string} lockId - Lock ID
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Item ID
   * @returns {boolean} Success
   */
  releaseEditLock(lockId, collectionName, itemId) {
    const lockKey = `${collectionName}:${itemId}`
    const existingLock = this.editLocks.get(lockKey)
    
    if (existingLock === lockId) {
      this.editLocks.delete(lockKey)
      this.activeTransactions.delete(lockId)
      
      logger.info(`🔓 TBCC: Edit lock released`, {
        lockId,
        collectionName,
        itemId
      })
      
      return true
    }
    
    return false
  }

  /**
   * Check if item is locked
   * @param {string} collectionName - Collection name
   * @param {string} itemId - Item ID
   * @returns {Object|null} Lock info or null
   */
  checkEditLock(collectionName, itemId) {
    const lockKey = `${collectionName}:${itemId}`
    const lockId = this.editLocks.get(lockKey)
    
    if (!lockId) {
      return null
    }
    
    const lockTransaction = this.activeTransactions.get(lockId)
    if (!lockTransaction || lockTransaction.status !== 'locked') {
      // Stale lock, clear it
      this.editLocks.delete(lockKey)
      return null
    }
    
    // Check if lock expired (5 minutes)
    const lockAge = Date.now() - lockTransaction.startTime.getTime()
    if (lockAge > 5 * 60 * 1000) {
      // Lock expired, clear it
      this.editLocks.delete(lockKey)
      this.activeTransactions.delete(lockId)
      return null
    }
    
    return {
      locked: true,
      lockId,
      lockedBy: lockTransaction.userId,
      lockTime: lockTransaction.startTime,
      expiresAt: new Date(lockTransaction.startTime.getTime() + 5 * 60 * 1000)
    }
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const active = Array.from(this.activeTransactions.values())
    const activeCount = active.filter(t => t.status === 'active').length
    const committedCount = active.filter(t => t.status === 'committed').length
    const abortedCount = active.filter(t => t.status === 'aborted').length
    const lockedCount = active.filter(t => t.status === 'locked').length
    
    return {
      activeTransactions: activeCount,
      committedTransactions: committedCount,
      abortedTransactions: abortedCount,
      lockedItems: lockedCount,
      totalDataItems: this.dataItemTimestamps.size,
      totalLogs: this.transactionLogs.length
    }
  }
}

// Singleton instance
const tbccManager = new TBCCManager()

module.exports = tbccManager


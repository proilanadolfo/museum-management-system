/**
 * TBCC Middleware
 * Wraps route handlers with Timestamp-Based Concurrency Control
 */

const tbccManager = require('../services/tbccManager')
const TBCCDataItem = require('../models/TBCCDataItem')
const logger = require('../utils/logger')

/**
 * TBCC wrapper for route handlers
 * @param {Function} handler - Route handler function
 * @param {Object} options - Configuration options
 * @param {string} options.operation - Operation name
 * @param {string} options.collectionName - Collection name
 * @param {Function} options.getItemId - Function to extract item ID from request
 * @param {string} options.operationType - 'read' or 'write'
 */
function withTBCC(handler, options = {}) {
  return async (req, res, next) => {
    const {
      operation = 'UNKNOWN_OPERATION',
      collectionName,
      getItemId = (req) => req.params.id || req.body._id,
      operationType = 'write' // 'read' or 'write'
    } = options

    // Get user ID from request (from auth middleware)
    const userId = req.user?.id || req.user?.username || 'anonymous'
    
    // Start transaction
    let { transactionId, timestamp } = tbccManager.startTransaction(userId, operation)
    let retryCount = 0
    const maxRetries = 3

    const executeWithTBCC = async () => {
      try {
        // Get item ID
        const itemId = getItemId(req)
        
        // Validate operation based on type
        let validation
        if (operationType === 'read') {
          validation = tbccManager.validateRead(transactionId, collectionName, itemId)
        } else {
          validation = tbccManager.validateWrite(transactionId, collectionName, itemId)
        }

        // Check if transaction was aborted
        if (!validation.allowed) {
          if (validation.aborted) {
            // Transaction was aborted, restart with new timestamp
            if (retryCount < maxRetries) {
              retryCount++
              logger.warn(`🔄 TBCC: Retrying transaction (attempt ${retryCount}/${maxRetries})`, {
                transactionId,
                reason: validation.reason
              })
              
              const newTransaction = tbccManager.restartTransaction(
                transactionId,
                userId,
                operation
              )
              transactionId = newTransaction.transactionId
              timestamp = newTransaction.timestamp
              
              // Retry the operation
              return executeWithTBCC()
            } else {
              // Max retries reached
              tbccManager.abortTransaction(transactionId, `Max retries (${maxRetries}) reached`)
              
              return res.status(409).json({
                success: false,
                error: 'Transaction conflict',
                message: validation.reason,
                transactionId,
                retryCount,
                suggestion: 'Please try again in a moment'
              })
            }
          } else {
            // Other validation error
            tbccManager.abortTransaction(transactionId, validation.reason)
            
            return res.status(400).json({
              success: false,
              error: 'Transaction validation failed',
              message: validation.reason,
              transactionId
            })
          }
        }

        // Attach transaction info to request
        req.tbcc = {
          transactionId,
          timestamp,
          collectionName,
          itemId,
          operationType
        }

        // Execute the actual handler
        const result = await handler(req, res, next)

        // If handler didn't send response, commit transaction
        if (!res.headersSent) {
          const commitResult = tbccManager.commitTransaction(transactionId)
          
          if (commitResult.success) {
            // Update database timestamps (persist to DB)
            if (operationType === 'read') {
              await TBCCDataItem.updateRTS(collectionName, itemId, timestamp)
            } else {
              await TBCCDataItem.updateWTS(collectionName, itemId, timestamp)
            }
            
            // IMPORTANT: Release edit lock after successful commit
            // This allows other browsers to edit again
            // The lock is automatically released in commitTransaction via editLocks cleanup
            
            // Return success response
            return res.json({
              success: true,
              data: result,
              transaction: commitResult.transaction
            })
          } else {
            return res.status(500).json({
              success: false,
              error: 'Transaction commit failed',
              message: commitResult.error
            })
          }
        }
        
        return result
      } catch (error) {
        // Abort transaction on error
        tbccManager.abortTransaction(transactionId, error.message)
        
        logger.error('❌ TBCC: Transaction error', {
          transactionId,
          error: error.message,
          stack: error.stack
        })
        
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: 'Transaction failed',
            message: error.message,
            transactionId
          })
        }
      }
    }

    // Execute with TBCC
    return executeWithTBCC()
  }
}

/**
 * TBCC wrapper for read operations
 */
function withTBCCRead(handler, options = {}) {
  return withTBCC(handler, { ...options, operationType: 'read' })
}

/**
 * TBCC wrapper for write operations
 */
function withTBCCWrite(handler, options = {}) {
  return withTBCC(handler, { ...options, operationType: 'write' })
}

/**
 * Get TBCC statistics endpoint handler
 */
async function getTBCCStats(req, res) {
  try {
    const stats = tbccManager.getStatistics()
    const logs = tbccManager.getTransactionLogs(50)
    
    res.json({
      success: true,
      statistics: stats,
      recentLogs: logs
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

/**
 * Get transaction status endpoint handler
 */
async function getTransactionStatus(req, res) {
  try {
    const { transactionId } = req.params
    const status = tbccManager.getTransactionStatus(transactionId)
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      })
    }
    
    res.json({
      success: true,
      transaction: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

module.exports = {
  withTBCC,
  withTBCCRead,
  withTBCCWrite,
  getTBCCStats,
  getTransactionStatus
}


/**
 * TBCC Data Item Model
 * Stores Read Timestamp (RTS) and Write Timestamp (WTS) for each data item
 */

const mongoose = require('mongoose')
const { bookingsConnection } = require('../db')

const tbccDataItemSchema = new mongoose.Schema({
  collectionName: {
    type: String,
    required: true,
    index: true
  },
  itemId: {
    type: String,
    required: true,
    index: true
  },
  rts: {
    type: Number,
    default: 0,
    required: true
  },
  wts: {
    type: Number,
    default: 0,
    required: true
  },
  lastReadAt: {
    type: Date,
    default: null
  },
  lastWriteAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Compound index for efficient lookups
tbccDataItemSchema.index({ collectionName: 1, itemId: 1 }, { unique: true })

// Static method to get or create data item timestamps
tbccDataItemSchema.statics.getOrCreate = async function(collectionName, itemId) {
  let item = await this.findOne({ collectionName, itemId })
  
  if (!item) {
    item = await this.create({
      collectionName,
      itemId,
      rts: 0,
      wts: 0
    })
  }
  
  return item
}

// Static method to update RTS
tbccDataItemSchema.statics.updateRTS = async function(collectionName, itemId, rts) {
  const item = await this.getOrCreate(collectionName, itemId)
  
  if (rts > item.rts) {
    item.rts = rts
    item.lastReadAt = new Date()
    await item.save()
  }
  
  return item
}

// Static method to update WTS
tbccDataItemSchema.statics.updateWTS = async function(collectionName, itemId, wts) {
  const item = await this.getOrCreate(collectionName, itemId)
  
  if (wts > item.wts) {
    item.wts = wts
    item.lastWriteAt = new Date()
    await item.save()
  }
  
  return item
}

module.exports = bookingsConnection.model('TBCCDataItem', tbccDataItemSchema)


/**
 * BOOKINGS ROUTES WITH TBCC INTEGRATION - EXAMPLE
 * 
 * This file demonstrates how to integrate TBCC with booking operations.
 * You can use this as a reference to update your existing bookings.js routes.
 */

const express = require('express')
const Booking = require('../models/Booking')
const { withTBCCRead, withTBCCWrite } = require('../middleware/tbcc')
const { authenticateAdmin } = require('../middleware/auth')

const router = express.Router()

/**
 * GET /api/bookings/:id
 * Read booking with TBCC protection
 */
router.get('/bookings/:id', 
  withTBCCRead(
    async (req, res) => {
      const { id } = req.params
      const booking = await Booking.findById(id)
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        })
      }
      
      // Return booking data (TBCC middleware will wrap response)
      return booking
    },
    {
      operation: 'READ_BOOKING',
      collectionName: 'bookings',
      getItemId: (req) => req.params.id
    }
  )
)

/**
 * POST /api/bookings
 * Create booking with TBCC protection
 */
router.post('/bookings',
  withTBCCWrite(
    async (req, res) => {
      const {
        fullName,
        email,
        contactNumber,
        visitDate,
        purpose,
        numberOfVisitors,
        specialRequests
      } = req.body

      // Validate required fields
      if (!fullName || !email || !contactNumber || !visitDate || !purpose || numberOfVisitors === undefined) {
        throw new Error('All required fields must be provided')
      }

      // Create booking
      const booking = new Booking({
        fullName,
        email,
        contactNumber,
        visitNumber: normalizePhilippineMobileNumber(contactNumber),
        visitDate: new Date(visitDate),
        purpose,
        numberOfVisitors,
        specialRequests: specialRequests || ''
      })

      // Get item ID from TBCC context (will be set after save)
      const savedBooking = await booking.save()
      
      // Update TBCC context with new item ID
      if (req.tbcc) {
        req.tbcc.itemId = savedBooking._id.toString()
      }

      return savedBooking
    },
    {
      operation: 'CREATE_BOOKING',
      collectionName: 'bookings',
      getItemId: (req) => {
        // For create operations, we'll generate ID after save
        // TBCC will handle this automatically
        return req.body._id || 'new'
      }
    }
  )
)

/**
 * PUT /api/bookings/:id
 * Update booking with TBCC protection
 */
router.put('/bookings/:id',
  authenticateAdmin,
  withTBCCWrite(
    async (req, res) => {
      const { id } = req.params
      const updates = req.body

      const booking = await Booking.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      )

      if (!booking) {
        throw new Error('Booking not found')
      }

      return booking
    },
    {
      operation: 'UPDATE_BOOKING',
      collectionName: 'bookings',
      getItemId: (req) => req.params.id
    }
  )
)

/**
 * DELETE /api/bookings/:id
 * Delete booking with TBCC protection
 */
router.delete('/bookings/:id',
  authenticateAdmin,
  withTBCCWrite(
    async (req, res) => {
      const { id } = req.params

      const booking = await Booking.findByIdAndDelete(id)

      if (!booking) {
        throw new Error('Booking not found')
      }

      return { message: 'Booking deleted successfully', booking }
    },
    {
      operation: 'DELETE_BOOKING',
      collectionName: 'bookings',
      getItemId: (req) => req.params.id
    }
  )
)

/**
 * GET /api/bookings
 * List bookings with TBCC protection (read operation on collection)
 */
router.get('/bookings',
  authenticateAdmin,
  withTBCCRead(
    async (req, res) => {
      const { status, page = 1, limit = 10 } = req.query
      
      const query = {}
      if (status) {
        query.status = status
      }

      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))

      const total = await Booking.countDocuments(query)

      return {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    },
    {
      operation: 'LIST_BOOKINGS',
      collectionName: 'bookings',
      getItemId: () => 'collection' // For list operations, use collection identifier
    }
  )
)

module.exports = router


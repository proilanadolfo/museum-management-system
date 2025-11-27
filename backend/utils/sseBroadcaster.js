// Unified Server-Sent Events (SSE) broadcaster for real-time updates
const sseClients = new Set()

/**
 * Broadcast an event to all connected SSE clients
 * @param {string} eventType - The type of event (e.g., 'booking', 'attendance', 'dashboard')
 * @param {object} data - The data to send
 */
const broadcastEvent = (eventType, data) => {
  const payload = JSON.stringify({
    type: eventType,
    timestamp: new Date().toISOString(),
    data
  })
  
  for (const res of sseClients) {
    try {
      res.write(`event: ${eventType}\n`)
      res.write(`data: ${payload}\n\n`)
    } catch (error) {
      // Remove dead connections
      sseClients.delete(res)
    }
  }
}

/**
 * Broadcast booking-related events
 */
const broadcastBooking = {
  created: (booking) => {
    broadcastEvent('booking', {
      action: 'created',
      booking: {
        _id: booking._id,
        fullName: booking.fullName,
        email: booking.email,
        contactNumber: booking.contactNumber,
        numberOfVisitors: booking.numberOfVisitors,
        visitDate: booking.visitDate,
        purpose: booking.purpose,
        status: booking.status,
        confirmationCode: booking.confirmationCode,
        createdAt: booking.createdAt
      }
    })
  },
  updated: (booking) => {
    broadcastEvent('booking', {
      action: 'updated',
      booking: {
        _id: booking._id,
        fullName: booking.fullName,
        email: booking.email,
        contactNumber: booking.contactNumber,
        numberOfVisitors: booking.numberOfVisitors,
        visitDate: booking.visitDate,
        purpose: booking.purpose,
        status: booking.status,
        confirmationCode: booking.confirmationCode,
        notes: booking.notes,
        updatedAt: booking.updatedAt
      }
    })
  },
  deleted: (bookingId) => {
    broadcastEvent('booking', {
      action: 'deleted',
      bookingId
    })
  }
}

/**
 * Broadcast attendance-related events
 */
const broadcastAttendance = {
  checkedIn: (attendance) => {
    broadcastEvent('attendance', {
      action: 'checkedIn',
      attendance: {
        _id: attendance._id,
        idNumber: attendance.idNumber,
        name: attendance.name,
        type: attendance.type,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        adminId: attendance.adminId,
        notes: attendance.notes
      }
    })
  },
  checkedOut: (attendance) => {
    broadcastEvent('attendance', {
      action: 'checkedOut',
      attendance: {
        _id: attendance._id,
        idNumber: attendance.idNumber,
        name: attendance.name,
        type: attendance.type,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        adminId: attendance.adminId
      }
    })
  }
}

/**
 * Broadcast dashboard stats updates
 */
const broadcastDashboardUpdate = () => {
  broadcastEvent('dashboard', {
    action: 'statsUpdated'
  })
}

/**
 * Broadcast museum settings updates
 * Payload shape is defined by the caller (typically a safe subset for guests)
 */
const broadcastSettingsUpdate = (data) => {
  broadcastEvent('settings', data)
}

/**
 * Setup SSE connection endpoint
 */
const setupSSEConnection = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders?.()

  // Send initial connection message
  res.write(': connected\n\n')

  // Send heartbeat every 25s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch (error) {
      clearInterval(heartbeat)
      sseClients.delete(res)
    }
  }, 25000)

  // Add client to set
  sseClients.add(res)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    sseClients.delete(res)
    try {
      res.end()
    } catch (error) {
      // Ignore errors on cleanup
    }
  })
}

module.exports = {
  sseClients,
  broadcastEvent,
  broadcastBooking,
  broadcastAttendance,
  broadcastDashboardUpdate,
  broadcastSettingsUpdate,
  setupSSEConnection
}


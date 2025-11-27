const express = require('express')
const { setupSSEConnection } = require('../utils/sseBroadcaster')

const router = express.Router()

// Unified SSE endpoint for all real-time updates
router.get('/realtime/stream', (req, res) => {
  setupSSEConnection(req, res)
})

module.exports = router


const express = require('express')
const router = express.Router()
const MuseumSettings = require('../models/MuseumSettings')
const {
  isGoogleCalendarConfigured,
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken
} = require('../services/googleCalendar')
const { authenticateAdmin } = require('../middleware/auth')

// Get Google Calendar authorization URL (Admin only)
router.get('/google-calendar/auth', authenticateAdmin, async (req, res) => {
  try {
    if (!isGoogleCalendarConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar API not configured',
        instructions: [
          '1. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file',
          '2. Get credentials from https://console.cloud.google.com/',
          '3. Enable Google Calendar API in your Google Cloud project',
          '4. Add redirect URI: http://localhost:5000/api/google-calendar/callback'
        ]
      })
    }

    const authUrl = getAuthUrl()
    res.json({
      success: true,
      authUrl: authUrl
    })
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL'
    })
  }
})

// Handle Google Calendar OAuth callback
router.get('/google-calendar/callback', async (req, res) => {
  try {
    const { code, error } = req.query

    if (error) {
      return res.redirect(`http://localhost:5173/admin?googleCalendarError=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return res.redirect(`http://localhost:5173/admin?googleCalendarError=${encodeURIComponent('No authorization code received')}`)
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    // Get user info to get email (with error handling)
    let userEmail = null
    try {
      const { google } = require('googleapis')
      const oauth2Client = require('../services/googleCalendar').getOAuth2Client(tokens)
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      userEmail = userInfo.data.email
    } catch (userInfoError) {
      console.log('Could not get user email from userinfo API, using token email if available:', userInfoError.message)
      // Try to get email from token response if available
      if (tokens && tokens.email) {
        userEmail = tokens.email
      }
    }

    // Save tokens to MuseumSettings
    const settings = await MuseumSettings.getSettings()
    settings.googleCalendarEnabled = true
    settings.googleCalendarTokens = tokens
    settings.googleCalendarEmail = userEmail || 'connected@google.com' // Fallback if email not available
    await settings.save()

    res.redirect(`http://localhost:5173/admin?googleCalendarSuccess=true`)
  } catch (error) {
    console.error('Error in Google Calendar callback:', error)
    res.redirect(`http://localhost:5173/admin?googleCalendarError=${encodeURIComponent(error.message)}`)
  }
})

// Get Google Calendar connection status (Admin only)
router.get('/google-calendar/status', authenticateAdmin, async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()
    
    res.json({
      success: true,
      data: {
        configured: isGoogleCalendarConfigured(),
        enabled: settings.googleCalendarEnabled || false,
        connected: !!(settings.googleCalendarTokens && settings.googleCalendarTokens.access_token),
        email: settings.googleCalendarEmail || null
      }
    })
  } catch (error) {
    console.error('Error getting Google Calendar status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get Google Calendar status'
    })
  }
})

// Disconnect Google Calendar (Admin only)
router.post('/google-calendar/disconnect', authenticateAdmin, async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()
    settings.googleCalendarEnabled = false
    settings.googleCalendarTokens = null
    settings.googleCalendarEmail = null
    await settings.save()

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    })
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Calendar'
    })
  }
})

// Test Google Calendar connection (Admin only)
router.post('/google-calendar/test', authenticateAdmin, async (req, res) => {
  try {
    const settings = await MuseumSettings.getSettings()
    
    if (!settings.googleCalendarEnabled || !settings.googleCalendarTokens) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar is not connected'
      })
    }

    let tokens = settings.googleCalendarTokens
    
    // Try to refresh token
    try {
      tokens = await refreshAccessToken(tokens)
      settings.googleCalendarTokens = tokens
      await settings.save()
    } catch (refreshError) {
      console.log('Token refresh test:', refreshError.message)
    }

    // Test by getting calendar list
    const { google } = require('googleapis')
    const oauth2Client = require('../services/googleCalendar').getOAuth2Client(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const calendars = await calendar.calendarList.list()
    
    res.json({
      success: true,
      message: 'Google Calendar connection is working',
      data: {
        calendarsCount: calendars.data.items?.length || 0,
        primaryCalendar: calendars.data.items?.find(cal => cal.primary)?.summary || 'Unknown'
      }
    })
  } catch (error) {
    console.error('Error testing Google Calendar connection:', error)
    res.status(500).json({
      success: false,
      message: `Google Calendar test failed: ${error.message}`
    })
  }
})

module.exports = router


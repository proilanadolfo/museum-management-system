const { google } = require('googleapis')
const { OAuth2Client } = require('google-auth-library')

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google-calendar/callback'
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary' // Use 'primary' for default calendar

// Check if Google Calendar is configured
const isGoogleCalendarConfigured = () => {
  return GOOGLE_CLIENT_ID && 
         GOOGLE_CLIENT_SECRET && 
         GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
         GOOGLE_CLIENT_SECRET !== 'your-google-client-secret'
}

// Create OAuth2 client
const getOAuth2Client = (tokens = null) => {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )

  if (tokens) {
    oauth2Client.setCredentials(tokens)
  }

  return oauth2Client
}

// Get authorization URL for Google Calendar
const getAuthUrl = () => {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar API not configured')
  }

  const oauth2Client = getOAuth2Client()
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email' // Add userinfo scope to get email
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force consent to get refresh token
  })
}

// Exchange authorization code for tokens
const getTokensFromCode = async (code) => {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar API not configured')
  }

  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Create calendar event from booking
const createCalendarEvent = async (booking, tokens) => {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar API not configured')
  }

  if (!tokens || !tokens.access_token) {
    throw new Error('Google Calendar tokens not available')
  }

  const oauth2Client = getOAuth2Client(tokens)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const visitDate = new Date(booking.visitDate)
  const endDate = new Date(visitDate)
  endDate.setHours(endDate.getHours() + 2) // 2 hour duration

  const purposeLabels = {
    'general': 'General Visit',
    'education': 'Educational Tour',
    'research': 'Research',
    'group': 'Group Visit',
    'event': 'Special Event',
    'other': 'Other'
  }

  const event = {
    summary: `Museum Visit: ${booking.fullName}`,
    description: `
Booking Details:
- Guest: ${booking.fullName}
- Contact: ${booking.contactNumber}
- Email: ${booking.email}
- Visitors: ${booking.numberOfVisitors}
- Purpose: ${purposeLabels[booking.purpose] || booking.purpose}
- Confirmation Code: ${booking.confirmationCode}
${booking.specialRequests ? `- Special Requests: ${booking.specialRequests}` : ''}
${booking.notes ? `- Admin Notes: ${booking.notes}` : ''}
    `.trim(),
    start: {
      dateTime: visitDate.toISOString(),
      timeZone: 'Asia/Manila'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Asia/Manila'
    },
    location: 'Bukidnon Studies Center Museum',
    colorId: booking.status === 'confirmed' ? '10' : '11', // Green for confirmed, Red for cancelled
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 hours before
        { method: 'popup', minutes: 60 } // 1 hour before
      ]
    }
  }

  try {
    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: event
    })

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      iCalUID: response.data.iCalUID
    }
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
    throw error
  }
}

// Update calendar event
const updateCalendarEvent = async (eventId, booking, tokens) => {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar API not configured')
  }

  if (!tokens || !tokens.access_token) {
    throw new Error('Google Calendar tokens not available')
  }

  if (!eventId) {
    // If no event ID, create a new event
    return await createCalendarEvent(booking, tokens)
  }

  const oauth2Client = getOAuth2Client(tokens)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const visitDate = new Date(booking.visitDate)
  const endDate = new Date(visitDate)
  endDate.setHours(endDate.getHours() + 2)

  const purposeLabels = {
    'general': 'General Visit',
    'education': 'Educational Tour',
    'research': 'Research',
    'group': 'Group Visit',
    'event': 'Special Event',
    'other': 'Other'
  }

  const event = {
    summary: `Museum Visit: ${booking.fullName}${booking.status === 'cancelled' ? ' (CANCELLED)' : ''}`,
    description: `
Booking Details:
- Guest: ${booking.fullName}
- Contact: ${booking.contactNumber}
- Email: ${booking.email}
- Visitors: ${booking.numberOfVisitors}
- Purpose: ${purposeLabels[booking.purpose] || booking.purpose}
- Confirmation Code: ${booking.confirmationCode}
- Status: ${booking.status.toUpperCase()}
${booking.specialRequests ? `- Special Requests: ${booking.specialRequests}` : ''}
${booking.notes ? `- Admin Notes: ${booking.notes}` : ''}
    `.trim(),
    start: {
      dateTime: visitDate.toISOString(),
      timeZone: 'Asia/Manila'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Asia/Manila'
    },
    location: 'Bukidnon Studies Center Museum',
    colorId: booking.status === 'confirmed' ? '10' : '11',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 }
      ]
    }
  }

  try {
    const response = await calendar.events.update({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId,
      resource: event
    })

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      iCalUID: response.data.iCalUID
    }
  } catch (error) {
    // If event not found, create a new one
    if (error.code === 404) {
      return await createCalendarEvent(booking, tokens)
    }
    console.error('Error updating Google Calendar event:', error)
    throw error
  }
}

// Delete calendar event
const deleteCalendarEvent = async (eventId, tokens) => {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar API not configured')
  }

  if (!tokens || !tokens.access_token) {
    throw new Error('Google Calendar tokens not available')
  }

  if (!eventId) {
    return // No event to delete
  }

  const oauth2Client = getOAuth2Client(tokens)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    await calendar.events.delete({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: eventId
    })
    return true
  } catch (error) {
    // If event not found, it's already deleted
    if (error.code === 404) {
      return true
    }
    console.error('Error deleting Google Calendar event:', error)
    throw error
  }
}

// Refresh access token if needed
const refreshAccessToken = async (tokens) => {
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available')
  }

  const oauth2Client = getOAuth2Client(tokens)
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

module.exports = {
  isGoogleCalendarConfigured,
  getAuthUrl,
  getTokensFromCode,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken,
  getOAuth2Client
}


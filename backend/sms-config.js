// SMS Configuration - Supports Twilio and Semaphore
// Semaphore: https://semaphore.co/ (Recommended for Philippines)
// Twilio: https://console.twilio.com/

const twilio = require('twilio')
const axios = require('axios')

// SMS Provider: 'semaphore' or 'twilio' (default: semaphore if API key exists, else twilio)
const SMS_PROVIDER = process.env.SMS_PROVIDER || (process.env.SEMAPHORE_API_KEY ? 'semaphore' : 'twilio')

// Initialize Twilio client (will be null if credentials not set)
let twilioClient = null

try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    console.log('✅ Twilio SMS client initialized successfully')
  }
} catch (error) {
  console.error('❌ Error initializing Twilio:', error.message)
}

// Check Semaphore configuration
if (process.env.SEMAPHORE_API_KEY) {
  console.log('✅ Semaphore SMS configured')
} else if (SMS_PROVIDER === 'semaphore') {
  console.log('⚠️  Semaphore API key not found - SMS notifications disabled')
}

// Log active provider
console.log(`📱 SMS Provider: ${SMS_PROVIDER.toUpperCase()}`)

// Format phone number for Philippines (Semaphore format: 639XXXXXXXXX)
const formatPhoneForSemaphore = (phone) => {
  let formatted = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
  
  // Remove + if present
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1)
  }
  
  // Convert to Semaphore format (639XXXXXXXXX)
  if (formatted.startsWith('0')) {
    // 09171234567 -> 639171234567
    formatted = '63' + formatted.substring(1)
  } else if (formatted.startsWith('63')) {
    // Already has country code
    formatted = formatted
  } else {
    // Assume Philippines number
    formatted = '63' + formatted
  }
  
  return formatted
}

// Format phone number for Twilio (international format: +639XXXXXXXXX)
const formatPhoneForTwilio = (phone) => {
  let formatted = phone.replace(/\s+/g, '')
  
  if (!formatted.startsWith('+')) {
    if (formatted.startsWith('0')) {
      formatted = '+63' + formatted.substring(1)
    } else if (formatted.startsWith('63')) {
      formatted = '+' + formatted
    } else {
      formatted = '+63' + formatted
    }
  }
  
  return formatted
}

// Send SMS via Semaphore
const sendSMSSemaphore = async (to, message) => {
  if (!process.env.SEMAPHORE_API_KEY) {
    return { success: false, message: 'Semaphore API key not configured' }
  }

  try {
    const phoneNumber = formatPhoneForSemaphore(to)
    const senderName = process.env.SEMAPHORE_SENDER_NAME || 'BSC-System'

    const response = await axios.post('https://api.semaphore.co/api/v4/messages', null, {
      params: {
        apikey: process.env.SEMAPHORE_API_KEY,
        number: phoneNumber,
        message: message,
        sendername: senderName
      }
    })

    if (response.data && response.data[0] && response.data[0].message_id) {
      console.log(`✅ SMS sent successfully via Semaphore to ${phoneNumber}: ${response.data[0].message_id}`)
      return { success: true, messageId: response.data[0].message_id, provider: 'semaphore' }
    } else {
      throw new Error('Unexpected response from Semaphore API')
    }
  } catch (error) {
    const statusCode = error.response?.status
    const errorData = error.response?.data
    
    let errorMsg = 'Unknown error'
    
    // Handle specific error cases
    if (statusCode === 403) {
      errorMsg = 'Forbidden - Check: 1) API key is valid, 2) Account has credits, 3) Sender name is approved'
      console.error(`❌ Semaphore 403 Error: ${errorMsg}`)
      console.error(`💡 Check Semaphore dashboard: https://semaphore.co/account`)
      console.error(`💡 Make sure you have credits and sender name is approved`)
    } else if (statusCode === 401) {
      errorMsg = 'Unauthorized - Invalid API key'
      console.error(`❌ Semaphore 401 Error: Invalid API key`)
    } else if (statusCode === 402) {
      errorMsg = 'Payment Required - Insufficient credits'
      console.error(`❌ Semaphore 402 Error: Insufficient credits - Add credits to your account`)
    } else {
      errorMsg = errorData?.message || error.response?.statusText || error.message || 'Unknown error'
    }
    
    // Log full error details for debugging
    if (error.response) {
      console.error(`❌ Semaphore API Error (${statusCode}):`, errorMsg)
      if (errorData) {
        console.error(`   Response data:`, JSON.stringify(errorData))
      }
    } else {
      console.error(`❌ Error sending SMS via Semaphore to ${to}:`, errorMsg)
    }
    
    return { success: false, message: errorMsg, provider: 'semaphore', statusCode }
  }
}

// Send SMS via Twilio
const sendSMSTwilio = async (to, message) => {
  if (!twilioClient) {
    return { success: false, message: 'Twilio not configured' }
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    return { success: false, message: 'Twilio phone number not configured' }
  }

  try {
    const phoneNumber = formatPhoneForTwilio(to)

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })

    console.log(`✅ SMS sent successfully via Twilio to ${phoneNumber}: ${result.sid}`)
    return { success: true, messageId: result.sid, provider: 'twilio' }
  } catch (error) {
    const errorMsg = error.message || 'Unknown error'
    
    // Check for specific Twilio restrictions
    if (errorMsg.includes('cannot be sent with the current combination')) {
      console.error(`❌ Error sending SMS to ${to}: US numbers cannot send SMS to Philippines numbers`)
      console.error(`💡 Solution: Use Semaphore (SMS_PROVIDER=semaphore) or Philippines Twilio number`)
      return { 
        success: false, 
        message: 'US numbers cannot send SMS to Philippines. Use Semaphore or Philippines Twilio number.',
        code: 'RESTRICTED_COUNTRY',
        provider: 'twilio'
      }
    }
    
    console.error(`❌ Error sending SMS via Twilio to ${to}:`, errorMsg)
    return { success: false, message: errorMsg, provider: 'twilio' }
  }
}

// Main SMS sending function (routes to appropriate provider)
const sendSMS = async (to, message) => {
  if (SMS_PROVIDER === 'semaphore') {
    return await sendSMSSemaphore(to, message)
  } else {
    return await sendSMSTwilio(to, message)
  }
}

// Send booking confirmation SMS
const sendBookingConfirmationSMS = async (booking) => {
  const visitDate = new Date(booking.visitDate)
  const formattedDate = visitDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  const formattedTime = visitDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const message = `✅ Booking Confirmed!\n\nHello ${booking.fullName},\n\nYour museum visit has been confirmed.\n\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n👥 Visitors: ${booking.numberOfVisitors}\n🔖 Code: ${booking.confirmationCode}\n\nWe look forward to welcoming you!\n\nBSC-System`

  return await sendSMS(booking.contactNumber, message)
}

// Send booking cancellation SMS
const sendBookingCancellationSMS = async (booking) => {
  const visitDate = new Date(booking.visitDate)
  const formattedDate = visitDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const message = `❌ Booking Cancelled\n\nHello ${booking.fullName},\n\nWe regret to inform you that your booking request has been cancelled.\n\n📅 Requested Date: ${formattedDate}\n🔖 Code: ${booking.confirmationCode}\n\nIf you have questions, please contact us.\n\nBSC-System`

  return await sendSMS(booking.contactNumber, message)
}

module.exports = {
  sendSMS,
  sendBookingConfirmationSMS,
  sendBookingCancellationSMS
}


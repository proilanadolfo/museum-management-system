const express = require('express')
const Booking = require('../models/Booking')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const { sendBookingConfirmationSMS, sendBookingCancellationSMS } = require('../sms-config')
const {
  isGoogleCalendarConfigured,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken
} = require('../services/googleCalendar')
const { broadcastBooking } = require('../utils/sseBroadcaster')
const { authenticateAdmin } = require('../middleware/auth')

const router = express.Router()

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  },
  tls: {
    rejectUnauthorized: false
  }
})

const normalizePhilippineMobileNumber = (raw) => {
  if (!raw) return null
  const value = String(raw).trim()

  if (/^\+639\d{9}$/.test(value)) {
    return value
  }

  if (/^09\d{9}$/.test(value)) {
    return `+63${value.slice(1)}`
  }

  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('63') && digits.length === 12) {
    return `+${digits}`
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`
  }

  return null
}

// Send booking submission email with confirmation code
const sendBookingSubmissionEmail = async (booking) => {
  try {
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

    const purposeLabels = {
      general: 'General Visit',
      education: 'Educational Tour',
      research: 'Research',
      group: 'Group Visit',
      event: 'Special Event',
      other: 'Other'
    }

    const subject = `✅ Booking Request Received - ${booking.confirmationCode}`
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin:0; padding:0; background:#f3f4f6; font-family:'Arial',sans-serif; color:#1f2937; }
          table { border-spacing:0; }
          .wrapper { width:100%; background:#f3f4f6; padding:24px 12px; }
          .card { width:100%; max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 18px 35px rgba(15,23,42,0.12); }
          .header { background:linear-gradient(135deg, #d52b1e 0%, #f97316 100%); color:#ffffff; text-align:center; padding:42px 24px; }
          .header h1 { margin:0; font-size:28px; }
          .content { padding:32px 28px 28px; }
          .intro { margin:0 0 18px; font-size:16px; line-height:1.7; }
          .code-box { background:#fef3c7; border:1px dashed #f59e0b; border-radius:12px; padding:18px 22px; margin:24px 0; text-align:center; }
          .code-label { font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#b45309; font-weight:700; margin-bottom:6px; display:block; }
          .code-value { font-size:24px; font-weight:800; letter-spacing:0.18em; color:#b45309; }
          .detail-table { width:100%; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; margin:24px 0; }
          .detail-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
          .detail-row:last-of-type { border-bottom:none; }
          .detail-label { text-transform:uppercase; letter-spacing:0.08em; color:#64748b; font-weight:600; }
          .detail-value { color:#1f2937; font-weight:600; }
          .tips { font-size:14px; color:#475569; margin:0 0 6px; }
          .footer { padding:24px 20px 28px; text-align:center; color:#6b7280; font-size:12px; border-top:1px solid #e2e8f0; }
          @media only screen and (max-width:520px) {
            .header { padding:32px 18px; }
            .header h1 { font-size:24px; }
            .content { padding:24px 18px; }
            .code-value { font-size:22px; }
            .detail-row { flex-direction:column; align-items:flex-start; gap:4px; }
          }
        </style>
      </head>
      <body>
        <table role="presentation" width="100%" class="wrapper">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" class="card">
                <tr>
                  <td class="header">
                    <h1>Booking Request Received</h1>
                    <p style="margin:12px 0 0; font-size:15px; opacity:0.9;">Thank you for planning a visit to the museum!</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <p class="intro">Hello <strong>${booking.fullName}</strong>,<br/>We’ve successfully received your booking request. Keep the confirmation code below—use it to check your status or make changes anytime.</p>
                    <div class="code-box">
                      <span class="code-label">Your confirmation code</span>
                      <span class="code-value">${booking.confirmationCode}</span>
                    </div>
                    <div class="detail-table">
                      <div class="detail-row">
                        <span class="detail-label">Visit Date</span>
                        <span class="detail-value">${formattedDate}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Preferred Time</span>
                        <span class="detail-value">${formattedTime}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Guests</span>
                        <span class="detail-value">${booking.numberOfVisitors} ${booking.numberOfVisitors === 1 ? 'Visitor' : 'Visitors'}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Purpose</span>
                        <span class="detail-value">${purposeLabels[booking.purpose] || booking.purpose}</span>
                      </div>
                    </div>
                    <p class="tips">📌 Save this email—your confirmation code is required to view, modify, or cancel your booking.</p>
                    <p class="tips">⏳ Our team will review your request and send another update once it’s confirmed.</p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p style="margin:0;">BSC-System Visitor Services · info@bsc-system.com · (555) 123-4567</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com' ||
        !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your-app-password') {
      console.log('⚠️  EMAIL NOT CONFIGURED - Running in TEST MODE')
      console.log(`📧 Would send booking submission email (code) to: ${booking.email}`)
      return true
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.email,
      subject,
      html: htmlContent
    }

    console.log('📧 Attempting to send booking submission email with confirmation code...')
    await transporter.sendMail(mailOptions)
    console.log(`✅ Booking submission email sent to: ${booking.email}`)
    return true
  } catch (error) {
    console.error('❌ Error sending booking submission email:', error.message)
    return false
  }
}

// Send booking status notification email
const sendBookingStatusEmail = async (booking, status) => {
  try {
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

    const purposeLabels = {
      'general': 'General Visit',
      'education': 'Educational Tour',
      'research': 'Research',
      'group': 'Group Visit',
      'event': 'Special Event',
      'other': 'Other'
    }

    let subject, htmlContent, statusColor, statusIcon

    if (status === 'confirmed') {
      subject = ` Booking Confirmed - ${booking.confirmationCode}`
      statusColor = '#B8860B'
      statusIcon = ''
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Arial', sans-serif; color: #1f2933; }
            table { border-spacing: 0; }
            img { border: 0; line-height: 100%; }
            .email-wrapper { width: 100%; background-color: #f3f4f6; padding: 24px 12px; }
            .email-container { width: 100%; max-width: 640px; margin: 0 auto; overflow: hidden; border-radius: 16px; background-color: #ffffff; box-shadow: 0 18px 35px rgba(15, 23, 42, 0.12); }
            .header { background: linear-gradient(135deg, #d52b1e 0%, #f97316 100%); color: #ffffff; text-align: center; padding: 48px 28px 36px; }
            .header h1 { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: 0.4px; }
            .header p { margin: 12px 0 0; font-size: 15px; opacity: 0.92; }
            .content { padding: 40px 36px 32px; background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%); }
            .intro { margin: 0 0 28px; font-size: 16px; line-height: 1.7; color: #334155; }
            .card { border-radius: 14px; background-color: #ffffff; border: 1px solid #e2e8f0; box-shadow: inset 0 0 0 1px rgba(184, 134, 11, 0.12); overflow: hidden; }
            .card-header { padding: 20px 28px; background-color: rgba(184, 134, 11, 0.12); display: flex; align-items: center; }
            .status-label { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #8b6a03; background-color: rgba(184, 134, 11, 0.18); padding: 6px 14px; border-radius: 999px; text-transform: uppercase; }
            .details { padding: 12px 28px 28px; }
            .detail-row { width: 100%; border-bottom: 1px solid #f1f5f9; }
            .detail-row:last-of-type { border-bottom: none; }
            .detail-label { padding: 14px 0 6px; font-size: 13px; font-weight: 600; letter-spacing: 0.3px; color: #64748b; text-transform: uppercase; }
            .detail-value { padding: 0 0 14px; font-size: 16px; color: #1f2937; }
            .bullet-note { margin: 0; padding-left: 20px; color: #475569; line-height: 1.7; font-size: 15px; }
            .footer { padding: 32px 24px 36px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6; border-top: 1px solid #e2e8f0; }
            .footer strong { color: #334155; }
            @media only screen and (max-width: 520px) {
              .email-wrapper { padding: 16px 0; }
              .email-container { border-radius: 0; }
              .header { padding: 36px 20px 28px; }
              .header h1 { font-size: 24px; }
              .content { padding: 28px 22px; }
              .details { padding: 8px 16px 22px; }
              .detail-label { font-size: 12px; }
              .detail-value { font-size: 15px; }
              .footer { padding: 24px 18px 32px; }
            }
          </style>
        </head>
        <body>
          <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="header">
                      <h1>${statusIcon} Booking Confirmed!</h1>
                      <p>Your museum visit has been confirmed</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="content">
                      <p class="intro">Hello <strong>${booking.fullName}</strong>,<br>
                      We’re delighted to share that your request to visit the museum has been <strong>successfully confirmed</strong>.</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card">
                        <tr>
                          <td class="card-header">
                            <span class="status-label">Confirmed</span>
                          </td>
                        </tr>
                        <tr>
                          <td class="details">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              <tr class="detail-row">
                                <td class="detail-label">Confirmation Code</td>
                                <td class="detail-value"><strong>${booking.confirmationCode}</strong></td>
                              </tr>
                              <tr class="detail-row">
                                <td class="detail-label">Visit Date</td>
                                <td class="detail-value"><strong>${formattedDate}</strong></td>
                              </tr>
                              <tr class="detail-row">
                                <td class="detail-label">Visit Time</td>
                                <td class="detail-value">${formattedTime}</td>
                              </tr>
                              <tr class="detail-row">
                                <td class="detail-label">Guests</td>
                                <td class="detail-value">${booking.numberOfVisitors} ${booking.numberOfVisitors === 1 ? 'Visitor' : 'Visitors'}</td>
                              </tr>
                              <tr class="detail-row">
                                <td class="detail-label">Purpose</td>
                                <td class="detail-value">${purposeLabels[booking.purpose] || booking.purpose}</td>
                              </tr>
                              ${booking.specialRequests ? `
                              <tr class="detail-row">
                                <td class="detail-label">Special Requests</td>
                                <td class="detail-value">${booking.specialRequests}</td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 28px 0 12px; font-weight: 600; color: #1f2937;">Before you arrive</p>
                      <ul class="bullet-note">
                        <li>Please arrive 10 minutes ahead of your scheduled visit.</li>
                        <li>Bring a valid ID together with this confirmation code: <strong>${booking.confirmationCode}</strong>.</li>
                        <li>Reach out to us anytime if you need to make changes or have questions.</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td class="footer">
                      <p style="margin: 0 0 8px;">We look forward to welcoming you to the museum.</p>
                      <p style="margin: 0;"><strong>BSC-System Visitor Services</strong><br>
                      📧 info@bsc-system.com · 📞 (555) 123-4567</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    } else if (status === 'cancelled') {
      subject = `❌ Booking Cancelled - ${booking.confirmationCode}`
      statusColor = '#DC143C'
      statusIcon = '❌'
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Arial', sans-serif; color: #1f2933; }
            table { border-spacing: 0; }
            img { border: 0; line-height: 100%; }
            .email-wrapper { width: 100%; background-color: #f3f4f6; padding: 24px 12px; }
            .email-container { width: 100%; max-width: 640px; margin: 0 auto; overflow: hidden; border-radius: 16px; background-color: #ffffff; box-shadow: 0 18px 35px rgba(15, 23, 42, 0.12); }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; text-align: center; padding: 48px 28px 36px; }
            .header h1 { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: 0.4px; }
            .header p { margin: 12px 0 0; font-size: 15px; opacity: 0.92; }
            .content { padding: 40px 36px 32px; background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%); }
            .intro { margin: 0 0 28px; font-size: 16px; line-height: 1.7; color: #334155; }
            .card { border-radius: 14px; background-color: #ffffff; border: 1px solid #e2e8f0; box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.12); overflow: hidden; }
            .card-header { padding: 20px 28px; background-color: rgba(220, 38, 38, 0.12); display: flex; align-items: center; }
            .status-label { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #7f1d1d; background-color: rgba(220, 38, 38, 0.18); padding: 6px 14px; border-radius: 999px; text-transform: uppercase; }
            .details { padding: 12px 28px 28px; }
            .detail-row { width: 100%; border-bottom: 1px solid #f1f5f9; }
            .detail-row:last-of-type { border-bottom: none; }
            .detail-label { padding: 14px 0 6px; font-size: 13px; font-weight: 600; letter-spacing: 0.3px; color: #64748b; text-transform: uppercase; }
            .detail-value { padding: 0 0 14px; font-size: 16px; color: #1f2937; }
            .footer { padding: 32px 24px 36px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6; border-top: 1px solid #e2e8f0; }
            .footer strong { color: #334155; }
            @media only screen and (max-width: 520px) {
              .email-wrapper { padding: 16px 0; }
              .email-container { border-radius: 0; }
              .header { padding: 36px 20px 28px; }
              .header h1 { font-size: 24px; }
              .content { padding: 28px 22px; }
              .details { padding: 8px 16px 22px; }
              .detail-label { font-size: 12px; }
              .detail-value { font-size: 15px; }
              .footer { padding: 24px 18px 32px; }
            }
          </style>
        </head>
        <body>
          <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="header">
                      <h1>${statusIcon} Booking Cancelled</h1>
                      <p>We’re sorry we can’t host you right now</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="content">
                      <p class="intro">Hello <strong>${booking.fullName}</strong>,<br>
                      We regret to inform you that your booking request has been <strong>cancelled</strong>.</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card">
                        <tr>
                          <td class="card-header">
                            <span class="status-label">Cancelled</span>
                          </td>
                        </tr>
                        <tr>
                          <td class="details">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              <tr class="detail-row">
                                <td class="detail-label">Confirmation Code</td>
                                <td class="detail-value"><strong>${booking.confirmationCode}</strong></td>
                              </tr>
                              <tr class="detail-row">
                                <td class="detail-label">Requested Date</td>
                                <td class="detail-value">${formattedDate}</td>
                              </tr>
                              <tr class="detail-row">
                                <td class="detail-label">Guests</td>
                                <td class="detail-value">${booking.numberOfVisitors} ${booking.numberOfVisitors === 1 ? 'Visitor' : 'Visitors'}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 28px 0 12px; font-weight: 600; color: #1f2937;">Need a hand?</p>
                      <p style="margin: 0 0 18px; color: #475569; line-height: 1.7; font-size: 15px;">If you believe this is an error or if you would like to reschedule, our support team is ready to help you find a new time that works.</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="footer">
                      <p style="margin: 0 0 8px;">We hope to welcome you on a future visit.</p>
                      <p style="margin: 0;"><strong>BSC-System Visitor Services</strong><br>
                      📧 info@bsc-system.com · 📞 (555) 123-4567</p>
                      <p style="margin: 18px 0 0;">You can submit a new booking request anytime.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    } else {
      return // Don't send email for pending status
    }

    // Check if email is properly configured
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com' || 
        !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your-app-password') {
      console.log('⚠️  EMAIL NOT CONFIGURED - Running in TEST MODE')
      console.log(`📧 Would send booking ${status} email to: ${booking.email}`)
      return true // Return true for testing purposes
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.email,
      subject: subject,
      html: htmlContent
    }

    console.log(`📧 Attempting to send booking ${status} email...`)
    console.log(`From: ${process.env.EMAIL_USER}`)
    console.log(`To: ${booking.email}`)

    await transporter.sendMail(mailOptions)
    
    console.log(`✅ Booking ${status} email sent successfully to: ${booking.email}`)
    return true
  } catch (error) {
    console.error(`❌ Error sending booking ${status} email:`, error.message)
    // Don't throw error - allow booking update to succeed even if email fails
    return false
  }
}

// Create a new booking
router.post('/bookings', async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      })
    }

    const normalizedContactNumber = normalizePhilippineMobileNumber(contactNumber)
    if (!normalizedContactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)'
      })
    }

    // Parse and validate visit date (accept date-only or date-time)
    let visitDateObj = new Date(visitDate)
    if (isNaN(visitDateObj.getTime())) {
      // Try to coerce YYYY-MM-DD
      const m = String(visitDate).match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (m) {
        visitDateObj = new Date(`${m[1]}-${m[2]}-${m[3]}T09:00:00`)
      }
    }
    if (isNaN(visitDateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid visit date' })
    }

    // Must be today or future at start of day comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const testDate = new Date(visitDateObj)
    testDate.setHours(0, 0, 0, 0)
    if (testDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Visit date must be today or in the future'
      })
    }

    // Coerce and validate number of visitors
    const visitorsNum = Number(numberOfVisitors)
    if (!Number.isFinite(visitorsNum) || visitorsNum < 1 || visitorsNum > 50) {
      return res.status(400).json({
        success: false,
        message: 'Number of visitors must be between 1 and 50'
      })
    }

    // Create new booking
    const booking = new Booking({
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      contactNumber: normalizedContactNumber,
      visitDate: visitDateObj,
      purpose,
      numberOfVisitors: visitorsNum,
      specialRequests: (specialRequests || '').toString()
    })

    await booking.save()
    // Broadcast new booking to all connected clients
    try {
      broadcastBooking.created(booking)
    } catch (error) {
      console.error('Error broadcasting new booking:', error)
      }

    // Send acknowledgment email with confirmation code
    sendBookingSubmissionEmail(booking).catch((error) => {
      console.error('Background email send (booking submission) failed:', error?.message || error)
    })

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      data: {
        bookingId: booking._id,
        confirmationCode: booking.confirmationCode,
        visitDate: booking.visitDate,
        status: booking.status
      }
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A booking with this confirmation code already exists'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    })
  }
})

// Get all bookings (Admin only)
router.get('/bookings', authenticateAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .select('-__v')

    res.json({
      success: true,
      data: bookings
    })
  } catch (error) {
    console.error('Get bookings error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings'
    })
  }
})

// Get count of pending bookings (used for notifications)
// MUST be before /bookings/:confirmationCode to avoid route conflicts
router.get('/bookings/pending/count', async (_req, res) => {
  try {
    const count = await Booking.countDocuments({ status: 'pending' })
    res.json({ success: true, count })
  } catch (error) {
    console.error('Get pending bookings count error:', error)
    res.status(500).json({ success: false, message: 'Failed to retrieve pending bookings count' })
  }
})

// Get latest pending bookings (for notifications list)
// MUST be before /bookings/:confirmationCode to avoid route conflicts
router.get('/bookings/pending', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 50))
    const items = await Booking.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('fullName email numberOfVisitors visitDate status createdAt')
      .lean()
    res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get pending bookings list error:', error)
    res.status(500).json({ success: false, message: 'Failed to retrieve pending bookings list' })
  }
})

// Get booking by confirmation code
router.get('/bookings/:confirmationCode', async (req, res) => {
  try {
    const { confirmationCode } = req.params
    
    const booking = await Booking.findOne({ confirmationCode })
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    res.json({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Get booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking'
    })
  }
})

// Guest booking management (cancel or modify pending requests)
router.patch('/bookings/:confirmationCode/manage', async (req, res) => {
  try {
    const { confirmationCode } = req.params
    const { email, action, updates = {} } = req.body || {}
    const cancelReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''

    if (!confirmationCode || !email) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation code and email are required'
      })
    }

    const booking = await Booking.findOne({ confirmationCode })
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    if (booking.email?.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Email does not match booking record' })
    }

    if (action === 'cancel') {
      if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Booking is already cancelled' })
      }

      booking.status = 'cancelled'
      booking.cancelledBy = 'guest'
      booking.cancelledReason = cancelReason || 'Guest cancelled via self-service portal.'
      booking.cancelledAt = new Date()
      await booking.save()

      sendBookingStatusEmail(booking, 'cancelled').catch((err) => {
        console.error('Guest cancellation email failed (non-blocking):', err.message)
      })

      return res.json({ success: true, message: 'Booking cancelled successfully.', booking })
    }

    if (action === 'modify') {
      if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Cancelled bookings can no longer be modified.' })
      }

      if (booking.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Only pending bookings can be modified online.' })
      }

      const updatePayload = {}

      if (updates.visitDate) {
        const visitDateObj = new Date(updates.visitDate)
        if (Number.isNaN(visitDateObj.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid visit date provided.' })
        }

        const today = new Date()
        if (visitDateObj < today) {
          return res.status(400).json({ success: false, message: 'Visit date must be in the future.' })
        }

        updatePayload.visitDate = visitDateObj
      }

      if (updates.numberOfVisitors !== undefined) {
        const visitors = Number(updates.numberOfVisitors)
        if (!Number.isFinite(visitors) || visitors < 1 || visitors > 50) {
          return res.status(400).json({ success: false, message: 'Number of visitors must be between 1 and 50.' })
        }
        updatePayload.numberOfVisitors = visitors
      }

      if (updates.specialRequests !== undefined) {
        updatePayload.specialRequests = String(updates.specialRequests || '').slice(0, 500)
      }

      if (updates.purpose) {
        const allowedPurposes = ['general', 'education', 'research', 'group', 'event', 'other']
        if (!allowedPurposes.includes(updates.purpose)) {
          return res.status(400).json({ success: false, message: 'Invalid purpose value.' })
        }
        updatePayload.purpose = updates.purpose
      }

      if (!Object.keys(updatePayload).length) {
        return res.status(400).json({ success: false, message: 'No changes were provided.' })
      }

      booking.set(updatePayload)
      await booking.save()

      return res.json({ success: true, message: 'Booking updated successfully.', booking })
    }

    return res.status(400).json({ success: false, message: 'Invalid action. Use cancel or modify.' })
  } catch (error) {
    console.error('Guest manage booking error:', error)
    res.status(500).json({ success: false, message: 'Failed to manage booking.' })
  }
})

// Update booking status (Admin only)
router.patch('/bookings/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes, clientTimestamp } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      })
    }

    if (clientTimestamp === undefined || clientTimestamp === null) {
      return res.status(400).json({
        success: false,
        message: 'clientTimestamp is required for timestamp ordering'
      })
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, confirmed, or cancelled'
      })
    }

    // Get the booking before updating to check if status is changing
    const existingBooking = await Booking.findById(id)
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    const previousStatus = existingBooking.status

    const currentTimestamp = Math.max(
      existingBooking.wts || 0,
      existingBooking.updatedAt ? existingBooking.updatedAt.getTime() : 0
    )

    if (Number(clientTimestamp) < currentTimestamp) {
      return res.status(409).json({
        success: false,
        message: 'Your edit is outdated. Another user saved first.',
        currentTimestamp
      })
    }

    if (status) existingBooking.status = status
    if (typeof notes === 'string') existingBooking.notes = notes

    if (status === 'cancelled') {
      existingBooking.cancelledBy = 'admin'
      existingBooking.cancelledAt = new Date()
      existingBooking.cancelledReason = notes || 'Cancelled by admin.'
    } else if (status && previousStatus === 'cancelled') {
      existingBooking.cancelledBy = undefined
      existingBooking.cancelledAt = undefined
      existingBooking.cancelledReason = undefined
    }

    const now = Date.now()
    existingBooking.wts = now
    existingBooking.rts = Math.max(existingBooking.rts || 0, now)

    const booking = await existingBooking.save()

    // Send email and SMS notifications if status changed to confirmed or cancelled
    if (status && (status === 'confirmed' || status === 'cancelled') && previousStatus !== status) {
      // Send email asynchronously (don't wait for it)
      sendBookingStatusEmail(booking, status).catch(err => {
        console.error('Email sending failed (non-blocking):', err.message)
      })
      
      // Send SMS notification asynchronously (don't wait for it)
      if (status === 'confirmed') {
        sendBookingConfirmationSMS(booking).catch(err => {
          console.error('SMS sending failed (non-blocking):', err.message)
        })
      } else if (status === 'cancelled') {
        sendBookingCancellationSMS(booking).catch(err => {
          console.error('SMS sending failed (non-blocking):', err.message)
        })
      }

      // Sync to Google Calendar if enabled
      if (isGoogleCalendarConfigured()) {
        try {
          // Get Google Calendar tokens from settings (we'll add this to MuseumSettings)
          const MuseumSettings = require('../models/MuseumSettings')
          const settings = await MuseumSettings.getSettings()
          
          if (settings.googleCalendarEnabled && settings.googleCalendarTokens) {
            let tokens = settings.googleCalendarTokens
            
            // Refresh token if needed (check if expired)
            if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
              try {
                tokens = await refreshAccessToken(tokens)
                // Update tokens in settings
                settings.googleCalendarTokens = tokens
                await settings.save()
              } catch (refreshError) {
                console.log('Token refresh failed:', refreshError.message)
                // Continue with existing token, might still work
              }
            }

            if (status === 'confirmed') {
              // Create or update calendar event
              if (booking.googleCalendarEventId) {
                // Update existing event
                const result = await updateCalendarEvent(booking.googleCalendarEventId, booking, tokens)
                await Booking.findByIdAndUpdate(id, {
                  googleCalendarEventId: result.eventId,
                  googleCalendarLink: result.htmlLink
                })
              } else {
                // Create new event
                const result = await createCalendarEvent(booking, tokens)
                await Booking.findByIdAndUpdate(id, {
                  googleCalendarEventId: result.eventId,
                  googleCalendarLink: result.htmlLink
                })
              }
            } else if (status === 'cancelled' && booking.googleCalendarEventId) {
              // Delete calendar event when cancelled
              await deleteCalendarEvent(booking.googleCalendarEventId, tokens)
              await Booking.findByIdAndUpdate(id, {
                googleCalendarEventId: null,
                googleCalendarLink: null
              })
            }
          }
        } catch (calendarError) {
          console.error('Google Calendar sync failed (non-blocking):', calendarError.message)
          // Don't fail the booking update if calendar sync fails
        }
      }
    }

    // Broadcast booking update to all connected clients
    try {
      broadcastBooking.updated(booking)
    } catch (error) {
      console.error('Error broadcasting booking update:', error)
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking,
      newTimestamp: booking.wts
    })
  } catch (error) {
    console.error('Update booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    })
  }
})

// Delete booking (Admin only)
router.delete('/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { clientTimestamp } = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      })
    }

    // Get booking before deletion for broadcasting and Google Calendar deletion
    const booking = await Booking.findById(id)

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    const currentTimestamp = Math.max(
      booking.wts || 0,
      booking.updatedAt ? booking.updatedAt.getTime() : 0
    )

    if (clientTimestamp === undefined || clientTimestamp === null) {
      return res.status(400).json({
        success: false,
        message: 'clientTimestamp is required for timestamp ordering'
      })
    }

    if (Number(clientTimestamp) < currentTimestamp) {
      return res.status(409).json({
        success: false,
        message: 'Your edit is outdated. Another user saved first.',
        currentTimestamp
      })
    }

    // Delete Google Calendar event if it exists
    if (booking.googleCalendarEventId && isGoogleCalendarConfigured()) {
      try {
        // Get Google Calendar tokens from settings
        const MuseumSettings = require('../models/MuseumSettings')
        const settings = await MuseumSettings.getSettings()
        
        if (settings.googleCalendarEnabled && settings.googleCalendarTokens) {
          let tokens = settings.googleCalendarTokens
          
          // Refresh token if needed (check if expired)
          if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
            try {
              tokens = await refreshAccessToken(tokens)
              // Update tokens in settings
              settings.googleCalendarTokens = tokens
              await settings.save()
            } catch (refreshError) {
              console.log('Token refresh failed:', refreshError.message)
              // Continue with existing token, might still work
            }
          }

          // Delete calendar event
          await deleteCalendarEvent(booking.googleCalendarEventId, tokens)
        }
      } catch (calendarError) {
        console.error('Google Calendar deletion failed (non-blocking):', calendarError.message)
        // Don't fail the booking deletion if calendar sync fails
      }
    }

    await Booking.findByIdAndDelete(id)

    // Broadcast booking deletion to all connected clients
    try {
      broadcastBooking.deleted(booking._id)
    } catch (error) {
      console.error('Error broadcasting booking deletion:', error)
    }

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    })
  } catch (error) {
    console.error('Delete booking error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking'
    })
  }
})

module.exports = router

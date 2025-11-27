import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import '../../styles/guestcss/Booking.css'

const Booking = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    visitDate: '',
    visitTime: '',
    purpose: '',
    numberOfVisitors: 1,
    specialRequests: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [museumSettings, setMuseumSettings] = useState(null)
  const [availableDates, setAvailableDates] = useState([])
  const [availableTimes, setAvailableTimes] = useState([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [lastBookingResponse, setLastBookingResponse] = useState(null)

  const statusLabels = {
    pending: 'Pending Review',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled'
  }

  const purposeLabels = {
    general: 'General Visit',
    education: 'Educational Tour',
    research: 'Research',
    group: 'Group Visit',
    event: 'Special Event',
    other: 'Other'
  }

  const sanitizeContactNumberInput = (value = '') => {
    if (!value) return ''

    let cleaned = value.replace(/[^\d+]/g, '')

    if (!cleaned) return ''

    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\D/g, '')

      if (!cleaned.startsWith('+63')) {
        cleaned = '+' + cleaned.slice(1)
      }

      if (cleaned.startsWith('+63')) {
        return cleaned.slice(0, 13)
      }

      return cleaned.slice(0, 16)
    }

    cleaned = cleaned.replace(/\D/g, '')

    if (cleaned.startsWith('63') && cleaned.length >= 12) {
      // Convert 639XXXXXXXXX (12 digits) to +639XXXXXXXXX (13 chars)
      // Extract 9 digits starting from index 2 (i.e., indices 2-10)
      return '+63' + cleaned.slice(2, 11)
    }

    return cleaned.slice(0, 11)
  }

  const isValidPhilippineMobileNumber = (value = '') => {
    if (!value) return false
    
    // Remove all spaces and other formatting characters
    const cleanValue = value.replace(/\s/g, '').trim()
    
    // Extract digits only for validation
    const digits = cleanValue.replace(/\D/g, '')
    
    // Must have between 10 and 12 digits
    if (digits.length < 10 || digits.length > 12) {
      return false
    }
    
    // Check different formats
    // Format 1: 09XXXXXXXXX (11 digits starting with 09)
    if (digits.length === 11 && digits.startsWith('09')) {
      return /^09\d{9}$/.test(digits)
    }
    
    // Format 2: 9XXXXXXXXX (10 digits starting with 9)
    if (digits.length === 10 && digits.startsWith('9')) {
      return /^9\d{9}$/.test(digits)
    }
    
    // Format 3: 639XXXXXXXXX (12 digits starting with 639)
    if (digits.length === 12 && digits.startsWith('639')) {
      return /^639\d{9}$/.test(digits)
    }
    
    // Also check formatted strings with + sign
    // Format 4: +639XXXXXXXXX (13 chars: +639 + 9 digits)
    if (cleanValue.startsWith('+') && cleanValue.length === 13) {
      const plusDigits = cleanValue.slice(1).replace(/\D/g, '')
      if (plusDigits.length === 12 && plusDigits.startsWith('639')) {
        return /^639\d{9}$/.test(plusDigits)
      }
    }
    
    // Format 5: 09XXXXXXXXX as string (11 chars)
    if (cleanValue.length === 11 && /^09\d{9}$/.test(cleanValue)) {
      return true
    }
    
    return false
  }

  const normalizeContactNumberForSubmit = (value = '') => {
    if (!value) return ''
    
    // Remove all spaces first
    const cleanValue = value.replace(/\s/g, '').trim()
    
    // Already in correct format
    if (/^\+639\d{9}$/.test(cleanValue)) return cleanValue
    
    // 09XXXXXXXXX format
    if (/^09\d{9}$/.test(cleanValue)) return `+63${cleanValue.slice(1)}`

    // Extract digits only
    const digits = cleanValue.replace(/\D/g, '')

    // 639XXXXXXXXX format (12 digits)
    if (digits.startsWith('639') && digits.length === 12) {
      return `+${digits}`
    }

    // 9XXXXXXXXX format (10 digits)
    if (digits.startsWith('9') && digits.length === 10) {
      return `+63${digits}`
    }

    // If it starts with +63 but is incomplete, try to fix it
    if (cleanValue.startsWith('+63') && digits.length >= 12) {
      // Take first 12 digits and format
      const first12 = digits.slice(0, 12)
      if (first12.startsWith('639')) {
        return `+${first12}`
      }
    }

    // Return as-is if we can't normalize (let backend handle it)
    return cleanValue
  }

  // Fetch museum settings and available dates
  const fetchSettingsAndDates = async () => {
    setSettingsLoading(true)
    try {
      const settingsResponse = await fetch('/api/museum-settings/public')
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setMuseumSettings(settingsData.data)
      }

      const datesResponse = await fetch('/api/museum-settings/available-dates')
      if (datesResponse.ok) {
        const datesData = await datesResponse.json()
        setAvailableDates(datesData.data || [])
      }
    } catch (error) {
      console.error('Error fetching museum settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettingsAndDates()
  }, [])

  // Real-time updates for museum settings (SSE)
  useEffect(() => {
    if (!('EventSource' in window)) return

    const eventSource = new EventSource('/api/realtime/stream')

    const handleSettingsEvent = (e) => {
      try {
        const eventData = JSON.parse(e.data)
        const { action, settings } = eventData.data || {}

        if (action === 'updated' && settings) {
          // Update basic settings immediately
          setMuseumSettings(prev => ({
            ...(prev || {}),
            ...settings
          }))
          // Refresh available dates since min/max days or availability may have changed
          fetchSettingsAndDates()
        }
      } catch (error) {
        console.error('Error processing settings event:', error)
      }
    }

    eventSource.addEventListener('settings', handleSettingsEvent)

    eventSource.onerror = () => {
      // Browser auto-reconnects; no-op
    }

    return () => {
      eventSource.removeEventListener('settings', handleSettingsEvent)
      eventSource.close()
    }
  }, [])

  // Fetch available times when date is selected
  useEffect(() => {
    if (formData.visitDate) {
      const fetchTimes = async () => {
        try {
          const response = await fetch(`/api/museum-settings/available-times/${formData.visitDate}`)
          if (response.ok) {
            const data = await response.json()
            setAvailableTimes(data.data?.slots || [])
            // Reset selected time if not available
            if (formData.visitTime && !data.data?.slots.find(slot => slot.time === formData.visitTime)) {
              setFormData(prev => ({ ...prev, visitTime: '' }))
            }
          }
        } catch (error) {
          console.error('Error fetching available times:', error)
        }
      }
      fetchTimes()
    } else {
      setAvailableTimes([])
      setFormData(prev => ({ ...prev, visitTime: '' }))
    }
  }, [formData.visitDate])

  const handleChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'contactNumber' ? sanitizeContactNumberInput(value) : value
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    // Client-side validation for friendlier UX
    const newErrors = {}
    if (!formData.fullName.trim()) newErrors.fullName = 'Please enter your full name'
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email address'
    
    let trimmedContact = formData.contactNumber.trim()
    if (!trimmedContact) {
      newErrors.contactNumber = 'Please enter your contact number'
    } else {
      // Validate the contact number
      if (!isValidPhilippineMobileNumber(trimmedContact)) {
      newErrors.contactNumber = 'Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)'
      } else {
        // If valid, normalize it for submission (will be used later in the submit)
        trimmedContact = normalizeContactNumberForSubmit(trimmedContact)
      }
    }
    if (!formData.visitDate) newErrors.visitDate = 'Please select a date'
    if (availableTimes.length > 0 && !formData.visitTime) newErrors.visitTime = 'Please choose a time'
    if (!formData.purpose) newErrors.purpose = 'Please select a purpose'

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      setIsSubmitting(false)
      return
    }

    // Check if museum is accepting bookings
    if (museumSettings && !museumSettings.isAcceptingBookings) {
      setSubmitStatus('error')
      setLastBookingResponse(null)
      setIsSubmitting(false)

      // SweetAlert when bookings are closed
      Swal.fire({
        title: 'Bookings Closed',
        text: 'We are currently not accepting booking requests. Please try again later or contact the museum.',
        icon: 'info',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    // If date is selected but not available, block submission
    if (formData.visitDate && !isDateAvailable(formData.visitDate)) {
      setSubmitStatus('error')
      setLastBookingResponse(null)
      setIsSubmitting(false)

      // SweetAlert when selected date is not available
      Swal.fire({
        title: 'Date Not Available',
        text: 'The selected date is not available for bookings. Please choose another date.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    // Compute visit datetime. If no time slots configured, default to opening time
    let visitDateTime = formData.visitDate
    if (formData.visitTime) {
      visitDateTime = `${formData.visitDate}T${formData.visitTime}:00`
    } else if (museumSettings && museumSettings.operatingHours) {
      const day = new Date(formData.visitDate).getDay()
      const hours = museumSettings.operatingHours[String(day)] || museumSettings.operatingHours[day] || { open: '09:00' }
      visitDateTime = `${formData.visitDate}T${hours.open}:00`
    }

    const contactNumberPayload = normalizeContactNumberForSubmit(trimmedContact)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          contactNumber: contactNumberPayload,
          visitDate: visitDateTime
        })
      })

      let responseBody = null
      try {
        responseBody = await response.json()
      } catch (_) {
        responseBody = null
      }

      if (response.ok) {
        setSubmitStatus('success')
        const responseData = responseBody?.data
          ? {
              ...responseBody.data,
              fullName: formData.fullName,
              email: formData.email
            }
          : null
        setLastBookingResponse(responseData)
        setFormData({
          fullName: '',
          email: '',
          contactNumber: '',
          visitDate: '',
          visitTime: '',
          purpose: '',
          numberOfVisitors: 1,
          specialRequests: ''
        })
        setAvailableTimes([])

        // SweetAlert for successful guest booking
        Swal.fire({
          title: 'Booking Submitted!',
          text: 'Your booking request has been submitted successfully. Please check your email for the confirmation code.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
      } else {
        const message = responseBody?.message || 'There was an error submitting your booking.'
        setSubmitStatus(message || 'error')
        setLastBookingResponse(null)

        // SweetAlert for booking error
        Swal.fire({
          title: 'Booking Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Booking submission error:', error)
      setSubmitStatus('error')
      setLastBookingResponse(null)

      // SweetAlert for network/unknown error
      Swal.fire({
        title: 'Network Error',
        text: 'There was a problem submitting your booking. Please check your connection and try again.',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    const minDays = museumSettings?.minAdvanceBookingDays || 1
    today.setDate(today.getDate() + minDays)
    return today.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const today = new Date()
    const maxDays = museumSettings?.maxAdvanceBookingDays || 90
    today.setDate(today.getDate() + maxDays)
    return today.toISOString().split('T')[0]
  }

  const isDateAvailable = (dateStr) => {
    return availableDates.some(avail => avail.date === dateStr && avail.available)
  }

  const getDayName = (dateStr) => {
    const date = new Date(dateStr)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  }

  const formatVisitDateTime = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <section id="booking" className="booking-section">
      <div className="container">
        <div className="booking-header">
          <h2 className="section-title">Book Your <span>Visit</span></h2>
          <p className="section-subtitle">
            Plan your museum visit and explore our rich collection of exhibits and artifacts
          </p>
        </div>

        <div className="booking-content">
          <div className="booking-form-container" style={{ flex: 1 }}>
            <div className="form-wrapper modern-card">
              <div className="form-header">
                <div className="form-header-content">
                <h3 className="form-title">Reservation Form</h3>
                <p className="form-subtitle">Fill out the form below to book your museum visit</p>
                </div>
                <div className="form-highlights">
                  <div className="highlight-card">
                    <div className="highlight-icon">📅</div>
                    <div className="highlight-content">
                    <span className="highlight-label">Booking Status</span>
                    <span className={`highlight-value ${museumSettings?.isAcceptingBookings ? 'status-open' : 'status-closed'}`}>
                      {museumSettings?.isAcceptingBookings ? 'Now Accepting Requests' : 'Currently Closed'}
                    </span>
                    </div>
                  </div>
                  <div className="highlight-card">
                    <div className="highlight-icon">⏱️</div>
                    <div className="highlight-content">
                    <span className="highlight-label">Advance Window</span>
                    <span className="highlight-value">
                      {museumSettings
                        ? `${museumSettings.minAdvanceBookingDays}–${museumSettings.maxAdvanceBookingDays} days`
                        : '5–90 days'}
                    </span>
                    </div>
                  </div>
                  <div className="highlight-card">
                    <div className="highlight-icon">👥</div>
                    <div className="highlight-content">
                    <span className="highlight-label">Capacity</span>
                    <span className="highlight-value">
                      {museumSettings?.maxVisitorsPerSlot
                        ? `${museumSettings.maxVisitorsPerSlot} guests / slot`
                        : 'Up to 92 guests / slot'}
                    </span>
                  </div>
                </div>
              </div>
                      </div>
                <form className="booking-form" onSubmit={handleSubmit}>
                  <div className="form-section-card single-card">
                      <div className="form-section-body">
                      <div className="form-row-compact">
                          <div className="form-group">
                            <label htmlFor="fullName">Full Name *</label>
                              <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                placeholder="e.g., Juan Dela Cruz"
                                className="modern-input"
                              />
                              {errors.fullName && <div className="field-error">{errors.fullName}</div>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="email">Email Address *</label>
                              <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="name@example.com"
                                className="modern-input"
                              />
                              {errors.email && <div className="field-error">{errors.email}</div>}
                          </div>
                        </div>
                        <div className="form-group">
                          <label htmlFor="contactNumber">Contact Number *</label>
                            <input
                              type="tel"
                              id="contactNumber"
                              name="contactNumber"
                              value={formData.contactNumber}
                              onChange={handleChange}
                              required
                              placeholder="e.g., 0917 123 4567"
                              className="modern-input"
                              inputMode="tel"
                              maxLength={formData.contactNumber.startsWith('+63') ? 13 : 11}
                              title="Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)"
                              autoComplete="tel"
                            />
                            {errors.contactNumber && <div className="field-error">{errors.contactNumber}</div>}
                          </div>
                      <div className="form-row-compact">
                          <div className="form-group">
                            <label htmlFor="visitDate">Visit Date *</label>
                              <input
                                type="date"
                                id="visitDate"
                                name="visitDate"
                                value={formData.visitDate}
                                onChange={handleChange}
                                min={getMinDate()}
                                max={getMaxDate()}
                                required
                                className="modern-input"
                                disabled={!museumSettings?.isAcceptingBookings}
                              />
                              {formData.visitDate && (
                            <div className="field-hint status-hint-inline" style={{ color: isDateAvailable(formData.visitDate) ? '#16a34a' : '#dc143c', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                  {isDateAvailable(formData.visitDate)
                                ? `✓ ${getDayName(formData.visitDate)}`
                                : '✗ Not available'}
                                </div>
                              )}
                              {errors.visitDate && <div className="field-error">{errors.visitDate}</div>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="visitTime">Visit Time *</label>
                              <select
                                id="visitTime"
                                name="visitTime"
                                value={formData.visitTime}
                                onChange={handleChange}
                                required={availableTimes.length > 0}
                                className="modern-select"
                                disabled={!formData.visitDate}
                              >
                                <option value="">Select time</option>
                                {availableTimes.filter(slot => slot.available).map((slot, index) => (
                                  <option key={index} value={slot.time}>
                                {slot.time} {slot.currentBookings > 0 ? `(${slot.currentBookings}/${slot.maxVisitors})` : ''}
                                  </option>
                                ))}
                              </select>
                              {errors.visitTime && <div className="field-error">{errors.visitTime}</div>}
                            </div>
                          </div>
                      <div className="form-row-compact">
                          <div className="form-group">
                            <label htmlFor="purpose">Purpose of Visit *</label>
                              <select
                                id="purpose"
                                name="purpose"
                                value={formData.purpose}
                                onChange={handleChange}
                                required
                                className="modern-select"
                              >
                                <option value="">Select purpose</option>
                                <option value="general">General Visit</option>
                                <option value="education">Educational Tour</option>
                                <option value="research">Research</option>
                                <option value="group">Group Visit</option>
                                <option value="event">Special Event</option>
                                <option value="other">Other</option>
                              </select>
                              {errors.purpose && <div className="field-error">{errors.purpose}</div>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="numberOfVisitors">Number of Visitors *</label>
                              <select
                                id="numberOfVisitors"
                                name="numberOfVisitors"
                                value={formData.numberOfVisitors}
                                onChange={handleChange}
                                required
                                className="modern-select"
                                disabled={!museumSettings?.isAcceptingBookings}
                              >
                                {[...Array(Math.min(museumSettings?.maxVisitorsPerSlot || 50, 50))].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>
                                    {i + 1} {i === 0 ? 'Visitor' : 'Visitors'}
                                  </option>
                                ))}
                              </select>
                          </div>
                        </div>
                        <div className="form-group">
                        <label htmlFor="specialRequests">Special Requests (optional)</label>
                            <textarea
                              id="specialRequests"
                              name="specialRequests"
                              value={formData.specialRequests}
                              onChange={handleChange}
                          rows="2"
                          placeholder="Any special accommodations or requests"
                              className="modern-textarea"
                            />
                      </div>
                    </div>
                  </div>

                {/* Success details panel removed because SweetAlert already shows this information */}

                {submitStatus === 'error' && (
                  <div className="error-message modern-alert error">
                    <div className="alert-icon">❌</div>
                    <div className="alert-content">
                      <h4>Submission Error</h4>
                      <p>There was an error submitting your booking. Please try again or contact us directly.</p>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="submit-btn modern-btn"
                    disabled={isSubmitting}
                  >
                    <span className="btn-text">
                      {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
                    </span>
                    <span className="btn-icon">
                      {isSubmitting ? '⏳' : '📅'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Booking

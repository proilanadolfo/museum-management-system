import React, { useState } from 'react'
import '../../styles/guestcss/BookingStatusModal.css'

const BookingStatusModal = ({ isOpen, onClose }) => {
  const [statusLookup, setStatusLookup] = useState({
    confirmationCode: '',
    email: ''
  })
  const [statusState, setStatusState] = useState({
    loading: false,
    error: '',
    result: null
  })
  const [manageMode, setManageMode] = useState(null)
  const [manageForm, setManageForm] = useState({
    visitDate: '',
    visitTime: '',
    numberOfVisitors: 1,
    specialRequests: ''
  })
  const [manageTimes, setManageTimes] = useState([])
  const [manageLoading, setManageLoading] = useState(false)
  const [manageMessage, setManageMessage] = useState({ type: '', text: '' })
  const [museumSettings, setMuseumSettings] = useState(null)

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

  React.useEffect(() => {
    if (isOpen) {
      const fetchSettings = async () => {
        try {
          const response = await fetch('/api/museum-settings')
          if (response.ok) {
            const data = await response.json()
            setMuseumSettings(data.data)
          }
        } catch (error) {
          console.error('Error fetching museum settings:', error)
        }
      }
      fetchSettings()
    }
  }, [isOpen])

  React.useEffect(() => {
    if (manageMode !== 'modify' || !manageForm.visitDate) {
      setManageTimes([])
      return
    }

    let cancelled = false
    const loadTimes = async () => {
      try {
        const response = await fetch(`/api/museum-settings/available-times/${manageForm.visitDate}`)
        if (!response.ok) {
          if (!cancelled) setManageTimes([])
          return
        }
        const data = await response.json().catch(() => ({}))
        const slots = Array.isArray(data.data?.slots) ? data.data.slots.filter(slot => slot.available) : []
        if (!cancelled) {
          setManageTimes(slots)
          if (manageForm.visitTime && !slots.find(slot => slot.time === manageForm.visitTime)) {
            setManageForm(prev => ({ ...prev, visitTime: '' }))
          }
        }
      } catch (error) {
        if (!cancelled) setManageTimes([])
      }
    }

    loadTimes()
    return () => { cancelled = true }
  }, [manageMode, manageForm.visitDate, manageForm.visitTime])

  React.useEffect(() => {
    if (!statusState.result) {
      setManageMode(null)
      setManageMessage({ type: '', text: '' })
      return
    }

    const visitDateObj = statusState.result.visitDate ? new Date(statusState.result.visitDate) : null
    setManageForm({
      visitDate: visitDateObj ? visitDateObj.toISOString().slice(0, 10) : '',
      visitTime: visitDateObj ? visitDateObj.toISOString().slice(11, 16) : '',
      numberOfVisitors: statusState.result.numberOfVisitors || 1,
      specialRequests: statusState.result.specialRequests || ''
    })
    setManageMode(null)
    setManageMessage({ type: '', text: '' })
  }, [statusState.result])

  const handleStatusInputChange = (e) => {
    const { name, value } = e.target
    setStatusLookup((prev) => ({
      ...prev,
      [name]: value.toUpperCase && name === 'confirmationCode' ? value.toUpperCase() : value
    }))
    if (statusState.error) {
      setStatusState((prev) => ({ ...prev, error: '' }))
    }
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
    // This would need availableDates, but for now we'll just return true
    return true
  }

  const getDayName = (dateStr) => {
    const date = new Date(dateStr)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  }

  const handleStatusLookup = async (e) => {
    e.preventDefault()
    const code = statusLookup.confirmationCode.trim().toUpperCase()
    const email = statusLookup.email.trim().toLowerCase()

    if (!code) {
      setStatusState({ loading: false, error: 'Please enter your confirmation code.', result: null })
      return
    }

    setStatusState({ loading: true, error: '', result: null })

    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(code)}`)
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.data) {
        setStatusState({ loading: false, error: 'We could not find a booking with that confirmation code.', result: null })
        return
      }

      const booking = data.data

      if (email && booking.email?.toLowerCase() !== email) {
        setStatusState({
          loading: false,
          error: 'Email does not match our records for that confirmation code.',
          result: null
        })
        return
      }

      setStatusState({
        loading: false,
        error: '',
        result: {
          confirmationCode: booking.confirmationCode,
          fullName: booking.fullName,
          email: booking.email,
          visitDate: booking.visitDate,
          numberOfVisitors: booking.numberOfVisitors,
          status: booking.status,
          purpose: booking.purpose,
          notes: booking.notes,
          specialRequests: booking.specialRequests,
          updatedAt: booking.updatedAt
        }
      })
    } catch (error) {
      console.error('Booking status lookup error:', error)
      setStatusState({
        loading: false,
        error: 'Something went wrong while checking your booking. Please try again.',
        result: null
      })
    }
  }

  const handleManageFieldChange = (field, value) => {
    setManageForm((prev) => {
      if (field === 'numberOfVisitors') {
        const maxVisitors = museumSettings?.maxVisitorsPerSlot || 50
        const parsed = Number(value) || 1
        const clamped = Math.min(Math.max(parsed, 1), maxVisitors)
        return { ...prev, numberOfVisitors: clamped }
      }
      return { ...prev, [field]: value }
    })
    if (manageMessage.text) setManageMessage({ type: '', text: '' })
  }

  const handleCancelBooking = async () => {
    if (!statusState.result) return
    if (!statusLookup.email.trim()) {
      setManageMessage({ type: 'error', text: 'Please enter the email used for the booking before cancelling.' })
      return
    }
    if (!window.confirm('Are you sure you want to cancel your booking?')) return

    setManageLoading(true)
    setManageMessage({ type: '', text: '' })

    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(statusState.result.confirmationCode)}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: statusLookup.email.trim(),
          action: 'cancel'
        })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to cancel booking. Please try again later.')
      }

      setStatusState((prev) => prev.result ? {
        ...prev,
        result: {
          ...prev.result,
          status: 'cancelled',
          updatedAt: data.booking?.updatedAt || new Date().toISOString()
        }
      } : prev)

      setManageMode(null)
      setManageMessage({ type: 'success', text: 'Booking cancelled successfully.' })
    } catch (error) {
      setManageMessage({ type: 'error', text: error.message || 'Failed to cancel booking. Please try again.' })
    } finally {
      setManageLoading(false)
    }
  }

  const handleModifyBooking = async (e) => {
    e.preventDefault()
    if (!statusState.result) return

    if (!statusLookup.email.trim()) {
      setManageMessage({ type: 'error', text: 'Please enter the email used for the booking before saving changes.' })
      return
    }

    if (!manageForm.visitDate) {
      setManageMessage({ type: 'error', text: 'Please select a visit date before saving changes.' })
      return
    }

    let visitDateObj = null
    if (manageTimes.length > 0) {
      if (!manageForm.visitTime) {
        setManageMessage({ type: 'error', text: 'Please select a visit time for the chosen date.' })
        return
      }
      visitDateObj = new Date(`${manageForm.visitDate}T${manageForm.visitTime}:00`)
    } else {
      visitDateObj = new Date(`${manageForm.visitDate}T00:00:00`)
    }
    if (Number.isNaN(visitDateObj.getTime())) {
      setManageMessage({ type: 'error', text: 'Please provide a valid visit date and time.' })
      return
    }

    const updates = {
      visitDate: visitDateObj.toISOString(),
      numberOfVisitors: manageForm.numberOfVisitors,
      specialRequests: manageForm.specialRequests
    }

    setManageLoading(true)
    setManageMessage({ type: '', text: '' })

    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(statusState.result.confirmationCode)}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: statusLookup.email.trim(),
          action: 'modify',
          updates
        })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to update booking. Please try again later.')
      }

      setStatusState((prev) => prev.result ? {
        ...prev,
        result: {
          ...prev.result,
          visitDate: data.booking?.visitDate || prev.result.visitDate,
          numberOfVisitors: data.booking?.numberOfVisitors ?? prev.result.numberOfVisitors,
          specialRequests: data.booking?.specialRequests ?? prev.result.specialRequests,
          updatedAt: data.booking?.updatedAt || new Date().toISOString()
        }
      } : prev)

      setManageMode(null)
      setManageMessage({ type: 'success', text: 'Booking updated successfully.' })
    } catch (error) {
      setManageMessage({ type: 'error', text: error.message || 'Failed to update booking. Please try again.' })
    } finally {
      setManageLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="booking-status-modal-overlay" onClick={onClose}>
      <div className="booking-status-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Check Booking Status</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="modal-subtitle">Enter your confirmation code to see if your visit is approved, pending, or declined.</p>
          
          <form className="status-form" onSubmit={handleStatusLookup}>
            <div className="status-form-group">
              <label htmlFor="confirmationCode">Confirmation Code *</label>
              <input
                type="text"
                id="confirmationCode"
                name="confirmationCode"
                value={statusLookup.confirmationCode}
                onChange={handleStatusInputChange}
                placeholder="e.g., BK074397"
                className="status-input"
                required
              />
            </div>

            <div className="status-form-group">
              <label htmlFor="statusEmail">Email Address (optional)</label>
              <input
                type="email"
                id="statusEmail"
                name="email"
                value={statusLookup.email}
                onChange={handleStatusInputChange}
                placeholder="Enter email used for the booking"
                className="status-input"
              />
              <span className="status-hint">Adding your email helps us verify your booking.</span>
            </div>

            {statusState.error && (
              <div className="status-alert error">
                <span>⚠</span>
                <p>{statusState.error}</p>
              </div>
            )}

            <button
              type="submit"
              className="status-check-btn"
              disabled={statusState.loading}
            >
              {statusState.loading ? 'Checking…' : 'View Booking Status'}
            </button>
          </form>

          {statusState.result && (
            <div className="status-result">
              <div className={`status-pill ${statusState.result.status}`}>
                {statusLabels[statusState.result.status] || 'Pending Review'}
              </div>
              <div className="status-summary">
                <h4>{statusState.result.fullName}</h4>
                <div className="status-detail-grid">
                  <div className="status-detail">
                    <span className="status-detail-label">Confirmation Code</span>
                    <span className="status-detail-value">{statusState.result.confirmationCode}</span>
                  </div>
                  <div className="status-detail">
                    <span className="status-detail-label">Visit Schedule</span>
                    <span className="status-detail-value">
                      {formatVisitDateTime(statusState.result.visitDate)}
                    </span>
                  </div>
                  <div className="status-detail">
                    <span className="status-detail-label">Guests</span>
                    <span className="status-detail-value">{statusState.result.numberOfVisitors}</span>
                  </div>
                  <div className="status-detail">
                    <span className="status-detail-label">Purpose</span>
                    <span className="status-detail-value">
                      {purposeLabels[statusState.result.purpose] || statusState.result.purpose || '—'}
                    </span>
                  </div>
                  {statusState.result.notes && (
                    <div className="status-detail status-notes">
                      <span className="status-detail-label">Notes</span>
                      <span className="status-detail-value">{statusState.result.notes}</span>
                    </div>
                  )}
                  {statusState.result.specialRequests && (
                    <div className="status-detail status-notes">
                      <span className="status-detail-label">Special Requests</span>
                      <span className="status-detail-value">{statusState.result.specialRequests}</span>
                    </div>
                  )}
                </div>
                <p className="status-updated">
                  Last updated: {formatVisitDateTime(statusState.result.updatedAt || statusState.result.visitDate)}
                </p>
              </div>

              {statusState.result.status !== 'cancelled' && (
                <div className="status-actions">
                  {statusState.result.status === 'pending' && (
                    <button
                      type="button"
                      className={`status-action-btn ${manageMode === 'modify' ? 'active' : ''}`}
                      onClick={() => setManageMode(manageMode === 'modify' ? null : 'modify')}
                      disabled={manageLoading}
                    >
                      {manageMode === 'modify' ? 'Close Changes' : 'Modify Booking'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="status-action-btn danger"
                    onClick={handleCancelBooking}
                    disabled={manageLoading}
                  >
                    {manageLoading && manageMode !== 'modify' ? 'Cancelling…' : 'Cancel Booking'}
                  </button>
                </div>
              )}

              {manageMessage.text && (
                <div className={`status-manage-message ${manageMessage.type}`}>
                  {manageMessage.text}
                </div>
              )}

              {manageMode === 'modify' && statusState.result.status === 'pending' && (
                <form className="status-manage-form" onSubmit={handleModifyBooking}>
                  <div className="status-manage-row">
                    <div className="status-manage-field">
                      <label htmlFor="manageVisitDate">Visit Date *</label>
                      <input
                        type="date"
                        id="manageVisitDate"
                        value={manageForm.visitDate}
                        min={getMinDate()}
                        max={getMaxDate()}
                        onChange={(e) => handleManageFieldChange('visitDate', e.target.value)}
                        required
                      />
                      {manageForm.visitDate && (
                        <span className={`status-manage-hint ${isDateAvailable(manageForm.visitDate) ? 'available' : 'unavailable'}`}>
                          {isDateAvailable(manageForm.visitDate)
                            ? `✓ ${getDayName(manageForm.visitDate)} - Available`
                            : '✗ Selected date is not available'}
                        </span>
                      )}
                    </div>
                    <div className="status-manage-field">
                      <label htmlFor="manageVisitTime">
                        Visit Time{manageTimes.length > 0 ? ' *' : ''}
                      </label>
                      <select
                        id="manageVisitTime"
                        value={manageForm.visitTime}
                        onChange={(e) => handleManageFieldChange('visitTime', e.target.value)}
                        required={manageTimes.length > 0}
                        disabled={!manageForm.visitDate || manageTimes.length === 0}
                      >
                        <option value="">Select time</option>
                        {manageTimes.map((slot, index) => (
                          <option key={index} value={slot.time}>
                            {slot.time} {slot.currentBookings > 0 ? `(${slot.currentBookings}/${slot.maxVisitors} booked)` : '(Available)'}
                          </option>
                        ))}
                      </select>
                      {manageTimes.length === 0 && manageForm.visitDate && (
                        <span className="status-manage-hint">No specific time slots required — we will coordinate the best time with you.</span>
                      )}
                    </div>
                  </div>

                  <div className="status-manage-row">
                    <div className="status-manage-field">
                      <label htmlFor="manageVisitors">Guests *</label>
                      <select
                        id="manageVisitors"
                        value={manageForm.numberOfVisitors}
                        onChange={(e) => handleManageFieldChange('numberOfVisitors', e.target.value)}
                      >
                        {[...Array(Math.min(museumSettings?.maxVisitorsPerSlot || 50, 50))].map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {idx + 1} {idx === 0 ? 'Visitor' : 'Visitors'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="status-manage-row full">
                    <div className="status-manage-field">
                      <label htmlFor="manageRequests">Special Requests</label>
                      <textarea
                        id="manageRequests"
                        rows="3"
                        value={manageForm.specialRequests}
                        onChange={(e) => handleManageFieldChange('specialRequests', e.target.value)}
                        placeholder="Update any requests or notes for the team"
                      />
                    </div>
                  </div>

                  <div className="status-manage-actions">
                    <button
                      type="submit"
                      className="status-action-btn primary"
                      disabled={manageLoading}
                    >
                      {manageLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingStatusModal


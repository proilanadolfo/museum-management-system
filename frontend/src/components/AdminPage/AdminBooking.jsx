import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../../styles/AdminCss/booking.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales: { 'en-US': enUS }
})

const purposeLabels = {
  general: 'General Visit',
  education: 'Educational Tour',
  research: 'Research',
  group: 'Group Visit',
  event: 'Special Event',
  other: 'Other'
}

const statusClassMap = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  cancelled: 'status-cancelled'
}

const AdminBooking = () => {
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('pending')
  const [showArchivedBookings, setShowArchivedBookings] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteSuccess, setDeleteSuccess] = useState('')
  const [calendarView, setCalendarView] = useState('table')
  const [calendarDate, setCalendarDate] = useState(new Date())

  const getAuthHeaders = () => {
    const raw = localStorage.getItem('admin_token')
    const token =
      raw && raw !== 'null' && raw !== 'undefined' && raw.includes('.') ? raw : null
    return token
      ? { Authorization: `Bearer ${token}` }
      : {}
  }

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true)
    setBookingsError('')
    try {
      const response = await fetch('/api/bookings', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (!response.ok) {
        setBookingsError('Failed to load bookings')
        return
      }
      const data = await response.json()
      setBookings(data.data || [])
    } catch (error) {
      console.error('Fetch bookings error:', error)
      setBookingsError('An error occurred while loading bookings')
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Real-time updates via SSE
  useEffect(() => {
    if (!('EventSource' in window)) return

    const eventSource = new EventSource('/api/realtime/stream')
    
    eventSource.addEventListener('booking', (e) => {
      try {
        const eventData = JSON.parse(e.data)
        const { action, booking, bookingId } = eventData.data

        if (action === 'created') {
          // Add new booking to the list
          setBookings(prev => [booking, ...prev])
        } else if (action === 'updated') {
          // Update existing booking in the list
          setBookings(prev => prev.map(b => 
            b._id === booking._id ? { ...b, ...booking } : b
          ))
          // If modal is open for this booking, update it
          if (selectedBooking && selectedBooking._id === booking._id) {
            setSelectedBooking(prev => ({ ...prev, ...booking }))
          }
        } else if (action === 'deleted') {
          // Remove deleted booking from the list
          setBookings(prev => prev.filter(b => b._id !== bookingId))
          // Close modal if deleted booking was selected
          if (selectedBooking && selectedBooking._id === bookingId) {
            setShowBookingModal(false)
            setSelectedBooking(null)
          }
        }
      } catch (error) {
        console.error('Error processing booking event:', error)
      }
    })

    eventSource.onerror = () => {
      // Browser will auto-reconnect
    }

    return () => {
      eventSource.close()
    }
  }, [selectedBooking])

  const updateBookingStatus = useCallback(
    async (bookingId, status, notes = '') => {
      setUpdateStatusLoading(true)
      try {
        const response = await fetch(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ status, notes })
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const message = data.message || 'Failed to update booking status'
          setBookingsError(message)

          Swal.fire({
            title: 'Update Failed',
            text: message,
            icon: 'error',
            confirmButtonColor: '#dc143c'
          })
          return
        }

        // Real-time update will handle the UI update, no need to refetch
        setShowBookingModal(false)
        setSelectedBooking(null)

        Swal.fire({
          title: 'Status Updated',
          text: status === 'confirmed' ? 'Booking has been confirmed successfully.' : 'Booking has been cancelled successfully.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
      } catch (error) {
        console.error('Update booking status error:', error)
        const message = 'An error occurred while updating booking status'
        setBookingsError(message)

        Swal.fire({
          title: 'Network Error',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      } finally {
        setUpdateStatusLoading(false)
      }
    },
    [fetchBookings]
  )

  const handleDeleteBooking = useCallback(
    async (bookingId) => {
      const confirmResult = await Swal.fire({
        title: 'Delete Booking?',
        text: 'This will permanently delete the booking. This action cannot be undone. Continue?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc143c',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      setDeleteLoading(true)
      setBookingsError('')
      setDeleteSuccess('')

      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          ...getAuthHeaders()
          }
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const message = data.message || 'Failed to delete booking'
          setBookingsError(message)

          Swal.fire({
            title: 'Delete Failed',
            text: message,
            icon: 'error',
            confirmButtonColor: '#dc143c'
          })
          return
        }

        const data = await response.json()
        const message = data.message || 'Booking deleted successfully'
        setDeleteSuccess(message)
        setShowBookingModal(false)
        setSelectedBooking(null)

        // SweetAlert success
        Swal.fire({
          title: 'Deleted',
          text: message,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })

        // Clear success message after 3 seconds
        setTimeout(() => {
          setDeleteSuccess('')
        }, 3000)
      } catch (error) {
        console.error('Delete booking error:', error)
        const message = 'An error occurred while deleting booking'
        setBookingsError(message)

        Swal.fire({
          title: 'Network Error',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      } finally {
        setDeleteLoading(false)
      }
    },
    []
  )

  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings]
  )

  const archivedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'cancelled'),
    [bookings]
  )

  const filteredBookings = useMemo(() => {
    if (showArchivedBookings) {
      if (bookingStatusFilter === 'all') return archivedBookings
      return archivedBookings.filter((booking) => booking.status === bookingStatusFilter)
    }
    return activeBookings
  }, [archivedBookings, activeBookings, bookingStatusFilter, showArchivedBookings])

  const calendarEvents = useMemo(() => {
    return filteredBookings.map((booking) => {
      const visitDate = new Date(booking.visitDate)
      const endDate = new Date(visitDate)
      endDate.setHours(endDate.getHours() + 2)

      const color =
        booking.status === 'pending'
          ? '#ffc107'
          : booking.status === 'confirmed'
            ? '#28a745'
            : '#dc3545'

      return {
        title: `${booking.fullName} (${booking.numberOfVisitors})`,
        start: visitDate,
        end: endDate,
        allDay: false,
        resource: booking,
        color
      }
    })
  }, [filteredBookings])

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedBooking(null)
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">
            {showArchivedBookings ? 'Archived Bookings' : 'Bookings & Reservations'}
          </h2>
          <p className="dash-subtitle">
            {showArchivedBookings
              ? 'View confirmed and cancelled booking records'
              : 'Manage active guest booking requests from the website'}
          </p>
        </div>
        <div className="booking-toolbar">
          <div className="booking-toggle-group">
            <button
              type="button"
              onClick={() => setCalendarView('table')}
              className={`booking-toggle-button ${calendarView === 'table' ? 'is-active' : ''}`}
            >
              📋 Table
            </button>
            <button
              type="button"
              onClick={() => setCalendarView('calendar')}
              className={`booking-toggle-button ${calendarView === 'calendar' ? 'is-active' : ''}`}
            >
              📅 Calendar
            </button>
          </div>

          <div className="booking-toggle-group">
            <button
              type="button"
              onClick={() => {
                setShowArchivedBookings(false)
                setBookingStatusFilter('pending')
              }}
              className={`booking-toggle-button ${!showArchivedBookings ? 'is-active' : ''}`}
            >
              Active ({activeBookings.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchivedBookings(true)
                setBookingStatusFilter('all')
              }}
              className={`booking-toggle-button ${showArchivedBookings ? 'is-active' : ''}`}
            >
              Archived ({archivedBookings.length})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchBookings}
            className="booking-refresh-button"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {bookingsError && (
        <div className="booking-alert booking-alert-error">
          {bookingsError}
        </div>
      )}

      {deleteSuccess && (
        <div className="booking-alert" style={{
          background: 'rgba(22, 163, 74, 0.1)',
          border: '1px solid rgba(22, 163, 74, 0.3)',
          color: '#16a34a',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          ✅ {deleteSuccess}
        </div>
      )}

      {showArchivedBookings && (
        <div className="booking-status-filter">
          <span className="booking-filter-label">
            Filter:
          </span>
          {['all', 'confirmed', 'cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setBookingStatusFilter(status)}
              className={`booking-filter-button ${bookingStatusFilter === status ? 'is-active' : ''}`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {calendarView === 'calendar' && !bookingsLoading && (
        <div className="booking-calendar-card">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            className="booking-calendar-component"
            date={calendarDate}
            onNavigate={setCalendarDate}
            onSelectEvent={(event) => {
              setSelectedBooking(event.resource)
              setShowBookingModal(true)
            }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.color,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 4px',
                fontSize: '12px'
              }
            })}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="month"
            popup
            messages={{
              next: 'Next',
              previous: 'Previous',
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'Agenda',
              date: 'Date',
              time: 'Time',
              event: 'Event',
              noEventsInRange: 'No bookings in this date range'
            }}
          />
        </div>
      )}

      {calendarView === 'table' && (
        <>
          {bookingsLoading ? (
            <div className="booking-state-card is-loading">
              <div className="booking-state-icon">⏳</div>
              <div className="booking-state-text">Loading bookings...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="booking-state-card is-empty">
              <div className="booking-state-icon">📅</div>
              <div className="booking-state-title">No bookings found</div>
              <div className="booking-state-text">
                {showArchivedBookings
                  ? bookingStatusFilter === 'all'
                    ? 'No archived bookings found.'
                    : `No ${bookingStatusFilter} bookings found.`
                  : 'No pending booking requests at the moment.'}
              </div>
            </div>
          ) : (
            <div className="booking-table-card">
              <div className="booking-table-wrapper">
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th className="booking-table-heading">Guest Name</th>
                      <th className="booking-table-heading">Contact</th>
                      <th className="booking-table-heading">Visit Date</th>
                      <th className="booking-table-heading is-center">Visitors</th>
                      <th className="booking-table-heading">Purpose</th>
                      <th className="booking-table-heading">Status</th>
                      <th className="booking-table-heading is-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => {
                      const visitDate = new Date(booking.visitDate)
                      const statusClass = statusClassMap[booking.status] || 'status-pending'

                      return (
                        <tr key={booking._id}>
                          <td className="booking-table-cell">
                            <div className="booking-guest-name">{booking.fullName}</div>
                            {booking.confirmationCode && (
                              <div className="booking-guest-code">Code: {booking.confirmationCode}</div>
                            )}
                          </td>
                          <td className="booking-table-cell">
                            <div className="booking-contact-email">{booking.email}</div>
                            <div className="booking-contact-phone">{booking.contactNumber}</div>
                          </td>
                          <td className="booking-table-cell">
                            <div className="booking-visit-date">
                              {visitDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="booking-visit-time">
                              {visitDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="booking-table-cell is-center">
                            <div className="booking-visitors-pill">{booking.numberOfVisitors}</div>
                          </td>
                          <td className="booking-table-cell">
                            <div className="booking-purpose">{purposeLabels[booking.purpose] || booking.purpose}</div>
                            {booking.specialRequests && (
                              <div className="booking-purpose-note">
                                {booking.specialRequests.substring(0, 30)}...
                              </div>
                            )}
                          </td>
                          <td className="booking-table-cell">
                            <span className={`booking-status-badge ${statusClass}`}>
                              {booking.status}
                            </span>
                            {booking.status === 'cancelled' && booking.cancelledBy && (
                              <div className="booking-status-note">
                                {booking.cancelledBy === 'guest' ? 'Cancelled by guest' : 'Cancelled by admin'}
                              </div>
                            )}
                          </td>
                          <td className="booking-table-cell is-center">
                            <button
                              type="button"
                              className={`booking-manage-button ${showArchivedBookings ? 'is-archived' : ''}`}
                              onClick={() => {
                                setSelectedBooking(booking)
                                setShowBookingModal(true)
                              }}
                            >
                              {showArchivedBookings ? 'View' : 'Manage'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showBookingModal && selectedBooking && (
        <div className="booking-modal-overlay" onClick={handleCloseModal}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h3 className="booking-modal-title">Booking Details</h3>
              <button type="button" className="booking-modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="booking-modal-body">
              <div className="booking-modal-section">
                <span className="booking-modal-label">Guest Name</span>
                <span className="booking-modal-value">{selectedBooking.fullName}</span>
              </div>
              <div className="booking-modal-section">
                <span className="booking-modal-label">Email</span>
                <span className="booking-modal-value">{selectedBooking.email}</span>
              </div>
              <div className="booking-modal-section">
                <span className="booking-modal-label">Contact Number</span>
                <span className="booking-modal-value">{selectedBooking.contactNumber}</span>
              </div>
              <div className="booking-modal-section">
                <span className="booking-modal-label">Visit Date</span>
                <span className="booking-modal-value">
                  {new Date(selectedBooking.visitDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </span>
              </div>
              <div className="booking-modal-section">
                <span className="booking-modal-label">Number of Visitors</span>
                <span className="booking-modal-value highlight">
                  {selectedBooking.numberOfVisitors}{' '}
                  {selectedBooking.numberOfVisitors === 1 ? 'Visitor' : 'Visitors'}
                </span>
              </div>
              <div className="booking-modal-section">
                <span className="booking-modal-label">Purpose</span>
                <span className="booking-modal-value">
                  {purposeLabels[selectedBooking.purpose] || selectedBooking.purpose}
                </span>
              </div>
              {selectedBooking.specialRequests && (
                <div className="booking-modal-section">
                  <span className="booking-modal-label">Special Requests</span>
                  <div className="booking-modal-note">
                    {selectedBooking.specialRequests}
                  </div>
                </div>
              )}
              <div className="booking-modal-section booking-modal-status">
                <span className="booking-modal-label">Current Status</span>
                <span className={`booking-status-badge ${statusClassMap[selectedBooking.status] || 'status-pending'}`}>
                  {selectedBooking.status}
                </span>
              </div>
              {selectedBooking.status === 'cancelled' && (
                <div className="booking-modal-section">
                  <span className="booking-modal-label">Cancellation Details</span>
                  <div className="booking-modal-note">
                    <div className="booking-cancel-meta">
                      <span className="booking-cancel-tag">
                        {selectedBooking.cancelledBy === 'guest' ? 'Guest cancellation' : 'Admin cancellation'}
                      </span>
                      <span>
                        Cancelled on{' '}
                        {selectedBooking.cancelledAt
                          ? new Date(selectedBooking.cancelledAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </span>
                    </div>
                    {selectedBooking.cancelledReason && (
                      <p className="booking-cancel-reason">{selectedBooking.cancelledReason}</p>
                    )}
                  </div>
                </div>
              )}
              {selectedBooking.status === 'pending' ? (
                <div className="booking-modal-actions">
                  <button
                    type="button"
                    className="booking-modal-action-btn confirm"
                    onClick={() => updateBookingStatus(selectedBooking._id, 'confirmed')}
                    disabled={updateStatusLoading || deleteLoading}
                  >
                    {updateStatusLoading ? 'Updating...' : '✓ Confirm'}
                  </button>
                  <button
                    type="button"
                    className="booking-modal-action-btn cancel"
                    onClick={() => updateBookingStatus(selectedBooking._id, 'cancelled')}
                    disabled={updateStatusLoading || deleteLoading}
                  >
                    {updateStatusLoading ? 'Updating...' : '✕ Cancel'}
                  </button>
                </div>
              ) : (
                <div className="booking-modal-message">
                  <p>
                    {selectedBooking.status === 'confirmed'
                      ? 'This booking has been confirmed and moved to archived. The guest has been notified via email.'
                      : selectedBooking.cancelledBy === 'guest'
                        ? 'Guest cancelled this booking through the self-service portal. It is now archived for record-keeping.'
                        : 'This booking was cancelled by an admin and has been archived.'}
                  </p>
                </div>
              )}
              <div className="booking-modal-actions" style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="booking-modal-action-btn"
                  onClick={() => handleDeleteBooking(selectedBooking._id)}
                  disabled={updateStatusLoading || deleteLoading}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    width: '100%'
                  }}
                >
                  {deleteLoading ? 'Deleting...' : '🗑️ Delete Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBooking


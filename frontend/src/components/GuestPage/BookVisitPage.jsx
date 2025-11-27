import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Booking from './Booking'
import BookingStatusModal from './BookingStatusModal'
import '../../styles/guestcss/global.css'

const BookVisitPage = () => {
  const [isBookingStatusModalOpen, setIsBookingStatusModalOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const shouldScroll = location.hash === '#booking' || location.state?.scrollToBooking
    if (!shouldScroll) return

    const scrollToBooking = () => {
      const bookingSection = document.getElementById('booking')
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' })
      }
    }

    scrollToBooking()
    const retryTimer = setTimeout(scrollToBooking, 200)

    if (location.state?.scrollToBooking) {
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: {} })
    }

    return () => clearTimeout(retryTimer)
  }, [location, navigate])

  return (
    <div className="guest-page">
      <Navbar onBookingStatusClick={() => setIsBookingStatusModalOpen(true)} />
      <main className="main-content">
        <Booking />
      </main>
      <BookingStatusModal 
        isOpen={isBookingStatusModalOpen} 
        onClose={() => setIsBookingStatusModalOpen(false)} 
      />
    </div>
  )
}

export default BookVisitPage



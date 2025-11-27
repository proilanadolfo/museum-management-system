import React, { useState } from 'react'
import Navbar from './Navbar'
import Contact from './Contact'
import BookingStatusModal from './BookingStatusModal'
import '../../styles/guestcss/global.css'

const AboutPage = () => {
  const [isBookingStatusModalOpen, setIsBookingStatusModalOpen] = useState(false)

  return (
    <div className="guest-page">
      <Navbar onBookingStatusClick={() => setIsBookingStatusModalOpen(true)} />
      <main className="main-content">
        <Contact />
      </main>
      <BookingStatusModal 
        isOpen={isBookingStatusModalOpen} 
        onClose={() => setIsBookingStatusModalOpen(false)} 
      />
    </div>
  )
}

export default AboutPage



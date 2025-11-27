import React, { useState } from 'react'
import Navbar from './Navbar'
import Home from './Home'
import Gallery from './Gallery'
import BookingStatusModal from './BookingStatusModal'
import '../../styles/guestcss/global.css'
import '../../styles/guestcss/GuestPage.css'

const GuestPage = () => {
  const [isBookingStatusModalOpen, setIsBookingStatusModalOpen] = useState(false)

  return (
    <div className="guest-page">
      <Navbar onBookingStatusClick={() => setIsBookingStatusModalOpen(true)} />
      <main className="main-content">
        <Home />
        <Gallery />
      </main>
      <BookingStatusModal 
        isOpen={isBookingStatusModalOpen} 
        onClose={() => setIsBookingStatusModalOpen(false)} 
      />
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>BSC-System</h3>
              <p>Preserving history, celebrating culture, inspiring future generations.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="/guest">Home</a></li>
                <li><a href="/guest#gallery">Exhibits</a></li>
                <li><a href="/guest/book">Book a Visit</a></li>
                <li><a href="/guest/about">About Us</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact Info</h4>
              <p>📧 info@bsc-system.com</p>
              <p>📞 (555) 123-4567</p>
              <p>📍 123 Museum Street</p>
            </div>
            <div className="footer-section">
              <h4>Follow Us</h4>
              <div className="footer-social">
                <a href="#">📘</a>
                <a href="#">🐦</a>
                <a href="#">📷</a>
                <a href="#">📺</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 BSC-System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default GuestPage

import React, { useState, useEffect } from 'react'
import '../../styles/guestcss/Navbar.css'
import { Link, useNavigate } from 'react-router-dom'

const Navbar = ({ onNavigate, activeSection, onBookingStatusClick }) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [profileLogo, setProfileLogo] = useState(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    fetchProfileLogo()
    
    // Listen for logo updates via custom event (immediate)
    const handleLogoUpdate = () => {
      fetchProfileLogo()
    }
    window.addEventListener('logoUpdated', handleLogoUpdate)
    
    // Real-time updates via SSE (Server-Sent Events) - fastest method
    if ('EventSource' in window) {
      const eventSource = new EventSource('/api/realtime/stream')
      
      eventSource.addEventListener('settings', (e) => {
        try {
          const eventData = JSON.parse(e.data)
          const { action, profileLogo } = eventData.data || {}
          
          if (action === 'logo_updated' && profileLogo) {
            // Update logo immediately with cache busting to force reload
            setProfileLogo(`http://localhost:5000/${profileLogo}?t=${Date.now()}`)
          } else if (action === 'logo_deleted') {
            // Reset to default logo
            setProfileLogo(null)
          }
        } catch (error) {
          console.error('Error processing logo update event:', error)
        }
      })
      
      eventSource.onerror = () => {
        // Browser will auto-reconnect
      }
      
      return () => {
        window.removeEventListener('logoUpdated', handleLogoUpdate)
        eventSource.close()
      }
    }
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate)
    }
  }, [])

  const fetchProfileLogo = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/museum-settings/public')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.profileLogo) {
          setProfileLogo(`http://localhost:5000/${data.data.profileLogo}`)
        } else {
          setProfileLogo(null) // Reset to default if no logo
        }
      }
    } catch (error) {
      console.error('Error fetching profile logo:', error)
    }
  }

  // Use profile logo from settings if available, otherwise use default
  const displayLogo = profileLogo || '/src/assets/img/Logo.jpg'

  const handleNavigation = (sectionId) => {
    if (onNavigate) {
      onNavigate(sectionId)
    } else {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
    setIsMobileMenuOpen(false)
  }

  const navigate = useNavigate()

  const goTo = (path) => {
    navigate(path)
    setIsMobileMenuOpen(false)
  }

  const handleGalleryClick = (e) => {
    e.preventDefault()
    if (window.location.pathname !== '/guest') {
      // If not on main guest page, navigate to guest page first
      navigate('/guest')
      // Wait for navigation to complete, then scroll to gallery
      setTimeout(() => {
        const element = document.getElementById('gallery')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    } else {
      // If already on guest page, just scroll to gallery
      handleNavigation('gallery')
    }
  }

  const handleHomeClick = (e) => {
    e.preventDefault()
    if (window.location.pathname !== '/guest') {
      // If not on main guest page, navigate to guest page first
      navigate('/guest')
      // Wait for navigation to complete, then scroll to home
      setTimeout(() => {
        const element = document.getElementById('home')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    } else {
      // If already on guest page, just scroll to home
      handleNavigation('home')
    }
  }

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/guest" className="navbar-logo">
          <img src={displayLogo} alt="BSC-System Logo" />
          <span>BSC-System</span>
        </Link>

        <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <a href="#home" onClick={handleHomeClick} className="navbar-link">
            Home
          </a>
          <a href="#gallery" onClick={handleGalleryClick} className="navbar-link">
            Gallery
          </a>
          <a href="/guest/book" onClick={(e) => { e.preventDefault(); goTo('/guest/book') }} className="navbar-link">
            Book a Visit
          </a>
          <a href="/guest/about" onClick={(e) => { e.preventDefault(); goTo('/guest/about') }} className="navbar-link">
            About Us
          </a>
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              if (onBookingStatusClick) {
                onBookingStatusClick()
              }
              setIsMobileMenuOpen(false)
            }} 
            className="navbar-link navbar-button"
          >
            Booking Status
          </button>
        </div>

        <div className="navbar-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

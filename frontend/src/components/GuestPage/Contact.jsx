import React, { useState, useEffect } from 'react'
import '../../styles/guestcss/Contact.css'
import GoogleMap from './GoogleMap'

const Contact = () => {
  const [museumInfo, setMuseumInfo] = useState({
    mission: 'We are dedicated to preserving, interpreting, and sharing the rich cultural heritage of our community. Through engaging exhibits, educational programs, and community partnerships, we inspire visitors to connect with history and appreciate the diversity of human experience.',
    vision: 'To be a leading cultural institution that serves as a bridge between past and present, fostering understanding, appreciation, and celebration of our shared heritage while inspiring future generations to value and preserve cultural diversity.'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMuseumInfo = async () => {
      try {
        const response = await fetch('/api/museum-settings/public')
        if (response.ok) {
          const data = await response.json()
          if (data.data) {
            setMuseumInfo({
              mission: data.data.mission || museumInfo.mission,
              vision: data.data.vision || museumInfo.vision
            })
          }
        }
      } catch (error) {
        console.error('Error fetching museum info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMuseumInfo()

    // Real-time updates via SSE
    if ('EventSource' in window) {
      const eventSource = new EventSource('/api/realtime/stream')
      
      eventSource.addEventListener('settings', (e) => {
        try {
          const eventData = JSON.parse(e.data)
          const { action, settings } = eventData.data
          
          if (action === 'updated' && settings) {
            setMuseumInfo(prev => ({
              mission: settings.mission || prev.mission,
              vision: settings.vision || prev.vision
            }))
          }
        } catch (error) {
          console.error('Error processing settings event:', error)
        }
      })

      eventSource.onerror = () => {
        // Browser will auto-reconnect
      }

      return () => {
        eventSource.close()
      }
    }
  }, [])

  return (
    <section id="contact" className="contact-section">
      <div className="container">
        <div className="contact-header">
          <h2 className="section-title">About Our Museum</h2>
          <p className="section-subtitle">
            Discover our rich history, mission, and commitment to preserving cultural heritage
          </p>
        </div>

        <div className="about-content">
          <div className="about-intro">
            <div className="intro-card modern-card">
              <h3>Our Mission</h3>
              <p>
                {loading ? 'Loading...' : museumInfo.mission}
              </p>
            </div>
            
            <div className="intro-card modern-card">
              <h3>Our Vision</h3>
              <p>
                {loading ? 'Loading...' : museumInfo.vision}
              </p>
            </div>
          </div>

          <div className="about-stats">
            <div className="stat-card modern-card">
              <div className="stat-icon">🏛️</div>
              <div className="stat-number">50+</div>
              <div className="stat-label">Years of Service</div>
            </div>
            <div className="stat-card modern-card">
              <div className="stat-icon">🎨</div>
              <div className="stat-number">2,500+</div>
              <div className="stat-label">Artifacts</div>
            </div>
            <div className="stat-card modern-card">
              <div className="stat-icon">👥</div>
              <div className="stat-number">100K+</div>
              <div className="stat-label">Annual Visitors</div>
            </div>
            <div className="stat-card modern-card">
              <div className="stat-icon">📚</div>
              <div className="stat-number">500+</div>
              <div className="stat-label">Educational Programs</div>
            </div>
          </div>

          <div className="contact-info">
            <div className="contact-card modern-card">
              <div className="contact-icon">📍</div>
              <h3>Visit Us</h3>
              <div className="contact-details">
                <p><strong>Address:</strong> 123 Museum Street</p>
                <p><strong>District:</strong> Cultural District</p>
                <p><strong>City:</strong> City, State 12345</p>
              </div>
            </div>

            <div className="contact-card modern-card">
              <div className="contact-icon">📞</div>
              <h3>Contact Information</h3>
              <div className="contact-details">
                <p><strong>Phone:</strong> (555) 123-4567</p>
                <p><strong>Fax:</strong> (555) 123-4568</p>
                <p><strong>Emergency:</strong> (555) 123-4569</p>
              </div>
            </div>

            <div className="contact-card modern-card">
              <div className="contact-icon">✉️</div>
              <h3>Email Us</h3>
              <div className="contact-details">
                <p><strong>General:</strong> info@museum.com</p>
                <p><strong>Bookings:</strong> bookings@museum.com</p>
                <p><strong>Education:</strong> education@museum.com</p>
              </div>
            </div>

            <div className="contact-card modern-card">
              <div className="contact-icon">🕒</div>
              <h3>Operating Hours</h3>
              <div className="contact-details">
                <p><strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM</p>
                <p><strong>Saturday:</strong> 10:00 AM - 5:00 PM</p>
                <p><strong>Sunday:</strong> 12:00 PM - 5:00 PM</p>
              </div>
            </div>
          </div>

          {/* Google Maps Section */}
          <div style={{ marginTop: '48px' }}>
            <div className="contact-header" style={{ marginBottom: '24px' }}>
              <h2 className="section-title">Find Us</h2>
              <p className="section-subtitle">
                Visit us at our location. Use the map below to get directions.
              </p>
            </div>
            <div style={{ 
              marginTop: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <GoogleMap />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
import React, { useState, useEffect } from 'react'
import '../../styles/guestcss/Gallery.css'

const Gallery = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedExhibit, setSelectedExhibit] = useState(null)
  const [exhibits, setExhibits] = useState([])
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false)

  // Fetch gallery items from API
  useEffect(() => {
    const fetchGalleryItems = async () => {
      try {
        const response = await fetch('/api/gallery')
        if (response.ok) {
          const data = await response.json()
          setExhibits(data.data || [])
        } else {
          console.error('Failed to fetch gallery items')
          // Fallback to empty array if API fails
          setExhibits([])
        }
      } catch (error) {
        console.error('Error fetching gallery items:', error)
        // Fallback to empty array if API fails
        setExhibits([])
      } finally {
        setLoading(false)
      }
    }

    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (response.ok) {
          const data = await response.json()
          setAnnouncements(data.data || [])
        } else {
          console.error('Failed to fetch announcements')
          setAnnouncements([])
        }
      } catch (error) {
        console.error('Error fetching announcements:', error)
        setAnnouncements([])
      } finally {
        setAnnouncementsLoading(false)
      }
    }

    fetchGalleryItems()
    fetchAnnouncements()
  }, [])

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (selectedExhibit) {
          setSelectedExhibit(null)
        }
        if (showAllAnnouncements) {
          setShowAllAnnouncements(false)
        }
      }
    }

    if (selectedExhibit || showAllAnnouncements) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [selectedExhibit, showAllAnnouncements])

  const categories = [
    { id: 'all', name: 'All Exhibits' },
    { id: 'historical', name: 'Historical' },
    { id: 'cultural', name: 'Cultural' },
    { id: 'modern', name: 'Modern' },
    { id: 'artifacts', name: 'Artifacts' }
  ]

  const filteredExhibits = selectedCategory === 'all' 
    ? exhibits 
    : exhibits.filter(exhibit => exhibit.category === selectedCategory)

  return (
    <section id="gallery" className="gallery-section">
      <div className="container">
        <div className="gallery-header">
          <h2 className="section-title">BSC-System Exhibits</h2>
          <p className="section-subtitle">
            Explore our diverse collection of historical artifacts, cultural displays, and modern achievements
          </p>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category.id}
              className={`filter-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Exhibits Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
            <div>Loading exhibits...</div>
          </div>
        ) : filteredExhibits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No exhibits available
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              Check back later for new exhibits.
            </div>
          </div>
        ) : (
          <div className="exhibits-grid">
            {filteredExhibits.map(exhibit => (
              <div key={exhibit._id} className="exhibit-card">
                <div 
                  className="exhibit-image"
                  onClick={() => setSelectedExhibit(exhibit)}
                  style={{ cursor: 'pointer' }}
                >
                  <img 
                    src={`http://localhost:5000${exhibit.image}`} 
                    alt={exhibit.title}
                    onError={(e) => {
                      e.target.src = '/src/assets/img/Browse1.jpg'
                    }}
                  />
                  <div className="exhibit-overlay">
                    <div className="exhibit-year">{exhibit.year || 'N/A'}</div>
                  </div>
                </div>
                <div className="exhibit-content">
                  <h3 className="exhibit-title">{exhibit.title}</h3>
                  <p className="exhibit-description">{exhibit.description}</p>
                  <button 
                    className="exhibit-btn"
                    onClick={() => setSelectedExhibit(exhibit)}
                  >
                    <span>Learn More</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exhibit Modal */}
        {selectedExhibit && (
          <div 
            className="exhibit-modal-overlay"
            onClick={() => setSelectedExhibit(null)}
          >
            <div 
              className="exhibit-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="exhibit-modal-close"
                onClick={() => setSelectedExhibit(null)}
                aria-label="Close modal"
              >
                ×
              </button>
              <div className="exhibit-modal-image-container">
                <img 
                  src={selectedExhibit.image?.startsWith('http') ? selectedExhibit.image : `http://localhost:5000${selectedExhibit.image}`} 
                  alt={selectedExhibit.title}
                  className="exhibit-modal-image"
                  onError={(e) => {
                    e.target.src = '/src/assets/img/Browse1.jpg'
                  }}
                />
              </div> 
              <div className="exhibit-modal-info">
                <div className="exhibit-modal-header">
                  <h2 className="exhibit-modal-title">{selectedExhibit.title}</h2>
                  <span className="exhibit-modal-year">{selectedExhibit.year || 'N/A'}</span>
                </div>
                <p className="exhibit-modal-description">{selectedExhibit.description}</p>
                <div className="exhibit-modal-category">
                  <span className="category-badge">{selectedExhibit.category}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Announcements Section */}
        <div className="announcements-section">
          <h3 className="announcements-title">Latest Announcements</h3>
          {announcementsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              <div>Loading announcements...</div>
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                No announcements at the moment
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                Check back later for updates.
              </div>
            </div>
          ) : (
            <>
              <div className="announcements-grid">
                {announcements.slice(0, 2).map((announcement) => {
                  const announcementDate = new Date(announcement.date)
                  const day = announcementDate.getDate()
                  const month = announcementDate.toLocaleString('en-US', { month: 'short' })
                  
                  return (
                    <div key={announcement._id} className="announcement-card">
                      {announcement.image && (
                        <div className="announcement-image">
                          <img 
                            src={`http://localhost:5000${announcement.image}`} 
                            alt={announcement.title}
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="announcement-card-content-wrapper">
                        <div className="announcement-date">
                          <span className="day">{day}</span>
                          <span className="month">{month}</span>
                        </div>
                        <div className="announcement-content">
                          <h4>{announcement.title}</h4>
                          <p>{announcement.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {announcements.length > 2 && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button 
                    className="view-all-announcements-btn"
                    onClick={() => setShowAllAnnouncements(true)}
                  >
                    View All Announcements
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* View All Announcements Modal */}
        {showAllAnnouncements && (
          <div 
            className="announcements-modal-overlay"
            onClick={() => setShowAllAnnouncements(false)}
          >
            <div 
              className="announcements-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="announcements-modal-close"
                onClick={() => setShowAllAnnouncements(false)}
                aria-label="Close modal"
              >
                ×
              </button>
              <h2 className="announcements-modal-title">All Announcements</h2>
              <div className="announcements-modal-grid">
                {announcements.map((announcement) => {
                  const announcementDate = new Date(announcement.date)
                  const day = announcementDate.getDate()
                  const month = announcementDate.toLocaleString('en-US', { month: 'short' })
                  
                  return (
                    <div key={announcement._id} className="announcement-card">
                      {announcement.image && (
                        <div className="announcement-image">
                          <img 
                            src={`http://localhost:5000${announcement.image}`} 
                            alt={announcement.title}
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div className="announcement-card-content-wrapper">
                        <div className="announcement-date">
                          <span className="day">{day}</span>
                          <span className="month">{month}</span>
                        </div>
                        <div className="announcement-content">
                          <h4>{announcement.title}</h4>
                          <p>{announcement.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Gallery

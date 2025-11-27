import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import '../../styles/AdminCss/gallery.css'

const AdminGallery = () => {
  const [galleryItems, setGalleryItems] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [gallerySuccess, setGallerySuccess] = useState('')
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [editingGalleryItem, setEditingGalleryItem] = useState(null)
  const [galleryFormData, setGalleryFormData] = useState({
    title: '',
    category: 'historical',
    description: '',
    year: '',
    order: 0,
    isActive: true
  })
  const [galleryImage, setGalleryImage] = useState(null)
  const [galleryImagePreview, setGalleryImagePreview] = useState(null)
  const [galleryFormLoading, setGalleryFormLoading] = useState(false)

  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [announcementsError, setAnnouncementsError] = useState('')
  const [announcementsSuccess, setAnnouncementsSuccess] = useState('')
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    order: 0,
    isActive: true
  })
  const [announcementImage, setAnnouncementImage] = useState(null)
  const [announcementImagePreview, setAnnouncementImagePreview] = useState(null)
  const [announcementFormLoading, setAnnouncementFormLoading] = useState(false)

  const getAuthHeaders = () => {
    const raw = localStorage.getItem('admin_token')
    const token =
      raw && raw !== 'null' && raw !== 'undefined' && raw.includes('.') ? raw : null
    return token
      ? { Authorization: `Bearer ${token}` }
      : {}
  }

  useEffect(() => {
    fetchGalleryItems()
    fetchAnnouncements()
  }, [])

  const fetchGalleryItems = async () => {
    setGalleryLoading(true)
    setGalleryError('')
    try {
      const response = await fetch('/api/gallery/admin', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        setGalleryItems(data.data || [])
      } else {
        setGalleryError('Failed to load gallery items')
      }
    } catch (error) {
      console.error('Fetch gallery error:', error)
      setGalleryError('An error occurred while loading gallery items')
    } finally {
      setGalleryLoading(false)
    }
  }

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true)
    setAnnouncementsError('')
    try {
      const response = await fetch('/api/announcements/admin', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.data || [])
      } else {
        setAnnouncementsError('Failed to load announcements')
      }
    } catch (error) {
      console.error('Fetch announcements error:', error)
      setAnnouncementsError('An error occurred while loading announcements')
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  const handleGalleryImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setGalleryImage(file)
      const reader = new FileReader()
      reader.onload = (ev) => setGalleryImagePreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleGallerySubmit = async (e) => {
    e.preventDefault()
    setGalleryFormLoading(true)
    setGalleryError('')
    setGallerySuccess('')

    try {
      const formData = new FormData()
      formData.append('title', galleryFormData.title)
      formData.append('category', galleryFormData.category)
      formData.append('description', galleryFormData.description)
      formData.append('year', galleryFormData.year)
      formData.append('order', galleryFormData.order)
      formData.append('isActive', galleryFormData.isActive)
      
      if (galleryImage) {
        formData.append('image', galleryImage)
      }

      const url = editingGalleryItem
        ? `/api/gallery/${editingGalleryItem._id}`
        : '/api/gallery'
      
      const method = editingGalleryItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: {
          ...getAuthHeaders()
        },
        body: formData
      })

      const result = await response.json()
      
      if (response.ok) {
        const successMessage = editingGalleryItem
          ? 'Gallery item updated successfully!'
          : 'Gallery item created successfully!'

        setGallerySuccess(successMessage)
        await fetchGalleryItems()

        // SweetAlert success for create/update gallery
        Swal.fire({
          title: 'Saved',
          text: successMessage,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        setTimeout(() => {
          setShowGalleryModal(false)
          setEditingGalleryItem(null)
          setGalleryFormData({
            title: '',
            category: 'historical',
            description: '',
            year: '',
            order: 0,
            isActive: true
          })
          setGalleryImage(null)
          setGalleryImagePreview(null)
          setGallerySuccess('')
        }, 1500)
      } else {
        const message = result.message || 'Failed to save gallery item'
        setGalleryError(message)

        // SweetAlert error for gallery save
        Swal.fire({
          title: 'Save Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Gallery submit error:', error)
      const message = 'Network error. Please try again.'
      setGalleryError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setGalleryFormLoading(false)
    }
  }

  const handleDeleteGalleryItem = async (id) => {
    const confirmResult = await Swal.fire({
      title: 'Delete Gallery Item?',
      text: 'This will permanently delete the gallery item and its image from the server. Continue?',
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

    setGalleryLoading(true)
    setGalleryError('')
    try {
      const response = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      })

      if (response.ok) {
        const message = 'Gallery item deleted successfully!'
        setGallerySuccess(message)
        await fetchGalleryItems()

        Swal.fire({
          title: 'Deleted',
          text: message,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        setTimeout(() => setGallerySuccess(''), 2000)
      } else {
        const data = await response.json()
        const message = data.message || 'Failed to delete gallery item'
        setGalleryError(message)

        Swal.fire({
          title: 'Delete Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Delete gallery error:', error)
      const message = 'Network error. Please try again.'
      setGalleryError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setGalleryLoading(false)
    }
  }

  const handleAnnouncementImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAnnouncementImage(file)
      const reader = new FileReader()
      reader.onload = (ev) => setAnnouncementImagePreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault()
    setAnnouncementFormLoading(true)
    setAnnouncementsError('')
    setAnnouncementsSuccess('')

    try {
      const url = editingAnnouncement
        ? `/api/announcements/${editingAnnouncement._id}`
        : '/api/announcements'
      
      const method = editingAnnouncement ? 'PUT' : 'POST'

      const formData = new FormData()
      formData.append('title', announcementFormData.title)
      formData.append('description', announcementFormData.description)
      formData.append('date', announcementFormData.date)
      formData.append('order', announcementFormData.order)
      formData.append('isActive', announcementFormData.isActive)
      
      if (announcementImage) {
        formData.append('image', announcementImage)
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          ...getAuthHeaders()
        },
        body: formData
      })

      const result = await response.json()
      
      if (response.ok) {
        const successMessage = editingAnnouncement
          ? 'Announcement updated successfully!'
          : 'Announcement created successfully!'

        setAnnouncementsSuccess(successMessage)
        await fetchAnnouncements()

        // SweetAlert success for announcements
        Swal.fire({
          title: 'Saved',
          text: successMessage,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        setTimeout(() => {
          setShowAnnouncementModal(false)
          setEditingAnnouncement(null)
          setAnnouncementFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            order: 0,
            isActive: true
          })
          setAnnouncementImage(null)
          setAnnouncementImagePreview(null)
          setAnnouncementsSuccess('')
        }, 1500)
      } else {
        const message = result.message || 'Failed to save announcement'
        setAnnouncementsError(message)

        Swal.fire({
          title: 'Save Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Announcement submit error:', error)
      const message = 'Network error. Please try again.'
      setAnnouncementsError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setAnnouncementFormLoading(false)
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    const confirmResult = await Swal.fire({
      title: 'Delete Announcement?',
      text: 'This will permanently delete the announcement. Continue?',
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

    setAnnouncementsLoading(true)
    setAnnouncementsError('')
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      })

      if (response.ok) {
        const message = 'Announcement deleted successfully!'
        setAnnouncementsSuccess(message)
        await fetchAnnouncements()

        Swal.fire({
          title: 'Deleted',
          text: message,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        setTimeout(() => setAnnouncementsSuccess(''), 2000)
      } else {
        const data = await response.json()
        const message = data.message || 'Failed to delete announcement'
        setAnnouncementsError(message)

        Swal.fire({
          title: 'Delete Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Delete announcement error:', error)
      const message = 'Network error. Please try again.'
      setAnnouncementsError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">🖼️ Gallery Management</h2>
          <p className="dash-subtitle">Manage exhibits and images displayed on the guest page</p>
        </div>
        <button
          onClick={() => {
            setEditingGalleryItem(null)
            setGalleryFormData({
              title: '',
              category: 'historical',
              description: '',
              year: '',
              order: 0,
              isActive: true
            })
            setGalleryImage(null)
            setGalleryImagePreview(null)
            setShowGalleryModal(true)
          }}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Add New Exhibit
        </button>
      </div>

      {galleryError && (
        <div style={{
          background: 'rgba(220, 20, 60, 0.1)',
          border: '1px solid rgba(220, 20, 60, 0.3)',
          color: '#dc143c',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {galleryError}
        </div>
      )}

      {gallerySuccess && (
        <div style={{
          background: 'rgba(22, 163, 74, 0.1)',
          border: '1px solid rgba(22, 163, 74, 0.3)',
          color: '#16a34a',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {gallerySuccess}
        </div>
      )}

      {galleryLoading ? (
        <div className="loading-state">
          <div className="loading-state-icon">⏳</div>
          <div>Loading gallery items...</div>
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <div className="empty-state-title">No gallery items yet</div>
          <div className="empty-state-description">
            Click "Add New Exhibit" to create your first gallery item.
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          {galleryItems.map((item) => (
            <div
              key={item._id}
              className={`gallery-item-card ${!item.isActive ? 'inactive' : ''}`}
            >
              <div className="gallery-item-image">
                <img
                  src={`http://localhost:5000${item.image}`}
                  alt={item.title || 'Gallery item'}
                  onError={(e) => {
                    e.target.src = '/src/assets/img/Browse1.jpg'
                  }}
                />
                {!item.isActive && (
                  <span className="gallery-item-status">Inactive</span>
                )}
              </div>

              <div className="gallery-item-body">
                <div className="gallery-item-meta">
                  <span className={`gallery-item-category ${item.category || 'historical'}`}>
                    {item.category || 'uncategorized'}
                  </span>
                  <span className="gallery-item-order">
                    Order {typeof item.order === 'number' ? item.order : '—'}
                  </span>
                </div>
                <h3 className="gallery-item-title">
                  {item.title || 'Untitled Exhibit'}
                </h3>
                <p className="gallery-item-description">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              <div className="gallery-item-footer">
                <button
                  onClick={() => {
                    setEditingGalleryItem(item)
                    setGalleryFormData({
                      title: item.title,
                      category: item.category,
                      description: item.description,
                      year: item.year || '',
                      order: item.order || 0,
                      isActive: item.isActive
                    })
                    setGalleryImagePreview(`http://localhost:5000${item.image}`)
                    setShowGalleryModal(true)
                  }}
                  className="gallery-item-btn gallery-item-btn-edit"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteGalleryItem(item._id)}
                  className="gallery-item-btn gallery-item-btn-delete"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Announcements Management Section */}
      <div className="announcements-section">
        <div className="dash-header">
          <div>
            <h2 className="dash-title">📢 Latest Announcements</h2>
            <p className="dash-subtitle">Manage announcements displayed on the guest page</p>
          </div>
          <button
            onClick={() => {
              setEditingAnnouncement(null)
              setAnnouncementFormData({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                order: 0,
                isActive: true
              })
              setAnnouncementImage(null)
              setAnnouncementImagePreview(null)
              setShowAnnouncementModal(true)
            }}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ➕ Add New Announcement
          </button>
        </div>

        {announcementsError && (
          <div style={{
            background: 'rgba(220, 20, 60, 0.1)',
            border: '1px solid rgba(220, 20, 60, 0.3)',
            color: '#dc143c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {announcementsError}
          </div>
        )}

        {announcementsSuccess && (
          <div style={{
            background: 'rgba(22, 163, 74, 0.1)',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            color: '#16a34a',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {announcementsSuccess}
          </div>
        )}

        {announcementsLoading ? (
          <div className="loading-state">
            <div className="loading-state-icon">⏳</div>
            <div>Loading announcements...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <div className="empty-state-title">No announcements yet</div>
            <div className="empty-state-description">
              Click "Add New Announcement" to create your first announcement.
            </div>
          </div>
        ) : (
          <div className="announcements-grid">
            {announcements.map((announcement) => {
              const announcementDate = new Date(announcement.date)
              const day = announcementDate.getDate()
              const month = announcementDate.toLocaleString('en-US', { month: 'short' })
              
              return (
                <div 
                  key={announcement._id} 
                  className={`carousel-card ${!announcement.isActive ? 'inactive' : ''}`}
                >
                  <div className="carousel-card-banner">
                    <div className="carousel-card-date">
                      <span className="carousel-card-date-day">{day}</span>
                      <span className="carousel-card-date-month">{month}</span>
                    </div>
                    {!announcement.isActive && (
                      <span className="carousel-card-status">Inactive</span>
                    )}
                  </div>
                  <div className="carousel-card-body">
                    <div className="carousel-card-caption">
                      <h3>{announcement.title}</h3>
                      <p>{announcement.description}</p>
                    </div>
                  </div>
                  <div className="carousel-card-actions">
                    <button
                      onClick={() => {
                        setEditingAnnouncement(announcement)
                        setAnnouncementFormData({
                          title: announcement.title,
                          description: announcement.description,
                          date: new Date(announcement.date).toISOString().split('T')[0],
                          order: announcement.order || 0,
                          isActive: announcement.isActive
                        })
                        setAnnouncementImage(null)
                        setAnnouncementImagePreview(announcement.image ? `http://localhost:5000${announcement.image}` : null)
                        setShowAnnouncementModal(true)
                      }}
                      className="carousel-card-btn carousel-card-btn-edit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement._id)}
                      className="carousel-card-btn carousel-card-btn-delete"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Gallery Add/Edit Modal */}
      {showGalleryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowGalleryModal(false)
            setEditingGalleryItem(null)
            setGalleryFormData({
              title: '',
              category: 'historical',
              description: '',
              year: '',
              order: 0,
              isActive: true
            })
            setGalleryImage(null)
            setGalleryImagePreview(null)
            setGalleryError('')
            setGallerySuccess('')
          }
        }}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            zIndex: 100000
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #eee'
            }}>
              <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '20px', fontWeight: '600' }}>
                {editingGalleryItem ? '✏️ Edit Gallery Item' : '➕ Add New Gallery Item'}
              </h3>
              <button
                onClick={() => {
                  setShowGalleryModal(false)
                  setEditingGalleryItem(null)
                  setGalleryFormData({
                    title: '',
                    category: 'historical',
                    description: '',
                    year: '',
                    order: 0,
                    isActive: true
                  })
                  setGalleryImage(null)
                  setGalleryImagePreview(null)
                  setGalleryError('')
                  setGallerySuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {galleryError && (
                <div style={{
                  background: 'rgba(220, 20, 60, 0.1)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  color: '#dc143c',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {galleryError}
                </div>
              )}
              {gallerySuccess && (
                <div style={{
                  background: 'rgba(22, 163, 74, 0.1)',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  color: '#16a34a',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {gallerySuccess}
                </div>
              )}

              <form onSubmit={handleGallerySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Image *
                  </label>
                  {galleryImagePreview && (
                    <div style={{ marginBottom: '12px' }}>
                      <img
                        src={galleryImagePreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryImageUpload}
                    required={!editingGalleryItem}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
                  />
                  {editingGalleryItem && !galleryImage && (
                    <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      Leave empty to keep current image
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={galleryFormData.title}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, title: e.target.value })}
                    placeholder="Enter exhibit title"
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Category *
                  </label>
                  <select
                    value={galleryFormData.category}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, category: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="historical">Historical</option>
                    <option value="cultural">Cultural</option>
                    <option value="modern">Modern</option>
                    <option value="artifacts">Artifacts</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Description *
                  </label>
                  <textarea
                    value={galleryFormData.description}
                    onChange={(e) => setGalleryFormData({ ...galleryFormData, description: e.target.value })}
                    placeholder="Enter exhibit description"
                    required
                    rows="4"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                      Year
                    </label>
                    <input
                      type="text"
                      value={galleryFormData.year}
                      onChange={(e) => setGalleryFormData({ ...galleryFormData, year: e.target.value })}
                      placeholder="e.g., 500 BC - 1500 AD"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                      Order
                    </label>
                    <input
                      type="number"
                      value={galleryFormData.order}
                      onChange={(e) => setGalleryFormData({ ...galleryFormData, order: parseInt(e.target.value) || 0 })}
                      min="0"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={galleryFormData.isActive}
                      onChange={(e) => setGalleryFormData({ ...galleryFormData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                      Active (visible on guest page)
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGalleryModal(false)
                      setEditingGalleryItem(null)
                      setGalleryFormData({
                        title: '',
                        category: 'historical',
                        description: '',
                        year: '',
                        order: 0,
                        isActive: true
                      })
                      setGalleryImage(null)
                      setGalleryImagePreview(null)
                      setGalleryError('')
                      setGallerySuccess('')
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'rgba(108, 117, 125, 0.1)',
                      color: '#495057'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={galleryFormLoading}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: galleryFormLoading ? 'not-allowed' : 'pointer',
                      border: 'none',
                      background: galleryFormLoading ? '#9ca3af' : 'linear-gradient(135deg, #dc143c, #ff8c00)',
                      color: 'white'
                    }}
                  >
                    {galleryFormLoading ? 'Saving...' : editingGalleryItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Add/Edit Modal */}
      {showAnnouncementModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAnnouncementModal(false)
            setEditingAnnouncement(null)
            setAnnouncementFormData({
              title: '',
              description: '',
              date: new Date().toISOString().split('T')[0],
              order: 0,
              isActive: true
            })
            setAnnouncementImage(null)
            setAnnouncementImagePreview(null)
            setAnnouncementsError('')
            setAnnouncementsSuccess('')
          }
        }}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            zIndex: 100000
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #eee'
            }}>
              <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '20px', fontWeight: '600' }}>
                {editingAnnouncement ? '✏️ Edit Announcement' : '➕ Add New Announcement'}
              </h3>
              <button
                onClick={() => {
                  setShowAnnouncementModal(false)
                  setEditingAnnouncement(null)
                  setAnnouncementFormData({
                    title: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    order: 0,
                    isActive: true
                  })
                  setAnnouncementImage(null)
                  setAnnouncementImagePreview(null)
                  setAnnouncementsError('')
                  setAnnouncementsSuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {announcementsError && (
                <div style={{
                  background: 'rgba(220, 20, 60, 0.1)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  color: '#dc143c',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {announcementsError}
                </div>
              )}
              {announcementsSuccess && (
                <div style={{
                  background: 'rgba(22, 163, 74, 0.1)',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  color: '#16a34a',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {announcementsSuccess}
                </div>
              )}

              <form onSubmit={handleAnnouncementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Image
                  </label>
                  {announcementImagePreview && (
                    <div style={{ marginBottom: '12px' }}>
                      <img
                        src={announcementImagePreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAnnouncementImageUpload}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
                  />
                  {editingAnnouncement && !announcementImage && (
                    <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      Leave empty to keep current image
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={announcementFormData.title}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
                    placeholder="Enter announcement title"
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                    Description *
                  </label>
                  <textarea
                    value={announcementFormData.description}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, description: e.target.value })}
                    placeholder="Enter announcement description"
                    required
                    rows="4"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={announcementFormData.date}
                      onChange={(e) => setAnnouncementFormData({ ...announcementFormData, date: e.target.value })}
                      required
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                      Order
                    </label>
                    <input
                      type="number"
                      value={announcementFormData.order}
                      onChange={(e) => setAnnouncementFormData({ ...announcementFormData, order: parseInt(e.target.value) || 0 })}
                      min="0"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={announcementFormData.isActive}
                      onChange={(e) => setAnnouncementFormData({ ...announcementFormData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#1a1a1a', fontWeight: '500', fontSize: '14px' }}>
                      Active (visible on guest page)
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnnouncementModal(false)
                      setEditingAnnouncement(null)
                      setAnnouncementFormData({
                        title: '',
                        description: '',
                        date: new Date().toISOString().split('T')[0],
                        order: 0,
                        isActive: true
                      })
                      setAnnouncementImage(null)
                      setAnnouncementImagePreview(null)
                      setAnnouncementsError('')
                      setAnnouncementsSuccess('')
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'rgba(108, 117, 125, 0.1)',
                      color: '#495057'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={announcementFormLoading}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: announcementFormLoading ? 'not-allowed' : 'pointer',
                      border: 'none',
                      background: announcementFormLoading ? '#9ca3af' : 'linear-gradient(135deg, #dc143c, #ff8c00)',
                      color: 'white'
                    }}
                  >
                    {announcementFormLoading ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminGallery


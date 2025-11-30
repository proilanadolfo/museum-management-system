import React, { useState, useEffect } from 'react'
import { FiMenu, FiHome, FiUsers, FiSettings, FiLogOut, FiBarChart, FiCalendar, FiImage } from 'react-icons/fi'
import logo from '../../assets/img/Logo.jpg'
import '../../styles/AdminCss/AdminSidebar.css'

export default function AdminSidebar({ onNavigate, active }) {
  const [userProfile, setUserProfile] = useState({
    name: 'Administrator',
    email: '',
    profilePicture: null,
    role: 'Museum Admin'
  })

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    username: ''
  })
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modulePermissions, setModulePermissions] = useState({
    attendance: true,
    gallery: true,
    reports: true,
    settings: true
  })

  // Map module keys to menu items
  const allMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiHome />, description: 'Home', module: null },
    { key: 'bookings', label: 'Bookings', icon: <FiCalendar />, description: 'Reservations', module: null },
    { key: 'attendance', label: 'Attendance', icon: <FiUsers />, description: 'Records', module: 'attendance' },
    { key: 'gallery', label: 'Gallery', icon: <FiImage />, description: 'Exhibits', module: 'gallery' },
    { key: 'reports', label: 'Reports', icon: <FiBarChart />, description: 'Reports', module: 'reports' },
    { key: 'settings', label: 'Settings', icon: <FiSettings />, description: 'Configuration', module: 'settings' },
    { key: 'logout', label: 'Logout', icon: <FiLogOut />, description: 'Sign out', module: null },
  ]

  // Filter items based on module permissions
  const items = allMenuItems.filter(item => {
    // Always show dashboard, bookings, and logout
    if (!item.module) return true
    // Check if module is enabled
    return modulePermissions[item.module] === true
  })

  const [isCollapsed, setIsCollapsed] = useState(false)
  useEffect(() => {
    const isClosed = document.body.classList.contains('sidebar-closed')
    setIsCollapsed(isClosed)
  }, [])

  const openProfileModal = () => {
    setProfileForm({
      name: userProfile.name || '',
      email: userProfile.email || '',
      username: userProfile.username || ''
    })
    setProfileImageFile(null)
    setProfileImagePreview(userProfile.profilePicture || null)
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    setShowProfileModal(true)
  }

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target
    setProfileForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfileImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setProfileImagePreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          setError('New password and confirm password do not match')
          setLoading(false)
          return
        }
        if (newPassword.length < 6) {
          setError('Password must be at least 6 characters long')
          setLoading(false)
          return
        }
      }

      const formData = new FormData()
      formData.append('name', profileForm.name)
      formData.append('email', profileForm.email)
      if (profileForm.username) {
        formData.append('username', profileForm.username)
      }
      if (profileImageFile) {
        formData.append('profilePicture', profileImageFile)
      }
      if (newPassword) {
        formData.append('newPassword', newPassword)
      }

      const token = localStorage.getItem('admin_token')
      const storedUser = localStorage.getItem('admin_user')
      const userData = storedUser ? JSON.parse(storedUser) : null
      const userId = userData?.id || userData?._id

      if (!userId) {
        setError('Missing admin user information.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/admin/update-profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      let result = {}
      try {
        result = await response.json()
      } catch {
        // Response is not valid JSON (e.g. HTML error page, rate-limit page, etc.)
        console.error('Profile update response was not valid JSON, status =', response.status)
      }

      if (response.ok) {
        setSuccess('Profile updated successfully!')

        const pictureUrl = result.profilePicture || userProfile.profilePicture || null

        const updatedUser = {
          ...userData,
          id: userId,
          _id: userId,
          name: result.name || profileForm.name,
          email: result.email || profileForm.email,
          username: result.username || profileForm.username,
          // Add cache-busting query to ensure avatar refreshes immediately
          profilePicture: pictureUrl ? `${pictureUrl}?v=${Date.now()}` : null
        }

        localStorage.setItem('admin_user', JSON.stringify(updatedUser))

        setUserProfile((prev) => ({
          ...prev,
          name: updatedUser.name || prev.name,
          email: updatedUser.email || prev.email,
          profilePicture: updatedUser.profilePicture || prev.profilePicture
        }))

        if (updatedUser.profilePicture) {
          setProfileImagePreview(updatedUser.profilePicture)
        }

        setNewPassword('')
        setConfirmPassword('')

        window.dispatchEvent(new CustomEvent('profileUpdated'))

        try {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'admin_user',
            newValue: JSON.stringify(updatedUser),
            storageArea: localStorage
          }))
        } catch {
          // Some browsers might block manual StorageEvent; ignore.
        }

        setTimeout(() => {
          setShowProfileModal(false)
          setSuccess('')
        }, 1500)
      } else {
        setError(result?.message || `Failed to update profile (status ${response.status})`)
      }
    } catch (err) {
      console.error('Profile update error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-closed')
    setIsCollapsed(prev => !prev)
  }

  // Fetch module permissions
  const fetchModulePermissions = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return

      const response = await fetch('/api/module-permissions/my-permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setModulePermissions(data.permissions || {
          attendance: true,
          gallery: true,
          exhibits: true,
          reports: true,
          analytics: true,
          settings: true
        })
      }
    } catch (error) {
      console.log('Error fetching module permissions:', error)
      // Default to all enabled on error
    }
  }

  useEffect(() => {
    // Initial load
    fetchModulePermissions()

    // Real-time updates via SSE (Server-Sent Events)
    if (!('EventSource' in window)) {
      return undefined
    }

    const eventSource = new EventSource('/api/realtime/stream')

    const handleModulePermissionsEvent = (e) => {
      try {
        const payload = JSON.parse(e.data)
        const adminIdFromEvent = payload?.data?.adminId

        // Check if this event is for the currently logged-in admin
        const storedUser = localStorage.getItem('admin_user')
        if (!storedUser || !adminIdFromEvent) return

        const userData = JSON.parse(storedUser)
        const currentAdminId = userData.id || userData._id
        if (!currentAdminId) return

        if (adminIdFromEvent === currentAdminId.toString()) {
          // Re-fetch permissions for this admin
          fetchModulePermissions()
        }
      } catch (error) {
        console.error('Error processing modulePermissions SSE event:', error)
      }
    }

    eventSource.addEventListener('modulePermissions', handleModulePermissionsEvent)

    eventSource.onerror = () => {
      // Browser will auto-reconnect; no special handling needed
    }

    return () => {
      eventSource.removeEventListener('modulePermissions', handleModulePermissionsEvent)
      eventSource.close()
    }
  }, [])

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get user data from localStorage first
        const storedUser = localStorage.getItem('admin_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          const picture =
            userData.profilePicture ||
            (userData.googleProfile && userData.googleProfile.picture) ||
            null

          setUserProfile({
            name: userData.name || userData.username || 'Administrator',
            email: userData.email || '',
            profilePicture: picture,
            role: 'Museum Admin',
            username: userData.username
          })
        }

        // Try to fetch additional profile data from API (optional - don't logout on failure)
        const token = localStorage.getItem('admin_token')
        if (token && storedUser) {
          const userData = JSON.parse(storedUser)
          const userId = userData.id || userData._id
          
          // Only fetch if we have a valid userId
          if (userId) {
            try {
          const response = await fetch(`/api/admin/profile?userId=${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
              // Don't logout on 401/404 for optional profile fetch - just use localStorage data
          if (response.ok) {
            const profileData = await response.json()
            setUserProfile(prev => ({
              ...prev,
              ...profileData,
              role: 'Museum Admin'
            }))
              }
              // Silently ignore 401, 404, and other errors for optional profile endpoint
            } catch (error) {
              // Silently ignore network errors for optional profile fetch
              console.log('Profile fetch failed, using localStorage data:', error.message)
            }
          }
        }
      } catch (error) {
        console.log('Using stored user data:', error.message)
      }
    }

    fetchUserProfile()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log('Profile update event received in AdminSidebar')
      fetchUserProfile()
    }

    // Listen for storage changes (when localStorage is updated)
    const handleStorageChange = (e) => {
      if (e.key === 'admin_user' && e.newValue) {
        console.log('Admin user storage updated')
        try {
          const userData = JSON.parse(e.newValue)
          const picture =
            userData.profilePicture ||
            (userData.googleProfile && userData.googleProfile.picture) ||
            null

          setUserProfile({
            name: userData.name || userData.username || 'Administrator',
            email: userData.email || '',
            profilePicture: picture,
            role: 'Museum Admin',
            username: userData.username
          })
        } catch (error) {
          console.error('Error parsing updated user data:', error)
        }
      }
    }

    // Add event listeners
    window.addEventListener('profileUpdated', handleProfileUpdate)
    window.addEventListener('storage', handleStorageChange)

    // Cleanup
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <>
      <div className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {/* Sidebar hamburger hidden; topbar has the primary burger */}
        <div className="sidebar-logo">
          <img src={logo} alt="Museum" className="sidebar-logo-img" />
          <div className="logo-text">
            <span className="logo-title">Bukidnon Studies Center</span>
            <span className="logo-subtitle">Admin Panel</span>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-menu">
          {items.map((item) => (
            <li key={item.key} className="nav-item">
              <button
                type="button"
                className={`nav-link ${active === item.key ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onNavigate?.(item.key)
                }}
                title={item.description}
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
                {active === item.key && <div className="nav-indicator"></div>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-profile" onClick={openProfileModal} style={{ cursor: 'pointer' }}>
          <div className="profile-avatar">
            {userProfile.profilePicture ? (
              <img 
                src={userProfile.profilePicture} 
                alt={userProfile.name}
                className="profile-image"
                onError={() => {
                  // If the image fails to load, fall back to initials by clearing profilePicture in state
                  setUserProfile((prev) => ({
                    ...prev,
                    profilePicture: null
                  }))
                }}
              />
            ) : null}
            <div className="profile-initials" style={{ display: userProfile.profilePicture ? 'none' : 'flex' }}>
              {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          </div>
          <div className="profile-info">
            <span className="profile-name">{userProfile.name}</span>
            <span className="profile-role">{userProfile.role}</span>
            {userProfile.email && (
              <span className="profile-email">{userProfile.email}</span>
            )}
          </div>
        </div>
      </div>
      </div>

      {showProfileModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) {
              setShowProfileModal(false)
              setError('')
              setSuccess('')
              setNewPassword('')
              setConfirmPassword('')
            }
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              width: '90%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(15,23,42,0.45)',
              padding: '22px 24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                  Account Info
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  View and update your admin profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!loading) {
                    setShowProfileModal(false)
                    setError('')
                    setSuccess('')
                    setNewPassword('')
                    setConfirmPassword('')
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.35)',
                  color: '#15803d',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ✅ {success}
              </div>
            )}

            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '24px',
                    overflow: 'hidden'
                  }}
                >
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt={profileForm.name || 'Profile'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>
                      {(profileForm.name || userProfile.name || 'AD')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label
                    htmlFor="adminProfileImageSidebar"
                    style={{
                      background: '#dc143c',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    Upload Photo
                  </label>
                  <input
                    id="adminProfileImageSidebar"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  {profileImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileImageFile(null)
                        setProfileImagePreview(null)
                      }}
                      style={{
                        background: '#f97373',
                        color: '#fff',
                        borderRadius: '999px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileInputChange}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileForm.email}
                  onChange={handleProfileInputChange}
                  placeholder="Enter your email address"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileInputChange}
                  placeholder="Enter your username"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: '4px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Change Password (optional)</div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    background: '#fffbeb',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    border: '1px solid #fef3c7'
                  }}
                >
                  Leave password fields blank if you do not want to change your password. Minimum 6 characters.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) {
                      setShowProfileModal(false)
                      setError('')
                      setSuccess('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #dc143c, #ff8c00)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

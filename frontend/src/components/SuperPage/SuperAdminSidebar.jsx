import React, { useState, useEffect } from 'react'
import { FiHome, FiUsers, FiSettings, FiLogOut, FiFileText } from 'react-icons/fi'
import logo from '../../assets/img/Logo.jpg'
import '../../styles/SuperCss/SuperAdminSidebar.css'

export default function SuperAdminSidebar({ onNavigate, active }) {
  const [userProfile, setUserProfile] = useState({
    name: 'Super Admin',
    email: '',
    profilePicture: null,
    role: 'System Administrator'
  })

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    username: ''
  })
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Debug logging for profile changes
  useEffect(() => {
    console.log('Sidebar userProfile updated:', userProfile)
    
    // Test if image URL is accessible
    if (userProfile.profilePicture) {
      const testImg = new Image()
      testImg.onload = () => console.log('✅ Image URL is accessible:', userProfile.profilePicture)
      testImg.onerror = () => console.error('❌ Image URL is not accessible:', userProfile.profilePicture)
      testImg.src = userProfile.profilePicture
    }
  }, [userProfile])

  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiHome />, description: 'Overview' },
    { key: 'admins', label: 'Manage Admins', icon: <FiUsers />, description: 'User Management' },
    { key: 'templates', label: 'Report Templates', icon: <FiFileText />, description: 'Design Reports' },
    { key: 'settings', label: 'Settings', icon: <FiSettings />, description: 'System Config' },
    { key: 'logout', label: 'Logout', icon: <FiLogOut />, description: 'Sign Out' },
  ]

  const [isCollapsed, setIsCollapsed] = useState(false)
  useEffect(() => {
    const updateCollapsed = () => {
      const isClosed = document.body.classList.contains('sidebar-closed')
      setIsCollapsed(isClosed)
    }
    
    // Initial check
    updateCollapsed()
    
    // Watch for body class changes
    const observer = new MutationObserver(() => {
      updateCollapsed()
    })
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => {
      observer.disconnect()
    }
  }, [])

  const openProfileModal = () => {
    setProfileForm({
      name: userProfile.name || '',
      email: userProfile.email || '',
      username: userProfile.username || ''
    })
    setProfileImageFile(null)
    setProfileImagePreview(userProfile.profilePicture || null)
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
    reader.onload = (ev) => setProfileImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('name', profileForm.name)
      formData.append('email', profileForm.email)
      if (profileForm.username) {
        formData.append('username', profileForm.username)
      }
      if (profileImageFile) {
        formData.append('profilePicture', profileImageFile)
      }

      const token = localStorage.getItem('superadmin_token')
      const storedUser = localStorage.getItem('superadmin_user')
      const userData = storedUser ? JSON.parse(storedUser) : null
      const userId = userData?.id || userData?._id

      if (!userId) {
        setError('Missing super admin user information.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/superadmin/update-profile/${userId}`, {
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
        console.error('SuperAdmin profile update: response not valid JSON, status =', response.status)
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
          profilePicture: pictureUrl
        }

        localStorage.setItem('superadmin_user', JSON.stringify(updatedUser))

        setUserProfile((prev) => ({
          ...prev,
          name: updatedUser.name || prev.name,
          email: updatedUser.email || prev.email,
          profilePicture: updatedUser.profilePicture || prev.profilePicture
        }))

        if (updatedUser.profilePicture) {
          setProfileImagePreview(updatedUser.profilePicture)
        }

        window.dispatchEvent(new CustomEvent('profileUpdated'))

        try {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'superadmin_user',
            newValue: JSON.stringify(updatedUser),
            storageArea: localStorage
          }))
        } catch {
          // ignore manual StorageEvent errors in some browsers
        }

        setTimeout(() => {
          setShowProfileModal(false)
          setSuccess('')
        }, 1500)
      } else {
        setError(result?.message || `Failed to update profile (status ${response.status})`)
      }
    } catch (err) {
      console.error('SuperAdmin profile update error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get user data from localStorage first
        const storedUser = localStorage.getItem('superadmin_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserProfile({
            name: userData.name || userData.username || 'Super Admin',
            email: userData.email || '',
            profilePicture: userData.profilePicture || null,
            role: 'System Administrator'
          })
        }

        // Try to fetch additional profile data from API
        const token = localStorage.getItem('superadmin_token')
        if (token && storedUser) {
          const userData = JSON.parse(storedUser)
          const response = await fetch(`/api/superadmin/profile?userId=${userData.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const profileData = await response.json()
            setUserProfile(prev => ({
              ...prev,
              ...profileData,
              role: 'System Administrator'
            }))
          }
        }
      } catch (error) {
        console.log('Using stored user data:', error.message)
      }
    }

    fetchUserProfile()
    
    // Listen for storage changes to update profile in real-time
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('superadmin_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        console.log('Sidebar updating profile with data:', userData)
        setUserProfile({
          name: userData.name || userData.username || 'Super Admin',
          email: userData.email || '',
          profilePicture: userData.profilePicture || null,
          role: 'System Administrator'
        })
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events
    window.addEventListener('profileUpdated', handleStorageChange)
    
    // Force refresh every 2 seconds for debugging
    const interval = setInterval(() => {
      const storedUser = localStorage.getItem('superadmin_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        if (userData.profilePicture && userData.profilePicture !== userProfile.profilePicture) {
          console.log('Force refreshing profile from localStorage:', userData)
          setUserProfile({
            name: userData.name || userData.username || 'Super Admin',
            email: userData.email || '',
            profilePicture: userData.profilePicture || null,
            role: 'System Administrator'
          })
        }
      }
    }, 2000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('profileUpdated', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      <div className={`superadmin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={logo} alt="Museum" className="sidebar-logo-img" />
          <div className="logo-text">
            <span className="logo-title">Bukidnon Studies Center</span>
            <span className="logo-subtitle">Super Admin Panel</span>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-menu">
          {items.map((item) => (
            <li key={item.key} className="nav-item">
              <button
                className={`nav-link ${active === item.key ? 'is-active' : ''}`}
                onClick={() => onNavigate?.(item.key)}
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
                  // Fall back to initials if image fails
                  setUserProfile((prev) => ({
                    ...prev,
                    profilePicture: null
                  }))
                }}
              />
            ) : (
              <div className="profile-initials" style={{ display: 'flex' }}>
                {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            {userProfile.profilePicture && (
              <div className="profile-initials" style={{ display: 'none' }}>
                {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
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
                  Super Admin Account
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  View and update your super admin profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!loading) {
                    setShowProfileModal(false)
                    setError('')
                    setSuccess('')
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
                      {(profileForm.name || userProfile.name || 'SA')
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
                    htmlFor="superAdminProfileImage"
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
                    id="superAdminProfileImage"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) {
                      setShowProfileModal(false)
                      setError('')
                      setSuccess('')
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

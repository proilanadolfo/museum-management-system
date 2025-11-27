import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import '../../styles/SuperCss/SuperSettins.css'

const SuperSettins = () => {
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [currentLogo, setCurrentLogo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchCurrentLogo()
  }, [])

  const fetchCurrentLogo = async () => {
    try {
      setFetching(true)
      const token = localStorage.getItem('superadmin_token')
      
      if (!token) {
        console.warn('No superadmin token found')
        setFetching(false)
        return
      }

      const response = await fetch('http://localhost:5000/api/museum-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.profileLogo) {
          setCurrentLogo(`http://localhost:5000/${data.data.profileLogo}`)
          setLogoPreview(`http://localhost:5000/${data.data.profileLogo}`)
        }
      } else if (response.status === 401) {
        console.error('Authentication failed - token may be expired')
        Swal.fire({
          title: 'Session Expired',
          text: 'Please log in again to continue.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        }).then(() => {
          localStorage.removeItem('superadmin_token')
          window.location.href = '/login'
        })
      }
    } catch (error) {
      console.error('Error fetching logo:', error)
    } finally {
      setFetching(false)
    }
  }

  const handleLogoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        title: 'File Too Large',
        text: 'Logo file size must be less than 5MB. Please compress the image.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        title: 'Invalid File Type',
        text: 'Please upload an image file (JPG, PNG, etc.)',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = async () => {
    if (!logoFile) {
      Swal.fire({
        title: 'No File Selected',
        text: 'Please select a logo file to upload.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('superadmin_token')
      
      if (!token || token === 'null' || token === 'undefined') {
        Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in again to upload the logo.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        }).then(() => {
          localStorage.removeItem('superadmin_token')
          window.location.href = '/login'
        })
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('logo', logoFile)

      const response = await fetch('http://localhost:5000/api/museum-settings/profile-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData
      })

      // Check if response is ok before trying to parse JSON
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        throw new Error('Invalid response from server')
      }

      if (response.ok && data.success) {
        Swal.fire({
          title: 'Success!',
          text: 'Profile logo uploaded successfully. It will appear on all pages (SuperAdmin, Admin, and Guest).',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        // Update preview with new logo immediately with cache busting
        if (data.data.profileLogo) {
          const logoUrl = `http://localhost:5000/${data.data.profileLogo}?t=${Date.now()}`
          setCurrentLogo(logoUrl)
          setLogoPreview(logoUrl)
        }
        setLogoFile(null)
        
        // Refresh logo on all pages by triggering a custom event (immediate)
        window.dispatchEvent(new CustomEvent('logoUpdated'))
        
        // Also trigger SSE broadcast (already done by backend, but ensure frontend updates)
        // The SSE listener will catch this automatically
      } else {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          Swal.fire({
            title: 'Authentication Failed',
            text: data.message || 'Your session has expired. Please log in again.',
            icon: 'warning',
            confirmButtonColor: '#dc143c'
          }).then(() => {
            localStorage.removeItem('superadmin_token')
            window.location.href = '/login'
          })
        } else {
          throw new Error(data.message || 'Failed to upload logo')
        }
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      Swal.fire({
        title: 'Upload Failed',
        text: error.message || 'Failed to upload profile logo. Please try again.',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLogo = async () => {
    const result = await Swal.fire({
      title: 'Delete Logo?',
      text: 'Are you sure you want to delete the profile logo? This will remove it from all pages.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc143c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) return

    try {
      setLoading(true)
      const token = localStorage.getItem('superadmin_token')
      
      if (!token || token === 'null' || token === 'undefined') {
        Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in again to delete the logo.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        }).then(() => {
          localStorage.removeItem('superadmin_token')
          window.location.href = '/login'
        })
        setLoading(false)
        return
      }

      const response = await fetch('http://localhost:5000/api/museum-settings/profile-logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        throw new Error('Invalid response from server')
      }

      if (response.ok && data.success) {
        Swal.fire({
          title: 'Deleted!',
          text: 'Profile logo has been deleted successfully.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        setCurrentLogo(null)
        setLogoPreview(null)
        setLogoFile(null)
        
        // Refresh logo on all pages immediately
        window.dispatchEvent(new CustomEvent('logoUpdated'))
        
        // SSE broadcast already done by backend, frontend will catch it automatically
      } else {
        if (response.status === 401 || response.status === 403) {
          Swal.fire({
            title: 'Authentication Failed',
            text: data.message || 'Your session has expired. Please log in again.',
            icon: 'warning',
            confirmButtonColor: '#dc143c'
          }).then(() => {
            localStorage.removeItem('superadmin_token')
            window.location.href = '/login'
          })
        } else {
          throw new Error(data.message || 'Failed to delete logo')
        }
      }
    } catch (error) {
      console.error('Error deleting logo:', error)
      Swal.fire({
        title: 'Delete Failed',
        text: error.message || 'Failed to delete profile logo. Please try again.',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Settings</h2>
          <p className="dash-subtitle">
            System-level settings for the Super Admin. Manage profile logo for all pages.
          </p>
        </div>
      </div>
      
      <div className="settings-grid">
        <div className="setting-card">
          <div className="setting-icon">🖼️</div>
          <h3>Profile Logo</h3>
          <p>
            Upload a profile logo that will be displayed on SuperAdmin, Admin, and Guest pages.
          </p>
          
          <div style={{ marginTop: '20px' }}>
            {fetching ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Loading...</p>
              </div>
            ) : (
              <>
                <div style={{ 
                  marginBottom: '15px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '150px',
                  border: '2px dashed #e9ecef',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa'
                }}>
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      style={{ 
                        maxWidth: '200px', 
                        maxHeight: '150px', 
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }} 
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#6c757d' }}>
                      <p>No logo uploaded</p>
                      <p style={{ fontSize: '12px', marginTop: '5px' }}>Upload a logo to see preview</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <label
                    htmlFor="logoUpload"
                    style={{
                      background: '#dc143c',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                      display: 'inline-block',
                      transition: 'background 0.3s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#b01030'}
                    onMouseOut={(e) => e.target.style.background = '#dc143c'}
                  >
                    {currentLogo ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoSelect}
                  />
                  
                  {logoFile && (
                    <button
                      onClick={handleLogoUpload}
                      disabled={loading}
                      style={{
                        background: loading ? '#6c757d' : '#16a34a',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        border: 'none',
                        transition: 'background 0.3s'
                      }}
                      onMouseOver={(e) => {
                        if (!loading) e.target.style.background = '#15803d'
                      }}
                      onMouseOut={(e) => {
                        if (!loading) e.target.style.background = '#16a34a'
                      }}
                    >
                      {loading ? 'Uploading...' : 'Save Logo'}
                    </button>
                  )}
                  
                  {currentLogo && (
                    <button
                      onClick={handleDeleteLogo}
                      disabled={loading}
                      style={{
                        background: loading ? '#6c757d' : '#dc143c',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        border: 'none',
                        transition: 'background 0.3s'
                      }}
                      onMouseOver={(e) => {
                        if (!loading) e.target.style.background = '#b01030'
                      }}
                      onMouseOut={(e) => {
                        if (!loading) e.target.style.background = '#dc143c'
                      }}
                    >
                      {loading ? 'Deleting...' : 'Delete Logo'}
                    </button>
                  )}
                </div>
                
                {logoFile && (
                  <p style={{ 
                    marginTop: '10px', 
                    fontSize: '12px', 
                    color: '#6c757d',
                    textAlign: 'center'
                  }}>
                    Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="setting-card">
          <div className="setting-icon">⚙️</div>
          <h3>System Settings</h3>
          <p>
            Additional super admin configuration options will appear here in the future.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SuperSettins


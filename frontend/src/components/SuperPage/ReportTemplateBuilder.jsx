import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import '../../styles/SuperCss/SuperTemplates.css'

const defaultLayout = {
  title: 'Attendance Report',
  titleAlign: 'center',
  headerTitle: 'Bukidnon Studies Center',
  headerSubtitle: 'Central Mindanao University • University Town, Musuan, Bukidnon 8710',
  logoUrl: '',
  logoPosition: 'left',
  headerBgColor: '#ffffff',
  footerText: 'Prepared by: __________ | Checked by: ___________',
  footerShowPageNumber: true,
  orientation: 'portrait',
  pageMargin: '15mm',
  visibleColumns: {
    date: true,
    name: true,
    idOrContact: true,
    grade: true,
    timeIn: true,
    timeOut: true,
    purpose: true,
    duration: true,
    status: true
  }
}

const ReportTemplateBuilder = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    layout: defaultLayout
  })

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/report-templates')
      if (response.ok) {
        const data = await response.json()
        console.log('Templates response:', data)
        // Handle both response formats
        const templatesList = data.templates || data.data || []
        console.log('Templates found:', templatesList.length)
        setTemplates(templatesList)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch templates' }))
        console.error('Error fetching templates:', errorData)
        setError(errorData.message || 'Failed to fetch templates')
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Network error. Please try again.')
    }
  }

  const handleInputChange = (path, value) => {
    // Special handling for visibleColumns so it updates inside layout
    if (path.startsWith('visibleColumns.')) {
      const column = path.replace('visibleColumns.', '')
      setFormData(prev => ({
        ...prev,
        layout: {
          ...prev.layout,
          visibleColumns: {
            ...prev.layout.visibleColumns,
            [column]: value
          }
        }
      }))
      return
    }

    // Nested layout.* keys (e.g., layout.title)
    if (path.includes('.')) {
      const [parent, child] = path.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
      return
    }

    // Top-level fields (e.g., name)
    setFormData(prev => ({
      ...prev,
      [path]: value
    }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          title: 'File Too Large',
          text: 'Logo file size must be less than 2MB. Please compress the image.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        setError('Logo file size must be less than 2MB. Please compress the image.')
        return
      }
      
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        
        // Compress image if it's too large
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxWidth = 300
          const maxHeight = 300
          let width = img.width
          let height = img.height
          
          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 with compression (use JPEG for better compression)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          
          setLogoPreview(compressedBase64)
          setFormData(prev => ({
            ...prev,
            layout: {
              ...prev.layout,
              logoUrl: compressedBase64
            }
          }))
        }
        img.src = base64String
      }
      reader.readAsDataURL(file)
    }
  }

  const loadTemplate = (template) => {
    const incomingLayout = template.layout || {}
    const mergedLayout = {
      ...defaultLayout,
      ...incomingLayout,
      visibleColumns: {
        ...defaultLayout.visibleColumns,
        ...(incomingLayout.visibleColumns || {})
      }
    }
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      layout: mergedLayout
    })
    if (template.layout.logoUrl) {
      setLogoPreview(template.layout.logoUrl)
    }
    setIsEditing(true)
  }

  const createNewTemplate = () => {
    setSelectedTemplate(null)
    setFormData({
      name: '',
      layout: defaultLayout
    })
    setLogoPreview('')
    setLogoFile(null)
    setIsEditing(true)
  }

  const saveTemplate = async () => {
    if (!formData.name.trim()) {
      Swal.fire({
        title: 'Template Name Required',
        text: 'Please enter a template name before saving.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('superadmin_token')
      if (!token) {
        Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in as Super Admin',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        setError('Please log in as Super Admin')
        setLoading(false)
        return
      }

      const storedUser = localStorage.getItem('superadmin_user')
      if (!storedUser) {
        Swal.fire({
          title: 'User Data Not Found',
          text: 'Please log in again.',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        setError('User data not found. Please log in again.')
        setLoading(false)
        return
      }

      const userData = JSON.parse(storedUser)

      const templateData = {
        name: formData.name,
        layout: formData.layout,
        createdBy: userData.id
      }

      console.log('Saving template:', templateData)

      const url = selectedTemplate 
        ? `/api/report-templates/${selectedTemplate._id}`
        : '/api/report-templates'
      
      const method = selectedTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      })

      const responseData = await response.json().catch(() => ({ message: 'Failed to parse response' }))
      console.log('Response status:', response.status)
      console.log('Response data:', responseData)

      if (response.ok) {
        Swal.fire({
          title: 'Success!',
          text: selectedTemplate ? 'Template updated successfully!' : 'Template created successfully!',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        // Refresh templates list immediately
        await fetchTemplates()
        // Wait a bit then close editor
        setTimeout(() => {
          setIsEditing(false)
          setSuccess('')
          // Reset form
          setSelectedTemplate(null)
          setFormData({
            name: '',
            layout: defaultLayout
          })
          setLogoPreview('')
          setLogoFile(null)
        }, 1500)
      } else {
        console.error('Template save error:', responseData)
        Swal.fire({
          title: 'Save Failed',
          text: responseData.message || responseData.error || 'Failed to save template',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        setError(responseData.message || responseData.error || 'Failed to save template. Please check the console for details.')
      }
    } catch (err) {
      console.error('Network error:', err)
      Swal.fire({
        title: 'Network Error',
        text: `Please check your connection and try again. ${err.message}`,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
      setError(`Network error: ${err.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (templateId) => {
    if (!templateId) {
      console.error('No template ID provided')
      Swal.fire({
        title: 'Invalid Template ID',
        text: 'Cannot delete template without a valid ID.',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
      setError('Invalid template ID')
      return
    }

    const result = await Swal.fire({
      title: 'Delete Template?',
      text: 'This action cannot be undone. Are you sure you want to delete this template?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('superadmin_token')
      if (!token) {
        Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in as Super Admin',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        setError('Please log in as Super Admin')
        setLoading(false)
        return
      }

      console.log('Deleting template:', templateId)
      const response = await fetch(`/api/report-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const responseData = await response.json().catch(() => ({ message: 'Failed to parse response' }))
      console.log('Delete response:', response.status, responseData)

      if (response.ok) {
        Swal.fire({
          title: 'Deleted!',
          text: 'Template has been deleted successfully.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        await fetchTemplates()
        if (selectedTemplate?._id === templateId) {
          setIsEditing(false)
          setSelectedTemplate(null)
        }
        setTimeout(() => setSuccess(''), 2000)
      } else {
        Swal.fire({
          title: 'Delete Failed',
          text: responseData.message || responseData.error || 'Failed to delete template',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        setError(responseData.message || responseData.error || 'Failed to delete template')
      }
    } catch (err) {
      console.error('Delete error:', err)
      Swal.fire({
        title: 'Network Error',
        text: `Please check your connection and try again. ${err.message}`,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
      setError(`Failed to delete template: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <div className="dash-section" style={{ padding: '24px' }}>
        <div className="dash-header" style={{ marginBottom: '24px' }}>
          <div>
            <h2 className="dash-title">Report Template Builder</h2>
            <p className="dash-subtitle">Design custom PDF report layouts</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={saveTemplate} 
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#dc143c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading ? 'Saving...' : 'Save Template'}
            </button>
            <button 
              onClick={() => {
                setIsEditing(false)
                setSelectedTemplate(null)
              }}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {error && <div style={{ padding: '12px', background: '#fee', color: '#c33', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ padding: '12px', background: '#efe', color: '#3c3', borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column - Basic Settings */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', color: '#495057' }}>Basic Settings</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter template name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Header Name (Institution)</label>
              <input
                type="text"
                value={formData.layout.headerTitle}
                onChange={(e) => handleInputChange('layout.headerTitle', e.target.value)}
                placeholder="e.g., Bukidnon Studies Center"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Header Subtitle</label>
              <input
                type="text"
                value={formData.layout.headerSubtitle}
                onChange={(e) => handleInputChange('layout.headerSubtitle', e.target.value)}
                placeholder="Address or tagline (optional)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Report Title</label>
              <input
                type="text"
                value={formData.layout.title}
                onChange={(e) => handleInputChange('layout.title', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Title Alignment</label>
              <select
                value={formData.layout.titleAlign}
                onChange={(e) => handleInputChange('layout.titleAlign', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Logo Upload</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ marginBottom: '8px' }}
              />
              {logoPreview && (
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  style={{ maxWidth: '200px', maxHeight: '100px', marginTop: '8px', border: '1px solid #ddd', padding: '4px' }}
                />
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Logo Position</label>
              <select
                value={formData.layout.logoPosition}
                onChange={(e) => handleInputChange('layout.logoPosition', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Header Background Color</label>
              <input
                type="color"
                value={formData.layout.headerBgColor}
                onChange={(e) => handleInputChange('layout.headerBgColor', e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Page Orientation</label>
              <select
                value={formData.layout.orientation}
                onChange={(e) => handleInputChange('layout.orientation', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Page Margin</label>
              <input
                type="text"
                value={formData.layout.pageMargin}
                onChange={(e) => handleInputChange('layout.pageMargin', e.target.value)}
                placeholder="e.g., 15mm"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Right Column - Footer & Columns */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', color: '#495057' }}>Footer Settings</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Footer Text</label>
              <textarea
                value={formData.layout.footerText}
                onChange={(e) => handleInputChange('layout.footerText', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.layout.footerShowPageNumber}
                  onChange={(e) => handleInputChange('layout.footerShowPageNumber', e.target.checked)}
                />
                <span>Show Page Number</span>
              </label>
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '20px', color: '#495057' }}>Visible Columns</h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {Object.keys(formData.layout.visibleColumns).map(column => {
                const labelMap = {
                  date: 'Date',
                  name: 'Visitor Name',
                  idOrContact: 'ID / Contact',
                  grade: 'Grade/Level',
                  timeIn: 'Time In',
                  timeOut: 'Time Out',
                  purpose: 'Purpose',
                  duration: 'Duration',
                  status: 'Status'
                }
                const label = labelMap[column] || column
                return (
                  <label key={column} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.layout.visibleColumns[column]}
                      onChange={(e) => handleInputChange(`visibleColumns.${column}`, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-section" style={{ padding: '24px' }}>
      <div className="dash-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dash-title">Report Template Builder</h2>
          <p className="dash-subtitle">Design and manage custom PDF report layouts</p>
        </div>
        <button 
          onClick={createNewTemplate}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          + Create Template
        </button>
      </div>

      {error && <div style={{ padding: '12px', background: '#fee', color: '#c33', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '12px', background: '#efe', color: '#3c3', borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
          <strong>Debug:</strong> Templates count: {templates.length} | 
          <button onClick={fetchTemplates} style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '11px' }}>
            🔄 Refresh
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {templates.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '60px 20px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '18px', color: '#6c757d', marginBottom: '20px' }}>No templates found</p>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '20px' }}>
              Check browser console for details. Click refresh if you just created a template.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={fetchTemplates}
                style={{
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔄 Refresh List
              </button>
              <button 
                onClick={createNewTemplate}
                style={{
                  padding: '12px 24px',
                  background: '#dc143c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                + Create Template
              </button>
            </div>
          </div>
        ) : (
          templates.map(template => (
            <div 
              key={template._id} 
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e9ecef',
                position: 'relative',
                zIndex: 1
              }}
            >
              <h3 style={{ marginBottom: '8px', color: '#495057' }}>{template.name}</h3>
              <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    loadTemplate(template)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#dc143c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    position: 'relative',
                    zIndex: 10,
                    pointerEvents: 'auto'
                  }}
                >
                  Edit
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Delete button clicked for template:', template._id)
                    deleteTemplate(template._id)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    position: 'relative',
                    zIndex: 10,
                    pointerEvents: 'auto'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ReportTemplateBuilder


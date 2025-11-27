import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import '../../styles/AdminCss/reports.css'

const ReportGenerator = () => {
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState([])
  const [showPreview, setShowPreview] = useState(false)

  const getAuthHeaders = () => {
    const raw = localStorage.getItem('admin_token')
    const token =
      raw && raw !== 'null' && raw !== 'undefined' && raw.includes('.') ? raw : null
    return token
      ? { Authorization: `Bearer ${token}` }
      : {}
  }

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    status: '',
    department: '',
    school: '',
    grade: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t._id === selectedTemplateId)
      setSelectedTemplate(template)
    } else {
      setSelectedTemplate(null)
    }
  }, [selectedTemplateId, templates])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/report-templates', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
        if (data.templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data.templates[0]._id)
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to load templates')
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const previewReport = async () => {
    if (!selectedTemplateId) {
      setError('Please select a template')
      return
    }

    setPreviewLoading(true)
    setError('')

    try {
      const storedUser = localStorage.getItem('admin_user')
      if (!storedUser) {
        setError('Please log in')
        return
      }

      const userData = JSON.parse(storedUser)
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          adminId: userData.id,
          startDate: filters.startDate,
          endDate: filters.endDate,
          filters: {
            type: filters.type || undefined,
            status: filters.status || undefined,
            department: filters.department || undefined,
            school: filters.school || undefined,
            grade: filters.grade || undefined
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data.data || [])
        setShowPreview(true)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to preview data')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const generatePDF = async () => {
    if (!selectedTemplateId) {
      setError('Please select a template')
      return
    }

    setLoading(true)
    setError('')

    try {
      const storedUser = localStorage.getItem('admin_user')
      if (!storedUser) {
        setError('Please log in')
        return
      }

      const userData = JSON.parse(storedUser)
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          adminId: userData.id,
          templateId: selectedTemplateId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          filters: {
            type: filters.type || undefined,
            status: filters.status || undefined,
            department: filters.department || undefined,
            school: filters.school || undefined,
            grade: filters.grade || undefined
          }
        })
      })

      if (response.ok) {
        // Get PDF blob
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Report-${selectedTemplate?.name || 'Report'}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json().catch(() => ({ message: 'Failed to generate PDF' }))
        setError(data.message || 'Failed to generate PDF')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exportTemplateExcel = () => {
    if (!selectedTemplate || previewData.length === 0) {
      setError('No data to export. Please preview data first.')
      return
    }

    try {
      setExportLoading(true)
      const visible = selectedTemplate.layout?.visibleColumns || {}

      const rows = previewData.map(record => {
        const checkIn = new Date(record.checkInTime)
        const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
        const idOrContact = (record.idNumber || '').toString().trim() || '-'
        const durationMins = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
        const durationStr = durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : '-'

        const row = {}
        if (visible.date !== false) row.Date = checkIn.toLocaleDateString()
        if (visible.name !== false) row['Visitor Name'] = record.name || 'Unknown'
        if (visible.idOrContact !== false) row['ID / Contact'] = idOrContact
        if (visible.grade !== false) {
          row['Grade/Level'] =
            record.type === 'student'
              ? 'Student'
              : record.type === 'staff'
              ? 'Staff'
              : record.type === 'visitor'
              ? 'Visitor'
              : 'Unknown'
        }
        if (visible.timeIn !== false) row['Time In'] = checkIn.toLocaleTimeString()
        if (visible.timeOut !== false) row['Time Out'] = checkOut ? checkOut.toLocaleTimeString() : '-'
        if (visible.purpose !== false) {
          row.Purpose = record.notes || (record.status === 'checked-in' ? 'Visit' : 'Completed Visit')
        }
        if (visible.duration !== false) row.Duration = durationStr
        if (visible.status !== false) {
          row.Status =
            record.status === 'checked-in'
              ? 'Checked In'
              : record.status === 'checked-out'
              ? 'Checked Out'
              : 'Unknown'
        }
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Report')

      const fileName = `Template-${selectedTemplate.name || 'Report'}-${new Date()
        .toISOString()
        .split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (err) {
      console.error('Error exporting template Excel:', err)
      setError(`Error exporting Excel: ${err.message}`)
    } finally {
      setExportLoading(false)
    }
  }

  const exportTemplateCSV = () => {
    if (!selectedTemplate || previewData.length === 0) {
      setError('No data to export. Please preview data first.')
      return
    }

    try {
      setExportLoading(true)
      const visible = selectedTemplate.layout?.visibleColumns || {}

      const headerParts = []
      if (visible.date !== false) headerParts.push('Date')
      if (visible.name !== false) headerParts.push('Visitor Name')
      if (visible.idOrContact !== false) headerParts.push('ID / Contact')
      if (visible.grade !== false) headerParts.push('Grade/Level')
      if (visible.timeIn !== false) headerParts.push('Time In')
      if (visible.timeOut !== false) headerParts.push('Time Out')
      if (visible.purpose !== false) headerParts.push('Purpose')
      if (visible.duration !== false) headerParts.push('Duration')
      if (visible.status !== false) headerParts.push('Status')

      const escapeCSV = (str) => {
        if (str == null) return ''
        const val = String(str)
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }

      let csvContent = headerParts.join(',') + '\n'

      previewData.forEach((record) => {
        const checkIn = new Date(record.checkInTime)
        const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
        const idOrContact = (record.idNumber || '').toString().trim() || '-'
        const durationMins = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
        const durationStr = durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : '-'

        const row = []
        if (visible.date !== false) row.push(escapeCSV(checkIn.toLocaleDateString()))
        if (visible.name !== false) row.push(escapeCSV(record.name || 'Unknown'))
        if (visible.idOrContact !== false) row.push(escapeCSV(idOrContact))
        if (visible.grade !== false) {
          const typeStr =
            record.type === 'student'
              ? 'Student'
              : record.type === 'staff'
              ? 'Staff'
              : record.type === 'visitor'
              ? 'Visitor'
              : 'Unknown'
          row.push(escapeCSV(typeStr))
        }
        if (visible.timeIn !== false) row.push(escapeCSV(checkIn.toLocaleTimeString()))
        if (visible.timeOut !== false)
          row.push(escapeCSV(checkOut ? checkOut.toLocaleTimeString() : '-'))
        if (visible.purpose !== false) {
          row.push(escapeCSV(record.notes || (record.status === 'checked-in' ? 'Visit' : 'Completed Visit')))
        }
        if (visible.duration !== false) row.push(escapeCSV(durationStr))
        if (visible.status !== false) {
          const statusStr =
            record.status === 'checked-in'
              ? 'Checked In'
              : record.status === 'checked-out'
              ? 'Checked Out'
              : 'Unknown'
          row.push(escapeCSV(statusStr))
        }

        csvContent += row.join(',') + '\n'
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Template-${selectedTemplate.name || 'Report'}-${new Date()
        .toISOString()
        .split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting template CSV:', err)
      setError(`Error exporting CSV: ${err.message}`)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div style={{ padding: '0' }}>

      {error && (
        <div style={{ 
          padding: '12px', 
          background: '#fee', 
          color: '#c33', 
          borderRadius: '8px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Column - Template Selection & Filters */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>Template & Filters</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">-- Select Template --</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div style={{ 
              padding: '12px', 
              background: '#f8f9fa', 
              borderRadius: '6px', 
              marginBottom: '20px',
              fontSize: '12px',
              color: '#6c757d'
            }}>
              <strong>Template:</strong> {selectedTemplate.name}<br/>
              <strong>Orientation:</strong> {selectedTemplate.layout.orientation}<br/>
              <strong>Title:</strong> {selectedTemplate.layout.title}<br/>
              {selectedTemplate.layout.headerTitle && (
                <>
                  <strong>Header:</strong> {selectedTemplate.layout.headerTitle}<br/>
                </>
              )}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Date Range</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Filters</label>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Visitor Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="visitor">Visitor</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Status</option>
                <option value="checked-in">Checked In</option>
                <option value="checked-out">Checked Out</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Department</label>
              <input
                type="text"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                placeholder="Filter by department"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>School</label>
              <input
                type="text"
                value={filters.school}
                onChange={(e) => handleFilterChange('school', e.target.value)}
                placeholder="Filter by school"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Grade/Level</label>
              <input
                type="text"
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                placeholder="Filter by grade"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={previewReport}
              disabled={previewLoading || !selectedTemplateId}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: previewLoading || !selectedTemplateId ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: previewLoading || !selectedTemplateId ? 0.6 : 1,
                marginBottom: '12px'
              }}
            >
              {previewLoading ? 'Loading...' : 'Preview Data'}
            </button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                onClick={generatePDF}
                disabled={loading || !selectedTemplateId || !showPreview}
                style={{
                  padding: '10px 12px',
                  background: loading || !selectedTemplateId || !showPreview ? '#9ca3af' : '#dc143c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || !selectedTemplateId || !showPreview ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: loading || !selectedTemplateId || !showPreview ? 0.6 : 1
                }}
              >
                {loading ? '⏳' : '📄'} PDF
              </button>
              <button
                onClick={exportTemplateExcel}
                disabled={exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0}
                style={{
                  padding: '10px 12px',
                  background: exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0 ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0 ? 0.6 : 1
                }}
              >
                {exportLoading ? '⏳' : '📊'} Excel
              </button>
              <button
                onClick={exportTemplateCSV}
                disabled={exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0}
                style={{
                  padding: '10px 12px',
                  background: exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0 ? '#9ca3af' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: exportLoading || !selectedTemplateId || !showPreview || previewData.length === 0 ? 0.6 : 1
                }}
              >
                {exportLoading ? '⏳' : '📈'} CSV
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>Data Preview</h3>
          
          {!showPreview ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#6c757d'
            }}>
              <p>Click "Preview Data" to see the filtered results</p>
            </div>
          ) : previewData.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#6c757d'
            }}>
              <p>No data found for the selected filters</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>ID / Contact</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Time In</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Time Out</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((record, index) => {
                    const checkIn = new Date(record.checkInTime)
                    const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
                    const idOrContact = (record.idNumber || '').toString().trim() || '-'
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px' }}>{checkIn.toLocaleDateString()}</td>
                        <td style={{ padding: '8px' }}>{record.name}</td>
                        <td style={{ padding: '8px' }}>{idOrContact}</td>
                        <td style={{ padding: '8px' }}>{record.type}</td>
                        <td style={{ padding: '8px' }}>{checkIn.toLocaleTimeString()}</td>
                        <td style={{ padding: '8px' }}>{checkOut ? checkOut.toLocaleTimeString() : '-'}</td>
                        <td style={{ padding: '8px' }}>{record.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
                  Showing first 10 of {previewData.length} records
                </p>
              )}
              
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9ecef', fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
                📊 Total Records: {previewData.length} • Last Updated: {new Date().toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportGenerator


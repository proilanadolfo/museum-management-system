import React, { useState, useEffect, useCallback } from 'react'
import '../../styles/SuperCss/SuperManage.css'

const SuperAuditLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    userRole: '',
    startDate: '',
    endDate: ''
  })
  const [stats, setStats] = useState(null)
  const [showStats, setShowStats] = useState(false)

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const raw = localStorage.getItem('superadmin_token')
    const token = raw && raw !== 'null' && raw !== 'undefined' ? raw : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Handle 401 errors - redirect to login
  const handleAuthError = useCallback(() => {
    localStorage.removeItem('superadmin_token')
    localStorage.removeItem('superadmin_user')
    window.location.href = '/login'
  }, [])

  const fetchAuditLogs = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    
    try {
      const token = getAuthHeaders().Authorization
      if (!token) {
        // No token - don't fetch, but don't redirect (might be timing issue)
        // Only redirect if we actually get 401 from API
        console.log('No token available, skipping fetch')
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.action) params.append('action', filters.action)
      if (filters.resource) params.append('resource', filters.resource)
      if (filters.userRole) params.append('userRole', filters.userRole)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      // Only logout if we have a token but got 401 (means token is invalid/expired)
      // BUT: Don't force logout - might be temporary issue
      if (response.status === 401 && token) {
        setError('Unauthorized: Please check your session or try refreshing the page')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.data?.docs || data.logs || [])
      setPagination(data.data?.pagination || data.pagination || pagination)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, handleAuthError])

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/audit-logs/stats?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [filters.startDate, filters.endDate])

  useEffect(() => {
    fetchAuditLogs(1)
  }, [filters])

  useEffect(() => {
    if (showStats) {
      fetchStats()
    }
  }, [showStats, filters.startDate, filters.endDate])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage) => {
    fetchAuditLogs(newPage)
  }

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      userRole: '',
      startDate: '',
      endDate: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'LOGIN':
        return 'badge-success'
      case 'CREATE':
        return 'badge-primary'
      case 'UPDATE':
        return 'badge-warning'
      case 'DELETE':
        return 'badge-danger'
      default:
        return 'badge-secondary'
    }
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Audit Logs</h2>
          <p className="dash-subtitle">View system activity and user actions</p>
        </div>
        <div className="manage-header-actions">
          <button
            type="button"
            className="add-admin-btn"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '📊 Hide Statistics' : '📊 Show Statistics'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Panel */}
      {showStats && stats && (
        <div className="audit-stats-panel" style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Total Logs:</strong> {stats.totalLogs.toLocaleString()}
            </div>
            <div>
              <strong>Recent Logins (7 days):</strong> {stats.recentLogins?.length || 0}
            </div>
          </div>
          
          {stats.actionStats && stats.actionStats.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong>Actions:</strong>
              <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                {stats.actionStats.map((stat, idx) => (
                  <li key={idx}>{stat._id}: {stat.count}</li>
                ))}
              </ul>
            </div>
          )}

          {stats.resourceStats && stats.resourceStats.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong>Resources:</strong>
              <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                {stats.resourceStats.map((stat, idx) => (
                  <li key={idx}>{stat._id}: {stat.count}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="audit-filters" style={{
        background: '#fff',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #dee2e6',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Action</label>
          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="PASSWORD_RESET">Password Reset</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Resource</label>
          <select
            name="resource"
            value={filters.resource}
            onChange={handleFilterChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="">All Resources</option>
            <option value="AUTHENTICATION">Authentication</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="BOOKING">Booking</option>
            <option value="GALLERY">Gallery</option>
            <option value="ANNOUNCEMENT">Announcement</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>User Role</label>
          <select
            name="userRole"
            value={filters.userRole}
            onChange={handleFilterChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Start Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>End Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="admin-table">
        <div className="table-header">
          <span>Timestamp</span>
          <span>User</span>
          <span>Role</span>
          <span>Action</span>
          <span>Resource</span>
          <span>IP Address</span>
        </div>

        {loading ? (
          <div className="table-row">
            <span className="empty-message">Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="table-row">
            <span className="empty-message">No audit logs found</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="table-row">
              <span className="admin-created">{formatDate(log.timestamp)}</span>
              <span className="admin-username">{log.username || log.userId || 'N/A'}</span>
              <span className={`role-badge ${log.userRole === 'superadmin' ? 'role-superadmin' : 'role-admin'}`}>
                {log.userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
              <span className={`status-badge ${getActionBadgeClass(log.action)}`}>
                {log.action}
              </span>
              <span className="admin-email">{log.resource}</span>
              <span className="admin-email" title={log.userAgent || 'N/A'}>
                {log.ipAddress || 'N/A'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '20px',
          padding: '15px'
        }}>
          <button
            type="button"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev || loading}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              background: pagination.hasPrev ? '#fff' : '#f5f5f5',
              cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            Previous
          </button>
          
          <span style={{ fontSize: '14px' }}>
            Page {pagination.page} of {pagination.pages} ({pagination.total.toLocaleString()} total)
          </span>
          
          <button
            type="button"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext || loading}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              background: pagination.hasNext ? '#fff' : '#f5f5f5',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default SuperAuditLogs


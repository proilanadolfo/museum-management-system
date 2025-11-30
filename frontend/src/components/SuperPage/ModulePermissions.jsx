import React, { useState, useEffect } from 'react'
import '../../styles/SuperCss/SuperDashboard.css'

const MODULE_NAMES = {
  attendance: 'Attendance Records',
  gallery: 'Gallery',
  reports: 'Reports',
  settings: 'Settings'
}

const MODULE_DESCRIPTIONS = {
  attendance: 'Manage visitor attendance and check-in records',
  gallery: 'Manage museum gallery items and collections',
  reports: 'Generate and view system reports',
  settings: 'Access system configuration settings'
}

export default function ModulePermissions() {
  const [admins, setAdmins] = useState([])
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const raw = localStorage.getItem('superadmin_token')
    const token = raw && raw !== 'null' && raw !== 'undefined' ? raw : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Handle 401 errors - redirect to login
  const handleAuthError = () => {
    localStorage.removeItem('superadmin_token')
    localStorage.removeItem('superadmin_user')
    window.location.href = '/login'
  }

  // Fetch all admins
  useEffect(() => {
    fetchAdmins()
  }, [])

  // Fetch permissions when admin is selected
  useEffect(() => {
    if (selectedAdmin && (selectedAdmin.id || selectedAdmin._id)) {
      const adminId = selectedAdmin.id || selectedAdmin._id
      fetchAdminPermissions(adminId)
    } else {
      setPermissions({})
    }
  }, [selectedAdmin])

  const fetchAdmins = async () => {
    try {
      const token = getAuthHeaders().Authorization
      if (!token) {
        // No token - don't fetch, but don't redirect (might be timing issue)
        // Only redirect if we actually get 401 from API
        console.log('No token available, skipping fetch')
        setLoading(false)
        return
      }

      setLoading(true)
      const response = await fetch('/api/admin/list', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      // Only logout if we have a token but got 401 (means token is invalid/expired)
      // BUT: Don't logout immediately - might be a temporary issue or module permission
      // Only logout if we get 401 on multiple critical endpoints
      if (response.status === 401 && token) {
        // For now, just show error - don't force logout
        // User can manually logout if needed
        setError('Unauthorized: Please check your permissions or try refreshing the page')
        setLoading(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setAdmins(data.admins || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.message || 'Failed to fetch admins')
      }
    } catch (err) {
      console.error('Error fetching admins:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminPermissions = async (adminId) => {
    try {
      const token = getAuthHeaders().Authorization
      if (!token) {
        // No token - don't fetch, but don't logout (component might be loading)
        setError('Authentication required')
        return
      }

      setLoading(true)
      // Ensure adminId is a string
      const adminIdStr = String(adminId).trim()
      console.log('Fetching permissions for adminId:', adminIdStr)
      
      const response = await fetch(`/api/module-permissions/admin/${adminIdStr}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      // Only logout if we have a token but got 401 (means token is invalid/expired)
      // BUT: Don't logout immediately - might be a temporary issue
      if (response.status === 401 && token) {
        setError('Unauthorized: Please check your permissions or try refreshing the page')
        setLoading(false)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || {})
      } else {
        setError('Failed to fetch permissions')
      }
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = async (moduleName, enabled) => {
    if (!selectedAdmin) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const adminId = selectedAdmin.id || selectedAdmin._id
      const adminIdStr = String(adminId).trim()
      console.log('Updating permission:', { adminId: adminIdStr, moduleName, enabled })

      const response = await fetch(
        `/api/module-permissions/admin/${adminIdStr}/module/${moduleName}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ enabled })
        }
      )

      if (response.status === 401) {
        handleAuthError()
        return
      }

      if (response.ok) {
        const data = await response.json()
        setPermissions(prev => ({
          ...prev,
          [moduleName]: {
            ...prev[moduleName],
            enabled: data.permission.enabled
          }
        }))
        setSuccess(`Module ${moduleName} ${enabled ? 'enabled' : 'disabled'} successfully`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update permission' }))
        setError(errorData.message || 'Failed to update permission')
      }
    } catch (err) {
      console.error('Error updating permission:', err)
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkUpdate = async (newPermissions) => {
    if (!selectedAdmin) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Convert to simple object with moduleName -> enabled
      const bulkData = {}
      Object.keys(MODULE_NAMES).forEach(moduleName => {
        bulkData[moduleName] = newPermissions[moduleName]?.enabled ?? true
      })

      const adminId = selectedAdmin.id || selectedAdmin._id
      const adminIdStr = String(adminId).trim()
      console.log('Bulk updating permissions for adminId:', adminIdStr, 'permissions:', bulkData)

      const response = await fetch(
        `/api/module-permissions/admin/${adminIdStr}/bulk`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ permissions: bulkData })
        }
      )

      if (response.status === 401) {
        handleAuthError()
        return
      }

      if (response.ok) {
        const data = await response.json()
        // Update local state
        const updatedPermissions = {}
        data.permissions.forEach(perm => {
          updatedPermissions[perm.moduleName] = {
            enabled: perm.enabled,
            enabledBy: null,
            enabledAt: null,
            disabledBy: null,
            disabledAt: null
          }
        })
        setPermissions(updatedPermissions)
        setSuccess('All permissions updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update permissions' }))
        setError(errorData.message || 'Failed to update permissions')
      }
    } catch (err) {
      console.error('Error bulk updating permissions:', err)
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEnableAll = () => {
    const allEnabled = {}
    Object.keys(MODULE_NAMES).forEach(moduleName => {
      allEnabled[moduleName] = { enabled: true }
    })
    handleBulkUpdate(allEnabled)
  }

  const handleDisableAll = () => {
    const allDisabled = {}
    Object.keys(MODULE_NAMES).forEach(moduleName => {
      allDisabled[moduleName] = { enabled: false }
    })
    handleBulkUpdate(allDisabled)
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Module Permissions</h2>
          <p className="dash-subtitle">Control which modules each admin can access</p>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" style={{ marginBottom: '16px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Admin List */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: 'fit-content',
            maxHeight: '600px',
            overflowY: 'auto'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Select Admin
          </h3>
          {loading && !selectedAdmin ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              Loading admins...
            </div>
          ) : admins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              No admins found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {admins.map((admin) => {
                const adminId = admin._id || admin.id
                const activeId = selectedAdmin ? (selectedAdmin.id || selectedAdmin._id) : null
                const isActive = activeId === adminId

                return (
                  <button
                    key={adminId}
                    onClick={() => setSelectedAdmin({ ...admin, id: adminId })}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: isActive ? '2px solid #dc143c' : '1px solid #e5e7eb',
                      background: isActive ? '#fef2f2' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {admin.name || admin.username || 'Admin'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {admin.email}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Permissions Panel */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {!selectedAdmin ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#6b7280'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>
                Select an admin to manage their module permissions
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    {selectedAdmin.name || selectedAdmin.username || 'Admin'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                    {selectedAdmin.email}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleEnableAll}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #10b981',
                      background: '#fff',
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    Enable All
                  </button>
                  <button
                    onClick={handleDisableAll}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #ef4444',
                      background: '#fff',
                      color: '#ef4444',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    Disable All
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading permissions...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(MODULE_NAMES).map(([moduleName, moduleLabel]) => {
                    const permission = permissions[moduleName]
                    const isEnabled = permission?.enabled !== undefined ? permission.enabled : true

                    return (
                      <div
                        key={moduleName}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          background: isEnabled ? '#f0fdf4' : '#fef2f2'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                            {moduleLabel}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {MODULE_DESCRIPTIONS[moduleName]}
                          </div>
                        </div>
                        <label
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '52px',
                            height: '28px',
                            cursor: saving ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleTogglePermission(moduleName, e.target.checked)}
                            disabled={saving}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: isEnabled ? '#10b981' : '#d1d5db',
                              borderRadius: '28px',
                              transition: 'background 0.3s',
                              opacity: saving ? 0.6 : 1
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: '2px',
                                left: isEnabled ? '26px' : '2px',
                                width: '24px',
                                height: '24px',
                                background: '#fff',
                                borderRadius: '50%',
                                transition: 'left 0.3s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            />
                          </span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


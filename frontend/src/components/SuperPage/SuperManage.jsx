import React, { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import '../../styles/SuperCss/SuperManage.css'

const SuperManage = () => {
  const [adminList, setAdminList] = useState([])
  const [superAdminList, setSuperAdminList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState({
    username: '',
    email: '',
    role: 'admin' // 'admin' or 'superadmin'
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editingUserRole, setEditingUserRole] = useState('admin') // 'admin' or 'superadmin'
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editVersion, setEditVersion] = useState(null)

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

  const fetchAdminList = useCallback(async () => {
    try {
      const token = getAuthHeaders().Authorization
      if (!token) {
        // No token - don't fetch, but don't redirect (might be timing issue)
        // Only redirect if we actually get 401 from API
        console.log('No token available, skipping fetch')
        return
      }

      const [adminResponse, superAdminResponse] = await Promise.all([
        fetch('/api/admin/list', {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }),
        fetch('/api/superadmin/list', {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        })
      ])
      
      // Only logout if BOTH return 401 (strong signal token is invalid)
      // BUT: Even then, don't force logout - might be temporary network issue
      // Let user continue working and manually logout if needed
      if (adminResponse.status === 401 && superAdminResponse.status === 401) {
        setError('Unauthorized: Please check your session or try refreshing the page')
        return
      }
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json()
        setAdminList(adminData.admins || [])
      } else if (adminResponse.status !== 401) {
        // Only show error if it's not a 401 (401 is handled above)
        const errorData = await adminResponse.json().catch(() => ({}))
        setError(errorData.message || 'Failed to fetch admin list')
        console.error('Failed to fetch admin list:', adminResponse.status, adminResponse.statusText)
      }
      
      if (superAdminResponse.ok) {
        const superAdminData = await superAdminResponse.json()
        setSuperAdminList(superAdminData.superAdmins || [])
      } else if (superAdminResponse.status !== 401) {
        // Only show error if it's not a 401 (401 is handled above)
        const errorData = await superAdminResponse.json().catch(() => ({}))
        setError(errorData.message || 'Failed to fetch superadmin list')
        console.error('Failed to fetch superadmin list:', superAdminResponse.status, superAdminResponse.statusText)
      }
    } catch (error) {
      console.log('Error fetching user lists:', error)
      setError('Network error. Please try again.')
    }
  }, [handleAuthError])

  useEffect(() => {
    fetchAdminList()
    
    // Listen for admin login events to refresh the admin list
    const handleAdminLogin = () => {
      fetchAdminList()
    }
    window.addEventListener('adminLoggedIn', handleAdminLogin)
    
    const handleStorageChange = (e) => {
      if (e.key === 'admin_user' && e.newValue) {
        fetchAdminList()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('adminLoggedIn', handleAdminLogin)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [fetchAdminList])

  const handleEditUser = (user, role) => {
    const timestamp = user?.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()
    setEditVersion(timestamp)
    setEditingUser(user)
    setEditingUserRole(role)
    setEditFormData({
      username: user.username || '',
      email: user.email || ''
    })
    setShowEditModal(true)
    setEditError('')
    setEditSuccess('')
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError('')
    setAddSuccess('')

    try {
      const payload = {
        username: addFormData.username?.trim(),
        email: addFormData.email?.trim()
      }

      if (!payload.username || !payload.email) {
        const message = 'Please fill out username and email'
        setAddError(message)
        setAddLoading(false)

        Swal.fire({
          title: 'Missing Fields',
          text: message,
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        return
      }

      const endpoint = addFormData.role === 'superadmin' ? '/api/superadmin/create' : '/api/admin/create'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      })

      if (res.status === 401) {
        handleAuthError()
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = data.message || 'Failed to create administrator'
        setAddError(message)
        setAddLoading(false)

        Swal.fire({
          title: 'Create Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        return
      }

      const roleLabel = addFormData.role === 'superadmin' ? 'Super Administrator' : 'Administrator'
      const successMessage = `${roleLabel} created successfully! Password has been generated and sent to their email.`
      setAddSuccess(successMessage)
      await fetchAdminList()

      Swal.fire({
        title: `${roleLabel} Created`,
        text: successMessage,
        icon: 'success',
        confirmButtonColor: '#dc143c'
      })

      setTimeout(() => {
        setShowAddModal(false)
        setAddSuccess('')
        setAddFormData({ username: '', email: '', role: 'admin' })
      }, 1500)
    } catch (err) {
      const message = 'Network error. Please try again.'
      setAddError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setAddLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingUser?._id) {
      setEditError('No user selected.')
      return
    }

    setEditLoading(true)
    setEditError('')
    setEditSuccess('')

    try {
      const updateData = {
        username: editFormData.username,
        email: editFormData.email
      }
      
      // Add clientTimestamp only for admin updates
      if (editingUserRole === 'admin') {
        updateData.clientTimestamp = editVersion ?? 0
      }
      
      const endpoint = editingUserRole === 'superadmin' 
        ? `/api/superadmin/update/${editingUser._id}`
        : `/api/admin/update/${editingUser._id}`
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updateData)
      })

      if (response.status === 401) {
        handleAuthError()
        return
      }

      const data = await response.json()

      if (response.status === 409) {
        const message = data.message || 'Transaction aborted — outdated data. Please refresh.'
        setEditError(message)
        Swal.fire({
          title: 'Outdated Data',
          text: message,
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        if (data.currentTimestamp) {
          setEditVersion(data.currentTimestamp)
        }
        await fetchAdminList()
        setEditLoading(false)
        return
      }

      if (response.ok) {
        const roleLabel = editingUserRole === 'superadmin' ? 'Super Administrator' : 'Administrator'
        const successMessage = `${roleLabel} updated successfully!`
        setEditSuccess(successMessage)
        if (data.newTimestamp) {
          setEditVersion(data.newTimestamp)
        }
        await fetchAdminList()

        Swal.fire({
          title: `${roleLabel} Updated`,
          text: successMessage,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        
        setTimeout(() => {
          setShowEditModal(false)
          setEditSuccess('')
          setEditingUser(null)
          setEditingUserRole('admin')
          setEditFormData({ username: '', email: '' })
          setEditVersion(null)
        }, 1000)
      } else {
        const message = data.message || 'Failed to update administrator'
        setEditError(message)

        Swal.fire({
          title: 'Update Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (err) {
      console.error('Error updating admin:', err)
      const message = 'Network error. Please try again.'
      setEditError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteUser = async (userId, role) => {
    const roleLabel = role === 'superadmin' ? 'Super Administrator' : 'Administrator'
    
    // Ensure userId is properly formatted as string
    const userIdStr = String(userId || '').trim()
    if (!userIdStr || userIdStr === 'undefined' || userIdStr === 'null') {
      Swal.fire({
        title: 'Error',
        text: 'User ID is missing. Cannot delete user.',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
      return
    }
    
    console.log('Deleting user:', { userId: userIdStr, role, originalUserId: userId, userIdType: typeof userId })
    
    const confirmResult = await Swal.fire({
      title: `Delete ${roleLabel}?`,
      text: `This will permanently delete the ${roleLabel.toLowerCase()} account. This action cannot be undone. Continue?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc143c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    })

    if (!confirmResult.isConfirmed) {
      return
    }

    setEditLoading(true)
    setEditError('')
    setEditSuccess('')

    try {
      const endpoint = role === 'superadmin' 
        ? `/api/superadmin/delete/${userIdStr}`
        : `/api/admin/delete/${userIdStr}`
      
      console.log('Delete request to:', endpoint)
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      if (response.status === 401) {
        handleAuthError()
        return
      }

      const data = await response.json()

      if (response.ok) {
        const successMessage = `${roleLabel} deleted successfully!`
        setEditSuccess(successMessage)
        await fetchAdminList()

        Swal.fire({
          title: 'Deleted',
          text: successMessage,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        
        setTimeout(() => {
          setEditSuccess('')
        }, 1000)
      } else {
        const message = data.message || 'Failed to delete administrator'
        setEditError(message)

        Swal.fire({
          title: 'Delete Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (err) {
      console.error('Error deleting admin:', err)
      const message = 'Network error. Please try again.'
      setEditError(message)

      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Manage Administrators</h2>
          <p className="dash-subtitle">Oversee administrator accounts and permissions</p>
        </div>
        <div className="manage-header-actions">
          <button 
            type="button"
            className="add-admin-btn" 
            onClick={(e) => {
              console.log('Add button clicked!')
              e.preventDefault()
              e.stopPropagation()
              console.log('Before setShowAddModal, current state:', showAddModal)
              setAddError('')
              setAddSuccess('')
              setAddFormData({ username: '', email: '', role: 'admin' })
              setShowAddModal(true)
              console.log('After setShowAddModal(true)')
              setTimeout(() => {
                console.log('Modal state after timeout:', showAddModal)
              }, 100)
            }}
            onMouseDown={(e) => {
              console.log('Add button mouse down!')
              e.preventDefault()
              e.stopPropagation()
            }}
            style={{ position: 'relative', zIndex: 9999 }}
          >
            + Add Administrator
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="admin-table">
        <div className="table-header">
          <span>Role</span>
          <span>Username</span>
          <span>Email</span>
          <span>Created</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {/* Display Super Admins first */}
        {superAdminList.map((superAdmin) => (
          <div key={superAdmin._id} className="table-row">
            <span className="role-badge role-superadmin">Super Admin</span>
            <span className="admin-username">{superAdmin.username}</span>
            <span className="admin-email" title={superAdmin.email}>
              {superAdmin.email.length > 25 ? superAdmin.email.substring(0, 25) + '...' : superAdmin.email}
            </span>
            <span className="admin-created">{new Date(superAdmin.createdAt).toLocaleDateString()}</span>
            <span className="status-badge status-active">Active</span>
            <span className="actions">
              <button 
                type="button"
                className="edit-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEditUser(superAdmin, 'superadmin')
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                disabled={editLoading}
                style={{ position: 'relative', zIndex: 9999 }}
              >
                ✏️ Edit
              </button>
              <button 
                type="button"
                className="delete-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  handleDeleteUser(superAdmin._id || superAdmin.id, 'superadmin')
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                disabled={editLoading}
                style={{ position: 'relative', zIndex: 9999 }}
              >
                🗑️ Delete
              </button>
            </span>
          </div>
        ))}
        {/* Display Admins */}
        {adminList.map((admin) => (
          <div key={admin._id} className="table-row">
            <span className="role-badge role-admin">Admin</span>
            <span className="admin-username">{admin.username}</span>
            <span className="admin-email" title={admin.email}>
              {admin.email.length > 25 ? admin.email.substring(0, 25) + '...' : admin.email}
            </span>
            <span className="admin-created">{new Date(admin.createdAt).toLocaleDateString()}</span>
            <span className={`status-badge ${admin.status === 'active' ? 'status-active' : 'status-inactive'}`}>
              {admin.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <span className="actions">
              <button 
                type="button"
                className="edit-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEditUser(admin, 'admin')
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                disabled={editLoading}
                style={{ position: 'relative', zIndex: 9999 }}
              >
                ✏️ Edit
              </button>
              <button 
                type="button"
                className="delete-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  handleDeleteUser(admin._id || admin.id, 'admin')
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                disabled={editLoading}
                style={{ position: 'relative', zIndex: 9999 }}
              >
                🗑️ Delete
              </button>
            </span>
          </div>
        ))}
        {adminList.length === 0 && superAdminList.length === 0 && (
          <div className="table-row">
            <span className="empty-message">No users found</span>
          </div>
        )}
      </div>

      {/* Add Administrator Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            zIndex: 999999, 
            pointerEvents: 'auto',
            display: 'flex'
          }}
          onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddModal(false)
            setAddFormData({ username: '', email: '', role: 'admin' })
            setAddError('')
            setAddSuccess('')
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add User</h3>
              <button onClick={() => {
                setShowAddModal(false)
                setAddFormData({ username: '', email: '', role: 'admin' })
                setAddError('')
                setAddSuccess('')
              }}>×</button>
            </div>
            <div className="modal-body">
              {addError && <div className="error-message">{addError}</div>}
              {addSuccess && <div className="success-message">{addSuccess}</div>}
              <form onSubmit={handleAddSubmit}>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={addFormData.role}
                    onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}
                  >
                    <option value="admin">Administrator</option>
                    <option value="superadmin">Super Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={addFormData.username}
                    onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => {
                    setShowAddModal(false)
                    setAddFormData({ username: '', email: '', role: 'admin' })
                    setAddError('')
                    setAddSuccess('')
                  }}>Cancel</button>
                  <button type="submit" disabled={addLoading}>
                    {addLoading ? 'Creating...' : `Create ${addFormData.role === 'superadmin' ? 'Super Administrator' : 'Administrator'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Administrator Modal */}
      {showEditModal && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            zIndex: 999999, 
            pointerEvents: 'auto',
            display: 'flex'
          }}
          onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowEditModal(false)
            setEditFormData({ username: '', email: '' })
            setEditError('')
            setEditSuccess('')
            setEditingUser(null)
            setEditingUserRole('admin')
            setEditVersion(null)
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit {editingUserRole === 'superadmin' ? 'Super Administrator' : 'Administrator'}</h3>
              <button onClick={() => {
                setShowEditModal(false)
                setEditFormData({ username: '', email: '' })
                setEditError('')
                setEditSuccess('')
                setEditingUser(null)
                setEditingUserRole('admin')
                setEditVersion(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              {editError && <div className="error-message">{editError}</div>}
              {editSuccess && <div className="success-message">{editSuccess}</div>}
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => {
                    setShowEditModal(false)
                    setEditFormData({ username: '', email: '' })
                    setEditError('')
                    setEditSuccess('')
                    setEditingUser(null)
                    setEditingUserRole('admin')
                    setEditVersion(null)
                  }}>Cancel</button>
                  <button type="submit" disabled={editLoading}>
                    {editLoading ? 'Updating...' : `Update ${editingUserRole === 'superadmin' ? 'Super Administrator' : 'Administrator'}`}
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

export default SuperManage


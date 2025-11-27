import React, { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import '../../styles/SuperCss/SuperManage.css'

const SuperManage = () => {
  const [adminList, setAdminList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState({
    username: '',
    email: ''
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  const fetchAdminList = useCallback(async () => {
    try {
      const listResponse = await fetch('/api/admin/list')
      if (listResponse.ok) {
        const listData = await listResponse.json()
        setAdminList(listData.admins || [])
      }
    } catch (error) {
      console.log('Error fetching admin list:', error)
    }
  }, [])

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

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin)
    setEditFormData({
      username: admin.username || '',
      email: admin.email || ''
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

      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

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

      const successMessage = 'Administrator created successfully! Password has been generated and sent to their email.'
      setAddSuccess(successMessage)
      await fetchAdminList()

      Swal.fire({
        title: 'Administrator Created',
        text: successMessage,
        icon: 'success',
        confirmButtonColor: '#dc143c'
      })

      setTimeout(() => {
        setShowAddModal(false)
        setAddSuccess('')
        setAddFormData({ username: '', email: '' })
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
    setEditLoading(true)
    setEditError('')
    setEditSuccess('')

    try {
      const adminUpdateData = {
        username: editFormData.username,
        email: editFormData.email
      }
      
      const response = await fetch(`/api/admin/update/${editingAdmin._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminUpdateData)
      })

      const data = await response.json()

      if (response.ok) {
        const successMessage = 'Administrator updated successfully!'
        setEditSuccess(successMessage)
        await fetchAdminList()

        Swal.fire({
          title: 'Administrator Updated',
          text: successMessage,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        
        setTimeout(() => {
          setShowEditModal(false)
          setEditSuccess('')
        }, 2000)
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

  const handleDeleteAdmin = async (adminId) => {
    const confirmResult = await Swal.fire({
      title: 'Delete Administrator?',
      text: 'This will permanently delete the administrator account. This action cannot be undone. Continue?',
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
      const response = await fetch(`/api/admin/delete/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        const successMessage = 'Administrator deleted successfully!'
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
        }, 2000)
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
              setAddFormData({ username: '', email: '' })
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
          <span>Username</span>
          <span>Email</span>
          <span>Created</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {adminList.map((admin) => (
          <div key={admin._id} className="table-row">
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
                  console.log('Edit button clicked!', admin)
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Before handleEditAdmin, showEditModal:', showEditModal)
                  handleEditAdmin(admin)
                  console.log('After handleEditAdmin')
                  setTimeout(() => {
                    console.log('Edit modal state after timeout:', showEditModal)
                  }, 100)
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
                  console.log('Delete button clicked!', admin._id)
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  handleDeleteAdmin(admin._id)
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
        {adminList.length === 0 && (
          <div className="table-row">
            <span className="empty-message">No administrators found</span>
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
            setAddFormData({ username: '', email: '' })
            setAddError('')
            setAddSuccess('')
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Administrator</h3>
              <button onClick={() => {
                setShowAddModal(false)
                setAddFormData({ username: '', email: '' })
                setAddError('')
                setAddSuccess('')
              }}>×</button>
            </div>
            <div className="modal-body">
              {addError && <div className="error-message">{addError}</div>}
              {addSuccess && <div className="success-message">{addSuccess}</div>}
              <form onSubmit={handleAddSubmit}>
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
                    setAddFormData({ username: '', email: '' })
                    setAddError('')
                    setAddSuccess('')
                  }}>Cancel</button>
                  <button type="submit" disabled={addLoading}>
                    {addLoading ? 'Creating...' : 'Create Administrator'}
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
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Administrator</h3>
              <button onClick={() => {
                setShowEditModal(false)
                setEditFormData({ username: '', email: '' })
                setEditError('')
                setEditSuccess('')
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
                  }}>Cancel</button>
                  <button type="submit" disabled={editLoading}>
                    {editLoading ? 'Updating...' : 'Update Administrator'}
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


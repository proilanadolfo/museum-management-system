import React, { useState, useEffect } from 'react'
import '../../styles/AdminCss/attendance.css'

const AdminAttendance = ({ profileData }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [filteredRecords, setFilteredRecords] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const fetchTodayAttendance = async () => {
    setAttendanceLoading(true)
    try {
      const storedUser = localStorage.getItem('admin_user')
      if (!storedUser) {
        setAttendanceRecords([])
        setFilteredRecords([])
        return
      }
      
      const userData = JSON.parse(storedUser)
      const adminId = userData.id

      const response = await fetch(`/api/attendance/today?adminId=${adminId}`)
      if (response.ok) {
        const data = await response.json()
        const records = data.records || []
        const filteredRecords = records.filter(record => record.adminId === adminId)
        setAttendanceRecords(filteredRecords)
        setFilteredRecords(filteredRecords)
      } else {
        setAttendanceRecords([])
        setFilteredRecords([])
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
      setAttendanceRecords([])
      setFilteredRecords([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  useEffect(() => {
    fetchTodayAttendance()
  }, [])

  // Real-time updates via SSE
  useEffect(() => {
    if (!('EventSource' in window)) return

    const storedUser = localStorage.getItem('admin_user')
    if (!storedUser) return

    const userData = JSON.parse(storedUser)
    const adminId = userData.id

    const eventSource = new EventSource('/api/realtime/stream')
    
    eventSource.addEventListener('attendance', (e) => {
      try {
        const eventData = JSON.parse(e.data)
        const { action, attendance } = eventData.data

        // Only process events for this admin's records
        if (attendance.adminId !== adminId && attendance.adminId?.toString() !== adminId) {
          return
        }

        if (action === 'checkedIn') {
          // Add new attendance record
          setAttendanceRecords(prev => [attendance, ...prev])
          setFilteredRecords(prev => {
            const filtered = filterType === 'all' || attendance.type === filterType
            return filtered ? [attendance, ...prev] : prev
          })
        } else if (action === 'checkedOut') {
          // Update existing attendance record
          setAttendanceRecords(prev => prev.map(r => 
            r._id === attendance._id ? { ...r, ...attendance } : r
          ))
          setFilteredRecords(prev => prev.map(r => 
            r._id === attendance._id ? { ...r, ...attendance } : r
          ))
        }
      } catch (error) {
        console.error('Error processing attendance event:', error)
      }
    })

    eventSource.onerror = () => {
      // Browser will auto-reconnect
    }

    return () => {
      eventSource.close()
    }
  }, [filterType])

  // Filter functionality
  useEffect(() => {
    let filtered = [...attendanceRecords]
    
    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.type === filterType)
    }
    
    setFilteredRecords(filtered)
  }, [attendanceRecords, filterType])

  const handleFilterChange = (filterName, value) => {
    if (filterName === 'type') {
      setFilterType(value)
    }
  }

  return (
    <div className="dash-section">
      <h2 className="dash-title">Attendance Records</h2>
      <p className="dash-subtitle">
        View and manage today's attendance records for {profileData?.name || 'Administrator'}
      </p>
      
      {/* Today's Attendance Records */}
      <div className="attendance-records-section">
        <div className="section-header">
          <h3 className="section-title"> Today's Attendance Records</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="refresh-btn"
              onClick={fetchTodayAttendance}
              disabled={attendanceLoading}
            >
              {attendanceLoading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        
        {/* Compact Filter Controls */}
        <div className="compact-filter-section">
          <div className="compact-filter-controls">
            <div className="filter-type-section">
              <label className="compact-filter-label">Filter by Type:</label>
              <div className="compact-filter-buttons">
                <button 
                  className={`compact-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('type', 'all')}
                >
                  <span className="filter-icon">👥</span>
                  <span className="filter-text">All</span>
                  <span className="filter-count">({attendanceRecords.length})</span>
                </button>
                <button 
                  className={`compact-filter-btn ${filterType === 'student' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('type', 'student')}
                >
                  <span className="filter-icon">🎓</span>
                  <span className="filter-text">Students</span>
                  <span className="filter-count">({attendanceRecords.filter(r => r.type === 'student').length})</span>
                </button>
                <button 
                  className={`compact-filter-btn ${filterType === 'staff' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('type', 'staff')}
                >
                  <span className="filter-icon">👨‍💼</span>
                  <span className="filter-text">Staff</span>
                  <span className="filter-count">({attendanceRecords.filter(r => r.type === 'staff').length})</span>
                </button>
                <button 
                  className={`compact-filter-btn ${filterType === 'visitor' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('type', 'visitor')}
                >
                  <span className="filter-icon">👤</span>
                  <span className="filter-text">Visitors</span>
                  <span className="filter-count">({attendanceRecords.filter(r => r.type === 'visitor').length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="attendance-stats">
          <div className="stat-card">
            <div className="stat-value">{filteredRecords.length}</div>
            <div className="stat-label">Filtered Results</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredRecords.filter(r => r.status === 'checked-in').length}</div>
            <div className="stat-label">Currently In</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredRecords.filter(r => r.status === 'checked-out').length}</div>
            <div className="stat-label">Checked Out</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredRecords.filter(r => r.type === 'student').length}</div>
            <div className="stat-label">Students</div>
          </div>
        </div>

        <div className="attendance-table">
          <div className="table-header">
            <span>ID Number</span>
            <span>Name</span>
            <span>Contact Number</span>
            <span>Type</span>
            <span>Check-in Time</span>
            <span>Check-out Time</span>
            <span>Status</span>
            <span>Notes</span>
          </div>
          
          {filteredRecords.length === 0 ? (
            <div className="table-row empty">
              <span colSpan="7" style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                {attendanceRecords.length === 0 
                  ? `No attendance records for today logged by ${profileData?.name || 'this administrator'}. Go to Dashboard to log attendance.`
                  : 'No records match your filter criteria. Try adjusting your filters.'
                }
              </span>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const isVisitor = record.type === 'visitor'
              const contactNumber = isVisitor ? record.idNumber : ''
              const idDisplay = isVisitor ? '—' : record.idNumber

              return (
                <div key={record._id} className="table-row">
                  <span className="id-number">{idDisplay}</span>
                  <span className="visitor-name">{record.name}</span>
                  <span className="contact-number">
                    {contactNumber || '—'}
                  </span>
                  <span className={`type-badge type-${record.type}`}>
                    {record.type === 'student' ? '🎓 Student' : 
                     record.type === 'staff' ? '👨‍💼 Staff' : '👤 Visitor'}
                  </span>
                  <span className={`time-display ${record.status === 'checked-in' ? 'checked-in' : 'checked-out'}`}>
                    {new Date(record.checkInTime).toLocaleTimeString()}
                  </span>
                  <span className={`time-display ${record.checkOutTime ? 'checked-out' : 'checked-in'}`}>
                    {record.checkOutTime 
                      ? new Date(record.checkOutTime).toLocaleTimeString()
                      : 'Still In'
                    }
                  </span>
                  <span className={`status-badge status-${record.status}`}>
                    {record.status === 'checked-in' ? '✅ IN' : '🚪 OUT'}
                  </span>
                  <span className="notes-cell">{record.notes || '-'}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminAttendance


import React, { useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import DashboardLayout from './DashboardLayout'
import AdminSidebar from './AdminSidebar'
import AdminBooking from './AdminBooking'
import AdminAttendance from './AdminAttendance'
import AdminGallery from './AdminGallery'
import AdminReports from './AdminReports'
import AdminSettings from './AdminSettings'
import '../../styles/AdminCss/dashboard-layout.css'
import '../../styles/AdminCss/AdminDashboard.css'
import logo from '../../assets/img/Logo.jpg'

const COLORS = ['#FF8C00', '#DC143C', '#FFD700']

export default function AdminDashboard() {
  const [active, setActive] = useState('dashboard')
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    username: '',
    profilePicture: null
  })
  const [adminUserId, setAdminUserId] = useState(null)
  const [profileLogo, setProfileLogo] = useState(null)
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef(null)
  const notificationsRef = useRef(null)

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasNewNotifications, setHasNewNotifications] = useState(false)

  // Checkout state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState('')
  const [checkoutError, setCheckoutError] = useState('')

  // Add Attendance state
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false)
  const [attendanceForm, setAttendanceForm] = useState({
    name: '',
    idNumber: '',
    contactNumber: '',
    type: 'visitor',
    notes: ''
  })
  const [addAttendanceLoading, setAddAttendanceLoading] = useState(false)
  const [addAttendanceError, setAddAttendanceError] = useState('')
  const [addAttendanceSuccess, setAddAttendanceSuccess] = useState('')

  const getAuthHeaders = () => {
    const raw = localStorage.getItem('admin_token')
    const token = raw && raw !== 'null' && raw !== 'undefined' ? raw : null
    return token
      ? { Authorization: `Bearer ${token}` }
      : {}
  }

  // Load profile data from localStorage
  useEffect(() => {
    const loadProfileFromStorage = () => {
      const storedUser = localStorage.getItem('admin_user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setProfileData({
            name: userData.name || userData.username || '',
            email: userData.email || '',
            username: userData.username || '',
            profilePicture: userData.profilePicture || null
          })
          setAdminUserId(userData.id || userData._id || null)
        } catch (e) {
          console.error('Error parsing user data:', e)
        }
      }
    }

    loadProfileFromStorage()

    const handleStorageChange = (e) => {
      if (e.key === 'admin_user') {
        loadProfileFromStorage()
      }
    }

    const handleProfileUpdated = () => {
      loadProfileFromStorage()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('profileUpdated', handleProfileUpdated)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('profileUpdated', handleProfileUpdated)
    }
  }, [])

  // Fetch profile logo from settings
  useEffect(() => {
    fetchProfileLogo()
    
    // Listen for logo updates via custom event (immediate)
    const handleLogoUpdate = () => {
      fetchProfileLogo()
    }
    window.addEventListener('logoUpdated', handleLogoUpdate)
    
    // Real-time updates via SSE (Server-Sent Events)
    if ('EventSource' in window) {
      const eventSource = new EventSource('/api/realtime/stream')
      
      eventSource.addEventListener('settings', (e) => {
        try {
          const eventData = JSON.parse(e.data)
          const { action, profileLogo } = eventData.data || {}
          
          if (action === 'logo_updated' && profileLogo) {
            // Update logo immediately with cache busting to force reload
            setProfileLogo(`http://localhost:5000/${profileLogo}?t=${Date.now()}`)
          } else if (action === 'logo_deleted') {
            // Reset to default logo
            setProfileLogo(null)
          }
        } catch (error) {
          console.error('Error processing logo update event:', error)
        }
      })
      
      eventSource.onerror = () => {
        // Browser will auto-reconnect
      }
      
      return () => {
        window.removeEventListener('logoUpdated', handleLogoUpdate)
        eventSource.close()
      }
    }
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate)
    }
  }, [])

  const fetchProfileLogo = async () => {
    try {
      const token = getAuthHeaders().Authorization?.replace('Bearer ', '')
      if (!token) return

      const response = await fetch('http://localhost:5000/api/museum-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.profileLogo) {
          setProfileLogo(`http://localhost:5000/${data.data.profileLogo}`)
        } else {
          setProfileLogo(null) // Reset to default if no logo
        }
      }
    } catch (error) {
      console.error('Error fetching profile logo:', error)
    }
  }

  // Use profile logo from settings if available, otherwise use default
  const displayLogo = profileLogo || logo

  // Mobile sidebar handling
  useEffect(() => {
    const isMobile = window.innerWidth <= 900
    if (isMobile) {
      document.body.classList.remove('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-closed')
    }
  }, [])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/dashboard/overview', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (!response.ok) {
        throw new Error('Failed to load dashboard data')
      }
      const data = await response.json()
      if (data.success) {
        setDashboardData(data)
      } else {
        throw new Error(data.message || 'Failed to load dashboard data')
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPendingNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings/pending?limit=5', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (!response.ok) {
        return
      }
      const data = await response.json()
      setNotifications(data.data || [])
    } catch (err) {
      console.error('Fetch pending notifications error:', err)
    }
  }, [])

  useEffect(() => {
    if (active === 'dashboard') {
      fetchDashboardData()
    }
  }, [active, fetchDashboardData])

  useEffect(() => {
    fetchPendingNotifications()
  }, [fetchPendingNotifications])

  useEffect(() => {
    if (showNotifications) {
      setHasNewNotifications(false)
    }
  }, [showNotifications])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search function - searches attendance records
  const handleSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/attendance/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data || [])
        setShowSearchResults(true)
      }
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  useEffect(() => {
    if (!('EventSource' in window)) return

    const eventSource = new EventSource('/api/realtime/stream')

    const handleBookingEvent = (e) => {
      try {
        const eventData = JSON.parse(e.data)
        const { action, booking, bookingId } = eventData.data || {}

        setNotifications((prev) => {
          let updated = [...prev]

          if (action === 'created' && booking?.status === 'pending') {
            updated = [{ ...booking }, ...updated]
          } else if (action === 'updated' && booking) {
            if (booking.status !== 'pending') {
              updated = updated.filter(item => item._id !== booking._id)
            } else {
              const exists = updated.some(item => item._id === booking._id)
              updated = exists
                ? updated.map(item => item._id === booking._id ? { ...item, ...booking } : item)
                : [{ ...booking }, ...updated]
            }
          } else if (action === 'deleted' && bookingId) {
            updated = updated.filter(item => item._id !== bookingId)
          } else {
            return prev
          }

          const deduped = updated.filter((item, index, arr) =>
            item?._id ? arr.findIndex(inner => inner?._id === item._id) === index : true
          )

          return deduped.slice(0, 5)
        })

        if (action === 'created' && booking?.status === 'pending') {
          setHasNewNotifications(true)
        }
      } catch (error) {
        console.error('Error processing booking notification:', error)
      }
    }

    eventSource.addEventListener('booking', handleBookingEvent)

    eventSource.onerror = () => {
      // auto-reconnect handled by browser
    }

    return () => {
      eventSource.removeEventListener('booking', handleBookingEvent)
      eventSource.close()
    }
  }, [])

  // Checkout function
  const handleCheckout = async () => {
    if (!selectedAttendance) return

    setCheckoutLoading(true)
    setCheckoutError('')
    setCheckoutSuccess('')

    try {
      const response = await fetch(`/api/attendance/${selectedAttendance._id}/checkout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      if (response.ok) {
        const successMessage = `${selectedAttendance.name} has been checked out successfully!`
        setCheckoutSuccess(successMessage)

        // SweetAlert success popup for checkout
        Swal.fire({
          title: 'Checkout Successful',
          text: successMessage,
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        // Refresh dashboard data
        fetchDashboardData()
        // Clear search
        setSearchQuery('')
        setSearchResults([])
        setShowSearchResults(false)
        // Close modal after delay
        setTimeout(() => {
          setShowCheckoutModal(false)
          setSelectedAttendance(null)
          setCheckoutSuccess('')
        }, 1500)
      } else {
        const data = await response.json()
        const message = data.message || 'Failed to checkout'
        setCheckoutError(message)

        // SweetAlert error popup for checkout
        Swal.fire({
          title: 'Checkout Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (err) {
      console.error('Checkout error:', err)
      const message = 'Network error. Please try again.'
      setCheckoutError(message)

      // SweetAlert network error popup for checkout
      Swal.fire({
        title: 'Network Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Open checkout modal
  const openCheckoutModal = (attendance) => {
    setSelectedAttendance(attendance)
    setShowCheckoutModal(true)
    setCheckoutError('')
    setCheckoutSuccess('')
    setShowSearchResults(false)
  }

  const handleAttendanceInputChange = (field, value) => {
    if (field === 'contactNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 12)
      setAttendanceForm((prev) => ({
        ...prev,
        contactNumber: digitsOnly
      }))
      return
    }

    if (field === 'idNumber' && (attendanceForm.type === 'student' || attendanceForm.type === 'faculty')) {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
      setAttendanceForm((prev) => ({
        ...prev,
        idNumber: digitsOnly
      }))
      return
    }

    setAttendanceForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddAttendance = async (e) => {
    e.preventDefault()
    setAddAttendanceError('')
    setAddAttendanceSuccess('')

    const trimmedName = attendanceForm.name.trim()

    if (!trimmedName) {
      setAddAttendanceError('Please provide the full name.')
      return
    }

    let normalizedVisitorContact = null

    if (attendanceForm.type === 'visitor') {
      const contactDigits = attendanceForm.contactNumber.trim().replace(/\D/g, '')
      if (!contactDigits) {
        setAddAttendanceError('Please provide a contact number for visitors.')
        return
      }

      if (contactDigits.startsWith('63') && contactDigits.length === 12) {
        normalizedVisitorContact = contactDigits
      } else if (contactDigits.startsWith('09') && contactDigits.length === 11) {
        normalizedVisitorContact = `63${contactDigits.slice(1)}`
      } else {
        setAddAttendanceError('Contact number must start with 63 or 09 and follow PH format (e.g., 639XXXXXXXXX or 09XXXXXXXXX).')
        return
      }
    } else {
      if (attendanceForm.idNumber.length !== 10) {
        setAddAttendanceError('Student and faculty IDs must be exactly 10 digits.')
        return
      }
    }

    setAddAttendanceLoading(true)
    try {
      const normalizedType = attendanceForm.type === 'faculty' ? 'staff' : attendanceForm.type
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          idNumber: attendanceForm.type === 'visitor'
            ? normalizedVisitorContact
            : attendanceForm.idNumber,
          name: trimmedName,
          type: normalizedType,
          notes: attendanceForm.notes,
          contactNumber: attendanceForm.type === 'visitor'
            ? normalizedVisitorContact
            : undefined,
          adminId: adminUserId
        })
      })

      if (response.ok) {
        setAddAttendanceSuccess(`${attendanceForm.name} has been checked in!`)
        setAttendanceForm({
          name: '',
          idNumber: '',
          contactNumber: '',
          type: attendanceForm.type,
          notes: ''
        })
        fetchDashboardData()
        setTimeout(() => {
          setAddAttendanceSuccess('')
        }, 1500)
      } else {
        const data = await response.json()
        setAddAttendanceError(data.message || 'Failed to add attendance.')
      }
    } catch (err) {
      console.error('Add attendance error:', err)
      setAddAttendanceError('Network error. Please try again.')
    } finally {
      setAddAttendanceLoading(false)
    }
  }

  const handleNavigate = (key) => {
    if (key === 'logout') {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.reload()
      return
    }
    setActive(key)
    // Close mobile sidebar on navigation
    if (window.innerWidth <= 900) {
      document.body.classList.remove('sidebar-open')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="overview-loading">
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>Loading dashboard data...</div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="overview-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      )
    }

    if (!dashboardData) {
      return (
        <div className="overview-empty">
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div>No dashboard data available</div>
        </div>
      )
    }

    const { summary, charts, upcomingBookings } = dashboardData

    return (
      <>
        {/* Summary Cards */}
        <div className="summary-card-grid">
          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>👥</div>
            <div>
              <p className="summary-label">Visitors Today</p>
              <p className="summary-value">{summary?.attendance?.totalToday || 0}</p>
              <span className="summary-meta">{summary?.attendance?.checkedIn || 0} currently inside</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>📋</div>
            <div>
              <p className="summary-label">Pending Bookings</p>
              <p className="summary-value">{summary?.bookings?.pending || 0}</p>
              <span className="summary-meta">{summary?.bookings?.total || 0} total requests</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>✅</div>
            <div>
              <p className="summary-label">Confirmed Visits</p>
              <p className="summary-value">{summary?.bookings?.confirmed || 0}</p>
              <span className="summary-meta">{summary?.bookings?.upcoming || 0} upcoming</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>📢</div>
            <div>
              <p className="summary-label">Active Announcements</p>
              <p className="summary-value">{summary?.announcements?.active || 0}</p>
              <span className="summary-meta">{summary?.exhibits?.active || 0} exhibits live</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="chart-grid" style={{ marginTop: '24px' }}>
          {/* Attendance Trend Chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h4>Attendance (Last 7 Days)</h4>
              <span className="chart-meta">Visitors per day</span>
            </div>
            <div style={{ flex: 1, minHeight: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.attendanceTrend || []}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#DC143C" 
                    strokeWidth={2}
                    dot={{ fill: '#DC143C', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Visitor Mix Pie Chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h4>Visitor Mix (Today)</h4>
              <span className="chart-meta">By attendee type</span>
            </div>
            <div style={{ flex: 1, minHeight: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.visitorType || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="type"
                    label={false}
                  >
                    {(charts?.visitorType || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span style={{ color: '#495057', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Booking Status Bar Chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h4>Booking Status</h4>
              <span className="chart-meta">Current requests</span>
            </div>
            <div style={{ flex: 1, minHeight: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.bookingStatus || []}>
                  <XAxis 
                    dataKey="status" 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {(charts?.bookingStatus || []).map((entry, index) => {
                      const colors = { Pending: '#FF8C00', Confirmed: '#22C55E', Cancelled: '#DC143C' }
                      return <Cell key={`cell-${index}`} fill={colors[entry.status] || '#6B7280'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Upcoming Visits Section */}
        <div className="chart-card" style={{ marginTop: '24px' }}>
          <div className="chart-card-header">
            <h4>Upcoming Visits</h4>
            <span className="chart-meta">{upcomingBookings?.length || 0} on the schedule</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', color: '#6b7280', fontWeight: '600' }}>Visitor</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', color: '#6b7280', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', color: '#6b7280', fontWeight: '600' }}>Visitors</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', color: '#6b7280', fontWeight: '600' }}>Purpose</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', color: '#6b7280', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingBookings.map((booking) => (
                    <tr key={booking.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>{booking.fullName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{booking.email}</div>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#374151' }}>{formatDate(booking.visitDate)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', color: '#374151' }}>{booking.numberOfVisitors}</td>
                      <td style={{ padding: '12px 8px', color: '#374151' }}>{booking.purpose}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: booking.status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                          color: booking.status === 'confirmed' ? '#16a34a' : '#ea580c'
                        }}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                No upcoming visits scheduled
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardLayout
        sidebar={<AdminSidebar active={active} onNavigate={handleNavigate} />}
      >
        {/* Top Navigation Bar */}
        <div className="topbar">
          <div className="topbar-inner">
            <div className="topbar-logo">
              <button
                className="topbar-hamburger"
                aria-label="Toggle sidebar"
                onClick={() => {
                  if (window.innerWidth <= 900) {
                    document.body.classList.toggle('sidebar-open')
                  } else {
                    document.body.classList.toggle('sidebar-closed')
                  }
                }}
              >
                ☰
              </button>
              <img src={displayLogo} alt="BSC" />
              <span className="topbar-abbrev">BSC</span>
              <span className="topbar-title">Bukidnon Studies Center</span>
            </div>

            {/* Search Bar */}
            <div className="topbar-search" ref={searchRef}>
              <div className="search-toolbar">
                <div className="search-field">
                  <input
                    type="text"
                    className="search-input-pill"
                    placeholder="Search by name or ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  />
                  <span className="search-icon-right">
                    {searchLoading ? '⏳' : ''}
                  </span>
                </div>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="search-results-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '400px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e7eb',
                  marginTop: '8px',
                  zIndex: 1000
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={result._id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{result.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {result.type} • {result.status === 'checked-in' ? '🟢 Inside' : '🔴 Checked Out'}
                        </div>
                        {result.email && (
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>{result.email}</div>
                        )}
                      </div>
                      {result.status === 'checked-in' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openCheckoutModal(result)
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Checkout
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && !searchLoading && (
                <div className="search-results-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '300px',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e7eb',
                  marginTop: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  zIndex: 1000
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
                  <div style={{ color: '#6b7280' }}>No results found for "{searchQuery}"</div>
                </div>
              )}
            </div>

            <div className="topbar-profile" ref={notificationsRef} style={{ position: 'relative' }}>
              <button 
                aria-label="Notifications"
                onClick={() => {
                  setShowNotifications((prev) => !prev)
                  setHasNewNotifications(false)
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(17, 24, 39, 0.12)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 18H21L19.09 15.95C18.4 15.18 18 14.2 18 13.18V11C18 8.11 16.41 5.6 13.75 4.68C13.41 3.16 12.3 2 11 2C9.7 2 8.59 3.16 8.25 4.68C5.59 5.6 4 8.11 4 11V13.18C4 14.2 3.6 15.18 2.91 15.95L1 18H7M15 18V19C15 20.66 13.66 22 12 22C10.34 22 9 20.66 9 19V18H15Z"
                    stroke="#111827"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {hasNewNotifications && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '10px',
                      height: '10px',
                      background: '#dc2626',
                      borderRadius: '50%'
                    }}
                  />
                )}
              </button>

              {showNotifications && (
                <div
                  className="notifications-dropdown"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 12px)',
                    width: '320px',
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 16px 35px rgba(15, 23, 42, 0.18)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    zIndex: 1500
                  }}
                >
                  <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #f3f4f6',
                    fontWeight: 600,
                    color: '#111827',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Pending Bookings</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {notifications.length} new
                    </span>
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '18px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                        All caught up! No pending bookings.
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const key = item._id || item.confirmationCode || item.createdAt || Math.random().toString(36)
                        const visitorCount = item.numberOfVisitors ?? 1
                        return (
                          <div
                            key={key}
                            style={{
                              padding: '14px 18px',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                              {item.fullName || 'Guest Visitor'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {new Date(item.visitDate || item.createdAt || new Date()).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} • {visitorCount} {visitorCount === 1 ? 'pax' : 'pax'}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div style={{
                    padding: '12px 18px',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false)
                        setActive('bookings')
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        background: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      View Bookings
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        fetchPendingNotifications()
                        setShowNotifications(false)
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        border: 'none',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {active === 'dashboard' && (
          <div className="dash-section">
            <div className="overview-section">
              <div className="overview-header">
                <div>
                  <h2 className="overview-title">Dashboard Overview</h2>
                  <p className="overview-subtitle">Key activity across attendance and bookings</p>
                </div>
                <div className="overview-actions" style={{ gap: '12px' }}>
                  <button
                    className="overview-cta"
                    type="button"
                    onClick={() => {
                      setShowAddAttendanceModal(true)
                      setAddAttendanceError('')
                      setAddAttendanceSuccess('')
                    }}
                  >
                    + Add Attendance
                  </button>
                  <button 
                    className="overview-refresh" 
                    onClick={fetchDashboardData}
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
              {renderDashboardContent()}
            </div>
          </div>
        )}
        
        {active === 'bookings' && <AdminBooking />}
        {active === 'attendance' && <AdminAttendance profileData={profileData} />}
        {active === 'gallery' && <AdminGallery />}
        {active === 'reports' && <AdminReports />}
        {active === 'settings' && <AdminSettings onActiveChange={setActive} />}
      </DashboardLayout>

      {/* Checkout Modal */}
      {showCheckoutModal && selectedAttendance && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCheckoutModal(false)
              setSelectedAttendance(null)
            }
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '420px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👋</div>
              <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '20px' }}>
                Checkout Visitor
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Confirm checkout for this visitor
              </p>
            </div>

            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Name</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>{selectedAttendance.name}</div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Type</div>
                <div style={{ fontWeight: '500', color: '#374151' }}>{selectedAttendance.type}</div>
              </div>
              {selectedAttendance.email && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontWeight: '500', color: '#374151' }}>{selectedAttendance.email}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Check-in Time</div>
                <div style={{ fontWeight: '500', color: '#374151' }}>
                  {new Date(selectedAttendance.checkInTime).toLocaleString()}
                </div>
              </div>
            </div>

            {checkoutError && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {checkoutError}
              </div>
            )}

            {checkoutSuccess && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#16a34a',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✅ {checkoutSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowCheckoutModal(false)
                  setSelectedAttendance(null)
                }}
                disabled={checkoutLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading || checkoutSuccess}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: checkoutLoading || checkoutSuccess ? '#9ca3af' : 'linear-gradient(135deg, #dc143c, #ff8c00)',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: checkoutLoading || checkoutSuccess ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {checkoutLoading ? 'Processing...' : checkoutSuccess ? 'Done!' : 'Confirm Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendance Modal */}
      {showAddAttendanceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !addAttendanceLoading) {
              setShowAddAttendanceModal(false)
            }
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              padding: '24px',
              width: '90%',
              maxWidth: '460px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '20px' }}>
                Add Attendance
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Log a new visitor or guest entry
              </p>
            </div>

            {addAttendanceError && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#b91c1c',
                padding: '12px',
                borderRadius: '10px',
                marginBottom: '16px'
              }}>
                {addAttendanceError}
              </div>
            )}

            {addAttendanceSuccess && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#15803d',
                padding: '12px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontWeight: 600
              }}>
                ✅ {addAttendanceSuccess}
              </div>
            )}

            <form onSubmit={handleAddAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={attendanceForm.name}
                  onChange={(e) => handleAttendanceInputChange('name', e.target.value)}
                  placeholder="Enter visitor full name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                {attendanceForm.type === 'visitor' ? (
                  <>
                    <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={attendanceForm.contactNumber}
                      onChange={(e) => handleAttendanceInputChange('contactNumber', e.target.value)}
                      placeholder="e.g., 639123456789"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        fontSize: '14px'
                      }}
                    />
                    <small style={{ color: '#9ca3af', fontSize: '12px' }}>
                      Must start with 63 (e.g., 639XXXXXXXXX) or 09 (e.g., 09XXXXXXXXX).
                    </small>
                  </>
                ) : (
                  <>
                    <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
                      {attendanceForm.type === 'student' ? 'Student ID (10 digits)' : 'Faculty ID (10 digits)'}
                    </label>
                    <input
                      type="text"
                      value={attendanceForm.idNumber}
                      onChange={(e) => handleAttendanceInputChange('idNumber', e.target.value)}
                      placeholder="Enter 10-digit ID number"
                      required
                      maxLength={10}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        fontSize: '14px',
                        letterSpacing: '1px'
                      }}
                    />
                  </>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
                  Visitor Type
                </label>
                <select
                  value={attendanceForm.type}
                  onChange={(e) => handleAttendanceInputChange('type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    background: '#fff'
                  }}
                >
                  <option value="visitor">Visitor</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={attendanceForm.notes}
                  onChange={(e) => handleAttendanceInputChange('notes', e.target.value)}
                  placeholder="Purpose, department, additional info..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    resize: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddAttendanceModal(false)}
                  disabled={addAttendanceLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: 600,
                    cursor: addAttendanceLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAttendanceLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: addAttendanceLoading ? '#9ca3af' : 'linear-gradient(135deg, #dc143c, #ff8c00)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: addAttendanceLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {addAttendanceLoading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}


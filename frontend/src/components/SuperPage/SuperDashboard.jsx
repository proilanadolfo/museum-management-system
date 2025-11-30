import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import '../../styles/SuperCss/SuperDashboard.css'

const SuperDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    onDuty: 0,
    todayLogins: 0
  })

  // Get auth headers helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('superadmin_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch data function
  const fetchData = async () => {
    try {
      // Fetch admin count from database (with auth header for consistency)
      const countResponse = await fetch('/api/admin/count', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })
      
      // Don't logout on 401 for optional dashboard data - just use fallback
      if (countResponse.ok) {
        const countData = await countResponse.json()
        setDashboardData({
          totalAdmins: countData.totalAdmins || 0,
          activeAdmins: countData.activeAdmins || 0,
          onDuty: countData.onDuty || 0,
          todayLogins: countData.todayLogins || 0
        })
      } else {
        // Silent fallback to static data (including 401 errors)
        setDashboardData({
          totalAdmins: 6,
          activeAdmins: 6,
          onDuty: 1,
          todayLogins: 8
        })
      }
    } catch (error) {
      console.log('Using static data for demo')
      // Use static data if API not available
      setDashboardData({
        totalAdmins: 6,
        activeAdmins: 6,
        onDuty: 1,
        todayLogins: 8
      })
      // Only show error if it's a real network issue, not just missing endpoint
      if (error.message && !error.message.includes('Failed to fetch')) {
        Swal.fire({
          title: 'Data Load Error',
          text: 'Unable to load dashboard data. Showing demo data.',
          icon: 'warning',
          confirmButtonColor: '#dc143c',
          timer: 3000,
          showConfirmButton: false
        })
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard Overview</h1>
          <p className="dash-subtitle">Welcome back, Super Admin</p>
        </div>
        <div className="user-info">
          <span className="user-icon">👤</span>
          <span>Super Admin</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.totalAdmins}</div>
            <div className="stat-label">Total Administrators</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.activeAdmins}</div>
            <div className="stat-label">Active Administrators</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🕐</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.onDuty}</div>
            <div className="stat-label">On Duty</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.todayLogins}</div>
            <div className="stat-label">Today's Logins</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperDashboard


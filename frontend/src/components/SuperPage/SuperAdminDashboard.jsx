import React, { useState, useEffect } from 'react'
import DashboardLayout from './DashboardLayout'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperDashboard from './SuperDashboard'
import SuperManage from './SuperManage'
import SuperSettins from './SuperSettins'
import SuperTemplates from './SuperTemplates'
import ReportTemplateBuilder from './ReportTemplateBuilder'
import ModulePermissions from './ModulePermissions'
import SuperAuditLogs from './SuperAuditLogs'
import ErrorBoundary from '../ErrorBoundary'
import '../../styles/SuperCss/super-dashboard-layout.css'
import '../../styles/SuperCss/SuperDashboard.css'
import logo from '../../assets/img/Logo.jpg'

export default function SuperAdminDashboard() {
  const [active, setActive] = useState('dashboard')
  const [profileLogo, setProfileLogo] = useState(null)
  
  useEffect(() => {
    const isMobile = window.innerWidth <= 900
    if (isMobile) {
      document.body.classList.remove('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-closed')
    }
  }, [])

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
      const token = localStorage.getItem('superadmin_token')
      if (!token) {
        setProfileLogo(null)
        return
      }
      
      const response = await fetch('http://localhost:5000/api/museum-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      // Don't logout on 401/403 for optional logo fetch - just use default logo
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.profileLogo) {
          setProfileLogo(`http://localhost:5000/${data.data.profileLogo}`)
        } else {
          setProfileLogo(null) // Reset to default if no logo
        }
      } else if (response.status === 401 || response.status === 403) {
        // Silently handle 401/403 - don't logout, just don't show logo
        // This could be due to module permissions or expired token, but don't force logout
        console.log('Logo fetch failed: Unauthorized/Forbidden - using default logo')
        setProfileLogo(null)
      } else {
        // Other errors (500, etc.) - also just use default logo
        console.log('Logo fetch failed with status:', response.status)
        setProfileLogo(null)
      }
    } catch (error) {
      // Silently use default logo on network error
      console.error('Error fetching profile logo:', error)
      setProfileLogo(null)
    }
  }

  // Use profile logo from settings if available, otherwise use default
  const displayLogo = profileLogo || logo

  return (
    <>
      <DashboardLayout
        sidebar={<SuperAdminSidebar active={active} onNavigate={(k) => {
          if (k === 'logout') {
            localStorage.removeItem('superadmin_token')
            localStorage.removeItem('superadmin_user')
            window.location.href = '/login'
            return
          }
          setActive(k)
        }} />}
      >
        {/* Top Navigation Bar */}
      <div className="super-topbar">
        <div className="super-topbar-inner">
          <div className="super-topbar-logo">
            <button
              className="super-topbar-hamburger"
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
            <span className="super-topbar-abbrev">BSC</span>
            <span className="super-topbar-title">Bukidnon Studies Center</span>
          </div>
          <div />
        </div>
      </div>

        <ErrorBoundary>
        {active === 'dashboard' && <SuperDashboard />}
        {active === 'admins' && <SuperManage />}
        {active === 'permissions' && <ModulePermissions />}
        {active === 'templates' && <ReportTemplateBuilder />}
          {active === 'audit-logs' && <SuperAuditLogs />}
        {active === 'settings' && <SuperSettins />}
        </ErrorBoundary>
    </DashboardLayout>
    </>
  )
}

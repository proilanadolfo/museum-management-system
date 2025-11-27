import React, { useState, useEffect } from 'react'
import DashboardLayout from './DashboardLayout'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperDashboard from './SuperDashboard'
import SuperManage from './SuperManage'
import SuperSettins from './SuperSettins'
import SuperTemplates from './SuperTemplates'
import ReportTemplateBuilder from './ReportTemplateBuilder'
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

  return (
    <>
      <DashboardLayout
        sidebar={<SuperAdminSidebar active={active} onNavigate={(k) => {
          if (k === 'logout') {
            localStorage.removeItem('superadmin_token')
            window.location.reload()
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

        {active === 'dashboard' && <SuperDashboard />}
        {active === 'admins' && <SuperManage />}
        {active === 'templates' && <ReportTemplateBuilder />}
        {active === 'settings' && <SuperSettins />}
    </DashboardLayout>
    </>
  )
}

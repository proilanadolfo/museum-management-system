import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import Login from './components/Login.jsx'
import SuperAdminDashboard from './components/SuperPage/SuperAdminDashboard.jsx'
import AdminDashboard from './components/AdminPage/AdminDashboard.jsx'
import GuestPage from './components/GuestPage/GuestPage.jsx'
import BookVisitPage from './components/GuestPage/BookVisitPage.jsx'
import AboutPage from './components/GuestPage/AboutPage.jsx'
import GoogleAuthSuccess from './components/GoogleAuthSuccess.jsx'

// Force cache refresh
console.log('App loaded at:', new Date().toISOString())

function App() {
  const [userType, setUserType] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const checkAuth = React.useCallback(() => {
    const superAdminToken = localStorage.getItem('superadmin_token')
    const adminToken = localStorage.getItem('admin_token')
    
    // Check if we have valid tokens
    const hasSuperAdminToken = superAdminToken && superAdminToken !== 'null' && superAdminToken !== 'undefined'
    const hasAdminToken = adminToken && adminToken !== 'null' && adminToken !== 'undefined'
    
    // Only update userType if we have a valid token
    if (hasSuperAdminToken) {
      setUserType('superadmin')
    } else if (hasAdminToken) {
      setUserType('admin')
    } else {
      // Only set to null if we're sure tokens don't exist
      // This prevents redirects during component mounting or timing issues
      setUserType(null)
    }
    setIsLoading(false)
  }, [])

  React.useEffect(() => {
    checkAuth()
    
    // Listen for storage changes (when tokens are added/removed)
    // Note: storage event only fires from OTHER tabs/windows, not same tab
    const handleStorageChange = (e) => {
      if (e.key === 'superadmin_token' || e.key === 'admin_token') {
        // Only check auth if token was actually removed (newValue is null)
        // Don't re-check if token was just updated (might cause timing issues)
        if (e.newValue === null || e.oldValue !== null) {
          checkAuth()
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom logout events (explicit logout)
    const handleLogout = () => {
      // Explicit logout - always check auth
      checkAuth()
    }
    
    window.addEventListener('adminLoggedOut', handleLogout)
    window.addEventListener('superadminLoggedOut', handleLogout)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('adminLoggedOut', handleLogout)
      window.removeEventListener('superadminLoggedOut', handleLogout)
    }
  }, [checkAuth])

  const renderDashboard = () => {
    switch (userType) {
      case 'superadmin':
        return <SuperAdminDashboard />
      case 'admin':
        return <AdminDashboard />
      default:
        return <Login />
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <Router>
      <div>
        <Routes>
          {/* Guest Routes */}
          <Route path="/guest" element={<GuestPage />} />
          <Route path="/guest/book" element={<BookVisitPage />} />
          <Route path="/guest/about" element={<AboutPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={userType ? renderDashboard() : <Navigate to="/login" replace />} />
          <Route path="/login" element={userType ? <Navigate to="/admin" replace /> : <Login />} />
          <Route path="/admin-login" element={<Navigate to="/login" replace />} />
          
          {/* Google OAuth Success Route */}
          <Route path="/auth-success" element={<GoogleAuthSuccess />} />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/guest" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/guest" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

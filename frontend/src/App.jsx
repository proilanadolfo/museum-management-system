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

  React.useEffect(() => {
    const superAdminToken = localStorage.getItem('superadmin_token')
    const adminToken = localStorage.getItem('admin_token')
    
    if (superAdminToken) {
      setUserType('superadmin')
    } else if (adminToken) {
      setUserType('admin')
    } else {
      setUserType(null)
    }
    setIsLoading(false)
  }, [])

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

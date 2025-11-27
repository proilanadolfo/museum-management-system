import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GoogleAuthSuccess() {
  const navigate = useNavigate()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const type = urlParams.get('type')
    const userParam = urlParams.get('user')

    if (token && type && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam))
        
        // Store token and user info based on type
        if (type === 'admin') {
          localStorage.setItem('admin_token', token)
          localStorage.setItem('admin_user', JSON.stringify(user))
          
          // Dispatch custom event to notify dashboards or listeners
          window.dispatchEvent(new CustomEvent('adminLoggedIn'))
        } else if (type === 'superadmin') {
          localStorage.setItem('superadmin_token', token)
          localStorage.setItem('superadmin_user', JSON.stringify(user))
        }

        // Show branded loading screen briefly, then redirect
        setRedirecting(true)
        setTimeout(() => {
          window.location.replace('/admin')
        }, 900) // ~0.9s pleasant flash
        return
      } catch (error) {
        console.error('Error parsing user data:', error)
        navigate('/login?error=google_auth_failed')
      }
    } else {
      navigate('/login?error=google_auth_failed')
    }
  }, [navigate])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '52px',
          height: '52px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #FF8C00',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
          margin: '0 auto'
        }}></div>
        <div style={{ marginTop: 14, fontSize: 14, color: '#555', fontWeight: 600 }}>
          {redirecting ? 'Signing you in…' : 'Preparing your session…'}
        </div>
        <div style={{
          marginTop: 10,
          width: 220,
          height: 6,
          background: '#f0f0f0',
          borderRadius: 999,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #FF8C00, #FFC107)',
            transformOrigin: 'left',
            animation: 'grow 0.9s ease-in-out forwards'
          }} />
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes grow {
          0% { transform: scaleX(0.2); }
          60% { transform: scaleX(0.85); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}

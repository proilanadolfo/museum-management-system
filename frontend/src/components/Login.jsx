import React, { useState, useEffect } from 'react'
import '../styles/Login.css'
import logo from '../assets/img/Logo.jpg'
import AdminForm from './AdminPage/AdminForm.jsx'
import SuperAdminForm from './SuperPage/SuperAdminForm.jsx'

export default function Login() {
  const [modalType, setModalType] = useState(null)
  const [notice, setNotice] = useState({ message: '', type: '' })
  const [noticeTimeoutId, setNoticeTimeoutId] = useState(null)
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const message = params.get('message')

    if (error) {
      if (error === 'email_already_exists') {
        const raw = decodeURIComponent(message || '')
        const friendly = raw.includes('SuperAdmin')
          ? 'Email is already registered as SuperAdmin. Please use a different email or contact support.'
          : raw.includes('Admin')
            ? 'Email is already registered as Admin. Please use a different email or contact support.'
            : 'That email is already in use for another role. Please use a different email.'
        setNotice({ message: friendly, type: 'warning' })
      } else if (error === 'email_already_superadmin') {
        setNotice({
          message: 'This email is already registered as Super Admin. Please use a different email or contact support.',
          type: 'warning'
        })
      } else if (error === 'email_already_admin') {
        setNotice({
          message: 'This email is already registered as Admin. Please use a different email or contact support.',
          type: 'warning'
        })
      } else if (error === 'admin_not_found') {
        setNotice({
          message: 'Admin account not found. Please contact your Super Administrator to create your account first.',
          type: 'error'
        })
      } else if (error === 'superadmin_not_found') {
        setNotice({
          message: 'Super Admin account not found. Please contact the system administrator to create your account first.',
          type: 'error'
        })
      } else if (error === 'google_auth_failed') {
        setNotice({
          message: 'Google authentication failed. Please try again or use email/password.',
          type: 'error'
        })
      }
      // Clean URL after showing message
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Auto-dismiss notice after a few seconds
  useEffect(() => {
    if (!notice.message) return
    if (noticeTimeoutId) clearTimeout(noticeTimeoutId)
    const id = setTimeout(() => {
      setIsDismissing(true)
      setTimeout(() => setNotice({ message: '', type: '' }), 300)
    }, 6000)
    setNoticeTimeoutId(id)
    return () => clearTimeout(id)
  }, [notice.message])

  const dismissNotice = () => {
    setIsDismissing(true)
    setTimeout(() => {
      setNotice({ message: '', type: '' })
      setIsDismissing(false)
    }, 300)
  }

  const closeModal = () => setModalType(null)

  return (
    <div className="login-page">
      <style>{`
        @keyframes slideInDown {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes slideOutUp {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
        }
        
        .login-notice {
          animation: slideInDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .login-notice.fade-out {
          animation: slideOutUp 0.3s ease-in-out forwards;
        }
      `}</style>
      {notice.message && (
        <div
          className={`login-notice ${notice.type} ${isDismissing ? 'fade-out' : ''}`}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: 'min(90vw, 480px)',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)',
            background: notice.type === 'error' 
              ? 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)' 
              : 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
            color: '#2c3e50',
            border: `1px solid ${notice.type === 'error' ? '#ffcdd2' : '#ffcc02'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            backdropFilter: 'blur(10px)',
            animation: 'slideInDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          role="alert"
          aria-live="polite"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: notice.type === 'error' 
                ? 'linear-gradient(135deg, #ff5722, #f44336)' 
                : 'linear-gradient(135deg, #ff9800, #ffc107)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {notice.type === 'error' ? '⚠' : 'ℹ'}
            </div>
            <span style={{ 
              lineHeight: 1.5, 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {notice.message}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Dismiss notification"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              color: '#666',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.4)'
              e.target.style.color = '#333'
              e.target.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)'
              e.target.style.color = '#666'
              e.target.style.transform = 'scale(1)'
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-wrap">
            <img
              src={logo}
              alt="BSC-System Logo"
              className="login-logo"
            />
          </div>
          <h2 className="login-title">Bukidnon Studies Center</h2>
          <p className="login-subtitle">Please choose your role to continue</p>
        </div>

        <div className="login-actions">
          <button
            type="button"
            className="role-btn role-btn--primary"
            onClick={() => setModalType('superadmin')}
            aria-label="Open Super Admin login form"
          >
            <span className="role-btn__icon" aria-hidden>🛡️</span>
            <span className="role-btn__text">Super Admin</span>
          </button>
          <button
            type="button"
            className="role-btn role-btn--secondary"
            onClick={() => setModalType('admin')}
            aria-label="Open Administrator login form"
          >
            <span className="role-btn__icon" aria-hidden>👤</span>
            <span className="role-btn__text">Administrator</span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalType && (
      <div
          className="modal-overlay is-visible"
        onClick={(e) => {
          if (e.target.classList.contains('modal-overlay')) closeModal()
        }}
      >
          <div className="modal-card enter" role="dialog" aria-modal="true">
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            ×
          </button>

          <div className="modal-header">
            <h3 className="modal-title">
              {modalType === 'superadmin' ? 'Super Admin Login' : modalType === 'admin' ? 'Administrator Login' : ''}
            </h3>
          </div>

          <div className="modal-body">
            {modalType === 'superadmin' && <SuperAdminForm onClose={closeModal} />}
            {modalType === 'admin' && <AdminForm onClose={closeModal} />}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

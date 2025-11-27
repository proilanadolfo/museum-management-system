import React, { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import Recaptcha from '../Recaptcha'
import { RECAPTCHA_CONFIG } from '../../config/recaptcha'

export default function SuperAdminForm({ onClose }) {
  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotStep, setForgotStep] = useState('request')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codeVerified, setCodeVerified] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const recaptchaRef = useRef(null)

  // Check for URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorType = urlParams.get('error')
    const errorMessage = urlParams.get('message')
    
    if (errorType === 'email_already_exists' && errorMessage) {
      setError(decodeURIComponent(errorMessage))
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (errorType === 'google_auth_failed') {
      setError('Google authentication failed. Please try again or use email/password login.')
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRecaptchaVerify = (token) => {
    setRecaptchaToken(token)
  }

  const handleRecaptchaExpire = () => {
    setRecaptchaToken('')
  }

  const handleRecaptchaError = () => {
    setRecaptchaToken('')
    setError('reCAPTCHA verification failed. Please try again.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification')
      setLoading(false)
      return
    }
    
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: formData.identifier, 
          password: formData.password,
          recaptchaToken: recaptchaToken
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message = body.message || 'Failed to login'
        // SweetAlert for Super Admin login error
        Swal.fire({
          title: 'Login Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        throw new Error(message)
      }
      const data = await res.json()
      if (data?.token) {
        localStorage.setItem('superadmin_token', data.token)
        // Store complete user information for manual login
        if (data.user) {
          localStorage.setItem('superadmin_user', JSON.stringify(data.user))
        }
        // Force page reload to show dashboard
        window.location.reload()
      }
      onClose?.('superadmin')
    } catch (err) {
      setError(err.message)
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setRecaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Redirect directly to Google OAuth for superadmin
    window.location.href = '/api/google/superadmin'
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotEmail) {
      setForgotMessage('Please enter your email address')
      return
    }
    
    setForgotLoading(true)
    setForgotMessage('')
    
    try {
      const res = await fetch('/api/superadmin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Failed to send reset code')
      }
      
      setForgotMessage('A 6-digit reset code has been sent. Check your inbox.')
      setForgotStep('verify')
    } catch (err) {
      setForgotMessage(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetWithCode = async (e) => {
    e.preventDefault()
    if (!resetCode || !newPassword || !confirmPassword) {
      setForgotMessage('Please fill in all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setForgotMessage('Passwords do not match')
      return
    }
    setForgotLoading(true)
    setForgotMessage('')
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword, userType: 'superadmin' })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Failed to reset password')
      }
      setForgotMessage('Password reset successfully. You can now login.')
      setTimeout(() => {
        setShowForgotPassword(false)
        setForgotMessage('')
        setForgotEmail('')
        setResetCode('')
        setNewPassword('')
        setConfirmPassword('')
        setForgotStep('request')
        setCodeVerified(false)
      }, 1200)
    } catch (err) {
      setForgotMessage(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    if (!resetCode) {
      setForgotMessage('Please enter the reset code')
      return
    }
    if (resetCode.length !== 6) {
      setForgotMessage('Please enter a 6-digit code')
      return
    }
    
    setForgotLoading(true)
    setForgotMessage('')
    
    try {
      // Verify the code without resetting password
      const res = await fetch('/api/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotEmail, 
          code: resetCode, 
          userType: 'superadmin' 
        })
      })
      
      if (res.ok) {
        setCodeVerified(true)
        setForgotStep('reset')
        setForgotMessage('Code verified! Now set your new password.')
      } else {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Invalid or expired reset code')
      }
    } catch (err) {
      setForgotMessage(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="auth-form">
        <div className="form-header">
          <h4>Reset Password</h4>
          {forgotStep === 'request' && (
            <p>Enter your email address and we'll send you a 6-digit reset code.</p>
          )}
          {forgotStep === 'verify' && (
            <p>Enter the 6-digit code sent to your email.</p>
          )}
          {forgotStep === 'reset' && (
            <p>Code verified! Now set your new password.</p>
          )}
        </div>
        {forgotStep === 'request' ? (
          <form onSubmit={handleForgotPassword}>
            <div className="form-field">
              <label>Email Address</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>

            {forgotMessage && (
              <div className={`form-message ${forgotMessage.includes('sent') || forgotMessage.includes('code') ? 'success' : 'error'}`}>
                {forgotMessage}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="submit" 
                className="login-btn" 
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending...' : 'Send Code'}
              </button>
              
              <button 
                type="button" 
                className="google-login-btn"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotMessage('')
                  setForgotEmail('')
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : forgotStep === 'verify' ? (
          <form onSubmit={handleVerifyCode}>
            <div className="form-field">
              <label>Email Address</label>
              <input
                type="email"
                value={forgotEmail}
                disabled
                style={{ backgroundColor: '#f5f5f5', color: '#666' }}
              />
            </div>
            <div className="form-field">
              <label>Reset Code</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                maxLength="6"
                required
                style={{ letterSpacing: '2px', textAlign: 'center', fontSize: '18px' }}
              />
            </div>

            {forgotMessage && (
              <div className={`form-message ${forgotMessage.includes('verified') ? 'success' : 'error'}`}>
                {forgotMessage}
              </div>
            )}

            <div className="form-actions">
              <button 
                type="submit" 
                className="login-btn" 
                disabled={forgotLoading || resetCode.length !== 6}
              >
                {forgotLoading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <button 
                type="button" 
                className="google-login-btn"
                onClick={() => {
                  setForgotStep('request')
                  setResetCode('')
                  setForgotMessage('')
                }}
              >
                Back
              </button>
            </div>
          </form>
         ) : (
           <form onSubmit={handleResetWithCode}>
             <div className="form-field">
               <label>Email Address</label>
               <input
                 type="email"
                 value={forgotEmail}
                 disabled
                 style={{ backgroundColor: '#f5f5f5', color: '#666' }}
               />
             </div>
             <div className="form-field">
               <label>New Password</label>
               <input
                 type="password"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
                 placeholder="Enter new password"
                 required
               />
             </div>
             <div className="form-field">
               <label>Confirm New Password</label>
               <input
                 type="password"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 placeholder="Confirm new password"
                 required
               />
             </div>

             {forgotMessage && (
               <div className={`form-message ${forgotMessage.includes('successfully') ? 'success' : 'error'}`}>
                 {forgotMessage}
               </div>
             )}

             <div className="form-actions">
               <button 
                 type="submit" 
                 className="login-btn" 
                 disabled={forgotLoading}
               >
                 {forgotLoading ? 'Resetting…' : 'Reset Password'}
               </button>
               
               <button 
                 type="button" 
                 className="google-login-btn"
                 onClick={() => {
                   setForgotStep('verify')
                   setNewPassword('')
                   setConfirmPassword('')
                   setForgotMessage('')
                 }}
               >
                 Back
               </button>
             </div>
           </form>
         )}
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label>Email or Username</label>
        <input
          type="text"
          name="identifier"
          value={formData.identifier}
          onChange={handleChange}
          placeholder="Enter email or username"
          required
        />
      </div>

      <div className="form-field">
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter password"
          required
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <Recaptcha
        ref={recaptchaRef}
        siteKey={RECAPTCHA_CONFIG.SITE_KEY}
        onVerify={handleRecaptchaVerify}
        onExpire={handleRecaptchaExpire}
        onError={handleRecaptchaError}
      />

      <div className="form-actions">
        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
        
        <div className="auth-divider">
          <span>or</span>
        </div>
        
        <button 
          type="button" 
          className="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#FF8C00" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <button 
          type="button" 
          className="forgot-password-btn"
          onClick={() => setShowForgotPassword(true)}
        >
          Forgot Password?
        </button>
      </div>
    </form>
  )
}

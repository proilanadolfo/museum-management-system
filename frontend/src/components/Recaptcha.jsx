import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

const Recaptcha = forwardRef(({ onVerify, onExpire, onError, siteKey }, ref) => {
  const recaptchaRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    console.log('Recaptcha useEffect - siteKey:', siteKey)
    
    // Load reCAPTCHA script if not already loaded
    if (!window.grecaptcha) {
      console.log('Loading reCAPTCHA script...')
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      
      script.onload = () => {
        console.log('reCAPTCHA script loaded')
        renderRecaptcha()
      }
      
      script.onerror = () => {
        console.error('Failed to load reCAPTCHA script')
      }
    } else {
      console.log('reCAPTCHA already loaded')
      renderRecaptcha()
    }

    return () => {
      // Cleanup widget when component unmounts
      if (widgetId.current && window.grecaptcha && window.grecaptcha.reset) {
        window.grecaptcha.reset(widgetId.current)
      }
    }
  }, [siteKey])

  const renderRecaptcha = () => {
    console.log('Attempting to render reCAPTCHA...')
    console.log('window.grecaptcha:', !!window.grecaptcha)
    console.log('recaptchaRef.current:', !!recaptchaRef.current)
    console.log('siteKey:', siteKey)
    
    // Check if reCAPTCHA is already rendered in this element
    if (widgetId.current) {
      console.log('reCAPTCHA already rendered, skipping...')
      return
    }
    
    if (window.grecaptcha && recaptchaRef.current && siteKey) {
      try {
        // Use the standard render method
        widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
          theme: 'light',
          size: 'normal'
        })
        console.log('reCAPTCHA rendered successfully, widgetId:', widgetId.current)
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error)
        // Don't retry if it's already rendered
        if (!error.message.includes('already been rendered')) {
          setTimeout(() => {
            try {
              widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
                sitekey: siteKey,
                callback: onVerify,
                'expired-callback': onExpire,
                'error-callback': onError,
                theme: 'light',
                size: 'normal'
              })
              console.log('reCAPTCHA rendered successfully on retry, widgetId:', widgetId.current)
            } catch (retryError) {
              console.error('Error rendering reCAPTCHA on retry:', retryError)
            }
          }, 500)
        }
      }
    } else {
      console.log('Cannot render reCAPTCHA - missing requirements')
    }
  }

  const resetRecaptcha = () => {
    if (widgetId.current && window.grecaptcha && window.grecaptcha.reset) {
      window.grecaptcha.reset(widgetId.current)
    }
  }

  // Expose reset function to parent
  useImperativeHandle(ref, () => ({
    reset: resetRecaptcha
  }))

  return (
    <div 
      ref={recaptchaRef}
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        margin: '12px 0',
        minHeight: '78px' // Ensure space for reCAPTCHA
      }}
    />
  )
})

Recaptcha.displayName = 'Recaptcha'

export default Recaptcha

// reCAPTCHA Configuration
// Get your keys from: https://www.google.com/recaptcha/admin

export const RECAPTCHA_CONFIG = {
  // Your actual reCAPTCHA v2 site key
  SITE_KEY: '6LfKE_IrAAAAANY2zYl8Q1pJiiDYtHBPNnMGzkHN',
  
  // This is just for reference - the secret key goes in backend/.env
  // SECRET_KEY: '6LfKE_IrAAAAAE9Zg-a5lpRVcbo5RwfEi9AzSKeV'
}

// Instructions for setup:
// 1. Go to https://www.google.com/recaptcha/admin
// 2. Create a new site
// 3. Choose reCAPTCHA v2 ("I'm not a robot" Checkbox)
// 4. Add your domain (localhost:5173 for development)
// 5. Copy the Site Key and replace '6LfYourSiteKeyHere' above
// 6. Copy the Secret Key and add it to backend/.env as RECAPTCHA_SECRET_KEY

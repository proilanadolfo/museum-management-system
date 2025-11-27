// Email Configuration
// Update these settings in your backend/routes/auth.js file

const EMAIL_CONFIG = {
  // Gmail SMTP (recommended)
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',        // Your Gmail address
    pass: 'your-app-password'            // Gmail App Password (not regular password)
  }
  
  // Alternative: Outlook/Hotmail
  // service: 'hotmail',
  // auth: {
  //   user: 'your-email@outlook.com',
  //   pass: 'your-password'
  // }
  
  // Alternative: Yahoo
  // service: 'yahoo',
  // auth: {
  //   user: 'your-email@yahoo.com',
  //   pass: 'your-app-password'
  // }
}

// Instructions for Gmail:
// 1. Enable 2-factor authentication on your Gmail account
// 2. Go to Google Account settings > Security > App passwords
// 3. Generate a new app password for "Mail"
// 4. Use that app password (not your regular password) in the 'pass' field above
// 5. Update the 'user' field with your Gmail address

module.exports = EMAIL_CONFIG

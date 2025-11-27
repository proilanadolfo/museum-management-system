const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const { adminConnection, superAdminConnection } = require('../db')
const axios = require('axios')
const multer = require('multer')
const path = require('path')

const mongoose = require('mongoose')
const Attendance = require('../models/Attendance')
const AuditLog = require('../models/AuditLog')
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwt')
const logger = require('../utils/logger')
const { validateLogin, validatePasswordReset, validatePasswordResetCode } = require('../middleware/validation')

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'), false)
    }
  }
})

// reCAPTCHA verification function
const verifyRecaptcha = async (recaptchaToken) => {
  try {
    if (!recaptchaToken) {
      return { success: false, message: 'reCAPTCHA token is required' }
    }

    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken
      }
    })

    if (response.data.success) {
      return { success: true }
    } else {
      return { 
        success: false, 
        message: 'reCAPTCHA verification failed',
        errors: response.data['error-codes'] 
      }
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return { success: false, message: 'reCAPTCHA verification error' }
  }
}

// Create Admin and SuperAdmin models using connections
const adminSchema = new (require('mongoose').Schema)({
  username: { type: String, required: function() { return !this.googleId }, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: function() { return !this.googleId } },
  name: { type: String, default: null },
  profilePicture: { type: String, default: null },
  googleId: { type: String, unique: true, sparse: true },
  googleProfile: {
    name: String,
    picture: String,
    verified_email: Boolean
  },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
}, { timestamps: true })

const superAdminSchema = new (require('mongoose').Schema)({
  username: { type: String, required: function() { return !this.googleId }, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: function() { return !this.googleId } },
  name: { type: String, default: null },
  profilePicture: { type: String, default: null },
  googleId: { type: String, unique: true, sparse: true },
  googleProfile: {
    name: String,
    picture: String,
    verified_email: Boolean
  },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
}, { timestamps: true })

const Admin = adminConnection.model('Admin', adminSchema)
const SuperAdmin = superAdminConnection.model('SuperAdmin', superAdminSchema)

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret'

// Check if Google OAuth is properly configured
const isGoogleOAuthConfigured = GOOGLE_CLIENT_ID !== 'your-google-client-id' && 
                                GOOGLE_CLIENT_SECRET !== 'your-google-client-secret'

// Configure Passport for Google OAuth
passport.use('admin-google', new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/google/admin/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value
    
    // Check if admin already exists with this Google ID
    let admin = await Admin.findOne({ googleId: profile.id })
    
    if (admin) {
      return done(null, admin)
    }
    
    // Check if admin exists with this email
    admin = await Admin.findOne({ email })
    
    if (admin) {
      // Link Google account to existing admin
      admin.googleId = profile.id
      admin.name = profile.displayName
      admin.profilePicture = profile.photos[0]?.value
      admin.googleProfile = {
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        verified_email: profile.emails[0].verified
      }
      await admin.save()
      return done(null, admin)
    }
    
    // Check if email is already used by SuperAdmin
    const existingSuperAdmin = await SuperAdmin.findOne({ email })
    if (existingSuperAdmin) {
      return done(new Error('EMAIL_ALREADY_SUPERADMIN'), null)
    }
    
    // SECURITY: Only allow Google OAuth login for admins that already exist
    // Do NOT create new admin accounts via Google OAuth
    // All admin accounts must be created by Super Admin first
    return done(new Error('ADMIN_NOT_FOUND'), null)
  } catch (error) {
    return done(error, null)
  }
}))

passport.use('superadmin-google', new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/google/superadmin/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value
    
    // Check if superadmin already exists with this Google ID
    let superAdmin = await SuperAdmin.findOne({ googleId: profile.id })
    
    if (superAdmin) {
      return done(null, superAdmin)
    }
    
    // Check if superadmin exists with this email
    superAdmin = await SuperAdmin.findOne({ email })
    
    if (superAdmin) {
      // Link Google account to existing superadmin
      superAdmin.googleId = profile.id
      superAdmin.name = profile.displayName
      superAdmin.profilePicture = profile.photos[0]?.value
      superAdmin.googleProfile = {
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        verified_email: profile.emails[0].verified
      }
      await superAdmin.save()
      return done(null, superAdmin)
    }
    
    // Check if email is already used by Admin
    const existingAdmin = await Admin.findOne({ email })
    if (existingAdmin) {
      return done(new Error('EMAIL_ALREADY_ADMIN'), null)
    }
    
    // SECURITY: Only allow Google OAuth login for Super Admins that already exist
    // Do NOT create new Super Admin accounts via Google OAuth
    // All Super Admin accounts must be created manually in the database first
    return done(new Error('SUPERADMIN_NOT_FOUND'), null)
  } catch (error) {
    return done(error, null)
  }
}))

// Email configuration (using Gmail SMTP for demo - you can change this)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Set your email
    pass: process.env.EMAIL_PASS || 'your-app-password'     // Set your app password
  },
  tls: {
    rejectUnauthorized: false
  }
})

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    console.log('\n=== TEST EMAIL REQUEST ===')
    console.log('EMAIL_USER:', process.env.EMAIL_USER)
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET')
    
    const testCode = '123456'
    const testEmail = process.env.EMAIL_USER || 'adolfoproilan@gmail.com'
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Test Email - Museum System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Test Email</h2>
          <p>This is a test email to verify email configuration.</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; padding: 12px 24px; border-radius: 10px; background: #111827; color: #fff; font-size: 24px; letter-spacing: 6px; font-weight: bold;">
              ${testCode}
            </div>
          </div>
          <p>If you receive this email, email configuration is working!</p>
        </div>
      `
    }
    
    console.log('Attempting to send test email...')
    await transporter.sendMail(mailOptions)
    console.log('✅ Test email sent successfully!')
    
    res.json({ 
      ok: true, 
      message: 'Test email sent successfully! Check your inbox.' 
    })
    
  } catch (error) {
    console.error('❌ Test email error:', error.message)
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to send test email: ' + error.message 
    })
  }
})

// Generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Send admin credentials email
const sendAdminCredentialsEmail = async (email, username, password) => {
  console.log(`\n=== ADMIN CREDENTIALS EMAIL ===`)
  console.log(`To: ${email}`)
  console.log(`Username: ${username}`)
  console.log(`Password: ${password}`)
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`)
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***SET***' : 'NOT SET'}`)
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Your Administrator Account - BSC-System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Welcome to BSC-System</h2>
        <p>Hello,</p>
        <p>Your administrator account has been created successfully. Below are your login credentials:</p>
        
        <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Login Credentials</h3>
          <p><strong>Username:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${username}</code></p>
          <p><strong>Password:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h4 style="color: #856404; margin-top: 0;">⚠️ Important Security Notice</h4>
          <ul style="color: #856404; margin: 0;">
            <li>Please change your password after your first login</li>
            <li>Keep your credentials secure and do not share them</li>
            <li>Use the "Forgot Password" feature if you need to reset your password</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/admin-login" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Login to Admin Dashboard
          </a>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          BSC-System<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    `
  }
  
  try {
    // Check if email is properly configured
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com' || 
        !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your-app-password') {
      console.log('⚠️  EMAIL NOT CONFIGURED - Running in TEST MODE')
      console.log('📧 To configure email:')
      console.log('   1. Create backend/.env file')
      console.log('   2. Add EMAIL_USER=your-gmail@gmail.com')
      console.log('   3. Add EMAIL_PASS=your-app-password')
      console.log('   4. Restart server')
      console.log(`\n🔑 ADMIN CREDENTIALS FOR TESTING:`)
      console.log(`   Username: ${username}`)
      console.log(`   Password: ${password}`)
      console.log(`📧 Would send to: ${email}`)
      console.log('===============================\n')
      return true
    }
    
    console.log('📧 Attempting to send admin credentials email...')
    console.log('From:', process.env.EMAIL_USER)
    console.log('To:', email)
    console.log('Subject:', mailOptions.subject)
    
    await transporter.sendMail(mailOptions)
    console.log('✅ Admin credentials email sent successfully!')
    return true
  } catch (error) {
    console.error('❌ Admin credentials email error:', error.message)
    console.error('Full error:', error)
    console.log('🔑 ADMIN CREDENTIALS FOR TESTING:')
    console.log(`   Username: ${username}`)
    console.log(`   Password: ${password}`)
    console.log('📧 Failed to send to:', email)
    // For testing, still return true even if email fails
    return true
  }
}

// Send password reset CODE (OTP) email
const sendResetCodeEmail = async (email, code, userType) => {
  console.log(`\n=== EMAIL SENDING DEBUG ===`)
  console.log(`To: ${email}`)
  console.log(`Code: ${code}`)
  console.log(`UserType: ${userType}`)
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`)
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***SET***' : 'NOT SET'}`)
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Your Password Reset Code - BSC-System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset Code</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your ${userType} account.</p>
        <p>Use the code below to reset your password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; padding: 12px 24px; border-radius: 10px; background: #111827; color: #fff; font-size: 24px; letter-spacing: 6px; font-weight: bold;">
            ${code}
          </div>
        </div>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          BSC-System<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    `
  }
  
  try {
    // Check if email is properly configured
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com' || 
        !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your-app-password') {
      console.log('⚠️  EMAIL NOT CONFIGURED - Running in TEST MODE')
      console.log('📧 To configure email:')
      console.log('   1. Create backend/.env file')
      console.log('   2. Add EMAIL_USER=your-gmail@gmail.com')
      console.log('   3. Add EMAIL_PASS=your-app-password')
      console.log('   4. Restart server')
      console.log(`\n🔑 RESET CODE FOR TESTING: ${code}`)
      console.log(`📧 Would send to: ${email}`)
      console.log('===============================\n')
      return true
    }
    
    console.log('📧 Attempting to send email...')
    console.log('From:', process.env.EMAIL_USER)
    console.log('To:', email)
    console.log('Subject:', mailOptions.subject)
    
    await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully!')
    return true
  } catch (error) {
    console.error('❌ Email sending error:', error.message)
    console.error('Full error:', error)
    console.log('🔑 RESET CODE FOR TESTING:', code)
    console.log('📧 Failed to send to:', email)
    // For testing, still return true even if email fails
    return true
  }
}

// Seed a default superadmin if none exists (for quick start)
router.post('/seed-superadmin', async (_req, res) => {
  try {
    const existing = await SuperAdmin.findOne({ username: 'superadmin' })
    if (existing) return res.json({ ok: true, message: 'Superadmin already exists' })
    const passwordHash = await bcrypt.hash('admin123', 10)
    const user = await SuperAdmin.create({ username: 'superadmin', email: 'superadmin@example.com', passwordHash })
    res.json({ ok: true, user: { id: user._id, username: user.username, db: 'museum_superadmin' } })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// Seed a default admin if none exists (separate admin DB)
router.post('/seed-admin', async (_req, res) => {
  try {
    const existing = await Admin.findOne({ username: 'admin' })
    if (existing) return res.json({ ok: true, message: 'Admin already exists' })
    const passwordHash = await bcrypt.hash('admin123', 10)
    const user = await Admin.create({ username: 'admin', email: 'admin@example.com', passwordHash })
    res.json({ ok: true, user: { id: user._id, username: user.username, db: 'museum_admin' } })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// Create multiple sample admin accounts
router.post('/seed-multiple-admins', async (_req, res) => {
  try {
    const admins = [
      { username: 'admin1', email: 'admin1@example.com', password: 'admin123' },
      { username: 'admin2', email: 'admin2@example.com', password: 'admin123' },
      { username: 'admin3', email: 'admin3@example.com', password: 'admin123' },
      { username: 'john_doe', email: 'john@example.com', password: 'admin123' },
      { username: 'jane_smith', email: 'jane@example.com', password: 'admin123' }
    ]
    
    const createdAdmins = []
    for (const admin of admins) {
      const existing = await Admin.findOne({ username: admin.username })
      if (!existing) {
        const passwordHash = await bcrypt.hash(admin.password, 10)
        const user = await Admin.create({
          username: admin.username,
          email: admin.email,
          passwordHash
        })
        createdAdmins.push({ id: user._id, username: user.username })
      }
    }
    
    res.json({ ok: true, message: `Created ${createdAdmins.length} admin accounts`, admins: createdAdmins })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// Get admin dashboard statistics
router.get('/admin/count', async (_req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments()
    const activeAdmins = await Admin.countDocuments({ status: 'active' })
    const onDuty = Math.floor(Math.random() * 3) + 1 // Random 1-3 for demo
    const todayLogins = Math.floor(Math.random() * 10) + 5 // Random 5-14 for demo
    
    res.json({
      ok: true,
      totalAdmins,
      activeAdmins,
      onDuty,
      todayLogins
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.post('/admin/login', validateLogin, async (req, res) => {
  const { identifier, password, recaptchaToken } = req.body || {}
  const ip = req.ip || req.connection.remoteAddress
  const userAgent = req.get('user-agent')
  
  try {
    logger.info('Admin login attempt', { identifier, ip })
    
    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken)
    if (!recaptchaResult.success) {
      logger.security.loginAttempt(identifier, false, ip, userAgent)
      return res.status(400).json({ message: recaptchaResult.message })
    }

    const user = await Admin.findOne({ $or: [{ username: identifier }, { email: identifier }] })
    if (!user) {
      logger.security.loginAttempt(identifier, false, ip, userAgent)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      logger.security.loginAttempt(user.username, false, ip, userAgent)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    // Auto-activate admin on login (handle both old and new status fields)
    if (user.status === 'inactive' || user.status === undefined || !user.status) {
      user.status = 'active'
      await user.save()
      logger.info(`Admin ${user.username} auto-activated on login`)
    }
    
    // Generate JWT tokens
    const token = generateToken({ 
      _id: user._id, 
      username: user.username, 
      email: user.email, 
      role: 'admin', 
      db: 'museum_admin' 
    })
    const refreshToken = generateRefreshToken({ 
      _id: user._id, 
      role: 'admin', 
      db: 'museum_admin' 
    })
    
    // Log successful login
    logger.security.loginAttempt(user.username, true, ip, userAgent)
    
    // Log to audit trail
    await AuditLog.create({
      userId: user._id.toString(),
      userRole: 'admin',
      username: user.username,
      action: 'LOGIN',
      resource: 'AUTHENTICATION',
      ipAddress: ip,
      userAgent: userAgent
    }).catch(err => logger.error('Audit log error', { error: err.message }))
    
    res.json({ 
      ok: true, 
      token: token,
      refreshToken: refreshToken,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        name: user.name || user.username, 
        profilePicture: user.profilePicture || (user.googleProfile && user.googleProfile.picture) || null,
        googleProfile: user.googleProfile || undefined,
        db: 'museum_admin' 
      } 
    })
  } catch (e) {
    logger.error('Admin login error', { error: e.message, stack: e.stack })
    res.status(500).json({ message: e.message })
  }
})

router.post('/superadmin/login', validateLogin, async (req, res) => {
  const { identifier, password, recaptchaToken } = req.body || {}
  const ip = req.ip || req.connection.remoteAddress
  const userAgent = req.get('user-agent')
  
  try {
    logger.info('SuperAdmin login attempt', { identifier, ip })
    
    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken)
    if (!recaptchaResult.success) {
      logger.security.loginAttempt(identifier, false, ip, userAgent)
      return res.status(400).json({ message: recaptchaResult.message })
    }

    const user = await SuperAdmin.findOne({ $or: [{ username: identifier }, { email: identifier }] })
    if (!user) {
      logger.security.loginAttempt(identifier, false, ip, userAgent)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      logger.security.loginAttempt(user.username, false, ip, userAgent)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    // Generate JWT tokens
    const token = generateToken({ 
      _id: user._id, 
      username: user.username, 
      email: user.email, 
      role: 'superadmin', 
      db: 'museum_superadmin' 
    })
    const refreshToken = generateRefreshToken({ 
      _id: user._id, 
      role: 'superadmin', 
      db: 'museum_superadmin' 
    })
    
    // Log successful login
    logger.security.loginAttempt(user.username, true, ip, userAgent)
    
    // Log to audit trail
    await AuditLog.create({
      userId: user._id.toString(),
      userRole: 'superadmin',
      username: user.username,
      action: 'LOGIN',
      resource: 'AUTHENTICATION',
      ipAddress: ip,
      userAgent: userAgent
    }).catch(err => logger.error('Audit log error', { error: err.message }))
    
    res.json({ 
      ok: true, 
      token: token,
      refreshToken: refreshToken,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        name: user.name || user.username, 
        db: 'museum_superadmin' 
      } 
    })
  } catch (e) {
    logger.error('SuperAdmin login error', { error: e.message, stack: e.stack })
    res.status(500).json({ message: e.message })
  }
})

// ===== GOOGLE OAUTH ROUTES =====

// Admin Google OAuth routes
router.get('/google/admin', (req, res) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(400).json({
      error: 'Google OAuth not configured',
      message: 'Please configure Google OAuth credentials in your .env file',
      instructions: [
        '1. Create a .env file in the backend/ directory',
        '2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
        '3. Get credentials from https://console.cloud.google.com/',
        '4. Restart the server'
      ]
    })
  }
  
  
  passport.authenticate('admin-google', { scope: ['profile', 'email'] })(req, res)
})

router.get('/google/admin/callback', 
  passport.authenticate('admin-google', { failureRedirect: '/login?error=google_auth_failed' }),
  async (req, res) => {
    try {
      // Auto-activate admin on Google OAuth login
      if (req.user.status === 'inactive' || req.user.status === undefined || !req.user.status) {
        req.user.status = 'active'
        await req.user.save()
        console.log(`Admin ${req.user.username} auto-activated on Google OAuth login - Status: ${req.user.status}`)
      }
      
      // Successful authentication, generate a real JWT token (admin role)
      const token = generateToken({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: 'admin',
        db: 'museum_admin'
      })

      const googlePicture = req.user.googleProfile?.picture || req.user.profilePicture || null

      res.redirect(`http://localhost:5173/auth-success?token=${token}&type=admin&user=${encodeURIComponent(JSON.stringify({
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        name: req.user.name || req.user.username,
        profilePicture: googlePicture,
        googleProfile: req.user.googleProfile
      }))}`)
    } catch (error) {
      console.error('Error in Google OAuth callback:', error)
      res.redirect('/login?error=google_auth_failed')
    }
  },
  (err, req, res, next) => {
    // Handle authentication errors
    console.error('Admin Google OAuth error:', err.message)
    
    let errorType = 'google_auth_failed'
    let errorMessage = 'Google authentication failed. Please try again.'
    
    if (err.message === 'EMAIL_ALREADY_SUPERADMIN') {
      errorType = 'email_already_superadmin'
      errorMessage = 'This email is already registered as Super Admin. Please use a different email or contact support.'
    } else if (err.message === 'ADMIN_NOT_FOUND') {
      errorType = 'admin_not_found'
      errorMessage = 'Admin account not found. Please contact your Super Administrator to create your account first.'
    }
    
    res.redirect(`http://localhost:5173/login?error=${errorType}&message=${encodeURIComponent(errorMessage)}`)
  }
)

// SuperAdmin Google OAuth routes
router.get('/google/superadmin', (req, res) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(400).json({
      error: 'Google OAuth not configured',
      message: 'Please configure Google OAuth credentials in your .env file',
      instructions: [
        '1. Create a .env file in the backend/ directory',
        '2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
        '3. Get credentials from https://console.cloud.google.com/',
        '4. Restart the server'
      ]
    })
  }
  
  
  passport.authenticate('superadmin-google', { scope: ['profile', 'email'] })(req, res)
})

router.get('/google/superadmin/callback', 
  passport.authenticate('superadmin-google', { failureRedirect: '/login?error=google_auth_failed' }),
  (req, res) => {
    // Successful authentication, generate a real JWT token (superadmin role)
    const token = generateToken({
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: 'superadmin',
      db: 'museum_superadmin'
    })
    res.redirect(`http://localhost:5173/auth-success?token=${token}&type=superadmin&user=${encodeURIComponent(JSON.stringify({
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      googleProfile: req.user.googleProfile
    }))}`)
  },
  (err, req, res, next) => {
    // Handle authentication errors
    console.error('SuperAdmin Google OAuth error:', err.message)
    
    let errorType = 'google_auth_failed'
    let errorMessage = 'Google authentication failed. Please try again.'
    
    if (err.message === 'EMAIL_ALREADY_ADMIN') {
      errorType = 'email_already_admin'
      errorMessage = 'This email is already registered as Admin. Please use a different email or contact support.'
    } else if (err.message === 'SUPERADMIN_NOT_FOUND') {
      errorType = 'superadmin_not_found'
      errorMessage = 'Super Admin account not found. Please contact the system administrator to create your account first.'
    }
    
    res.redirect(`http://localhost:5173/login?error=${errorType}&message=${encodeURIComponent(errorMessage)}`)
  }
)

// ===== FORGOT PASSWORD ENDPOINTS =====

// Admin forgot password (send 6-digit code)
router.post('/admin/forgot-password', async (req, res) => {
  const { email } = req.body || {}
  
  try {
    console.log(`\n=== ADMIN FORGOT PASSWORD REQUEST ===`)
    console.log(`Email: ${email}`)
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }
    
    // Find admin by email
    const admin = await Admin.findOne({ email })
    console.log(`Admin found: ${admin ? 'YES' : 'NO'}`)
    if (!admin) {
      return res.status(404).json({ message: 'No admin account found with this email' })
    }
    
    // Generate 6-digit code valid for 10 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000)
    
    console.log(`Generated code: ${code}`)
    console.log(`Expires at: ${resetTokenExpiry}`)
    
    // Store code in database
    admin.resetToken = code
    admin.resetTokenExpiry = resetTokenExpiry
    await admin.save()
    
    console.log(`✅ Code stored in database for admin: ${admin._id}`)
    
    // Send reset code email
    const emailSent = await sendResetCodeEmail(email, code, 'admin')
    
    if (emailSent) {
      console.log(`✅ Password reset process completed for admin: ${email}`)
      res.json({ 
        ok: true, 
        message: 'Reset code sent successfully. Check your inbox.' 
      })
    } else {
      res.status(500).json({ 
        message: 'Failed to send reset code. Please try again later.' 
      })
    }
    
  } catch (e) {
    console.error('❌ Admin forgot password error:', e)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Super Admin forgot password (send 6-digit code)
router.post('/superadmin/forgot-password', async (req, res) => {
  const { email } = req.body || {}
  
  try {
    console.log(`\n=== SUPERADMIN FORGOT PASSWORD REQUEST ===`)
    console.log(`Email: ${email}`)
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }
    
    // Find super admin by email
    const superAdmin = await SuperAdmin.findOne({ email })
    console.log(`SuperAdmin found: ${superAdmin ? 'YES' : 'NO'}`)
    if (!superAdmin) {
      return res.status(404).json({ message: 'No super admin account found with this email' })
    }
    
    // Generate 6-digit code valid for 10 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000)
    
    console.log(`Generated code: ${code}`)
    console.log(`Expires at: ${resetTokenExpiry}`)
    
    // Store code in database
    superAdmin.resetToken = code
    superAdmin.resetTokenExpiry = resetTokenExpiry
    await superAdmin.save()
    
    console.log(`✅ Code stored in database for superadmin: ${superAdmin._id}`)
    
    // Send reset code email
    const emailSent = await sendResetCodeEmail(email, code, 'superadmin')
    
    if (emailSent) {
      console.log(`✅ Password reset process completed for superadmin: ${email}`)
      res.json({ 
        ok: true, 
        message: 'Reset code sent successfully. Check your inbox.' 
      })
    } else {
      res.status(500).json({ 
        message: 'Failed to send reset code. Please try again later.' 
      })
    }
    
  } catch (e) {
    console.error('❌ SuperAdmin forgot password error:', e)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Verify reset code without resetting password
router.post('/verify-reset-code', async (req, res) => {
  const { email, code, userType } = req.body || {}
  
  try {
    console.log(`\n=== VERIFY RESET CODE REQUEST ===`)
    console.log(`Email: ${email}`)
    console.log(`Code: ${code}`)
    console.log(`UserType: ${userType}`)
    
    if (!email || !code || !userType) {
      return res.status(400).json({ message: 'Email, code, and user type are required' })
    }
    
    let model
    if (userType === 'admin') {
      model = Admin
    } else if (userType === 'superadmin') {
      model = SuperAdmin
    } else {
      return res.status(400).json({ message: 'Invalid user type' })
    }
    
    // Find user by email and valid code
    const user = await model.findOne({ 
      email,
      resetToken: code,
      resetTokenExpiry: { $gt: new Date() }
    })
    
    console.log(`User found with valid code: ${user ? 'YES' : 'NO'}`)
    if (!user) {
      console.log('❌ Invalid or expired reset code')
      return res.status(400).json({ message: 'Invalid or expired reset code' })
    }
    
    console.log(`✅ Code verified successfully for ${userType}: ${email}`)
    
    res.json({ 
      ok: true, 
      message: 'Code verified successfully' 
    })
    
  } catch (e) {
    console.error('❌ Verify reset code error:', e)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Refresh token route
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body
    const ip = req.ip || req.connection.remoteAddress
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' })
    }

    const decoded = verifyToken(refreshToken)
    if (!decoded || decoded.type !== 'refresh') {
      logger.security.unauthorizedAccess('/api/refresh-token', ip, req.get('user-agent'))
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    // Get user based on role
    const user = decoded.role === 'superadmin' 
      ? await SuperAdmin.findById(decoded.id)
      : await Admin.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    const newToken = generateToken({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: decoded.role,
      db: decoded.role === 'superadmin' ? 'museum_superadmin' : 'museum_admin'
    })

    logger.info('Token refreshed', { userId: user._id.toString(), role: decoded.role, ip })
    
    res.json({ ok: true, token: newToken })
  } catch (error) {
    logger.error('Token refresh error', { error: error.message, stack: error.stack })
    res.status(500).json({ message: 'Token refresh failed' })
  }
})

// Reset password with email + code (for both admin and superadmin)
router.post('/reset-password', validatePasswordResetCode, async (req, res) => {
  const { email, code, newPassword, userType } = req.body || {}
  const ip = req.ip || req.connection.remoteAddress
  
  try {
    logger.info('Password reset request', { email, userType, ip })
    
    let user, model
    if (userType === 'admin') {
      model = Admin
    } else if (userType === 'superadmin') {
      model = SuperAdmin
    } else {
      return res.status(400).json({ message: 'Invalid user type' })
    }
    
    // Find user by email and valid code
    user = await model.findOne({ 
      email,
      resetToken: code,
      resetTokenExpiry: { $gt: new Date() }
    })
    
    if (!user) {
      logger.security.passwordReset(email, false, ip)
      return res.status(400).json({ message: 'Invalid or expired reset code' })
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)
    
    // Update password and clear reset token
    user.passwordHash = passwordHash
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()
    
    // Log successful password reset
    logger.security.passwordReset(email, true, ip)
    
    // Log to audit trail
    await AuditLog.create({
      userId: user._id.toString(),
      userRole: userType,
      username: user.username,
      action: 'PASSWORD_RESET',
      resource: 'AUTHENTICATION',
      ipAddress: ip,
      userAgent: req.get('user-agent')
    }).catch(err => logger.error('Audit log error', { error: err.message }))
    
    logger.info(`Password reset successful for ${userType}: ${email}`)
    
    res.json({ 
      ok: true, 
      message: 'Password reset successfully. You can now login with your new password.' 
    })
    
  } catch (e) {
    logger.error('Password reset error', { error: e.message, stack: e.stack })
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Create new administrator (Super Admin only)
router.post('/admin/create', async (req, res) => {
  console.log('Admin create request received:', req.body)
  const { username, email, password } = req.body || {}
  console.log('Extracted data:', { username, email, password: password ? '***' : 'undefined' })
  try {
    // Check if username or email already exists in Admin collection
    const existingUser = await Admin.findOne({ 
      $or: [{ username }, { email }] 
    })
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? 'Username already exists' : 'Email already exists' 
      })
    }

    // Check if email is already used by SuperAdmin
    const existingSuperAdmin = await SuperAdmin.findOne({ email })
    if (existingSuperAdmin) {
      return res.status(400).json({ 
        message: 'Email is already registered as SuperAdmin. Please use a different email.' 
      })
    }

    // Generate random password if not provided
    let finalPassword = password
    if (!password) {
      // Generate a random 12-character password with letters and numbers
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      finalPassword = ''
      for (let i = 0; i < 12; i++) {
        finalPassword += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      console.log('Generated random password for admin:', username)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(finalPassword, 10)
    
    // Create new admin
    const newAdmin = await Admin.create({
      username,
      email,
      passwordHash,
      status: 'inactive' // Explicitly set as inactive
    })

    // Send email with generated password to the administrator
    const emailSent = await sendAdminCredentialsEmail(email, username, finalPassword)
    
    if (emailSent) {
      console.log(`✅ Admin credentials sent successfully to: ${email}`)
      res.json({ 
        ok: true, 
        message: 'Administrator created successfully. Login credentials have been sent to their email.',
        admin: { 
          id: newAdmin._id, 
          username: newAdmin.username, 
          email: newAdmin.email 
        }
      })
    } else {
      // Even if email fails, admin is created - just log the credentials
      console.log(`⚠️ Email failed, but admin created. Credentials: ${username} / ${finalPassword}`)
      res.json({ 
        ok: true, 
        message: 'Administrator created successfully. Please check console for login credentials (email sending failed).',
        admin: { 
          id: newAdmin._id, 
          username: newAdmin.username, 
          email: newAdmin.email 
        }
      })
    }
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// Get all administrators
router.get('/admin/list', async (req, res) => {
  try {
    const admins = await Admin.find({}, { passwordHash: 0 }).sort({ createdAt: -1 })
    console.log('Admin list endpoint - returning admins:', admins.map(admin => ({ username: admin.username, status: admin.status })))
    res.json({ ok: true, admins })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ===== ATTENDANCE MANAGEMENT ENDPOINTS =====

// Log attendance (check-in)
router.post('/attendance/checkin', async (req, res) => {
  console.log('Attendance check-in request received:', req.body)
  const { idNumber, name, type, adminId, notes } = req.body || {}
  
  try {
    // Check if person is already checked in
    const existingCheckIn = await Attendance.findOne({
      idNumber,
      status: 'checked-in'
    })
    
    if (existingCheckIn) {
      return res.status(400).json({
        message: `Person with ID ${idNumber} is already checked in`
      })
    }
    
    // Create new attendance record
    const attendance = await Attendance.create({
      idNumber,
      name,
      type,
      adminId,
      notes: notes || '',
      checkInTime: new Date(),
      status: 'checked-in'
    })
    
    // Broadcast attendance check-in to all connected clients
    try {
      const { broadcastAttendance } = require('../utils/sseBroadcaster')
      broadcastAttendance.checkedIn(attendance)
    } catch (error) {
      console.error('Error broadcasting attendance check-in:', error)
    }
    
    res.json({
      ok: true,
      message: 'Attendance logged successfully',
      attendance: {
        id: attendance._id,
        idNumber: attendance.idNumber,
        name: attendance.name,
        type: attendance.type,
        checkInTime: attendance.checkInTime,
        status: attendance.status
      }
    })
  } catch (e) {
    console.error('Error logging attendance:', e)
    res.status(500).json({ message: e.message })
  }
})

// Check out attendance
router.post('/attendance/checkout', async (req, res) => {
  console.log('Attendance check-out request received:', req.body)
  const { recordId, adminId } = req.body || {}
  
  try {
    // Find the attendance record by ID
    const attendance = await Attendance.findById(recordId)
    
    if (!attendance) {
      return res.status(404).json({
        message: `No attendance record found with ID ${recordId}`
      })
    }
    
    if (attendance.status === 'checked-out') {
      return res.status(400).json({
        message: `Visitor ${attendance.name} is already checked out`
      })
    }
    
    // Update attendance record
    attendance.checkOutTime = new Date()
    attendance.status = 'checked-out'
    await attendance.save()
    
    // Broadcast attendance check-out to all connected clients
    try {
      const { broadcastAttendance } = require('../utils/sseBroadcaster')
      broadcastAttendance.checkedOut(attendance)
    } catch (error) {
      console.error('Error broadcasting attendance check-out:', error)
    }
    
    console.log(`✅ Successfully checked out: ${attendance.name} (ID: ${attendance.idNumber})`)
    
    res.json({
      ok: true,
      message: 'Check-out successful',
      attendance: {
        id: attendance._id,
        idNumber: attendance.idNumber,
        name: attendance.name,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        duration: Math.round((attendance.checkOutTime - attendance.checkInTime) / (1000 * 60)) // minutes
      }
    })
  } catch (e) {
    console.error('Error checking out:', e)
    res.status(500).json({ message: e.message })
  }
})

// Search attendance records
router.get('/attendance/search', async (req, res) => {
  try {
    const { q } = req.query
    
    if (!q || q.trim().length < 2) {
      return res.json({ data: [] })
    }

    const searchQuery = q.trim()
    
    // Search by name, idNumber, or email (case-insensitive)
    const results = await Attendance.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { idNumber: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .sort({ checkInTime: -1 })
    .limit(20)

    res.json({
      ok: true,
      data: results
    })
  } catch (e) {
    console.error('Error searching attendance:', e)
    res.status(500).json({ message: e.message })
  }
})

// Checkout by ID (PUT method)
router.put('/attendance/:id/checkout', async (req, res) => {
  try {
    const { id } = req.params
    
    const attendance = await Attendance.findById(id)
    
    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found'
      })
    }
    
    if (attendance.status === 'checked-out') {
      return res.status(400).json({
        message: `${attendance.name} is already checked out`
      })
    }
    
    // Update attendance record
    attendance.checkOutTime = new Date()
    attendance.status = 'checked-out'
    await attendance.save()
    
    // Broadcast attendance check-out to all connected clients
    try {
      const { broadcastAttendance } = require('../utils/sseBroadcaster')
      broadcastAttendance.checkedOut(attendance)
    } catch (error) {
      console.error('Error broadcasting attendance check-out:', error)
    }
    
    console.log(`✅ Successfully checked out via PUT: ${attendance.name}`)
    
    res.json({
      ok: true,
      message: 'Check-out successful',
      attendance: {
        id: attendance._id,
        idNumber: attendance.idNumber,
        name: attendance.name,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        duration: Math.round((attendance.checkOutTime - attendance.checkInTime) / (1000 * 60))
      }
    })
  } catch (e) {
    console.error('Error checking out:', e)
    res.status(500).json({ message: e.message })
  }
})

// Get today's attendance records
router.get('/attendance/today', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const attendanceRecords = await Attendance.find({
      checkInTime: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ checkInTime: -1 })
    
    res.json({
      ok: true,
      records: attendanceRecords,
      totalToday: attendanceRecords.length,
      checkedIn: attendanceRecords.filter(r => r.status === 'checked-in').length,
      checkedOut: attendanceRecords.filter(r => r.status === 'checked-out').length
    })
  } catch (e) {
    console.error('Error fetching today\'s attendance:', e)
    res.status(500).json({ message: e.message })
  }
})

// Get attendance records by date range
router.get('/attendance/records', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query
    
    let query = {}
    
    if (startDate && endDate) {
      query.checkInTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }
    
    if (type) {
      query.type = type
    }
    
    const records = await Attendance.find(query)
      .sort({ checkInTime: -1 })
      .limit(100) // Limit to prevent large responses
    
    res.json({
      ok: true,
      records,
      total: records.length
    })
  } catch (e) {
    console.error('Error fetching attendance records:', e)
    res.status(500).json({ message: e.message })
  }
})

// Get attendance statistics
router.get('/attendance/stats', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const stats = await Attendance.aggregate([
      {
        $match: {
          checkInTime: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          checkedIn: {
            $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] }
          },
          checkedOut: {
            $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] }
          }
        }
      }
    ])
    
    res.json({
      ok: true,
      stats,
      totalToday: stats.reduce((sum, stat) => sum + stat.count, 0)
    })
  } catch (e) {
    console.error('Error fetching attendance stats:', e)
    res.status(500).json({ message: e.message })
  }
})

// Get attendance reports
router.get('/attendance/reports', async (req, res) => {
  try {
    const { adminId, type, startDate, endDate } = req.query
    let start, end

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Set date range based on type
    switch(type) {
      case 'today':
        start = new Date(today)
        end = new Date(today)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        start = new Date(today)
        start.setDate(start.getDate() - start.getDay()) // Start of week (Sunday)
        end = new Date(start)
        end.setDate(end.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case 'custom':
        if (!startDate || !endDate) {
          return res.status(400).json({ message: 'Start date and end date are required for custom range' })
        }
        start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date(today)
        end = new Date(today)
        end.setHours(23, 59, 59, 999)
    }

    const query = {
      adminId,
      checkInTime: {
        $gte: start,
        $lte: end
      }
    }

    const records = await Attendance.find(query).sort({ checkInTime: -1 })
    
    res.json({
      ok: true,
      records: records.map(record => ({
        _id: record._id,
        idNumber: record.idNumber,
        name: record.name,
        type: record.type,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime || null,
        status: record.status,
        notes: record.notes || '',
        adminId: record.adminId
      })),
      count: records.length
    })
  } catch (e) {
    console.error('Error fetching attendance reports:', e)
    res.status(500).json({ message: e.message })
  }
})

// Get SuperAdmin profile
router.get('/superadmin/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    // For demo purposes, we'll get the user from localStorage data
    // In a real app, you'd verify the JWT token here
    const userId = req.query.userId || req.headers['x-user-id']
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' })
    }

    const superadmin = await SuperAdmin.findById(userId).select('username email name profilePicture')
    
    if (!superadmin) {
      return res.status(404).json({ message: 'SuperAdmin not found' })
    }

    res.json({
      name: superadmin.name || superadmin.username,
      email: superadmin.email,
      profilePicture: superadmin.profilePicture,
      username: superadmin.username
    })
  } catch (error) {
    console.error('Error fetching superadmin profile:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get Admin profile
router.get('/admin/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const userId = req.query.userId || req.headers['x-user-id']
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' })
    }

    const admin = await Admin.findById(userId).select('username email name profilePicture')
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    res.json({
      name: admin.name || admin.username,
      email: admin.email,
      profilePicture: admin.profilePicture,
      username: admin.username
    })
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update SuperAdmin profile
router.put('/superadmin/update-profile/:id', (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err)
      return res.status(400).json({ message: 'File upload error: ' + err.message })
    }
    next()
  })
}, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const { id } = req.params
    const { name, email, username } = req.body
    
    console.log('Profile update request:', { id, name, email, username, hasFile: !!req.file })
    
    // For demo purposes, we'll update the profile without JWT verification
    // In a real app, you'd verify the JWT token here
    
    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (username) updateData.username = username
    
    // Handle profile picture upload
    if (req.file) {
      updateData.profilePicture = `http://localhost:5000/uploads/profiles/${req.file.filename}`
    }

    console.log('Updating SuperAdmin with data:', updateData)
    
    const superadmin = await SuperAdmin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('username email name profilePicture')

    if (!superadmin) {
      return res.status(404).json({ message: 'SuperAdmin not found' })
    }

    console.log('Updated SuperAdmin:', superadmin)

    res.json({
      message: 'Profile updated successfully',
      profilePicture: superadmin.profilePicture,
      name: superadmin.name,
      email: superadmin.email,
      username: superadmin.username
    })
  } catch (error) {
    console.error('Error updating superadmin profile:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update Admin profile
router.put('/admin/update-profile/:id', (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err)
      return res.status(400).json({ message: 'File upload error: ' + err.message })
    }
    next()
  })
}, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const { id } = req.params
    const { name, email, username, newPassword } = req.body
    
    console.log('Admin profile update request:', { id, name, email, username, hasNewPassword: !!newPassword, hasFile: !!req.file })
    
    // For demo purposes, we'll update the profile without JWT verification
    // In a real app, you'd verify the JWT token here
    
    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (username) updateData.username = username
    
    // Handle password change if provided
    if (newPassword) {
      console.log('Updating admin password')
      const passwordHash = await bcrypt.hash(newPassword, 10)
      updateData.passwordHash = passwordHash
    }
    
    // Handle profile picture upload
    if (req.file) {
      updateData.profilePicture = `http://localhost:5000/uploads/profiles/${req.file.filename}`
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('username email name profilePicture')

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    res.json({
      message: newPassword ? 'Profile and password updated successfully' : 'Profile updated successfully',
      profilePicture: admin.profilePicture,
      name: admin.name,
      email: admin.email,
      username: admin.username
    })
  } catch (error) {
    console.error('Error updating admin profile:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update Admin credentials (username, email, password)
router.put('/admin/update/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, password } = req.body
    
    console.log('Admin update request:', { id, username, email, password: password ? '***' : 'undefined' })
    
    // Find the admin
    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({ message: 'Administrator not found' })
    }
    
    // Prepare update data
    const updateData = {}
    
    // Update username if provided
    if (username && username !== admin.username) {
      // Check if username already exists
      const existingUsername = await Admin.findOne({ 
        username, 
        _id: { $ne: id } 
      })
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' })
      }
      updateData.username = username
    }
    
    // Update email if provided
    if (email && email !== admin.email) {
      // Check if email already exists
      const existingEmail = await Admin.findOne({ 
        email, 
        _id: { $ne: id } 
      })
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' })
      }
      updateData.email = email
    }
    
    // Update password if provided
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updateData.passwordHash = passwordHash
    }
    
    // Update the admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('username email createdAt')
    
    console.log('Admin updated successfully:', updatedAdmin)
    
    res.json({
      ok: true,
      message: 'Administrator updated successfully',
      admin: updatedAdmin
    })
    
  } catch (error) {
    console.error('Error updating admin:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Deactivate Admin
router.put('/admin/deactivate/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    console.log('Admin deactivate request:', { id, status })
    
    // Find the admin
    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({ message: 'Administrator not found' })
    }
    
    // Update the admin status
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { status: status || 'inactive' },
      { new: true, runValidators: true }
    ).select('username email status createdAt')
    
    console.log('Admin status updated successfully:', updatedAdmin)
    
    res.json({
      ok: true,
      message: `Administrator ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      admin: updatedAdmin
    })
    
  } catch (error) {
    console.error('Error updating admin status:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete Admin (permanent deletion)
router.delete('/admin/delete/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    console.log('Admin delete request:', { id })
    
    // Find the admin
    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({ message: 'Administrator not found' })
    }
    
    // Delete the admin permanently
    await Admin.findByIdAndDelete(id)
    
    console.log('Admin deleted successfully:', admin.username)
    
    res.json({
      ok: true,
      message: 'Administrator deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting admin:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Test endpoint to check database directly
router.get('/admin/test-db', async (req, res) => {
  try {
    console.log('=== DATABASE TEST ===')
    
    // Get all admins with full details
    const allAdmins = await Admin.find({})
    console.log('All admins in database:', allAdmins.map(admin => ({
      id: admin._id,
      username: admin.username,
      status: admin.status,
      hasStatusField: admin.status !== undefined,
      schemaFields: Object.keys(admin.toObject())
    })))
    
    // Try to create a test admin with status
    const testAdmin = new Admin({
      username: 'test-admin-' + Date.now(),
      email: 'test@example.com',
      passwordHash: 'test-hash',
      status: 'active'
    })
    
    console.log('Test admin before save:', {
      username: testAdmin.username,
      status: testAdmin.status,
      hasStatusField: testAdmin.status !== undefined
    })
    
    await testAdmin.save()
    console.log('Test admin after save:', {
      id: testAdmin._id,
      username: testAdmin.username,
      status: testAdmin.status,
      hasStatusField: testAdmin.status !== undefined
    })
    
    // Clean up test admin
    await Admin.findByIdAndDelete(testAdmin._id)
    
    res.json({ 
      ok: true, 
      message: 'Database test completed',
      adminCount: allAdmins.length,
      testResult: 'Check console logs'
    })
  } catch (error) {
    console.error('Database test error:', error)
    res.status(500).json({ message: 'Database test failed', error: error.message })
  }
})

// Migration endpoint to fix all existing admins
router.post('/admin/migrate-status', async (req, res) => {
  try {
    console.log('Starting admin status migration...')
    
    // Find all admins without status field or with undefined status
    const adminsToUpdate = await Admin.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: undefined },
        { status: 'inactive' }
      ]
    })
    
    console.log(`Found ${adminsToUpdate.length} admins to migrate`)
    console.log('Admins to update:', adminsToUpdate.map(admin => ({ username: admin.username, status: admin.status })))
    
    // Update each admin individually to ensure the status field is added
    let updatedCount = 0
    for (const admin of adminsToUpdate) {
      try {
        // First, let's check the current admin document
        const currentAdmin = await Admin.findById(admin._id)
        console.log(`Before update - Admin ${admin.username}:`, { 
          id: currentAdmin._id, 
          username: currentAdmin.username, 
          status: currentAdmin.status,
          hasStatusField: currentAdmin.status !== undefined
        })
        
        // Force update with explicit field setting
        const result = await Admin.findByIdAndUpdate(
          admin._id,
          { 
            $set: { 
              status: 'active',
              // Force the field to exist
              'status': 'active'
            } 
          },
          { 
            new: true, 
            upsert: false,
            runValidators: true
          }
        )
        
        if (result) {
          updatedCount++
          console.log(`After update - Admin ${admin.username}:`, { 
            id: result._id, 
            username: result.username, 
            status: result.status,
            hasStatusField: result.status !== undefined
          })
        }
      } catch (error) {
        console.error(`Failed to update admin ${admin.username}:`, error.message)
      }
    }
    
    console.log(`Migration completed: ${updatedCount} admins updated`)
    
    // Verify the migration by checking a few admins
    const sampleAdmins = await Admin.find({}).limit(3).select('username status')
    console.log('Sample admin statuses after migration:', sampleAdmins.map(admin => ({ username: admin.username, status: admin.status })))
    
    res.json({
      ok: true,
      message: `Successfully migrated ${updatedCount} admin accounts to active status`,
      modifiedCount: updatedCount
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ message: 'Migration failed', error: error.message })
  }
})

// Test endpoint to verify image serving
router.get('/test-image/:filename', (req, res) => {
  const filename = req.params.filename
  console.log('Testing image access for:', filename)
  const fs = require('fs')
  const path = require('path')
  
  try {
    const files = fs.readdirSync('uploads/profiles/')
    res.json({ 
      message: 'Image test endpoint',
      filename: filename,
      fullPath: `http://localhost:5000/uploads/profiles/${filename}`,
      files: files,
      fileExists: files.includes(filename)
    })
  } catch (error) {
    res.json({ 
      message: 'Error reading uploads directory',
      error: error.message
    })
  }
})

module.exports = router



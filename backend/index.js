require('dotenv').config()
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const bcrypt = require('bcryptjs')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { adminConnection, superAdminConnection, bookingsConnection, whenOpen } = require('./db')
const cors = require('cors')
const logger = require('./utils/logger')
const { requestLogger, auditLogger } = require('./middleware/logging')

const authRoutes = require('./routes/auth')
const bookingRoutes = require('./routes/bookings')
const museumSettingsRoutes = require('./routes/museumSettings')
const googleCalendarRoutes = require('./routes/googleCalendar')
const galleryRoutes = require('./routes/gallery')
const announcementRoutes = require('./routes/announcements')
const reportTemplateRoutes = require('./routes/reportTemplates')
const reportsRoutes = require('./routes/reports')
const dashboardRoutes = require('./routes/dashboard')
const realtimeRoutes = require('./routes/realtime')
const Admin = require('./models/Admin')
const SuperAdmin = require('./models/SuperAdmin')

const app = express()
const PORT = process.env.PORT || 5000

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1)

// Security headers
// Allow cross-origin loading of static assets like profile images from the frontend (http://localhost:5173)
// while keeping the other Helmet protections enabled.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))

// Environment flag (development vs production)
const isProduction = process.env.NODE_ENV === 'production'

// Rate limiting for login routes
// - In production: very strict (5 attempts / 15 minutes)
// - In development: a bit looser so you don't get locked out while testing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 20,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

// General API rate limiting
// - In production: 1000 requests / 15 minutes per IP
// - In development: very high limit so local testing is smooth
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 1000 : 10000,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

// Session configuration for Google OAuth
const sessionSecret = process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production'
if (isProduction && sessionSecret === 'your-session-secret-key-change-in-production') {
  logger.warn('⚠️  WARNING: Using default session secret in production! Set SESSION_SECRET in .env')
}
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

// CORS configuration - allow credentials for JWT authentication
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
// Increase body parser limit to handle large template data (especially base64 images)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware (must be after body parser)
app.use(requestLogger)
app.use(auditLogger)

// Apply general API rate limiting
// Only enforce this strictly in production. In development, the high max
// above effectively disables it for normal testing.
if (isProduction) {
  app.use('/api', apiLimiter)
}

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'museum-api' })
})

// Apply login rate limiting to auth routes
app.use('/api/admin/login', loginLimiter)
app.use('/api/superadmin/login', loginLimiter)

app.use('/api', authRoutes)
app.use('/api', bookingRoutes)
app.use('/api', museumSettingsRoutes)
app.use('/api', googleCalendarRoutes)
app.use('/api', galleryRoutes)
app.use('/api', announcementRoutes)
app.use('/api', reportTemplateRoutes)
app.use('/api', reportsRoutes)
app.use('/api', dashboardRoutes)
app.use('/api', realtimeRoutes)
const modulePermissionsRoutes = require('./routes/modulePermissions')
app.use('/api/module-permissions', modulePermissionsRoutes)
const auditLogsRoutes = require('./routes/auditLogs')
app.use('/api', auditLogsRoutes)

// TBCC (Timestamp-Based Concurrency Control) routes
const tbccRoutes = require('./routes/tbcc')
app.use('/api/tbcc', tbccRoutes)

async function ensureDefaultAccounts() {
  try {
    const [
      superAdminExists,
      adminExists
    ] = await Promise.all([
      SuperAdmin.exists({}),
      Admin.exists({})
    ])

    if (!superAdminExists) {
      const username = process.env.DEFAULT_SUPERADMIN_USERNAME || 'superadmin'
      const email = process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@example.com'
      const password = process.env.DEFAULT_SUPERADMIN_PASSWORD || 'admin123'
      const passwordHash = await bcrypt.hash(password, 10)
      await SuperAdmin.create({ username, email, passwordHash })
      console.log(`✅ Default Super Admin account created (${username} / ${password})`)
    }

    if (!adminExists) {
      const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin'
      const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
      const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
      const passwordHash = await bcrypt.hash(password, 10)
      await Admin.create({ username, email, passwordHash, status: 'active' })
      console.log(`✅ Default Admin account created (${username} / ${password})`)
    }
  } catch (error) {
    console.error('Error ensuring default accounts:', error)
  }
}

Promise.all([whenOpen(adminConnection), whenOpen(superAdminConnection), whenOpen(bookingsConnection)])
  .then(async () => {
    console.log('MongoDB connected: museum_admin, museum_superadmin & museum_bookings')
    await ensureDefaultAccounts()
    
    // Initialize real-time database sync (if enabled)
    if (process.env.ENABLE_DB_SYNC === 'true') {
      console.log('🔄 Real-time database sync is ENABLED')
      const dbSyncService = require('./services/dbSync')
      dbSyncService.setAtlasConnections(adminConnection, superAdminConnection, bookingsConnection)
      await dbSyncService.start()
    } else {
      const primaryDb = process.env.MONGO_URI_ADMIN || 'mongodb://127.0.0.1:27017/museum_admin'
      console.log('ℹ️  Real-time database sync is DISABLED (set ENABLE_DB_SYNC=true to enable)')
      console.log('   Current setup: Using', 
        primaryDb.startsWith('mongodb+srv://') ? 'MongoDB Atlas' : 'Local MongoDB',
        'as primary database')
    }
    
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })



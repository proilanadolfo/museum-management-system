# 🚀 Setup Guide para sa mga Kauban (For Team Members)

Kini nga guide para sa mga tawo nga mag-clone sa repository ug mag-setup sa system.

## ⚠️ IMPORTANTE: Ang `.env` file DILI ma-push sa GitHub!

Ang `.env` file (environment variables) **DILI** ma-push sa GitHub para sa security. Kailangan ninyo mag-create ug inyong own `.env` file.

---

## 📋 Prerequisites (Kailangan ninyo)

1. **Node.js** (v16 o mas taas) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)
3. **MongoDB Atlas Account** (para sa database) - [Sign up here](https://www.mongodb.com/cloud/atlas)
4. **Code Editor** (VS Code recommended)

---

## 🔧 Step-by-Step Setup

### Step 1: Clone ang Repository

```bash
git clone https://github.com/proilanadolfo/museum-management-system.git
cd museum-management-system
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Step 3: Create `.env` File sa Backend

1. **Adto sa backend folder:**
   ```bash
   cd backend
   ```

2. **Create ug bag-ong file nga `.env`** (wala'y extension)
   - Sa VS Code: Right-click → New File → Name it `.env`
   - O sa terminal: `touch .env` (Mac/Linux) o `type nul > .env` (Windows)

3. **Copy-paste ang template sa ubos ug i-fill ang values:**

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000
NODE_ENV=development

# ============================================
# MONGODB ATLAS CONNECTION STRINGS
# ============================================
# IMPORTANTE: Kailangan ninyo ang actual connection strings gikan sa MongoDB Atlas
# Tan-awa ang MONGODB_ATLAS_SETUP.md para sa detailed instructions

MONGO_URI_ADMIN=mongodb+srv://username:password@cluster-hostname/museum_admin?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI_SUPERADMIN=mongodb+srv://username:password@cluster-hostname/museum_superadmin?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI_BOOKINGS=mongodb+srv://username:password@cluster-hostname/museum_bookings?retryWrites=true&w=majority&appName=Cluster0

# ============================================
# JWT SECRET KEYS
# ============================================
# Generate ug random string (pwede ninyo gamiton: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# SESSION SECRET
# ============================================
SESSION_SECRET=your-session-secret-key-change-this

# ============================================
# EMAIL CONFIGURATION (Optional - para sa email notifications)
# ============================================
# Para sa Gmail:
# 1. Enable 2-factor authentication
# 2. Go to Google Account > Security > App passwords
# 3. Generate app password para sa "Mail"
# 4. I-copy ang app password dinhi

EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# ============================================
# SMS CONFIGURATION (Optional - para sa SMS notifications)
# ============================================
# Semaphore (Recommended para sa Philippines)
SEMAPHORE_API_KEY=your-semaphore-api-key
SEMAPHORE_SENDER_NAME=BSC-System

# ============================================
# GOOGLE SERVICES (Optional)
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/callback
GOOGLE_CALENDAR_ID=primary

# ============================================
# RECAPTCHA (Optional)
# ============================================
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# ============================================
# FRONTEND URL
# ============================================
FRONTEND_URL=http://localhost:5173

# ============================================
# DEFAULT ADMIN CREDENTIALS (Optional)
# ============================================
DEFAULT_SUPERADMIN_USERNAME=superadmin
DEFAULT_SUPERADMIN_EMAIL=superadmin@example.com
DEFAULT_SUPERADMIN_PASSWORD=admin123

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

### Step 4: Setup MongoDB Atlas

1. **Create MongoDB Atlas Account** (kung wala pa)
   - Adto sa [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up o login

2. **Create Cluster** (kung wala pa)
   - Follow ang instructions sa `MONGODB_ATLAS_SETUP.md`

3. **Get Connection Strings**
   - Adto sa MongoDB Atlas Dashboard
   - Click "Connect" sa inyong cluster
   - Pili "Connect your application"
   - Copy ang connection string
   - I-update ang `.env` file sa 3 ka connection strings (ADMIN, SUPERADMIN, BOOKINGS)

**Example:**
```
mongodb+srv://username:password@cluster0.abc123.mongodb.net/museum_admin?retryWrites=true&w=majority&appName=Cluster0
```

**IMPORTANTE:**
- I-replace ang `username` ug `password` sa actual values
- I-replace ang `cluster0.abc123.mongodb.net` sa inyong actual cluster hostname
- I-encode ang special characters sa password (e.g., `!` becomes `%21`)

### Step 5: Run ang System

**Option 1: Run Backend ug Frontend Separately**

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Backend mo-run sa `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend mo-run sa `http://localhost:5173`

**Option 2: Run Both (kung naa kay `start-dev.bat`):**
```bash
# Windows
start-dev.bat

# Mac/Linux (kung naa kay script)
npm run dev
```

### Step 6: Access ang System

1. **Open browser:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

2. **Login:**
   - Super Admin: `superadmin` / `admin123`
   - Admin: `admin` / `admin123`

---

## ❓ Common Issues ug Solutions

### Issue 1: "Cannot connect to MongoDB"
**Solution:**
- I-check ang connection strings sa `.env` file
- I-verify nga tama ang username, password, ug hostname
- I-check kung na-whitelist ang inyong IP sa MongoDB Atlas

### Issue 2: "Module not found"
**Solution:**
- I-run `npm install` sa backend ug frontend folders
- I-delete ang `node_modules` ug `package-lock.json`, dayon `npm install` balik

### Issue 3: "Port already in use"
**Solution:**
- I-check kung naa bay other application nga naggamit sa port 5000 o 5173
- I-change ang PORT sa `.env` file (backend) o sa `vite.config.js` (frontend)

### Issue 4: "Environment variables not found"
**Solution:**
- I-verify nga naa gyud ang `.env` file sa `backend/` folder
- I-check nga tama ang format (walay spaces sa palibot sa `=`)
- I-restart ang backend server

---

## 📚 Additional Resources

- **MongoDB Atlas Setup**: Tan-awa ang `MONGODB_ATLAS_SETUP.md`
- **Google OAuth Setup**: Tan-awa ang `GOOGLE_OAUTH_SETUP.md`
- **SMS Setup**: Tan-awa ang `SEMAPHORE_SMS_SETUP.md`
- **Email Setup**: Tan-awa ang `GOOGLE_AUTH_FIX_GUIDE.md`

---

## 🔐 Security Notes

1. **DILI i-commit ang `.env` file** - Naa na sa `.gitignore`
2. **DILI i-share ang actual credentials** - Gamit lang ang template
3. **I-change ang default passwords** sa production
4. **I-generate ug strong JWT_SECRET** para sa production

---

## 💡 Tips

- Gamit ang VS Code extensions: "REST Client" para sa API testing
- Gamit ang MongoDB Compass para sa database management
- I-check ang `backend/logs/` folder para sa error logs
- I-read ang `README.md` para sa general information

---

## 🆘 Need Help?

Kung naa moy questions o issues:
1. I-check ang error messages sa terminal
2. I-check ang logs sa `backend/logs/` folder
3. I-contact ang team lead o project owner

---

**Happy Coding! 🎉**



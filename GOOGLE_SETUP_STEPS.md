# 🔧 Google OAuth Setup - Step by Step

## 🎯 Goal: Get Real Google OAuth Working

You want to choose your actual Google account when clicking "Continue with Google". Here's how to set it up:

## 📋 Step 1: Create Google OAuth App

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** (or select existing one)
3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add these **Authorized redirect URIs**:
     ```
     http://localhost:5000/api/google/admin/callback
     http://localhost:5000/api/google/superadmin/callback
     ```
5. **Copy your credentials**:
   - Copy the "Client ID"
   - Copy the "Client Secret"

## 📝 Step 2: Update .env File

Replace the content in `backend/.env` with your real credentials:

```env
# Google OAuth Configuration - Real Credentials
GOOGLE_CLIENT_ID=your-actual-client-id-from-google
GOOGLE_CLIENT_SECRET=your-actual-client-secret-from-google
SESSION_SECRET=my-super-secret-session-key-123

# Email Configuration (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🚀 Step 3: Restart Server

```bash
cd backend
npm start
```

## ✅ Step 4: Test

1. Go to `http://localhost:5173/login`
2. Click "Administrator" or "Super Admin"
3. Click "Continue with Google"
4. **You should now see Google's account selection page!**
5. Choose your Google account
6. Get redirected back to your dashboard

## 🎉 Expected Result

- Click "Continue with Google" → Google account selection page
- Choose your account → Redirect to dashboard
- No more loading screen, real Google OAuth!

## 🔍 Troubleshooting

If you still get errors:
1. Make sure the redirect URIs in Google Console match exactly
2. Check that the .env file has the correct credentials
3. Restart the server after updating .env
4. Clear browser cache and try again



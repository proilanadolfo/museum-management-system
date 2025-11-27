# 🚨 Quick Fix for Google OAuth Error

## The Problem
You're getting an error when clicking "Continue with Google" because the Google OAuth credentials are not configured yet.

## 🔧 Step-by-Step Fix

### 1. Create Environment File
Create a file named `.env` in the `backend/` directory with this content:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
SESSION_SECRET=your-session-secret-key-here
```

### 2. Get Google OAuth Credentials

#### Option A: Quick Test (Use Demo Credentials)
For testing purposes, you can use these demo values:
```env
GOOGLE_CLIENT_ID=demo-client-id
GOOGLE_CLIENT_SECRET=demo-client-secret
SESSION_SECRET=my-super-secret-session-key-123
```

#### Option B: Real Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set Application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/google/admin/callback`
   - `http://localhost:5000/api/google/superadmin/callback`
7. Copy the Client ID and Client Secret to your `.env` file

### 3. Restart the Backend Server
```bash
cd backend
npm start
```

### 4. Test the Google Login
1. Go to `http://localhost:5173/login`
2. Click "Administrator" or "Super Admin"
3. Click "Continue with Google"

## 🎯 Expected Behavior

- **With Demo Credentials**: You'll get a Google OAuth error page (this is normal for demo credentials)
- **With Real Credentials**: You'll be redirected to Google's consent screen

## 🔍 Troubleshooting

If you still get errors:

1. **Check if .env file exists**: Make sure `backend/.env` file exists
2. **Check server logs**: Look at the backend console for error messages
3. **Verify redirect URIs**: Make sure the redirect URIs in Google Console match exactly
4. **Clear browser cache**: Try in incognito/private mode

## 📞 Need Help?

If you're still having issues, share:
1. The exact error message you see
2. Any console errors in the browser
3. Any error messages in the backend terminal



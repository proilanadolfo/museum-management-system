# 🔧 Google Auth Fix Guide

## Problem
Your Google OAuth is not working because the `.env` file has placeholder values instead of real Google OAuth credentials.

## Current Status
✅ .env file exists in backend/ directory  
✅ Backend OAuth routes are properly configured  
✅ Frontend Google login buttons are working  
✅ Success page is set up  
❌ .env file has placeholder values  
❌ Need to set up Google Cloud Console OAuth app  

## Solution Steps

### 1. Your .env file already exists but needs real credentials

Your current `.env` file has placeholder values:
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

You need to replace these with real Google OAuth credentials.

### 2. Get Google OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** (or select existing):
   - Click "Select a project" → "New Project"
   - Name: "Museum Management System"
   - Click "Create"

3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Name: "Museum OAuth"
   - Add these **Authorized redirect URIs**:
     ```
     http://localhost:5000/api/google/admin/callback
     http://localhost:5000/api/google/superadmin/callback
     ```
   - Click "Create"

5. **Copy your credentials**:
   - Copy the "Client ID" (looks like: 123456789-abcdefghijklmnop.apps.googleusercontent.com)
   - Copy the "Client Secret" (looks like: GOCSPX-abcdefghijklmnopqrstuvwxyz)

### 3. Update .env file

Replace the placeholder values in your `.env` file:
- Replace `your-google-client-id-here` with your actual Client ID
- Replace `your-google-client-secret-here` with your actual Client Secret

### 4. Restart the server

```bash
cd backend
npm start
```

### 5. Test Google OAuth

1. Go to `http://localhost:5173/login`
2. Click "Administrator" or "Super Admin"
3. Click "Continue with Google"
4. You should now see Google's account selection page!

## Expected Result

- Click "Continue with Google" → Google account selection page
- Choose your account → Redirect to dashboard
- No more demo mode, real Google OAuth!

## Troubleshooting

If you still get errors:
1. Make sure the redirect URIs in Google Console match exactly
2. Check that the .env file has the correct credentials
3. Restart the server after updating .env
4. Clear browser cache and try again

## Current Status

✅ Backend OAuth routes are properly configured
✅ Frontend Google login buttons are working
✅ Success page is set up
❌ Missing .env file with Google credentials
❌ Need to set up Google Cloud Console OAuth app

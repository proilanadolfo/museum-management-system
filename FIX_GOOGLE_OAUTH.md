# 🔧 Fix Google OAuth Login Issue

## Problem
After changing `.env` file, "Continue with Google" login is not working.

## Solution

### Step 1: Get Correct Client ID and Secret from Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **MatigBukSU** (or MatigBukSUv2)
3. Go to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (should be named "Client ID for Web application" or similar)
5. Click on it to view details
6. **Copy the Client ID** (looks like: `930332501901-ud3h...`)
7. **Copy the Client Secret** (click "Show" if needed, looks like: `GOCSPX-...`)

### Step 2: Update `.env` File

Open `backend/.env` and make sure it has:

```env
# Google OAuth (SAME for both login and calendar)
GOOGLE_CLIENT_ID=930332501901-ud3h... (paste your actual Client ID here)
GOOGLE_CLIENT_SECRET=GOCSPX-... (paste your actual Client Secret here)

# Google Calendar (optional - uses same Client ID/Secret above)
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/callback
GOOGLE_CALENDAR_ID=primary
```

**Important:**
- ✅ Use the **SAME** Client ID and Secret for both login and calendar
- ✅ Make sure there are **NO spaces** before or after the `=` sign
- ✅ Make sure there are **NO quotes** around the values
- ✅ Make sure the Client ID starts with numbers (e.g., `930332501901-...`)
- ✅ Make sure the Client Secret starts with `GOCSPX-`

### Step 3: Verify Redirect URIs in Google Cloud Console

Make sure these 3 redirect URIs are added in your OAuth client:

1. `http://localhost:5000/api/google/admin/callback` (for Admin login)
2. `http://localhost:5000/api/google/superadmin/callback` (for Super Admin login)
3. `http://localhost:5000/api/google-calendar/callback` (for Google Calendar)

### Step 4: Restart Backend Server

**CRITICAL:** After changing `.env`, you MUST restart the backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
npm start
```

### Step 5: Test

1. Go to login page: `http://localhost:5173/login`
2. Click "Administrator" or "Super Admin"
3. Click "Continue with Google"
4. Should redirect to Google account selection

## Common Issues

### Issue 1: "OAuth client was deleted"
- **Cause:** Client ID in `.env` doesn't match Google Cloud Console
- **Fix:** Copy the correct Client ID from Google Cloud Console

### Issue 2: "Redirect URI mismatch"
- **Cause:** Redirect URI not added in Google Cloud Console
- **Fix:** Add all 3 redirect URIs in OAuth client settings

### Issue 3: "Invalid client secret"
- **Cause:** Client Secret in `.env` is wrong or has extra spaces
- **Fix:** Copy the exact Client Secret (no spaces, no quotes)

### Issue 4: Still not working after restart
- **Cause:** Server didn't reload `.env` file
- **Fix:** 
  1. Make sure server is completely stopped
  2. Check `.env` file is saved
  3. Restart server again

## Verification

To verify your `.env` is correct, check backend console when starting:

```
✅ Should see: Server running on port 5000
❌ Should NOT see: "Google OAuth not configured"
```

If you see "Google OAuth not configured", your `.env` values are still wrong.


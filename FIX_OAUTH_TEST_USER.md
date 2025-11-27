# 🔧 Fix: "Access blocked: App has not completed Google verification"

## Problem
You're getting this error:
```
Access blocked: MatigBukSU has not completed the Google verification process.
The app is currently being tested, and can only be accessed by developer-approved test users.
```

## Solution: Add Test Users

Ang app nimo naa pa sa **"Testing" mode**, so kailangan nimo i-add ang imong email as test user.

### Steps (NEW Google Auth Platform Interface):

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/
   - Select project: **MatigBukSU** (or MatigBukSUv2)

2. **Go to Google Auth Platform**
   - Click **APIs & Services** → **OAuth consent screen**
   - Mo-redirect ka sa **"Google Auth Platform / OAuth Overview"** (bag-ong interface)

3. **Go to "Audience" section**
   - Sa **left sidebar**, i-click ang **"Audience"** (dili "Overview")
   - Didto nimo makita ang **"Test users"** section

4. **Add your email**
   - Sa "Test users" section, i-click ang **"+ ADD USERS"** button
   - I-type ang imong Google email: `proilanadolfo@gmail.com`
   - Click **ADD**

5. **Try again**
   - I-try balik ang "Connect Google Calendar" sa Admin Dashboard
   - Dapat mo-work na

## Visual Guide (NEW Interface):

```
Google Cloud Console
├── APIs & Services
    └── OAuth consent screen ← CLICK HERE
        └── Google Auth Platform / OAuth Overview (bag-ong interface)
            └── Left Sidebar:
                ├── Overview ← DILI NI
                ├── Branding
                ├── Audience ← CLICK NI! (didto ang Test users)
                ├── Clients
                ├── Data Access
                └── Settings
                    └── Audience page
                        └── Test users section
                            └── + ADD USERS ← CLICK HERE
                                └── Add: proilanadolfo@gmail.com
```

## Important Notes:

✅ **For Development**: Adding test users is enough
✅ **For Production**: Kailangan mo-publish ang app (requires Google verification)
✅ **Multiple Users**: Pwede ka mag-add ug multiple test users
✅ **No Email Needed**: Usually wala na invitation email, diretso na mo-work

## After Adding Test User:

1. I-try balik ang "Connect Google Calendar"
2. Dapat mo-redirect na sa Google authorization
3. I-click "Allow"
4. Mo-redirect balik sa dashboard

## If Still Not Working:

1. I-check nga naa ang email sa Test users list
2. I-clear ang browser cache
3. I-try sa incognito/private window
4. I-restart ang backend server


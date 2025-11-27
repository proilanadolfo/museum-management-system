# Google Calendar API Integration Setup Guide

This guide will help you set up Google Calendar API integration to automatically sync confirmed bookings to Google Calendar.

## Prerequisites

1. Google Cloud Platform account
2. Access to Google Cloud Console
3. Existing Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

## Setup Steps

### 1. Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Calendar API"
5. Click on it and press **Enable**

### 2. Configure OAuth Consent Screen (if not already done)

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (recommended for museum system - allows access from any Google account)
   - **Internal**: Only for users within your Google Workspace organization
   - **External**: For public access (recommended for museum system)
3. Fill in the required information:
   - App name: "BSC Museum Management System"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Save and continue

### 2.1. Add Test Users (IMPORTANT for Testing Mode)

**If your app is in "Testing" mode**, you MUST add test users:

1. Go to **APIs & Services** → **OAuth consent screen**
2. Scroll down to **Test users** section
3. Click **+ ADD USERS**
4. Add your Google email address (e.g., `proilanadolfo@gmail.com`)
5. Click **ADD**
6. **Important**: The user must accept the invitation email (if sent) or try to sign in again

**Note**: 
- In Testing mode, only added test users can access the app
- For production, you'll need to publish the app (requires Google verification)
- For development, adding test users is the easiest solution

### 3. Update OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID (or create a new one)
3. Add authorized redirect URI:
   ```
   http://localhost:5000/api/google-calendar/callback
   ```
   (For production, use your production URL)
4. Save the changes

### 4. Update Environment Variables

Add to your `backend/.env` file:

```env
# Google OAuth (should already exist)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Google Calendar (optional - defaults to 'primary')
GOOGLE_CALENDAR_ID=primary
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-calendar/callback
```

### 5. Connect Google Calendar in Admin Dashboard

1. Log in to Admin Dashboard
2. Go to **Settings**
3. Find the **Google Calendar Sync** card
4. Click **🔗 Connect Google Calendar**
5. You'll be redirected to Google to authorize
6. Grant permissions to access your Google Calendar
7. You'll be redirected back to the dashboard

### 6. Test the Connection

1. In Settings → Google Calendar Sync
2. Click **🧪 Test Connection**
3. You should see a success message

## How It Works

### Automatic Sync

- When a booking is **confirmed**, it automatically creates an event in Google Calendar
- When a booking is **cancelled**, it automatically deletes the event from Google Calendar
- When booking details are updated, the calendar event is updated

### Event Details

Each calendar event includes:
- **Title**: "Museum Visit: [Guest Name]"
- **Date & Time**: Booking visit date and time (2-hour duration)
- **Location**: "Bukidnon Studies Center Museum"
- **Description**: 
  - Guest name and contact info
  - Number of visitors
  - Purpose of visit
  - Confirmation code
  - Special requests (if any)
  - Admin notes (if any)
- **Reminders**: 
  - Email reminder 24 hours before
  - Popup reminder 1 hour before

### Event Colors

- **Green**: Confirmed bookings
- **Red**: Cancelled bookings

## Managing Google Calendar Sync

### Connect/Disconnect

- **Connect**: Click "Connect Google Calendar" button in Settings
- **Disconnect**: Click "Disconnect" button (stops all syncing)

### Viewing Synced Events

- All synced events appear in your Google Calendar
- You can view them in Google Calendar app or website
- Events are linked back to the booking (stored in database)

## Troubleshooting

### "Google Calendar API not configured"

- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart the backend server after adding environment variables

### "Failed to connect"

- Check that Google Calendar API is enabled in Google Cloud Console
- Verify redirect URI matches exactly: `http://localhost:5000/api/google-calendar/callback`
- Make sure OAuth consent screen is configured

### "Token expired" or "Invalid token"

- Disconnect and reconnect Google Calendar
- The system should auto-refresh tokens, but manual reconnection may be needed

### Events not syncing

- Check that Google Calendar is connected (Settings → Google Calendar Sync)
- Verify booking status is being changed to "confirmed"
- Check backend console for error messages
- Test the connection using "Test Connection" button

## Security Notes

- Google Calendar tokens are stored securely in the database
- Tokens are automatically refreshed when expired
- Only confirmed bookings are synced (pending bookings are not)
- Cancelled bookings remove the calendar event

## Production Deployment

For production, update:
1. Redirect URI in Google Cloud Console to your production URL
2. `GOOGLE_REDIRECT_URI` in `.env` to production URL
3. Ensure HTTPS is enabled (required for OAuth in production)

## Support

If you encounter issues:
1. Check backend console logs
2. Verify all environment variables are set
3. Test Google Calendar API access in Google Cloud Console
4. Check that OAuth consent screen is properly configured


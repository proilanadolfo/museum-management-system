# Google OAuth Setup Instructions

## Backend Configuration

1. **Install Dependencies** (Already done):
   ```bash
   cd backend
   npm install google-auth-library passport passport-google-oauth20 express-session
   ```

2. **Create Google OAuth App**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set Application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/google/admin/callback`
     - `http://localhost:5000/api/google/superadmin/callback`

3. **Environment Variables**:
   Create a `.env` file in the backend directory with:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id-here
   GOOGLE_CLIENT_SECRET=your-google-client-secret-here
   SESSION_SECRET=your-session-secret-key-here
   ```

## Frontend Configuration

1. **Install Dependencies** (Already done):
   ```bash
   cd frontend
   npm install @google-cloud/local-auth google-auth-library
   ```

## How It Works

1. **Admin/SuperAdmin Login**: Users can now choose between:
   - Traditional username/password login
   - Google OAuth login

2. **Google OAuth Flow**:
   - User clicks "Continue with Google" button
   - Redirected to Google OAuth consent screen
   - After authorization, redirected back to `/auth-success`
   - Token and user info stored in localStorage
   - User redirected to appropriate dashboard

3. **Account Linking**: 
   - If Google email matches existing admin/superadmin account, accounts are linked
   - If no existing account, new account is created with Google profile

## Features Added

- ✅ Google OAuth integration for both Admin and SuperAdmin
- ✅ Account linking for existing users
- ✅ New user creation via Google OAuth
- ✅ Beautiful Google login buttons with proper styling
- ✅ Success page with loading animation
- ✅ Error handling for failed authentication

## Testing

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173/login`
4. Click on Admin or SuperAdmin
5. Try the "Continue with Google" button

## Security Notes

- Make sure to set proper environment variables in production
- Use HTTPS in production
- Set `cookie: { secure: true }` in session config for production
- Consider implementing proper JWT tokens instead of demo tokens

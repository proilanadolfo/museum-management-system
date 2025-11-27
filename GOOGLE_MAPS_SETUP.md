# 🗺️ Google Maps API Integration Setup Guide

This guide will help you set up Google Maps API integration to display an interactive map on the Contact/About page.

## Prerequisites

1. Google Cloud Platform account
2. Access to Google Cloud Console
3. Google Maps API key

## Setup Steps

### 1. Enable Google Maps JavaScript API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Maps JavaScript API"
5. Click on it and press **Enable**

### 2. Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API key**
3. Copy the API key (looks like: `AIzaSy...`)
4. **Important**: Restrict the API key for security:
   - Click on the API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Choose "Maps JavaScript API"
   - Under "Application restrictions", you can restrict by HTTP referrer (for web)
   - Add your domain (e.g., `localhost:5173/*` for development)
   - Click **Save**

### 3. Update Environment Variables

Create or update `frontend/.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

**Important:**
- ✅ Use `VITE_` prefix (required for Vite)
- ✅ No spaces before or after `=`
- ✅ No quotes around the value
- ✅ Restart the dev server after adding

### 4. Update Map Coordinates (Optional)

Edit `frontend/src/components/GuestPage/GoogleMap.jsx`:

```javascript
const center = {
  lat: 8.1574, // Update with your actual latitude
  lng: 125.1279 // Update with your actual longitude
}
```

To find your coordinates:
1. Go to Google Maps
2. Search for your location
3. Right-click on the marker
4. Click the coordinates to copy them

### 5. Restart Development Server

After adding the API key:

```bash
cd frontend
npm run dev
```

## How It Works

### Location
- **Page**: Guest Dashboard → About/Contact page
- **URL**: `/guest/about`
- **Section**: "Find Us" section at the bottom

### Features
- ✅ Interactive Google Map
- ✅ Marker showing museum location
- ✅ Zoom controls
- ✅ Street View
- ✅ Map type controls
- ✅ Fullscreen mode

### Fallback
If API key is not configured:
- Shows a placeholder message
- Instructs to add `VITE_GOOGLE_MAPS_API_KEY` to `.env`

## Customization

### Change Map Style
Edit `GoogleMap.jsx` → `options`:

```javascript
const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [...] // Add custom map styles
}
```

### Change Map Size
Edit `GoogleMap.jsx` → `mapContainerStyle`:

```javascript
const mapContainerStyle = {
  width: '100%',
  height: '400px', // Change height here
  borderRadius: '12px'
}
```

### Change Zoom Level
Edit `GoogleMap.jsx` → `zoom` prop:

```javascript
<GoogleMap
  zoom={15} // Change zoom level (1-20)
  ...
/>
```

## Security Notes

### API Key Restrictions
- ✅ Always restrict your API key
- ✅ Use HTTP referrer restrictions for web
- ✅ Don't commit API key to version control
- ✅ Add `.env` to `.gitignore`

### Billing
- Google Maps API has a free tier
- After free tier, pay-as-you-go pricing
- Monitor usage in Google Cloud Console

## Troubleshooting

### "Google Maps API key not configured"
- Check if `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- Make sure to restart dev server after adding
- Check if `.env` file is in `frontend/` directory

### "This page can't load Google Maps correctly"
- Check if API key is valid
- Check if Maps JavaScript API is enabled
- Check if API key restrictions allow your domain
- Check browser console for specific errors

### Map not showing
- Check browser console for errors
- Verify API key is correct
- Check if coordinates are valid
- Ensure internet connection

### Map shows wrong location
- Update coordinates in `GoogleMap.jsx`
- Use Google Maps to find correct coordinates
- Save and refresh the page

## Production Deployment

For production:

1. **Update API Key Restrictions**:
   - Add your production domain
   - Remove `localhost` restrictions (or keep for testing)

2. **Environment Variables**:
   - Set `VITE_GOOGLE_MAPS_API_KEY` in production environment
   - Don't hardcode in source code

3. **Build**:
   ```bash
   npm run build
   ```

## Support

If you encounter issues:
1. Check Google Cloud Console for API usage
2. Check browser console for errors
3. Verify API key restrictions
4. Check Google Maps API documentation

